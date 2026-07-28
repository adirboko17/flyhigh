import { PageHeader } from "@/components/ui/PageHeader";
import { AccountSettings } from "@/components/auth/AccountSettings";
import { SiblingDiscountSettings } from "@/components/admin/SiblingDiscountSettings";
import { getDefaultSiblingTiers } from "@/lib/admin/siblingDiscount";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "הגדרות" };

export default async function AdminSettingsPage() {
  const profile = await requireRole("admin");
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    defaultSiblingTiers,
  ] = await Promise.all([supabase.auth.getUser(), getDefaultSiblingTiers()]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="הגדרות"
        description="פרטי החשבון שלך והגדרות תמחור כלליות"
      />
      <AccountSettings
        id={profile.id}
        email={user?.email ?? profile.email ?? ""}
        fullName={profile.full_name}
        phone={profile.phone}
        role={profile.role}
        createdAt={profile.created_at}
      />
      <SiblingDiscountSettings initialTiers={defaultSiblingTiers} />
    </div>
  );
}
