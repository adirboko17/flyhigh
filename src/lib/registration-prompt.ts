/** דגל לסשן הנוכחי: ההורה התחבר ועדיין לא ראה את הזמנת ההרשמה. */
const REGISTRATION_PROMPT_KEY = "flyhigh-registration-prompt";

export function markRegistrationPrompt() {
  try {
    sessionStorage.setItem(REGISTRATION_PROMPT_KEY, "1");
  } catch {
    // מצב פרטי או אחסון חסום — בלי ההזמנה, ההתחברות עצמה לא נפגעת.
  }
}

export function peekRegistrationPrompt() {
  try {
    return sessionStorage.getItem(REGISTRATION_PROMPT_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearRegistrationPrompt() {
  try {
    sessionStorage.removeItem(REGISTRATION_PROMPT_KEY);
  } catch {
    // אין מה לנקות.
  }
}
