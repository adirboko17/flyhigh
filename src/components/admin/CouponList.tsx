"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { AdminSection } from "@/components/admin/AdminSection";
import { deleteAdminRow } from "@/components/admin/adminDelete";
import {
  CouponForm,
  type CouponFormData,
  type CouponOptions,
} from "@/components/admin/CouponForm";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import {
  COUPON_STATE,
  couponState,
  describeCouponDiscount,
  describeCouponUsage,
  describeCouponWindow,
} from "@/lib/finance/coupon";
import { createClient } from "@/lib/supabase/client";

export type AdminCouponRow = CouponFormData;

interface CouponListProps {
  coupons: AdminCouponRow[];
  options: CouponOptions;
  /** "YYYY-MM-DD" לפי שעון ישראל, מחושב בשרת כדי שהסטטוס יהיה זהה בשני הצדדים. */
  today: string;
}

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function subjectOf(coupon: AdminCouponRow, labelOf: Map<string, string>) {
  if (coupon.class_id) {
    return {
      label: labelOf.get(`class:${coupon.class_id}`) ?? "חוג שנמחק",
      redeemable: true,
    };
  }
  if (coupon.program_id) {
    return {
      label: labelOf.get(`program:${coupon.program_id}`) ?? "מסלול שנמחק",
      redeemable: true,
    };
  }
  if (coupon.pool_pass_id) {
    return {
      label: labelOf.get(`pool_pass:${coupon.pool_pass_id}`) ?? "כרטיסייה שנמחקה",
      redeemable: true,
    };
  }
  if (coupon.private_lesson_id) {
    return {
      label:
        labelOf.get(`private_lesson:${coupon.private_lesson_id}`) ??
        "שיעור פרטי שנמחק",
      redeemable: true,
    };
  }
  return { label: "כל מה שבתשלום", redeemable: true };
}

export function CouponList({ coupons, options, today }: CouponListProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminCouponRow | "new" | null>(null);
  const [query, setQuery] = useState("");

  const labelOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const parent of options.parents) map.set(`parent:${parent.id}`, parent.label);
    for (const item of options.classes) map.set(`class:${item.id}`, item.label);
    for (const item of options.programs) map.set(`program:${item.id}`, item.label);
    for (const item of options.poolPasses) {
      map.set(`pool_pass:${item.id}`, item.label);
    }
    for (const item of options.privateLessons) {
      map.set(`private_lesson:${item.id}`, item.label);
    }
    return map;
  }, [options]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return coupons;

    return coupons.filter((coupon) =>
      [
        coupon.code,
        coupon.description ?? "",
        coupon.parent_id ? labelOf.get(`parent:${coupon.parent_id}`) ?? "" : "",
        subjectOf(coupon, labelOf).label,
      ].some((value) => normalizeSearch(value).includes(q))
    );
  }, [coupons, query, labelOf]);

  return (
    <>
      <AdminSection
        id="coupons"
        icon="🎟️"
        title="קודי קופון"
        count={filtered.length}
        totalCount={coupons.length}
        onNew={() => setEditing("new")}
        newLabel="+ קופון חדש"
      >
        {coupons.length > 0 && (
          <div className="border-b border-ink-100 px-5 py-3">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי קוד, לקוח או פריט..."
              className="h-10 border-ink-100 bg-ink-50/50 focus:bg-white"
              aria-label="חיפוש קודי קופון"
            />
          </div>
        )}

        {coupons.length === 0 ? (
          <SectionMessage>
            עדיין אין קודי קופון — צרו את הראשון ולקוחות יוכלו להזין אותו בעמוד
            התשלום.
          </SectionMessage>
        ) : filtered.length === 0 ? (
          <SectionMessage>לא נמצאו קופונים התואמים לחיפוש.</SectionMessage>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>קוד</TH>
                <TH>הנחה</TH>
                <TH className="hidden md:table-cell">חל על</TH>
                <TH className="hidden lg:table-cell">לקוח</TH>
                <TH className="hidden lg:table-cell">תוקף</TH>
                <TH className="hidden sm:table-cell">שימושים</TH>
                <TH>סטטוס</TH>
                <TH className="w-14 sm:w-28">פעולות</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((coupon) => {
                const state = couponState(coupon, today);
                const subject = subjectOf(coupon, labelOf);

                return (
                  <TR key={coupon.id}>
                    <TD>
                      <span
                        dir="ltr"
                        className="block font-mono font-bold tracking-wider text-ink-900"
                      >
                        {coupon.code}
                      </span>
                      {coupon.description && (
                        <span className="block text-xs font-normal text-ink-400">
                          {coupon.description}
                        </span>
                      )}
                    </TD>
                    <TD className="font-medium">
                      {describeCouponDiscount(
                        coupon.discount_type,
                        coupon.discount_value
                      )}
                    </TD>
                    <TD className="hidden max-w-[12rem] md:table-cell">
                      {subject.label}
                      {!subject.redeemable && (
                        <span className="block text-xs font-normal text-amber-600">
                          אין עדיין מסך תשלום לפריט הזה
                        </span>
                      )}
                    </TD>
                    <TD className="hidden max-w-[10rem] truncate lg:table-cell">
                      {coupon.parent_id
                        ? labelOf.get(`parent:${coupon.parent_id}`) ?? "לקוח שנמחק"
                        : "כל הלקוחות"}
                    </TD>
                    <TD className="hidden text-sm text-ink-600 lg:table-cell">
                      {describeCouponWindow(coupon.starts_on, coupon.ends_on)}
                    </TD>
                    <TD className="hidden whitespace-nowrap text-sm text-ink-600 sm:table-cell">
                      {describeCouponUsage(coupon.used_count, coupon.max_uses)}
                    </TD>
                    <TD>
                      <Badge tone={COUPON_STATE[state].tone}>
                        {COUPON_STATE[state].label}
                      </Badge>
                    </TD>
                    <TD>
                      <AdminRowActions
                        onEdit={() => setEditing(coupon)}
                        itemLabel={`הקופון ${coupon.code}`}
                        onDelete={async () => {
                          const result = await deleteAdminRow(
                            createClient(),
                            "coupons",
                            coupon.id
                          );
                          if (!result.error) router.refresh();
                          return result;
                        }}
                      />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </AdminSection>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "קופון חדש" : "עריכת קופון"}
        description={
          editing === "new"
            ? "הקופון ייווצר כפעיל ויהיה זמין למימוש מיד."
            : undefined
        }
      >
        {editing !== null && (
          <CouponForm
            existing={editing === "new" ? undefined : editing}
            options={options}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </>
  );
}

function SectionMessage({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-10 text-center text-sm text-ink-400">{children}</p>;
}
