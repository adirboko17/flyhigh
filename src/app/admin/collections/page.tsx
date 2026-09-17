import { CollectionsList } from "@/components/admin/CollectionsList";
import { loadCollectionParents } from "@/lib/collections/loadParents";
import type { ReceiptLabelOption } from "@/lib/receipt-labels";
import { createAdminDataClient } from "@/lib/admin/dataClient";

export const metadata = { title: "גבייה" };

export default async function AdminCollectionsPage() {
  const supabase = await createAdminDataClient();
  const [{ data: labelRows }, parents] = await Promise.all([
    supabase
      .from("receipt_labels")
      .select("id, label, note")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true }),
    loadCollectionParents(),
  ]);

  const receiptLabels: ReceiptLabelOption[] = labelRows ?? [];

  return <CollectionsList parents={parents} receiptLabels={receiptLabels} />;
}
