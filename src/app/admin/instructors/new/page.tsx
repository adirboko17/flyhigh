import { PageHeader } from "@/components/ui/PageHeader";
import { InstructorForm } from "@/components/admin/InstructorForm";

export const metadata = { title: "מדריכה חדשה" };

export default function NewInstructorPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="הוספת מדריכה חדשה"
        description="מלאו את פרטי המדריכה לשיוך לחוגים."
      />
      <InstructorForm />
    </div>
  );
}
