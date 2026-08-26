/**
 * לקוח Cardcom Low Profile — יצירת דף תשלום ואימות תוצאה מול השרת שלהם.
 * הפרטים הרגישים נשארים בצד השרת בלבד.
 */

export type CardcomCustomer = {
  /** שם בעל הכרטיס בדף הסליקה. */
  name: string;
  /** שם הלקוח על החשבונית — אם הוגדר שם קבלה אחר. */
  invoiceName: string;
  email?: string | null;
  phone?: string | null;
  /** ח.פ / ת.ז שיופיע על החשבונית בלבד. */
  taxId?: string | null;
  address?: string | null;
  city?: string | null;
};

export type CardcomLpResult = {
  ResponseCode?: number;
  Description?: string;
  LowProfileId?: string;
  ReturnValue?: string;
  TransactionId?: number | string;
  /** איות של קארדקום ב־API v11 */
  TranzactionId?: number | string;
  Amount?: number;
  DocumentInfo?: {
    ResponseCode?: number;
    DocumentNumber?: number | string;
    DocumentUrl?: string | null;
  };
  TransactionInfo?: {
    ResponseCode?: number;
    TransactionId?: number | string;
    TranzactionId?: number | string;
    Amount?: number;
    ApprovalNumber?: string;
  };
  TranzactionInfo?: {
    ResponseCode?: number;
    TransactionId?: number | string;
    TranzactionId?: number | string;
    Amount?: number;
    ApprovalNumber?: string;
  };
  [key: string]: unknown;
};

type CardcomConfig = {
  terminalNumber: number;
  apiName: string;
  apiPassword: string;
  appUrl: string;
};

const API_BASE = "https://secure.cardcom.solutions/api/v11";

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getCardcomAppUrl() {
  return (
    env("CARDCOM_APP_URL") ||
    env("NEXT_PUBLIC_SITE_URL") ||
    "https://www.al-ha-gova.co.il"
  ).replace(/\/$/, "");
}

export function getCardcomConfig(): CardcomConfig {
  const terminalNumber = Number(env("CARDCOM_TERMINAL_NUMBER"));
  const apiName = env("CARDCOM_API_NAME");
  const apiPassword = env("CARDCOM_API_PASSWORD");

  if (!Number.isFinite(terminalNumber) || terminalNumber <= 0 || !apiName) {
    throw new Error("Cardcom is not configured");
  }

  return {
    terminalNumber,
    apiName,
    apiPassword,
    appUrl: getCardcomAppUrl(),
  };
}

export function isCardcomConfigured() {
  try {
    getCardcomConfig();
    return true;
  } catch {
    return false;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function documentPayload(input: {
  amount: number;
  description: string;
  customer: CardcomCustomer;
}) {
  const email = input.customer.email?.trim() || null;
  return {
    TypeToCreate: "TaxInvoiceAndReceipt",
    Name: input.customer.invoiceName,
    TaxId: input.customer.taxId?.trim() || undefined,
    Email: email || undefined,
    IsSendByEmail: Boolean(email),
    AddressLine1: input.customer.address?.trim() || undefined,
    City: input.customer.city?.trim() || undefined,
    Phone: input.customer.phone?.trim() || undefined,
    Mobile: input.customer.phone?.trim() || undefined,
    Products: [
      {
        Description: input.description.slice(0, 200),
        Quantity: 1,
        UnitCost: input.amount,
      },
    ],
  };
}

export type CardcomInstallments = {
  min: number;
  max: number;
  selected: number;
};

function createPayload(
  input: {
    checkoutId: string;
    amount: number;
    description: string;
    customer: CardcomCustomer;
    installments?: CardcomInstallments | null;
  },
  includeDocument: boolean
) {
  const config = getCardcomConfig();
  const successUrl = `${config.appUrl}/checkout/success?checkout=${input.checkoutId}`;
  const failedUrl = `${config.appUrl}/checkout/failed?checkout=${input.checkoutId}`;

  return {
    TerminalNumber: config.terminalNumber,
    ApiName: config.apiName,
    ApiPassword: config.apiPassword || undefined,
    Operation: "ChargeOnly",
    Amount: input.amount,
    ReturnValue: input.checkoutId,
    SuccessRedirectUrl: successUrl,
    FailedRedirectUrl: failedUrl,
    WebHookUrl: `${config.appUrl}/api/payments/cardcom/webhook`,
    ProductName: input.description.slice(0, 50),
    Language: "he",
    ISOCoinId: 1,
    UIDefinition: {
      CardOwnerNameValue: input.customer.name,
      CardOwnerPhoneValue: input.customer.phone?.trim() || undefined,
      CardOwnerEmailValue: input.customer.email?.trim() || undefined,
    },
    AdvancedDefinition: {
      ApiPassword: config.apiPassword || undefined,
      ThreeDSecureState: "Disabled",
      MinNumOfPayments: input.installments?.min ?? 1,
      MaxNumOfPayments: input.installments?.max ?? 1,
      SelectedNumOfPayments: input.installments?.selected ?? 1,
      ISOCoinName: "ILS",
    },
    ...(includeDocument
      ? { Document: documentPayload(input) }
      : {}),
  };
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("תשובת קארדקום אינה תקינה.");
    }
  }

  if (!response.ok) {
    const record = asRecord(parsed);
    throw new Error(
      pickString(record, ["Description", "description"]) ||
        `קארדקום החזיר שגיאה (${response.status}).`
    );
  }

  return parsed as T;
}

export async function createLowProfilePage(input: {
  checkoutId: string;
  amount: number;
  description: string;
  customer: CardcomCustomer;
  installments?: CardcomInstallments | null;
}): Promise<{ lowProfileId: string; url: string }> {
  const attempt = async (includeDocument: boolean) => {
    const result = await postJson<Record<string, unknown>>(
      "/LowProfile/Create",
      createPayload(input, includeDocument)
    );
    return result;
  };

  let result = await attempt(true);
  let code = Number(result.ResponseCode ?? -1);
  let description = pickString(result, ["Description", "description"]) ?? "";

  if (code !== 0 && /document|invoice|מסמך|חשבונית/i.test(description)) {
    result = await attempt(false);
    code = Number(result.ResponseCode ?? -1);
    description = pickString(result, ["Description", "description"]) ?? description;
  }

  const lowProfileId = pickString(result, ["LowProfileId", "lowProfileId"]);
  const url = pickString(result, ["Url", "url"]);

  if (code !== 0 || !lowProfileId || !url) {
    throw new Error(description || "לא הצלחנו לפתוח את דף התשלום של קארדקום.");
  }

  return { lowProfileId, url };
}

export async function getLowProfileResult(
  lowProfileId: string
): Promise<CardcomLpResult> {
  const config = getCardcomConfig();
  return postJson<CardcomLpResult>("/LowProfile/GetLpResult", {
    TerminalNumber: config.terminalNumber,
    ApiName: config.apiName,
    LowProfileId: lowProfileId,
  });
}

function cardcomTransactionRecord(result: CardcomLpResult) {
  return (
    asRecord(result.TransactionInfo) ??
    asRecord(result.TranzactionInfo) ??
    result
  );
}

export function cardcomChargeSucceeded(result: CardcomLpResult) {
  if (Number(result.ResponseCode ?? -1) !== 0) return false;

  const tx = cardcomTransactionRecord(result);
  const txCode = tx.ResponseCode;
  if (txCode !== undefined && Number(txCode) !== 0) return false;

  return Boolean(cardcomTransactionId(result));
}

export function cardcomTransactionId(result: CardcomLpResult) {
  const tx = cardcomTransactionRecord(result);
  return pickString(
    { ...result, ...tx },
    ["TransactionId", "TranzactionId", "transactionId", "tranzactionId"]
  );
}

export function cardcomChargedAmount(result: CardcomLpResult) {
  const tx = cardcomTransactionRecord(result);
  const raw = tx.Amount ?? result.Amount;
  const amount = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(amount) ? amount : null;
}

export function cardcomDocumentNumber(result: CardcomLpResult) {
  const info = asRecord(result.DocumentInfo);
  return pickString(info, ["DocumentNumber", "documentNumber"]);
}

export type CardcomStandaloneDocument = {
  documentNumber: string | null;
  documentUrl: string | null;
  sentToEmail: string | null;
};

export type CardcomDocumentType =
  | "TaxInvoiceAndReceipt"
  | "TaxInvoiceAndReceiptRefund";

type StandaloneDocumentInput = {
  amount: number;
  description: string;
  customer: CardcomCustomer;
  /** איך התשלום התקבל — יופיע במסמך, לא כסליקת אשראי. */
  paymentMethodLabel: string;
  /** מזומן נרשם בשדה Cash; שאר האמצעים כתשלום מותאם. */
  asCash: boolean;
  comment?: string | null;
  documentDate?: string | null;
  /** ברירת מחדל: חשבונית מס קבלה. לזיכוי — חשבונית זיכוי והחזר כספים. */
  documentType?: CardcomDocumentType;
};

/** קארדקום דורש תאריך מסמך בפורמט dd/MM/yyyy בלבד. */
function toCardcomInvDate(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (!match) return undefined;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function standaloneDocumentBody(input: StandaloneDocumentInput, forceCash: boolean) {
  const config = getCardcomConfig();
  const email = input.customer.email?.trim() || null;
  const sendEmail = Boolean(email && email.length <= 50);
  const comment = [input.paymentMethodLabel, input.comment?.trim()]
    .filter(Boolean)
    .join(" · ");
  const useCash = forceCash || input.asCash;
  const invDate = toCardcomInvDate(input.documentDate);

  return {
    ApiName: config.apiName,
    ApiPassword: config.apiPassword,
    ...(useCash ? { Cash: input.amount } : {}),
    ...(!useCash
      ? {
          CustomFields: [
            {
              TransactionID: 0,
              TranDate: invDate,
              Description: input.paymentMethodLabel.slice(0, 50),
              asmacta: input.paymentMethodLabel.slice(0, 50),
              Sum: input.amount,
            },
          ],
        }
      : {}),
    Document: {
      DocumentTypeToCreate: input.documentType ?? "TaxInvoiceAndReceipt",
      Name: (input.customer.invoiceName || input.customer.name).slice(0, 50),
      TaxId: input.customer.taxId?.trim()?.slice(0, 50) || undefined,
      Email: sendEmail ? email : undefined,
      IsSendByEmail: sendEmail,
      AddressLine1: input.customer.address?.trim()?.slice(0, 50) || undefined,
      City: input.customer.city?.trim()?.slice(0, 50) || undefined,
      Phone: input.customer.phone?.trim()?.slice(0, 50) || undefined,
      Mobile: input.customer.phone?.trim()?.slice(0, 50) || undefined,
      Comments: comment.slice(0, 250) || undefined,
      DocumentDate: invDate,
      Languge: "he",
      ISOCoinID: 1,
      Products: [
        {
          Description: input.description.slice(0, 250),
          Quantity: 1,
          UnitCost: input.amount,
        },
      ],
    },
  };
}

function parseDocumentInfo(result: Record<string, unknown>): CardcomStandaloneDocument & {
  ok: boolean;
  error?: string;
} {
  const code = Number(result.ResponseCode ?? -1);
  const info = asRecord(result) ?? result;
  const documentInfo = asRecord(result.DocumentInfo) ?? info;
  if (code !== 0) {
    return {
      ok: false,
      error: pickString(info, ["Description", "description"]) || "הפקת המסמך בקארדקום נכשלה.",
      documentNumber: null,
      documentUrl: null,
      sentToEmail: null,
    };
  }

  return {
    ok: true,
    documentNumber: pickString(documentInfo, ["DocumentNumber", "documentNumber"]),
    documentUrl: pickString(documentInfo, ["DocumentUrl", "documentUrl"]),
    sentToEmail: null,
  };
}

/** מפיק חשבונית מס-קבלה בלי חיוב אשראי, ושולח למייל הלקוח אם יש. */
export async function createStandaloneDocument(
  input: StandaloneDocumentInput
): Promise<CardcomStandaloneDocument> {
  const email = input.customer.email?.trim() || null;
  const sendEmail = Boolean(email && email.length <= 50);

  const attempt = (forceCash: boolean) =>
    postJson<Record<string, unknown>>(
      "/Documents/CreateDocument",
      standaloneDocumentBody(input, forceCash)
    );

  let result = parseDocumentInfo(await attempt(false));
  if (!result.ok && !input.asCash) {
    result = parseDocumentInfo(await attempt(true));
  }

  if (!result.ok) {
    throw new Error(result.error);
  }

  return {
    documentNumber: result.documentNumber,
    documentUrl: result.documentUrl,
    sentToEmail: sendEmail ? email : null,
  };
}

export function extractCardcomLowProfileId(
  source: URLSearchParams | Record<string, unknown>
) {
  const record =
    source instanceof URLSearchParams
      ? Object.fromEntries(source.entries())
      : source;

  return pickString(record, [
    "LowProfileId",
    "lowProfileId",
    "lowprofileid",
    "LowProfileCode",
    "lowProfileCode",
    "lowprofilecode",
  ]);
}

export function extractCardcomCheckoutId(
  source: URLSearchParams | Record<string, unknown>
) {
  const record =
    source instanceof URLSearchParams
      ? Object.fromEntries(source.entries())
      : source;

  return pickString(record, ["checkout", "ReturnValue", "returnValue"]);
}

/**
 * זיכוי עסקה לפי מזהה קארדקום. PartialSum מאפשר זיכוי חלקי,
 * ו־AllowMultipleRefunds מאפשר כמה זיכויים על אותה עסקה.
 * המסמך לא מופק אוטומטית בזיכוי זה.
 */
export async function refundCardcomTransaction(input: {
  transactionId: string | number;
  amount: number;
}): Promise<{ refundTransactionId: string | null }> {
  const config = getCardcomConfig();
  if (!config.apiPassword) {
    throw new Error("חסרה סיסמת API של קארדקום לזיכויים.");
  }

  const transactionId = Number(input.transactionId);
  if (!Number.isFinite(transactionId) || transactionId <= 0) {
    throw new Error("מספר העסקה בקארדקום אינו תקין.");
  }

  const amount = Math.round(input.amount * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("סכום הזיכוי אינו תקין.");
  }

  const result = await postJson<Record<string, unknown>>(
    "/Transactions/RefundByTransactionId",
    {
      ApiName: config.apiName,
      ApiPassword: config.apiPassword,
      TransactionId: transactionId,
      PartialSum: amount,
      CancelOnly: false,
      AllowMultipleRefunds: true,
    }
  );

  const code = Number(result.ResponseCode ?? -1);
  if (code !== 0) {
    throw new Error(
      pickString(result, ["Description", "description"]) ||
        "הזיכוי בקארדקום נכשל."
    );
  }

  return {
    refundTransactionId: pickString(result, [
      "TransactionId",
      "TranzactionId",
      "NewTransactionId",
      "RefundTransactionId",
    ]),
  };
}
