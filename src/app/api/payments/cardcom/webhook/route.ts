import { NextResponse } from "next/server";
import {
  extractCardcomCheckoutId,
  extractCardcomLowProfileId,
} from "@/lib/integrations/cardcom";
import { settleCardcomCheckout } from "@/lib/payments/cardcomCheckout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function parseBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await request.json().catch(() => null)) as unknown;
    return json && typeof json === "object"
      ? (json as Record<string, unknown>)
      : {};
  }

  const text = await request.text();
  return Object.fromEntries(new URLSearchParams(text).entries());
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const body = request.method === "GET" ? {} : await parseBody(request);
  const merged = { ...Object.fromEntries(url.searchParams.entries()), ...body };

  const lowProfileId = extractCardcomLowProfileId(merged);
  const checkoutId = extractCardcomCheckoutId(merged);

  const result = await settleCardcomCheckout({
    checkoutId,
    lowProfileId,
    markFailedIfUnpaid: true,
  });

  if (!result.success) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: result.status });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
