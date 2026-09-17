import { getSessionProfile } from "@/lib/auth";
import {
  collectionsExportWorkbook,
  filterParentsForExport,
  parseCollectionExportSearch,
} from "@/lib/collections/exportReport";
import { loadCollectionParents } from "@/lib/collections/loadParents";

export async function GET(request: Request) {
  const profile = await getSessionProfile();
  if (profile?.role !== "admin") {
    return new Response("אין הרשאה", { status: 401 });
  }

  const options = parseCollectionExportSearch(new URL(request.url));
  const parents = filterParentsForExport(
    await loadCollectionParents(),
    options
  );
  const report = collectionsExportWorkbook(parents, options);

  return new Response(report.bytes as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${report.filename}"; filename*=UTF-8''${encodeURIComponent(report.hebrewFilename)}`,
      "Cache-Control": "no-store",
    },
  });
}
