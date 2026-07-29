export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** נתיבים נוספים שמסמנים את הפריט כפעיל (למשל מסכי יצירה/עריכה שיושבים תחת נתיב אחר). */
  matchPaths?: string[];
}

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "דשבורד", icon: "📊" },
  { href: "/admin/customers", label: "לקוחות", icon: "👨‍👩‍👧" },
  { href: "/admin/instructors", label: "מדריכות", icon: "👩‍🏫" },
  { href: "/admin/classes", label: "חוגים", icon: "🏊" },
  {
    href: "/admin/tracks",
    label: "מסלולים וכניסות",
    icon: "🎫",
    matchPaths: ["/admin/programs", "/admin/pool-passes"],
  },
  { href: "/admin/calendar", label: "לוח שנה", icon: "📅" },
  { href: "/admin/coupons", label: "קודי קופון", icon: "🎟️" },
  {
    href: "/admin/activity",
    label: "פעילות אחרונה",
    icon: "📝",
    matchPaths: ["/admin/enrollments"],
  },
  { href: "/admin/collections", label: "גבייה", icon: "🧾" },
  {
    href: "/admin/finance",
    label: "כספים",
    icon: "💳",
    matchPaths: ["/admin/payments", "/admin/reports"],
  },
  { href: "/admin/settings", label: "הגדרות", icon: "⚙️" },
];

export const INSTRUCTOR_NAV: NavItem[] = [
  { href: "/instructor", label: "דשבורד", icon: "📊" },
  { href: "/instructor/payroll", label: "שכר ופעילות", icon: "💰" },
];

export const PUBLIC_NAV: NavItem[] = [
  { href: "/", label: "בית", icon: "" },
  { href: "/classes", label: "חוגים", icon: "" },
  { href: "/programs", label: "מסלולים", icon: "" },
  { href: "/contact", label: "צור קשר", icon: "" },
];
