import { formatHours } from "@/lib/finance/payroll";
import { exportFilename, periodDelta } from "@/lib/finance/period";
import type { FinanceDashboard, FinanceSnapshot } from "@/lib/finance/report";
import { buildXlsx, type ExcelSheet } from "@/lib/finance/xlsx";
import { formatDateShort } from "@/utils/format";

function summaryRows(snapshot: FinanceSnapshot, openTotal: number, occupancy: number) {
  return [
    ["דוח כספים", snapshot.period.label],
    ["תקופה", `${snapshot.period.start} – ${snapshot.period.end}`],
    [],
    ["מדד", "סכום"],
    ["הכנסות", snapshot.revenue],
    ["תשלומים שנגבו", snapshot.paymentsRevenue],
    ["הכנסות מתנ״ס", snapshot.matnasAmount],
    ["שכר מדריכות", snapshot.payroll],
    ["רווח נטו", snapshot.netProfit],
    ["ממתין לגבייה (נוכחי)", openTotal],
    ["מספר תשלומים שנגבו", snapshot.paidCount],
    ["הרשמות חדשות", snapshot.newEnrollments],
    ["תפוסת חוגים (%)", occupancy],
  ];
}

function breakdownBlock(title: string, rows: { label: string; value: number; extra?: string }[]) {
  return [
    [title],
    ["פריט", "סכום", "פירוט"],
    ...rows.map((row) => [row.label, row.value, row.extra ?? ""]),
    [],
  ];
}

function compareRows(current: FinanceSnapshot, previous: FinanceSnapshot) {
  const metrics: Array<[string, number, number]> = [
    ["הכנסות", current.revenue, previous.revenue],
    ["תשלומים שנגבו", current.paymentsRevenue, previous.paymentsRevenue],
    ["מתנ״ס", current.matnasAmount, previous.matnasAmount],
    ["שכר מדריכות", current.payroll, previous.payroll],
    ["רווח נטו", current.netProfit, previous.netProfit],
    ["הרשמות חדשות", current.newEnrollments, previous.newEnrollments],
  ];
  return [
    ["השוואת תקופות", current.period.label, previous.period.label, "הפרש", "שינוי"],
    ...metrics.map(([label, currentValue, previousValue]) => {
      const delta = periodDelta(currentValue, previousValue);
      return [
        label,
        currentValue,
        previousValue,
        delta.amount,
        delta.percent == null ? delta.label : `${delta.percent}%`,
      ];
    }),
  ];
}

export function financeReportWorkbook(
  dashboard: FinanceDashboard,
  options?: { openTotal: number; occupancy: number }
): { bytes: Uint8Array; filename: string } {
  const { snapshot, compareSnapshot } = dashboard;
  const openTotal = options?.openTotal ?? dashboard.openTotal;
  const occupancy = options?.occupancy ?? dashboard.occupancy;

  const sheets: ExcelSheet[] = [
    {
      name: "סיכום",
      currencyCols: [1],
      rows: summaryRows(snapshot, openTotal, occupancy),
    },
    {
      name: "עסקאות",
      currencyCols: [2],
      rows: [
        ["הורה", "עבור", "סכום", "אמצעי תשלום", "סטטוס", "תאריך"],
        ...snapshot.transactions.map((row) => [
          row.parentName,
          row.subject,
          row.amount,
          row.methodLabel,
          row.badgeLabel,
          formatDateShort(row.date),
        ]),
      ],
    },
    {
      name: "שכר מדריכות",
      currencyCols: [3, 4],
      rows: [
        ["מדריכה", "מפגשים", "שעות", "תעריף / שכר חודשי", "לתשלום"],
        ...snapshot.payrollLines.map((line) => [
          line.name,
          line.sessions,
          formatHours(line.hours),
          line.payType === "monthly" ? line.monthlySalary : line.hourlyRate,
          line.amount,
        ]),
        [],
        ["סה״כ", "", "", "", snapshot.payroll],
      ],
    },
    {
      name: "פילוחים",
      currencyCols: [1],
      rows: [
        ...breakdownBlock("אמצעי תשלום", snapshot.methodTotals),
        ...breakdownBlock("סוג הכנסה", snapshot.kindTotals),
        ...breakdownBlock("קטגוריית חוג", snapshot.categoryTotals),
        ...breakdownBlock("פריט", snapshot.subjectTotals),
        ...breakdownBlock("לקוחות", snapshot.customerTotals),
      ],
    },
  ];

  if (compareSnapshot) {
    sheets.push({
      name: "השוואה",
      currencyCols: [1, 2, 3],
      rows: compareRows(snapshot, compareSnapshot),
    });
  }

  return {
    bytes: buildXlsx(sheets),
    filename: `${exportFilename(snapshot.period)}.xlsx`,
  };
}

