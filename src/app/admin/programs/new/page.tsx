import { PageHeader } from "@/components/ui/PageHeader";
import { ProgramForm } from "@/components/admin/ProgramForm";

export const metadata = { title: "מסלול חדש" };

export default function NewProgramPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="יצירת מסלול חדש"
        description="מלאו את פרטי המסלול או המנוי."
      />
      <ProgramForm />
    </div>
  );
}
