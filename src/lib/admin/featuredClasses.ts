import { createAdminDataClient } from "@/lib/admin/dataClient";
import {
  HOME_FEATURED_SETTING_KEY,
  parseFeaturedClassIds,
} from "@/lib/home/featuredClasses";

export async function getHomeFeaturedClassIds(): Promise<string[]> {
  const supabase = await createAdminDataClient();
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", HOME_FEATURED_SETTING_KEY)
    .maybeSingle();

  return parseFeaturedClassIds(data?.value);
}
