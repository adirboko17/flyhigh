export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "דשבורד", icon: "📊" },
  { href: "/admin/classes", label: "חוגים", icon: "🏊" },
  { href: "/admin/programs", label: "מסלולים", icon: "🎫" },
  { href: "/admin/pool-passes", label: "כניסות לבריכה", icon: "🪪" },
  { href: "/admin/customers", label: "לקוחות", icon: "👨‍👩‍👧" },
  { href: "/admin/instructors", label: "מדריכות", icon: "👩‍🏫" },
  { href: "/admin/enrollments", label: "הרשמות", icon: "📝" },
  { href: "/admin/waitlist", label: "רשימת המתנה", icon: "⏳" },
  { href: "/admin/payments", label: "תשלומים", icon: "💳" },
  { href: "/admin/attendance", label: "נוכחות", icon: "✅" },
  { href: "/admin/reports", label: "דוחות", icon: "📈" },
  { href: "/admin/settings", label: "הגדרות", icon: "⚙️" },
];

export const INSTRUCTOR_NAV: NavItem[] = [
  { href: "/instructor", label: "דשבורד", icon: "📊" },
  { href: "/instructor/classes", label: "החוגים שלי", icon: "🏊" },
  { href: "/instructor/attendance", label: "סימון נוכחות", icon: "✅" },
  { href: "/instructor/payroll", label: "שכר ופעילות", icon: "💰" },
];

export const PARENT_NAV: NavItem[] = [
  { href: "/parent/dashboard", label: "סקירה", icon: "🏠" },
  { href: "/parent/children", label: "הילדים שלי", icon: "🧒" },
  { href: "/parent/enrollments", label: "ההרשמות שלי", icon: "📝" },
  { href: "/parent/payments", label: "תשלומים וקבלות", icon: "💳" },
];

export const PUBLIC_NAV: NavItem[] = [
  { href: "/", label: "בית", icon: "" },
  { href: "/classes", label: "חוגים", icon: "" },
  { href: "/programs", label: "מסלולים", icon: "" },
  { href: "/contact", label: "צור קשר", icon: "" },
];
