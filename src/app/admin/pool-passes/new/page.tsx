import { PageHeader } from "@/components/ui/PageHeader";
import { PoolPassForm } from "@/components/admin/PoolPassForm";

export const metadata = { title: "כניסה לבריכה חדשה" };

export default function NewPoolPassPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="הוספת כניסה לבריכה"
        description="הגדירו כרטיס כניסה חד-פעמית או כרטיסייה."
      />
      <PoolPassForm />
    </div>
  );
}
