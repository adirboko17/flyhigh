/**
 * לקוח Cardcom Low Profile — יצירת דף תשלום ואימות תוצאה מול השרת שלהם.
 * הפרטים הרגישים נשארים בצד השרת בלבד.
 */

export type CardcomCustomer = {
  name: string;
  email?: string | null;
  phone?: string | null;
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
  Amount?: number;
  DocumentInfo?: {
    ResponseCode?: number;
    DocumentNumber?: number | string;
    DocumentUrl?: string | null;
  };
  TransactionInfo?: {
    ResponseCode?: number;
    TransactionId?: number | string;
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
    Name: input.customer.name,
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

function createPayload(
  input: {
    checkoutId: string;
    amount: number;
    description: string;
    customer: CardcomCustomer;
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
      CardOwnerIdValue: input.customer.taxId?.trim() || undefined,
    },
    AdvancedDefinition: {
      ApiPassword: config.apiPassword || undefined,
      ThreeDSecureState: "Disabled",
      MinNumOfPayments: 1,
      MaxNumOfPayments: 1,
      SelectedNumOfPayments: 1,
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

export function cardcomChargeSucceeded(result: CardcomLpResult) {
  if (Number(result.ResponseCode ?? -1) !== 0) return false;

  const tx = asRecord(result.TransactionInfo) ?? result;
  const txCode = tx.ResponseCode;
  if (txCode !== undefined && Number(txCode) !== 0) return false;

  const transactionId =
    result.TransactionId ??
    (typeof tx.TransactionId === "number" || typeof tx.TransactionId === "string"
      ? tx.TransactionId
      : null);

  return Boolean(transactionId);
}

export function cardcomTransactionId(result: CardcomLpResult) {
  const tx = asRecord(result.TransactionInfo);
  return pickString(
    { ...result, ...(tx ?? {}) },
    ["TransactionId", "transactionId"]
  );
}

export function cardcomChargedAmount(result: CardcomLpResult) {
  const tx = asRecord(result.TransactionInfo);
  const raw = tx?.Amount ?? result.Amount;
  const amount = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(amount) ? amount : null;
}

export function cardcomDocumentNumber(result: CardcomLpResult) {
  const info = asRecord(result.DocumentInfo);
  return pickString(info, ["DocumentNumber", "documentNumber"]);
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
