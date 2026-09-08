import { AccountSettings } from "@/components/auth/AccountSettings";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "הגדרות חשבון" };

export default async function ParentSettingsPage() {
  const profile = await requireRole("parent");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="הגדרות חשבון"
        description="עדכון פרטים אישיים, תעודת זהות וסיסמת התחברות"
      />
      <AccountSettings
        id={profile.id}
        email={profile.email ?? ""}
        fullName={profile.full_name}
        phone={profile.phone}
        gender={profile.gender}
        receiptIdNumber={profile.receipt_id_number}
        role={profile.role}
        createdAt={profile.created_at}
      />
    </div>
  );
}
