"use server";

import { revalidatePath, revalidateTag } from "next/cache";

/** מנקה את המטמון של עמודי הבית / חוגים / מסלולים אחרי שינוי באדמין. */
export async function revalidatePublicCatalog() {
  revalidateTag("public-plans");
  revalidateTag("public-classes");
  revalidateTag("public-class-sessions");
  revalidatePath("/", "layout");
  revalidatePath("/programs");
  revalidatePath("/classes", "layout");
}
