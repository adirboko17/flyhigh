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
    <div data-theme-color={THEME_COLOR.auth} className="min-h-screen bg-white">
      {children}
    </div>
  );
}
