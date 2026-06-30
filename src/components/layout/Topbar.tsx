import { Avatar } from "@/components/ui/Avatar";
import { ROLE_LABEL } from "@/lib/constants";
import { LogoutButton } from "./LogoutButton";
import type { Profile } from "@/lib/auth";

export function Topbar({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-100 bg-white/80 px-5 py-3 backdrop-blur">
      <div className="text-sm text-ink-500">
        שלום, <span className="font-semibold text-ink-800">{profile.full_name}</span>
      </div>
      <div className="flex items-center gap-3">
        <LogoutButton />
        <div className="flex items-center gap-2.5">
          <div className="text-left leading-tight">
            <p className="text-sm font-semibold text-ink-800">
              {profile.full_name}
            </p>
            <p className="text-xs text-ink-400">{ROLE_LABEL[profile.role]}</p>
          </div>
          <Avatar name={profile.full_name} />
        </div>
      </div>
    </header>
  );
}
