"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { CustomerDocuments } from "@/components/admin/CustomerDocuments";
import { CustomerRegistrations } from "@/components/admin/CustomerRegistrations";
import { CustomerForm } from "@/components/admin/CustomerForm";
import type {
  CustomerChild,
  CustomerWithChildren,
} from "@/components/admin/customerTypes";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { GENDER } from "@/lib/constants";
import { deleteCustomer } from "@/lib/admin/customerActions";
import { HealthDeclarationModal } from "@/components/health/HealthDeclarationModal";
import { declarationSchoolYear } from "@/lib/health-declaration";
import { formatSchoolGrade } from "@/lib/school-grade";
import { calcAge, formatDate } from "@/utils/format";

export type { CustomerChild, CustomerWithChildren };

interface CustomerListProps {
  customers: CustomerWithChildren[];
}

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function matchesCustomer(customer: CustomerWithChildren, query: string) {
  const q = normalizeSearch(query);
  if (!q) return true;
  return (
    normalizeSearch(customer.full_name).includes(q) ||
    normalizeSearch(customer.email ?? "").includes(q) ||
    normalizeSearch(customer.phone ?? "").includes(q)
  );
}

export function CustomerList({ customers }: CustomerListProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CustomerWithChildren | "new" | null>(
    null
  );
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => customers.find((customer) => customer.id === selectedId) ?? null,
    [customers, selectedId]
  );

  const filtered = useMemo(
    () => customers.filter((c) => matchesCustomer(c, query)),
    [customers, query]
  );

  async function handleDelete(customer: CustomerWithChildren) {
    const result = await deleteCustomer({ profileId: customer.id });
    if (result.success) {
      if (selectedId === customer.id) setSelectedId(null);
      router.refresh();
      return {};
    }
    return { error: result.error };
  }

  const formModal = (
    <Modal
      open={editing !== null}
      onClose={() => setEditing(null)}
      title={editing === "new" ? "הוספת לקוח" : "עריכת לקוח"}
      description={
        editing === "new"
          ? "הלקוח יוכל להתחבר מיד עם המייל והסיסמה, בלי אימות מייל."
          : "שינוי פרטי הלקוח, הילדים ופרטי ההתחברות."
      }
      className="max-w-2xl"
    >
      {editing !== null && (
        <CustomerForm
          existing={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Modal>
  );

  if (customers.length === 0) {
    return (
      <>
        <EmptyState
          title="אין לקוחות עדיין"
          description="הוסיפו לקוח עם מייל וסיסמה, והוא יוכל להתחבר מיד."
          action={
            <Button type="button" onClick={() => setEditing("new")}>
              + לקוח חדש
            </Button>
          }
        />
        {formModal}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <CustomerSearchBar
        query={query}
        onQueryChange={setQuery}
        resultCount={filtered.length}
        totalCount={customers.length}
        onNew={() => setEditing("new")}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="לא נמצאו לקוחות"
          description="נסו מונח חיפוש אחר או נקו את השדה"
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <THead>
              <TR>
                <TH>שם</TH>
                <TH>טלפון</TH>
                <TH className="hidden md:table-cell">אימייל</TH>
                <TH>ילדים</TH>
                <TH className="hidden sm:table-cell">הצטרף</TH>
                <TH className="w-14 sm:w-28">פעולות</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((customer) => {
              const kids = customer.children.length;
              return (
                <TR
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(customer.id)}
                >
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={customer.full_name} className="shrink-0" />
                      <span className="max-w-[9rem] truncate font-semibold text-ink-900 sm:max-w-none">
                        {customer.full_name}
                      </span>
                    </div>
                  </TD>
                  <TD dir="ltr" className="whitespace-nowrap text-right text-ink-600">
                    {customer.phone ?? "—"}
                  </TD>
                  <TD
                    dir="ltr"
                    className="hidden max-w-[14rem] truncate text-right text-ink-600 md:table-cell"
                  >
                    {customer.email ?? "—"}
                  </TD>
                  <TD>
                    {kids > 0 ? (
                      <Badge
                        tone="brand"
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(customer.id);
                        }}
                      >
                        {kids} {kids === 1 ? "ילד" : "ילדים"}
                      </Badge>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </TD>
                  <TD className="hidden whitespace-nowrap text-ink-500 sm:table-cell">
                    {formatDate(customer.created_at)}
                  </TD>
                  <TD onClick={(e) => e.stopPropagation()}>
                    <AdminRowActions
                      onView={() => setSelectedId(customer.id)}
                      onEdit={() => setEditing(customer)}
                      itemLabel={customer.full_name}
                      onDelete={() => handleDelete(customer)}
                    />
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>
      )}

      <Modal
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected?.full_name ?? "כרטיס לקוח"}
        description="פרטי קשר, ילדים, הרשמות ומסמכים שהופקו"
        className="max-w-2xl"
      >
        {selected && (
          <CustomerDetail
            customer={selected}
            onEdit={() => {
              setSelectedId(null);
              setEditing(selected);
            }}
            onDelete={async () => {
              const result = await handleDelete(selected);
              if (result.error) window.alert(result.error);
            }}
          />
        )}
      </Modal>

      {formModal}
    </div>
  );
}

function CustomerSearchBar({
  query,
  onQueryChange,
  resultCount,
  totalCount,
  onNew,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
  onNew: () => void;
}) {
  const isSearching = query.trim().length > 0;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink-100 bg-[var(--brand-gradient-soft)] px-5 py-4">
        <p className="text-sm font-medium text-ink-600">חיפוש לקוחות</p>
        <p className="mt-0.5 text-xs text-ink-400">
          לפי שם, טלפון או דוא״ל
        </p>
      </div>
      <div className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute inset-y-0 start-4 my-auto h-[18px] w-[18px] text-ink-400" />
          <Input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="הקלידו שם, טלפון או דוא״ל..."
            className="h-12 border-ink-100 bg-ink-50/50 ps-11 pe-11 shadow-soft focus:bg-white"
            aria-label="חיפוש לקוחות"
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="absolute inset-y-0 end-3 my-auto flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
              aria-label="ניקוי חיפוש"
            >
              <ClearIcon className="h-4 w-4" />
            </button>
          )}
          </div>
          <Button
            type="button"
            onClick={onNew}
            className="h-12 shrink-0 px-6 sm:w-auto"
          >
            + לקוח חדש
          </Button>
        </div>
        {isSearching && (
          <p className="mt-3 text-sm text-ink-500">
            {resultCount === totalCount ? (
              <>מוצגים כל {totalCount} הלקוחות</>
            ) : (
              <>
                נמצאו{" "}
                <span className="font-semibold text-brand-700">{resultCount}</span>{" "}
                לקוחות מתוך {totalCount}
              </>
            )}
          </p>
        )}
      </div>
    </Card>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function CustomerDetail({
  customer,
  onEdit,
  onDelete,
}: {
  customer: CustomerWithChildren;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={customer.full_name} className="h-12 w-12 shrink-0" />
          <p className="text-sm text-ink-500">הצטרף {formatDate(customer.created_at)}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            עריכה
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => {
              if (
                window.confirm(
                  `למחוק את ${customer.full_name}? החשבון, הילדים וההרשמות יימחקו ולא ניתן לשחזר.`
                )
              ) {
                void onDelete();
              }
            }}
          >
            מחיקה
          </Button>
        </div>
      </div>

      <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">פרטי קשר</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <DetailRow label="טלפון" dir="ltr">
                {customer.phone ?? "—"}
              </DetailRow>
              <DetailRow label="דוא״ל" dir="ltr">
                {customer.email ?? "—"}
              </DetailRow>
              <DetailRow label="תאריך לידה">
                {customer.birth_date ? formatDate(customer.birth_date) : "—"}
              </DetailRow>
              <DetailRow label="מגדר">
                {customer.gender ? GENDER[customer.gender] : "—"}
              </DetailRow>
              <DetailRow label="עיר">{customer.city ?? "—"}</DetailRow>
              <DetailRow label="כתובת">{customer.address ?? "—"}</DetailRow>
              {customer.receipt_name && (
                <DetailRow label="שם לקבלה">{customer.receipt_name}</DetailRow>
              )}
              <DetailRow label="תאריך הצטרפות">
                {formatDate(customer.created_at)}
              </DetailRow>
            </CardContent>
          </Card>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-ink-900">
                ילדים
              </h3>
              <div className="flex items-center gap-2">
                {customer.children.length > 0 && (
                  <Badge tone="brand">{customer.children.length}</Badge>
                )}
                <button
                  type="button"
                  onClick={onEdit}
                  className="text-sm font-semibold text-brand-600 hover:underline"
                >
                  עריכה
                </button>
              </div>
            </div>

            {customer.children.length > 0 ? (
              <div className="flex flex-col gap-3">
                {customer.children.map((child) => (
                  <ChildCard key={child.id} child={child} />
                ))}
              </div>
            ) : (
              <Card className="bg-ink-50/60">
                <CardContent className="py-8 text-center text-sm text-ink-500">
                  <p>אין ילדים רשומים ללקוח זה</p>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="mt-2 font-semibold text-brand-600 hover:underline"
                  >
                    הוספת ילד/ה
                  </button>
                </CardContent>
              </Card>
            )}
          </div>

          <CustomerRegistrations
            parentId={customer.id}
            parentName={customer.full_name}
          />

          <CustomerDocuments parentId={customer.id} />
    </div>
  );
}

function DetailRow({
  label,
  children,
  dir,
}: {
  label: string;
  children: React.ReactNode;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-100 pb-3 last:border-0 last:pb-0">
      <span className="shrink-0 text-sm text-ink-500">{label}</span>
      <span
        dir={dir}
        className="min-w-0 break-words text-end text-sm font-medium text-ink-900"
      >
        {children}
      </span>
    </div>
  );
}

function ChildCard({ child }: { child: CustomerChild }) {
  const [healthOpen, setHealthOpen] = useState(false);
  const age = calcAge(child.birth_date);
  const grade = formatSchoolGrade(child.school_grade, child.grade_school_year);

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-start gap-3 p-4">
        <Avatar name={child.full_name} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-900">{child.full_name}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {grade && <Badge tone="brand">{grade}</Badge>}
            {age !== null && (
              <Badge tone="neutral">גיל {age}</Badge>
            )}
            {child.gender && (
              <Badge tone="info">{GENDER[child.gender]}</Badge>
            )}
            {child.birth_date && (
              <Badge tone="neutral">{formatDate(child.birth_date)}</Badge>
            )}
            <Badge tone={child.healthDeclaration ? "success" : "warning"}>
              {child.healthDeclaration ? "הצהרת בריאות" : "חסרה הצהרה"}
            </Badge>
          </div>
          {child.healthDeclaration && (
            <button
              type="button"
              onClick={() => setHealthOpen(true)}
              className="mt-2 text-sm font-semibold text-brand-600 hover:underline"
            >
              צפייה בהצהרת הבריאות
            </button>
          )}
          {child.notes && (
            <p className="mt-2 text-sm text-ink-500">{child.notes}</p>
          )}
        </div>
      </CardContent>
      {child.healthDeclaration && (
        <HealthDeclarationModal
          open={healthOpen}
          onClose={() => setHealthOpen(false)}
          childName={child.healthDeclaration.child_name || child.full_name}
          today={child.healthDeclaration.signed_at}
          schoolYear={declarationSchoolYear()}
          initial={{
            idNumber: child.healthDeclaration.id_number,
            accepted: child.healthDeclaration.accepted,
            signedAt: child.healthDeclaration.signed_at,
          }}
          readOnly
        />
      )}
    </Card>
  );
}
