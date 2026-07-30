import { THEME_COLOR } from "@/lib/theme-color";

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
