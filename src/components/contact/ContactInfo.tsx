import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/paths";
import { CONTACT } from "@/lib/constants";
import { cn } from "@/utils/cn";

interface ContactDetailProps {
  icon: IconName;
  accent: string;
  label: string;
  value: string;
  href?: string;
}

function ContactDetail({ icon, accent, label, value, href }: ContactDetailProps) {
  const content = (
    <div
      className={cn(
        "feat-card flex items-start gap-4 rounded-[20px] border border-ink-100 bg-white p-5 shadow-card transition-all duration-300",
        href && "hover:border-brand-200"
      )}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white"
        style={{
          background: accent,
          boxShadow: `0 12px 26px -10px ${accent}`,
        }}
      >
        <Icon name={icon} size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-ink-400">{label}</p>
        <p
          className={cn(
            "mt-0.5 text-[15px] font-semibold text-ink-900",
            href && "text-brand-700"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export function ContactInfo() {
  const phoneHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`;

  return (
    <div className="flex flex-col gap-4">
      <ContactDetail
        icon="phone"
        accent="var(--logo-cyan)"
        label="טלפון"
        value={CONTACT.phone}
        href={phoneHref}
      />
      <ContactDetail
        icon="mail"
        accent="var(--logo-magenta)"
        label="דוא״ל"
        value={CONTACT.email}
        href={`mailto:${CONTACT.email}`}
      />
      <ContactDetail
        icon="pin"
        accent="var(--logo-orange)"
        label="כתובת"
        value={CONTACT.address}
      />

      <div className="feat-card rounded-[20px] border border-ink-100 bg-white p-5 shadow-card">
        <div className="flex items-start gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white"
            style={{
              background: "var(--brand-600)",
              boxShadow: "0 12px 26px -10px var(--brand-600)",
            }}
          >
            <Icon name="clock" size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-ink-400">שעות פעילות</p>
            <ul className="mt-2 space-y-1.5">
              {CONTACT.hours.map((row) => (
                <li
                  key={row.days}
                  className="flex items-center justify-between gap-6 text-sm text-ink-700"
                >
                  <span className="font-semibold text-ink-800">{row.days}</span>
                  <span dir="ltr">{row.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
