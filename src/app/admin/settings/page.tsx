import { PageHeader } from "@/components/ui/PageHeader";
import { AccountSettings } from "@/components/auth/AccountSettings";
import { AdminSettingsHub } from "@/components/admin/AdminSettingsHub";
import { BusinessDocumentsPanel } from "@/components/admin/BusinessDocumentsPanel";
import { getClassCategories } from "@/lib/admin/getClassCategories";
import { getFamilyDiscountSettings } from "@/lib/admin/siblingDiscount";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "הגדרות" };

export default async function AdminSettingsPage() {
  const profile = await requireRole("admin");
  const supabase = await createAdminDataClient();
  const [familyDiscount, classCategories, { data: admins }, { data: businessDocuments }] =
    await Promise.all([
      getFamilyDiscountSettings(),
      getClassCategories(),
      supabase
        .from("profiles")
        .select("id, full_name, email, created_at, is_primary_admin")
        .eq("role", "admin")
        .order("created_at"),
      supabase
        .from("business_documents")
        .select(
          "id, title, category, file_name, file_path, file_size, mime_type, notes, created_at"
        )
        .order("created_at", { ascending: false }),
    ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="הגדרות"
        description="פרטי החשבון, מסמכי העסק, משתמשי ניהול והגדרות תמחור כלליות"
      />
      <AccountSettings
        id={profile.id}
        email={profile.email ?? ""}
        fullName={profile.full_name}
        phone={profile.phone}
        gender={profile.gender}
        role={profile.role}
        createdAt={profile.created_at}
        layout="identity-only"
      />
      <AdminSettingsHub
        profileId={profile.id}
        email={profile.email ?? ""}
        fullName={profile.full_name}
        phone={profile.phone}
        gender={profile.gender}
        admins={admins ?? []}
        currentUserId={profile.id}
        canRemoveAdmins={profile.is_primary_admin}
        familyDiscount={familyDiscount}
        classCategories={classCategories}
      />
      <BusinessDocumentsPanel documents={businessDocuments ?? []} />
    </div>
  );
}
