export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** נתיבים נוספים שמסמנים את הפריט כפעיל (למשל מסכי יצירה/עריכה שיושבים תחת נתיב אחר). */
  matchPaths?: string[];
}

export interface NavGroup {
  id: string;
  label: string;
  icon: string;
  children: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

export function navHrefs(entries: NavEntry[]): string[] {
  return entries.flatMap((entry) =>
    isNavGroup(entry) ? entry.children.map((child) => child.href) : [entry.href]
  );
}

export const ADMIN_NAV: NavEntry[] = [
  { href: "/admin", label: "דשבורד", icon: "📊" },
  { href: "/admin/customers", label: "לקוחות", icon: "👨‍👩‍👧" },
  { href: "/admin/instructors", label: "מדריכים", icon: "🧑‍🏫" },
  { href: "/admin/classes", label: "חוגים", icon: "🏊" },
  {
    href: "/admin/tracks",
    label: "מנויים וכניסות",
    icon: "🎫",
    matchPaths: ["/admin/programs", "/admin/pool-passes"],
  },
  {
    id: "operations",
    label: "תפעול",
    icon: "🗓️",
    children: [
      {
        href: "/admin/private-lessons",
        label: "תיאום מועדים",
        icon: "🎯",
      },
      { href: "/admin/calendar", label: "לוח שנה", icon: "📅" },
      {
        href: "/admin/activity",
        label: "פעילות אחרונה",
        icon: "📝",
        matchPaths: ["/admin/enrollments"],
      },
    ],
  },
  {
    id: "finance",
    label: "פיננסי",
    icon: "💰",
    children: [
      {
        href: "/admin/finance",
        label: "כספים",
        icon: "💳",
        matchPaths: ["/admin/payments", "/admin/reports"],
      },
      { href: "/admin/collections", label: "גבייה", icon: "🧾" },
      { href: "/admin/refunds", label: "זיכויים", icon: "↩️" },
      { href: "/admin/receipt-labels", label: "תוויות לקבלה", icon: "🏷️" },
      { href: "/admin/coupons", label: "קודי קופון", icon: "🎟️" },
    ],
  },
  { href: "/admin/settings", label: "הגדרות", icon: "⚙️" },
];

export const INSTRUCTOR_NAV: NavItem[] = [
  { href: "/instructor", label: "דשבורד", icon: "📊" },
  { href: "/instructor/payroll", label: "שכר ופעילות", icon: "💰" },
  { href: "/instructor/documents", label: "מסמכים", icon: "📄" },
];

export const PUBLIC_NAV: NavItem[] = [
  { href: "/", label: "בית", icon: "" },
  { href: "/classes", label: "חוגים", icon: "" },
  { href: "/programs", label: "הבריכה", icon: "" },
  { href: "/contact", label: "צור קשר", icon: "" },
];
