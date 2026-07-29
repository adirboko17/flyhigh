import type { Metadata } from "next";
import { Heebo, Assistant } from "next/font/google";
import { AccessibilityWidget } from "@/components/a11y/AccessibilityWidget";
import { A11Y_INIT_SCRIPT } from "@/components/a11y/a11ySettings";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "על הגובה - חוגים, מסלולים וכניסות לבריכה",
    template: "%s | על הגובה",
  },
  description:
    "מערכת ההרשמה והניהול של 'על הגובה' - חוגי שחייה, מסלולים וכניסות לבריכה. הרשמה קלה, ניהול חכם וחוויה מושלמת להורים ולצוות.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${assistant.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        {/* מחיל העדפות נגישות שמורות לפני הצביעה הראשונה, כדי למנוע הבהוב. */}
        <script dangerouslySetInnerHTML={{ __html: A11Y_INIT_SCRIPT }} />
        {children}
        <AccessibilityWidget />
      </body>
    </html>
  );
}
