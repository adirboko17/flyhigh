"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  createAdminUser,
  removeAdminUser,
} from "@/lib/admin/adminUsersActions";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { formatDate } from "@/utils/format";

export type AdminUserRow = {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
  is_primary_admin: boolean;
};

export function AdminUsersSettingsPanel({
  admins,
  currentUserId,
  canRemoveAdmins,
}: {
  admins: AdminUserRow[];
  currentUserId: string;
  canRemoveAdmins: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function closeAddModal() {
    if (creating) return;
    setAddOpen(false);
    setFullName("");
    setEmail("");
    setPassword("");
    setCreateError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const result = await createAdminUser({ fullName, email, password });

    setCreating(false);

    if (!result.success) {
      setCreateError(result.error);
      return;
    }

    closeAddModal();
    setMessage("משתמש הניהול נוצר ויכול להתחבר מיד.");
    router.refresh();
  }

  async function handleRemove(profileId: string) {
    if (
      !window.confirm(
        "להסיר את משתמש הניהול? לא יוכל יותר להתחבר לדשבורד הניהול."
      )
    ) {
      return;
    }

    setRemovingId(profileId);
    setMessage(null);

    const result = await removeAdminUser({ profileId });

    setRemovingId(null);

    if (!result.success) {
      setMessage(result.error);
      return;
    }

    setMessage("משתמש הניהול הוסר.");
    router.refresh();
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            הוספת מנהל/ת
          </Button>
        </div>

        {message && (
          <p className="text-sm font-medium text-aqua-700" role="status">
            {message}
          </p>
        )}

        <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100">
          {admins.map((admin) => {
            const isSelf = admin.id === currentUserId;

            return (
              <li
                key={admin.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3.5"
              >
                <Avatar
                  name={admin.full_name}
                  className="h-10 w-10 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-900">
                      {admin.full_name}
                    </p>
                    {isSelf && <Badge tone="brand">את/ה</Badge>}
                    {admin.is_primary_admin && (
                      <Badge tone="info">מנהל/ת ראשי/ת</Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-ink-500" dir="ltr">
                    {admin.email ?? "ללא מייל"}
                  </p>
                  <p className="text-xs text-ink-400">
                    נוסף {formatDate(admin.created_at)}
                  </p>
                </div>

                {canRemoveAdmins &&
                  !isSelf &&
                  !admin.is_primary_admin &&
                  admins.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={removingId !== null}
                    onClick={() => handleRemove(admin.id)}
                  >
                    {removingId === admin.id ? "מסיר..." : "הסרה"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <Modal
        open={addOpen}
        onClose={closeAddModal}
        title="הוספת מנהל/ת"
        description="המנהל/ת החדש/ה יוכל/תכול להתחבר מיד לדשבורד הניהול."
        className="max-w-md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="שם מלא" htmlFor="adminFullName" required>
            <Input
              id="adminFullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="דנה כהן"
              required
              autoFocus
            />
          </Field>

          <Field label="אימייל התחברות" htmlFor="adminEmail" required>
            <Input
              id="adminEmail"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dana@al-hagova.co.il"
              required
            />
          </Field>

          <Field
            label="סיסמה"
            htmlFor="adminPassword"
            hint={`לפחות ${MIN_PASSWORD_LENGTH} תווים`}
            required
          >
            <Input
              id="adminPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </Field>

          {createError && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {createError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={closeAddModal}
              disabled={creating}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "יוצר משתמש..." : "הוספת מנהל/ת"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
