import { CustomerList } from "@/components/admin/CustomerList";
import { createClient } from "@/lib/supabase/server";
export const metadata = { title: "לקוחות" };

export default async function AdminCustomersPage() {
  const supabase = await createClient();

  const { data: parents } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, city, address, created_at, children(*)")
    .eq("role", "parent")
    .order("created_at", { ascending: false });

  const customers = (parents ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    phone: p.phone,
    city: p.city,
    address: p.address,
    created_at: p.created_at,
    children: (p.children ?? []).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  }));

  return <CustomerList customers={customers} />;}
