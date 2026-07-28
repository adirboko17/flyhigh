import { CouponList } from "@/components/admin/CouponList";
import type { CouponOptions } from "@/components/admin/CouponForm";
import { todayInIsrael } from "@/lib/scheduling/monthGrid";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "קודי קופון" };

export default async function AdminCouponsPage() {
  const supabase = await createClient();

  const [{ data: coupons }, { data: parents }, { data: classes }, { data: programs }, { data: passes }] =
    await Promise.all([
      supabase
        .from("coupons")
        .select(
          "id, code, description, discount_type, discount_value, parent_id, class_id, program_id, pool_pass_id, starts_on, ends_on, max_uses, used_count, is_active"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "parent")
        .order("full_name"),
      supabase.from("classes").select("id, title").order("title"),
      supabase.from("programs").select("id, title").order("title"),
      supabase.from("pool_passes").select("id, title").order("title"),
    ]);

  const options: CouponOptions = {
    parents: (parents ?? []).map((parent) => ({
      id: parent.id,
      label: parent.email ? `${parent.full_name} · ${parent.email}` : parent.full_name,
    })),
    classes: (classes ?? []).map((item) => ({ id: item.id, label: item.title })),
    programs: (programs ?? []).map((item) => ({ id: item.id, label: item.title })),
    poolPasses: (passes ?? []).map((item) => ({ id: item.id, label: item.title })),
  };

  return (
    <CouponList
      coupons={coupons ?? []}
      options={options}
      today={todayInIsrael()}
    />
  );
}
