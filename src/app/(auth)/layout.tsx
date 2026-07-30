import type { Viewport } from "next";
import { THEME_COLOR } from "@/lib/theme-color";

/** צובע את שורות המערכת כבר ב-HTML הראשוני, בלי להמתין ל-ThemeColorSync. */
export const viewport: Viewport = {
  themeColor: THEME_COLOR.auth,
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-auth-layout
      data-theme-color={THEME_COLOR.auth}
      className="min-h-[100dvh] bg-brand-50 lg:bg-white"
    >
      {children}
    </div>
  );
}
