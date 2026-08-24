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
import type { SiblingDiscountTier } from "@/lib/finance/siblingDiscount";

type OpenSection = "profile" | "password" | "admins" | "siblingDiscount" | null;

function formatSiblingDiscountSummary(tiers: SiblingDiscountTier[]): string {
  if (tiers.length === 0) return "לא הוגדרה הנחה";
  return tiers
    .map((t) => `${t.minChildren}+ ילדים: ${t.percent}% מהשני ומעלה`)
    .join(" · ");
}

export function AdminSettingsHub({
  profileId,
  email,
  fullName,
  phone,
  admins,
  currentUserId,
  canRemoveAdmins,
  siblingTiers,
}: {
  profileId: string;
  email: string;
  fullName: string;
  phone: string | null;
  admins: AdminUserRow[];
  currentUserId: string;
  canRemoveAdmins: boolean;
  siblingTiers: SiblingDiscountTier[];
}) {
  const [open, setOpen] = useState<OpenSection>(null);

  const profileDescription = [fullName, phone].filter(Boolean).join(" · ");
  const adminsDescription =
    admins.length === 1 ? "מנהל/ת אחד/ת" : `${admins.length} מנהלים/ות`;
  const siblingDescription = formatSiblingDiscountSummary(siblingTiers);

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
            title="הנחת אחים — ברירת מחדל"
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
          key={`profile-${fullName}-${phone ?? ""}`}
          id={profileId}
          fullName={fullName}
          phone={phone}
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
        title="הנחת אחים — ברירת מחדל"
        description="ההנחה חלה על הילד השני ומעלה באותה קטגוריה — גם אם נרשמו לחוגים שונים. חוג יכול להגדיר מדרגות משלו ולעקוף את ברירת המחדל."
        className="max-w-lg"
      >
        <SiblingDiscountForm
          key={open === "siblingDiscount" ? siblingTiers.map((t) => `${t.minChildren}-${t.percent}`).join(",") : "closed"}
          initialTiers={siblingTiers}
          onSuccess={() => setOpen(null)}
        />
      </Modal>
    </>
  );
}
