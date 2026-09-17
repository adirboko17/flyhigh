import type {
  CollectionCharge,
  CollectionParent,
} from "@/components/admin/CollectionsList";
import {
  COLLECTION_PAYMENT_METHODS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  isCollectionPaymentMethod,
  type CollectionPaymentMethod,
} from "@/lib/constants";
import { SUBJECT_KIND_LABEL } from "@/lib/finance/subject";
import { composeReceiptLine } from "@/lib/receipt-labels";
import { todayInIsrael } from "@/lib/scheduling/monthGrid";
import { buildXlsx, type ExcelCell, type ExcelSheet } from "@/lib/finance/xlsx";
import { formatDateShort } from "@/utils/format";

export type CollectionExportScope = "open" | "paid" | "all";

export type CollectionExportOptions = {
  scope: CollectionExportScope;
  methods: CollectionPaymentMethod[];
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function chargeStatusLabel(charge: CollectionCharge) {
  if (charge.remaining <= 0) return PAYMENT_STATUS.paid.label;
  if (charge.amountPaid > 0) return PAYMENT_STATUS.partial.label;
  return PAYMENT_STATUS.pending.label;
}

function subjectTypeLabel(charge: CollectionCharge) {
  return charge.subjectType ? SUBJECT_KIND_LABEL[charge.subjectType] : "חיוב כללי";
}

function receiptLine(charge: CollectionCharge) {
  return composeReceiptLine({
    base: charge.receiptDescription ?? charge.receiptLabel,
    customText: charge.receiptCustomText,
    fallback: charge.subject,
  });
}

function methodLabels(methods: CollectionPaymentMethod[]) {
  return methods.map((method) => PAYMENT_METHOD[method]);
}

function uniqueMethods(charges: CollectionCharge[]) {
  const seen = new Set<CollectionPaymentMethod>();
  const list: CollectionPaymentMethod[] = [];
  for (const charge of charges) {
    if (seen.has(charge.method)) continue;
    seen.add(charge.method);
    list.push(charge.method);
  }
  return list;
}

export function filterParentsForExport(
  parents: CollectionParent[],
  options: CollectionExportOptions
): CollectionParent[] {
  return parents
    .map((parent) => {
      const charges = parent.charges.filter((charge) => {
        if (options.methods.length > 0 && !options.methods.includes(charge.method)) {
          return false;
        }
        if (options.scope === "open") return charge.remaining > 0;
        if (options.scope === "paid") return charge.remaining <= 0;
        return true;
      });
      const openAmount = round2(
        charges.reduce((sum, charge) => sum + charge.remaining, 0)
      );
      const paidAmount = round2(
        charges.reduce((sum, charge) => sum + charge.amountPaid, 0)
      );
      return { ...parent, charges, openAmount, paidAmount };
    })
    .filter((parent) => parent.charges.length > 0)
    .sort(
      (a, b) =>
        b.openAmount - a.openAmount || a.name.localeCompare(b.name, "he")
    );
}

function methodBreakdown(parents: CollectionParent[]) {
  const map = new Map<
    CollectionPaymentMethod,
    { count: number; remaining: number; paid: number; amount: number }
  >();
  for (const parent of parents) {
    for (const charge of parent.charges) {
      const row = map.get(charge.method) ?? {
        count: 0,
        remaining: 0,
        paid: 0,
        amount: 0,
      };
      row.count += 1;
      row.remaining += charge.remaining;
      row.paid += charge.amountPaid;
      row.amount += charge.amount;
      map.set(charge.method, row);
    }
  }
  return COLLECTION_PAYMENT_METHODS.flatMap((method) => {
    const row = map.get(method);
    if (!row) return [];
    return [
      {
        method,
        label: PAYMENT_METHOD[method],
        count: row.count,
        remaining: round2(row.remaining),
        paid: round2(row.paid),
        amount: round2(row.amount),
      },
    ];
  });
}

function chargeRows(parents: CollectionParent[]): ExcelCell[][] {
  const header: ExcelCell[] = [
    "שם לקוח",
    "טלפון",
    "ת.ז.",
    "משתתף",
    "עבור",
    "סוג",
    "אמצעי תשלום",
    "סטטוס",
    "סכום",
    "שולם",
    "יתרה",
    "תאריך פתיחה",
    "פירוט לקבלה",
    "הערת מנהל",
  ];
  const rows: ExcelCell[][] = [header];
  let amount = 0;
  let paid = 0;
  let remaining = 0;

  for (const parent of parents) {
    for (const charge of parent.charges) {
      amount += charge.amount;
      paid += charge.amountPaid;
      remaining += charge.remaining;
      rows.push([
        parent.name,
        parent.phone ?? "",
        parent.receiptIdNumber ?? "",
        charge.childName ?? parent.name,
        charge.subject,
        subjectTypeLabel(charge),
        PAYMENT_METHOD[charge.method],
        chargeStatusLabel(charge),
        charge.amount,
        charge.amountPaid,
        charge.remaining,
        formatDateShort(charge.createdAt),
        receiptLine(charge),
        parent.adminNote ?? "",
      ]);
    }
  }

  if (rows.length > 1) {
    rows.push([]);
    rows.push([
      "סה״כ",
      "",
      "",
      "",
      "",
      "",
      "",
      `${rows.length - 2} חיובים`,
      round2(amount),
      round2(paid),
      round2(remaining),
      "",
      "",
      "",
    ]);
  }

  return rows;
}

function scopeTitle(options: CollectionExportOptions) {
  const methods =
    options.methods.length > 0 ? methodLabels(options.methods).join(" + ") : null;
  if (options.scope === "open" && !methods) return "כל החייבים";
  if (options.scope === "open" && methods) return `חובות פתוחים · ${methods}`;
  if (options.scope === "paid" && methods) return `שולמו · ${methods}`;
  if (options.scope === "paid") return "חיובים ששולמו";
  if (methods) return `כל החיובים · ${methods}`;
  return "דוח גבייה";
}

export function collectionExportFilename(options: CollectionExportOptions) {
  const date = todayInIsrael();
  const methods = options.methods.length ? options.methods.join("-") : "all";
  const ascii = `gviya-${options.scope}-${methods}-${date}.xlsx`;
  const hebrew = `${scopeTitle(options)} ${date}.xlsx`.replace(/[\\/?*[\]]/g, " ");
  return { ascii, hebrew };
}

export function collectionsExportWorkbook(
  parents: CollectionParent[],
  options: CollectionExportOptions
): { bytes: Uint8Array; filename: string; hebrewFilename: string } {
  const generatedAt = new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Jerusalem",
  }).format(new Date());
  const title = scopeTitle(options);
  const charges = parents.flatMap((parent) => parent.charges);
  const remaining = round2(
    charges.reduce((sum, charge) => sum + charge.remaining, 0)
  );
  const paid = round2(charges.reduce((sum, charge) => sum + charge.amountPaid, 0));
  const amount = round2(charges.reduce((sum, charge) => sum + charge.amount, 0));
  const breakdown = methodBreakdown(parents);

  const sheets: ExcelSheet[] = [
    {
      name: "סיכום",
      currencyCols: [2, 3, 4],
      rows: [
        ["דוח גבייה", title],
        ["הופק בתאריך", generatedAt],
        [],
        ["מדד", "כמות", "סכום"],
        ["לקוחות", parents.length, null],
        ["חיובים", charges.length, null],
        ["סך החיובים", null, amount],
        ["נגבה", null, paid],
        ["יתרה לגבייה", null, remaining],
        [],
        ["פילוח לפי אמצעי תשלום"],
        ["אמצעי תשלום", "חיובים", "סכום", "נגבה", "יתרה"],
        ...breakdown.map((row) => [
          row.label,
          row.count,
          row.amount,
          row.paid,
          row.remaining,
        ]),
      ],
    },
    {
      name: "לקוחות",
      currencyCols: [6, 7, 8],
      rows: [
        [
          "שם לקוח",
          "טלפון",
          "אימייל",
          "ת.ז.",
          "אמצעי תשלום",
          "מספר חיובים",
          "סכום חיובים",
          "שולם",
          "יתרה",
          "הערת מנהל",
        ],
        ...parents.map((parent) => [
          parent.name,
          parent.phone ?? "",
          parent.email ?? "",
          parent.receiptIdNumber ?? "",
          uniqueMethods(parent.charges)
            .map((method) => PAYMENT_METHOD[method])
            .join(", "),
          parent.charges.length,
          round2(parent.charges.reduce((sum, charge) => sum + charge.amount, 0)),
          parent.paidAmount,
          parent.openAmount,
          parent.adminNote ?? "",
        ]),
        [],
        [
          "סה״כ",
          "",
          "",
          "",
          "",
          charges.length,
          amount,
          paid,
          remaining,
          "",
        ],
      ],
    },
    {
      name: "פירוט חיובים",
      currencyCols: [8, 9, 10],
      rows: chargeRows(parents),
    },
  ];

  const methodsInReport =
    options.methods.length > 0
      ? options.methods
      : breakdown.map((row) => row.method);

  if (methodsInReport.length > 1) {
    for (const method of methodsInReport) {
      const subset = filterParentsForExport(parents, {
        scope: "all",
        methods: [method],
      });
      if (subset.length === 0) continue;
      sheets.push({
        name: PAYMENT_METHOD[method],
        currencyCols: [8, 9, 10],
        rows: chargeRows(subset),
      });
    }
  }

  const names = collectionExportFilename(options);
  return {
    bytes: buildXlsx(sheets),
    filename: names.ascii,
    hebrewFilename: names.hebrew,
  };
}

export function parseCollectionExportSearch(url: URL): CollectionExportOptions {
  const scopeRaw = url.searchParams.get("scope");
  const scope: CollectionExportScope =
    scopeRaw === "paid" || scopeRaw === "all" ? scopeRaw : "open";
  const methods = (url.searchParams.get("methods") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(isCollectionPaymentMethod);
  return { scope, methods };
}
