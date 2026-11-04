export type InvoiceChargeShare = {
  id: string;
  remaining: number;
};

export type InvoiceAllocation = {
  invoiceIndex: number;
  paymentId: string;
  amount: number;
};

function toAgorot(value: number) {
  return Math.round(value * 100);
}

function fromAgorot(value: number) {
  return value / 100;
}

/**
 * מחלק סכומי חשבוניות על חיובים פתוחים לפי הסדר.
 * חשבונית יכולה לכסות את סוף חיוב אחד ואת תחילת החיוב הבא.
 */
export function allocateInvoices(
  charges: InvoiceChargeShare[],
  amounts: number[]
): { ok: true; slices: InvoiceAllocation[] } | { ok: false; error: string } {
  if (charges.length === 0) {
    return { ok: false, error: "לא נבחרו חיובים." };
  }
  if (amounts.length === 0) {
    return { ok: false, error: "יש להוסיף לפחות חשבונית אחת." };
  }

  const left = charges.map((charge) => toAgorot(charge.remaining));
  if (left.some((value) => value <= 0)) {
    return { ok: false, error: "אפשר לכסות רק חיוב עם יתרה פתוחה." };
  }

  const invoiceAgorot = amounts.map(toAgorot);
  if (invoiceAgorot.some((value) => value <= 0)) {
    return { ok: false, error: "כל חשבונית חייבת להיות בסכום חיובי." };
  }

  const available = left.reduce((sum, value) => sum + value, 0);
  const requested = invoiceAgorot.reduce((sum, value) => sum + value, 0);
  if (requested > available) {
    return {
      ok: false,
      error: `סכום החשבוניות גדול מהיתרה שנבחרה (${fromAgorot(available).toFixed(2)} ₪).`,
    };
  }

  const slices: InvoiceAllocation[] = [];
  let cursor = 0;

  invoiceAgorot.forEach((need, invoiceIndex) => {
    let remaining = need;
    while (remaining > 0) {
      while (cursor < left.length && left[cursor] <= 0) cursor += 1;
      if (cursor >= left.length) return;
      const take = Math.min(left[cursor], remaining);
      slices.push({
        invoiceIndex,
        paymentId: charges[cursor].id,
        amount: fromAgorot(take),
      });
      left[cursor] -= take;
      remaining -= take;
    }
  });

  return { ok: true, slices };
}
