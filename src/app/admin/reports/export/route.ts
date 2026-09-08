import { getSessionProfile } from "@/lib/auth";
import { financeReportWorkbook } from "@/lib/finance/exportReport";
import { parseFinanceState, type FinanceSearchParams } from "@/lib/finance/period";
import { loadFinanceDashboard } from "@/lib/finance/report";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function GET(request: Request) {
  const profile = await getSessionProfile();
  if (profile?.role !== "admin") {
    return new Response("אין הרשאה", { status: 401 });
  }

  const url = new URL(request.url);
  const params: FinanceSearchParams = {
    view: first(url.searchParams.get("view") ?? undefined),
    month: first(url.searchParams.get("month") ?? undefined),
    year: first(url.searchParams.get("year") ?? undefined),
    from: first(url.searchParams.get("from") ?? undefined),
    to: first(url.searchParams.get("to") ?? undefined),
    compare: first(url.searchParams.get("compare") ?? undefined),
    cMonth: first(url.searchParams.get("cMonth") ?? undefined),
    cYear: first(url.searchParams.get("cYear") ?? undefined),
    cFrom: first(url.searchParams.get("cFrom") ?? undefined),
    cTo: first(url.searchParams.get("cTo") ?? undefined),
  };

  const state = parseFinanceState(params);
  const dashboard = await loadFinanceDashboard({
    period: state.period,
    compare: state.compare,
  });
  const report = financeReportWorkbook(dashboard);

  return new Response(report.bytes as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${report.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
