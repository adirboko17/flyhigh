/** שגיאות סשן שאין טעם לרענן מול Auth — המשתמש צריך להתחבר מחדש. */
export function isInvalidRefreshTokenError(
  error: { message?: string; code?: string } | null | undefined
): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = error.message ?? "";
  return (
    code === "refresh_token_not_found" ||
    message.includes("Refresh Token Not Found") ||
    message.includes("Invalid Refresh Token")
  );
}

export function isSupabaseAuthCookieName(name: string): boolean {
  return (
    name.startsWith("sb-") &&
    (name.includes("auth-token") || name.includes("auth."))
  );
}

/** עוגיית auth בלי refresh_token — getClaims/getUser יזרקו AuthApiError. */
export function hasIncompleteAuthSession(
  cookies: Array<{ name: string; value: string }>
): boolean {
  const parts = cookies
    .filter((cookie) => isSupabaseAuthCookieName(cookie.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (parts.length === 0) return false;

  const raw = parts.map((cookie) => cookie.value).join("");
  try {
    const encoded = raw.startsWith("base64-") ? raw.slice("base64-".length) : raw;
    const json = Buffer.from(encoded, "base64").toString("utf8");
    const session = JSON.parse(json) as { refresh_token?: string };
    return !session.refresh_token;
  } catch {
    return false;
  }
}
