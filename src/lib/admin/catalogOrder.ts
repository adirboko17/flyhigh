import { createAdminDataClient } from "@/lib/admin/dataClient";
import {
  CATALOG_ORDER_SETTING_KEY,
  parseCatalogClassIds,
} from "@/lib/classes/catalogOrder";

export async function getCatalogClassOrderIds(): Promise<string[]> {
  const supabase = await createAdminDataClient();
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", CATALOG_ORDER_SETTING_KEY)
    .maybeSingle();

  return parseCatalogClassIds(data?.value);
}
