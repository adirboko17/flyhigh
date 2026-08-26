export type CustomerRegistrationKind =
  | "class"
  | "membership"
  | "activity"
  | "pool_pass"
  | "private_lesson"
  | "waitlist";

export type CustomerRegistrationTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type CustomerRegistration = {
  id: string;
  kind: CustomerRegistrationKind;
  title: string;
  participant: string;
  detail: string | null;
  statusLabel: string;
  statusTone: CustomerRegistrationTone;
  paymentLabel: string | null;
  paymentTone: CustomerRegistrationTone | null;
  muted: boolean;
};

export const REGISTRATION_KIND_LABEL: Record<
  CustomerRegistrationKind,
  string
> = {
  class: "חוג",
  membership: "מנוי",
  activity: "פעילות",
  pool_pass: "כניסות",
  private_lesson: "שיעור פרטי",
  waitlist: "המתנה",
};

export const REGISTRATION_KIND_TONE: Record<
  CustomerRegistrationKind,
  CustomerRegistrationTone
> = {
  class: "brand",
  membership: "info",
  activity: "warning",
  pool_pass: "success",
  private_lesson: "info",
  waitlist: "warning",
};

export const REGISTRATION_KIND_ORDER: CustomerRegistrationKind[] = [
  "class",
  "membership",
  "pool_pass",
  "private_lesson",
  "activity",
  "waitlist",
];
