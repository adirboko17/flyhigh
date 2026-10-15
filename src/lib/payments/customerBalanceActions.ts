"use server";

import { getSessionProfile } from "@/lib/auth";
import { getCustomerBalance } from "@/lib/payments/checkoutBalance";

export async function loadMyCustomerBalance(): Promise<number> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "parent") return 0;
  return getCustomerBalance(profile.id);
}
