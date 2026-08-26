import { CustomerList } from "@/components/admin/CustomerList";
import { declarationSchoolYear } from "@/lib/health-declaration";
import { createAdminDataClient } from "@/lib/admin/dataClient";
export const metadata = { title: "לקוחות" };

export default async function AdminCustomersPage() {
  const supabase = await createAdminDataClient();

  const { data: parents } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, birth_date, gender, city, address, receipt_name, receipt_id_number, created_at, children(id, full_name, birth_date, gender, school_grade, grade_school_year, notes, created_at, health_declarations(id_number, signed_at, accepted, child_name, school_year))"
    )
    .eq("role", "parent")
    .order("created_at", { ascending: false });

  const customers = (parents ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    phone: p.phone,
    birth_date: p.birth_date,
    gender: p.gender,
    city: p.city,
    address: p.address,
    receipt_name: p.receipt_name,
    receipt_id_number: p.receipt_id_number,
    created_at: p.created_at,
    children: (p.children ?? [])
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .map((child) => {
        const year = declarationSchoolYear();
        const current =
          child.health_declarations?.find((row) => row.school_year === year) ??
          child.health_declarations?.[0] ??
          null;
        return {
          ...child,
          healthDeclaration: current
            ? {
                id_number: current.id_number,
                signed_at: current.signed_at,
                accepted: current.accepted,
                child_name: current.child_name,
              }
            : null,
        };
      }),
  }));

  return <CustomerList customers={customers} />;
}
