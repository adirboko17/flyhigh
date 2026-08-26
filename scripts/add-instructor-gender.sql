-- מגדר למדריכים: קובע אם להציג «מדריך» או «מדריכה» בכרטיסי החוג.
alter table public.instructors
  add column if not exists gender public.gender_type;

create or replace function public.list_public_class_instructor_genders()
returns table (
  class_id uuid,
  gender public.gender_type
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, i.gender
  from public.classes c
  left join public.instructors i on i.id = c.instructor_id
  where c.status in ('active', 'full');
$$;

revoke all on function public.list_public_class_instructor_genders() from public;
grant execute on function public.list_public_class_instructor_genders() to anon, authenticated;
