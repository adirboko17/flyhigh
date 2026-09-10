import { PaymentMethodNotesEditor } from "@/components/admin/PaymentMethodNotesEditor";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadPaymentMethodNotes } from "@/lib/admin/paymentMethodNoteActions";

export const metadata = { title: "אמצעי תשלום" };

export default async function AdminPaymentMethodsPage() {
  const notes = await loadPaymentMethodNotes();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="אמצעי תשלום"
        description="הוראות שמוצגות ללקוח כשהוא בוחר איך לשלם, וגם בכרטיס שלו."
      />
      <PaymentMethodNotesEditor notes={notes} />
    </div>
  );
}
