-- יתרת לקוח לשימוש באתר, במקום זיכוי כספי.
-- סכום חיובי = יתרה שניתנה. סכום שלילי = שימוש ברכישה.

alter type public.payment_method add value if not exists 'customer_balance';

create table if not exists public.customer_balance_entries (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null,
  kind text not null,
  note text,
  created_by uuid references public.profiles (id),
  source_payment_id uuid references public.payments (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  checkout_id uuid references public.payment_checkouts (id) on delete set null,
  reverses_entry_id uuid references public.customer_balance_entries (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint customer_balance_entries_amount_nonzero check (amount <> 0),
  constraint customer_balance_entries_kind_check check (kind in ('grant', 'spend', 'reversal'))
);

create index if not exists customer_balance_entries_parent_created_idx
  on public.customer_balance_entries (parent_id, created_at desc);

create index if not exists customer_balance_entries_source_payment_idx
  on public.customer_balance_entries (source_payment_id)
  where source_payment_id is not null;

create unique index if not exists customer_balance_one_reversal_per_entry
  on public.customer_balance_entries (reverses_entry_id)
  where reverses_entry_id is not null;

create unique index if not exists customer_balance_one_reversal_per_payment
  on public.customer_balance_entries (payment_id)
  where kind = 'reversal' and payment_id is not null;

alter table public.customer_balance_entries enable row level security;

grant select on table public.customer_balance_entries to authenticated;
grant select, insert, update, delete on table public.customer_balance_entries to service_role;

drop policy if exists customer_balance_entries_select_own on public.customer_balance_entries;
create policy customer_balance_entries_select_own
  on public.customer_balance_entries
  for select
  to authenticated
  using (parent_id = (select auth.uid()));

drop policy if exists customer_balance_entries_admin_select on public.customer_balance_entries;
create policy customer_balance_entries_admin_select
  on public.customer_balance_entries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create or replace function public.spend_customer_balance(
  p_parent_id uuid,
  p_amount numeric,
  p_note text
)
returns table(applied numeric, entry_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_available numeric;
  v_applied numeric;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_parent_id::text, 0));

  select coalesce(round(sum(amount), 2), 0)
    into v_available
  from public.customer_balance_entries
  where parent_id = p_parent_id;

  v_applied := round(
    least(greatest(coalesce(p_amount, 0), 0), greatest(v_available, 0)),
    2
  );

  if v_applied <= 0 then
    applied := 0;
    entry_id := null;
    return next;
    return;
  end if;

  insert into public.customer_balance_entries (parent_id, amount, kind, note)
  values (
    p_parent_id,
    -v_applied,
    'spend',
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning id into v_id;

  applied := v_applied;
  entry_id := v_id;
  return next;
end;
$$;

create or replace function public.restore_customer_balance_entry(p_entry_id uuid)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_parent uuid;
  v_amount numeric;
  v_kind text;
  v_restored numeric;
begin
  select parent_id, amount, kind
    into v_parent, v_amount, v_kind
  from public.customer_balance_entries
  where id = p_entry_id
  for update;

  if not found or v_kind <> 'spend' then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_parent::text, 0));

  if exists (
    select 1
    from public.customer_balance_entries
    where reverses_entry_id = p_entry_id
  ) then
    return 0;
  end if;

  v_restored := round(-v_amount, 2);
  insert into public.customer_balance_entries (
    parent_id, amount, kind, note, reverses_entry_id
  ) values (
    v_parent,
    v_restored,
    'reversal',
    'ביטול שריון יתרה',
    p_entry_id
  );

  return v_restored;
end;
$$;

create or replace function public.restore_customer_balance_checkout(p_checkout_id uuid)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_total numeric := 0;
  v_restored numeric;
begin
  for v_id in
    select id
    from public.customer_balance_entries
    where checkout_id = p_checkout_id
      and kind = 'spend'
  loop
    v_restored := public.restore_customer_balance_entry(v_id);
    v_total := round(v_total + v_restored, 2);
  end loop;
  return v_total;
end;
$$;

create or replace function public.restore_customer_balance_payment(p_payment_id uuid)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_amount numeric;
  v_parent uuid;
  v_status public.payment_status;
begin
  select amount, parent_id, status
    into v_amount, v_parent, v_status
  from public.payments
  where id = p_payment_id
  for update;

  if not found or v_status <> 'paid' then
    return 0;
  end if;

  if exists (
    select 1
    from public.customer_balance_entries
    where payment_id = p_payment_id
      and kind = 'reversal'
  ) then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_parent::text, 0));

  insert into public.customer_balance_entries (
    parent_id, amount, kind, note, payment_id
  ) values (
    v_parent,
    round(v_amount, 2),
    'reversal',
    'ביטול רכישה — החזרה ליתרה',
    p_payment_id
  );

  update public.payments
  set status = 'refunded'
  where id = p_payment_id;

  return round(v_amount, 2);
end;
$$;

create or replace function public.grant_customer_balance(
  p_parent_id uuid,
  p_amount numeric,
  p_note text,
  p_created_by uuid,
  p_source_payment_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_amount numeric;
  v_payment_amount numeric;
  v_payment_parent uuid;
  v_refunded numeric;
  v_granted numeric;
  v_id uuid;
begin
  v_amount := round(coalesce(p_amount, 0), 2);
  if v_amount <= 0 then
    raise exception 'נא להזין סכום חיובי';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_parent_id::text, 0));

  if p_source_payment_id is not null then
    select amount, parent_id
      into v_payment_amount, v_payment_parent
    from public.payments
    where id = p_source_payment_id
    for update;

    if not found then
      raise exception 'העסקה לא נמצאה';
    end if;
    if v_payment_parent <> p_parent_id then
      raise exception 'העסקה אינה שייכת ללקוח';
    end if;

    select coalesce(sum(amount), 0)
      into v_refunded
    from public.payment_refunds
    where payment_id = p_source_payment_id;

    select coalesce(sum(amount), 0)
      into v_granted
    from public.customer_balance_entries
    where source_payment_id = p_source_payment_id
      and kind = 'grant';

    if v_amount > round(v_payment_amount - v_refunded - v_granted, 2) then
      raise exception 'לא ניתן להעביר ליתרה יותר מהסכום שנותר בעסקה';
    end if;
  end if;

  insert into public.customer_balance_entries (
    parent_id, amount, kind, note, created_by, source_payment_id
  ) values (
    p_parent_id,
    v_amount,
    'grant',
    nullif(btrim(coalesce(p_note, '')), ''),
    p_created_by,
    p_source_payment_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.spend_customer_balance(uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.restore_customer_balance_entry(uuid) from public, anon, authenticated;
revoke all on function public.restore_customer_balance_checkout(uuid) from public, anon, authenticated;
revoke all on function public.restore_customer_balance_payment(uuid) from public, anon, authenticated;
revoke all on function public.grant_customer_balance(uuid, numeric, text, uuid, uuid) from public, anon, authenticated;

grant execute on function public.spend_customer_balance(uuid, numeric, text) to service_role;
grant execute on function public.restore_customer_balance_entry(uuid) to service_role;
grant execute on function public.restore_customer_balance_checkout(uuid) to service_role;
grant execute on function public.restore_customer_balance_payment(uuid) to service_role;
grant execute on function public.grant_customer_balance(uuid, numeric, text, uuid, uuid) to service_role;
