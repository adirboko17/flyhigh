import { ReceiptLabelList } from "@/components/admin/ReceiptLabelList";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "תוויות לקבלה" };

export default async function AdminReceiptLabelsPage() {
  const supabase = await createClient();
  const { data: labels } = await supabase
    .from("receipt_labels")
    .select("id, label, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader
        title="תוויות לקבלה"
        description="הרשימה שממנה לקוחות יכולים לבחור מה יופיע על הקבלה במקום שם החוג או המוצר."
      />
      <ReceiptLabelList labels={labels ?? []} />
    </div>
  );
}
