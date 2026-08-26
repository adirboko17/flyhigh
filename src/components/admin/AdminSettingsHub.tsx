"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import {
  ProfileSettingsForm,
  PasswordSettingsForm,
} from "@/components/auth/AccountSettings";
import { SettingsSectionRow } from "@/components/admin/SettingsSectionRow";
import { AdminUsersSettingsPanel } from "@/components/admin/AdminUsersSettings";
import { SiblingDiscountForm } from "@/components/admin/SiblingDiscountSettings";
import type { AdminUserRow } from "@/components/admin/AdminUsersSettings";
import {
  FAMILY_DISCOUNT_LABEL,
  FAMILY_DISCOUNT_PRODUCT_TYPES,
  type FamilyDiscountSettings,
} from "@/lib/finance/siblingDiscount";
import type { Enums } from "@/types/database.types";

type OpenSection = "profile" | "password" | "admins" | "siblingDiscount" | null;

function formatFamilyDiscountSummary(settings: FamilyDiscountSettings): string {
  if (settings.tiers.length === 0) return "לא הוגדרה הנחה";
  const tiers = settings.tiers
    .map((t) => `${t.minChildren}+ ילדים: ${t.percent}%`)
    .join(" · ");
  const scope = [
    ...settings.classCategories,
    ...FAMILY_DISCOUNT_PRODUCT_TYPES.filter((item) =>
      settings.productTypes.includes(item.id)
    ).map((item) => item.label),
  ];
  return scope.length > 0 ? `${tiers} · ${scope.join(", ")}` : tiers;
}

export function AdminSettingsHub({
  profileId,
  email,
  fullName,
  phone,
  gender,
  admins,
  currentUserId,
  canRemoveAdmins,
  familyDiscount,
  classCategories,
}: {
  profileId: string;
  email: string;
  fullName: string;
  phone: string | null;
  gender?: Enums<"gender_type"> | null;
  admins: AdminUserRow[];
  currentUserId: string;
  canRemoveAdmins: boolean;
  familyDiscount: FamilyDiscountSettings;
  classCategories: string[];
}) {
  const [open, setOpen] = useState<OpenSection>(null);

  const profileDescription = [fullName, phone].filter(Boolean).join(" · ");
  const adminsDescription =
    admins.length === 1 ? "מנהל/ת אחד/ת" : `${admins.length} מנהלים/ות`;
  const siblingDescription = formatFamilyDiscountSummary(familyDiscount);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>הגדרות מערכת</CardTitle>
        </CardHeader>
        <div className="divide-y divide-ink-100 border-t border-ink-100">
          <SettingsSectionRow
            title="פרטים אישיים"
            description={profileDescription || "עדכון שם וטלפון"}
            onAction={() => setOpen("profile")}
          />
          <SettingsSectionRow
            title="שינוי סיסמה"
            description="עדכון סיסמת ההתחברות"
            onAction={() => setOpen("password")}
          />
          <SettingsSectionRow
            title="משתמשי ניהול"
            description={adminsDescription}
            buttonLabel="ניהול"
            onAction={() => setOpen("admins")}
          />
          <SettingsSectionRow
            title={FAMILY_DISCOUNT_LABEL}
            description={siblingDescription}
            onAction={() => setOpen("siblingDiscount")}
          />
        </div>
      </Card>

      <Modal
        open={open === "profile"}
        onClose={() => setOpen(null)}
        title="פרטים אישיים"
        className="max-w-lg"
      >
        <ProfileSettingsForm
          key={`profile-${fullName}-${phone ?? ""}-${gender ?? ""}`}
          id={profileId}
          fullName={fullName}
          phone={phone}
          gender={gender}
          onSuccess={() => setOpen(null)}
          onCancel={() => setOpen(null)}
        />
      </Modal>

      <Modal
        open={open === "password"}
        onClose={() => setOpen(null)}
        title="שינוי סיסמה"
        className="max-w-lg"
      >
        <PasswordSettingsForm
          key={open === "password" ? "password-open" : "password-closed"}
          email={email}
          onSuccess={() => setOpen(null)}
          onCancel={() => setOpen(null)}
        />
      </Modal>

      <Modal
        open={open === "admins"}
        onClose={() => setOpen(null)}
        title="משתמשי ניהול"
        description="כל משתמשי הניהול מקבלים גישה מלאה לדשבורד."
        className="max-w-lg"
      >
        <AdminUsersSettingsPanel
          admins={admins}
          currentUserId={currentUserId}
          canRemoveAdmins={canRemoveAdmins}
        />
      </Modal>

      <Modal
        open={open === "siblingDiscount"}
        onClose={() => setOpen(null)}
        title={FAMILY_DISCOUNT_LABEL}
        description="ההנחה חלה על הילד השני ומעלה, רק בקטגוריות ובמוצרים שתבחרו כאן."
        className="max-w-xl"
      >
        <SiblingDiscountForm
          key={
            open === "siblingDiscount"
              ? `${familyDiscount.tiers.map((t) => `${t.minChildren}-${t.percent}`).join(",")}-${familyDiscount.classCategories.join(",")}-${familyDiscount.productTypes.join(",")}`
              : "closed"
          }
          initialSettings={familyDiscount}
          categories={classCategories}
          onSuccess={() => setOpen(null)}
        />
      </Modal>
    </>
  );
}
