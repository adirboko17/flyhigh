import { PlanBuyersList } from "@/components/admin/PlanBuyersList";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadIncomeClassOptions } from "@/lib/admin/incomeClasses";
import { loadPlanBuyers } from "@/lib/admin/loadPlanBuyers";

export const metadata = { title: "רוכשות" };

export default async function AdminBuyersPage() {
  const [rows, classes] = await Promise.all([
    loadPlanBuyers(),
    loadIncomeClassOptions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="רוכשות"
        description="כל מי שרכשה כרטיסייה או מנוי. אפשר לסמן עבור איזה חוג התשלום, והכסף ייספר על החוג בכספים."
      />
      <PlanBuyersList rows={rows} classes={classes} />
    </div>
  );
}
