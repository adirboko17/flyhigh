import { PageHeader } from "@/components/ui/PageHeader";
import { AccountSettings } from "@/components/auth/AccountSettings";
import { AdminSettingsHub } from "@/components/admin/AdminSettingsHub";
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
    { data: admins },
  ] = await Promise.all([
    supabase.auth.getUser(),
    getDefaultSiblingTiers(),
    supabase
      .from("profiles")
      .select("id, full_name, email, created_at, is_primary_admin")
      .eq("role", "admin")
      .order("created_at"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="הגדרות"
        description="פרטי החשבון, משתמשי ניהול והגדרות תמחור כלליות"
      />
      <AccountSettings
        id={profile.id}
        email={user?.email ?? profile.email ?? ""}
        fullName={profile.full_name}
        phone={profile.phone}
        role={profile.role}
        createdAt={profile.created_at}
        layout="identity-only"
      />
      <AdminSettingsHub
        profileId={profile.id}
        email={user?.email ?? profile.email ?? ""}
        fullName={profile.full_name}
        phone={profile.phone}
        admins={admins ?? []}
        currentUserId={profile.id}
        canRemoveAdmins={profile.is_primary_admin}
        siblingTiers={defaultSiblingTiers}
      />
    </div>
  );
}
