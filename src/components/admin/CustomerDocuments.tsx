"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import {
  loadCustomerDocuments,
  type CustomerIssuedDocument,
} from "@/lib/admin/customerDocuments";
import { formatCurrency, formatDate } from "@/utils/format";

export function CustomerDocuments({ parentId }: { parentId: string }) {
  const [documents, setDocuments] = useState<CustomerIssuedDocument[] | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    setDocuments(null);
    loadCustomerDocuments(parentId).then((rows) => {
      if (!cancelled) setDocuments(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-ink-900">מסמכים</h3>
        {documents && documents.length > 0 && (
          <Badge tone="neutral">{documents.length}</Badge>
        )}
      </div>
      <p className="mb-3 text-sm text-ink-500">
        חשבוניות מס קבלה, זיכויים וכל מסמך שהופק ללקוח
      </p>

      {documents === null ? (
        <Card className="bg-ink-50/60">
          <CardContent className="py-8 text-center text-sm text-ink-400">
            טוען מסמכים...
          </CardContent>
        </Card>
      ) : documents.length === 0 ? (
        <Card className="bg-ink-50/60">
          <CardContent className="py-8 text-center text-sm text-ink-500">
            עדיין לא הופקו מסמכים ללקוח זה
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-ink-100">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-900">{doc.title}</p>
                    <Badge tone={doc.kind === "refund" ? "neutral" : "success"}>
                      {doc.kind === "refund" ? "זיכוי" : "קבלה"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-ink-500">
                    {doc.number ? `מס׳ ${doc.number}` : "ללא מספר"}
                    {" · "}
                    {formatDate(doc.createdAt)}
                    {doc.product ? ` · ${doc.product}` : ""}
                  </p>
                  {doc.sentToEmail && (
                    <p className="mt-0.5 truncate text-xs text-ink-400">
                      נשלח ל־{doc.sentToEmail}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {doc.amount != null && (
                    <span className="text-sm font-semibold tabular-nums text-ink-900">
                      {formatCurrency(doc.amount)}
                    </span>
                  )}
                  {doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-8 items-center rounded-full bg-brand-50 px-3 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                    >
                      צפייה
                    </a>
                  ) : (
                    <span className="text-xs text-ink-400">אין קובץ</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
