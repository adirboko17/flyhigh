"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getUnreadAlertCount,
  markCurrentAlertsSeen,
} from "@/lib/admin/alertActions";

const AlertUnreadContext = createContext(0);

let markingAlerts: Promise<boolean> | null = null;

function markAlertsSeen() {
  markingAlerts ??= markCurrentAlertsSeen().finally(() => {
    markingAlerts = null;
  });
  return markingAlerts;
}

function onAlertsPage(pathname: string) {
  return pathname === "/admin/alerts" || pathname.startsWith("/admin/alerts/");
}

export function AlertUnreadProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const loaded = useRef(false);
  const sawAlertsPage = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function sync() {
      if (onAlertsPage(pathname)) {
        setCount(0);
        const ok = await markAlertsSeen();
        if (!cancelled && !ok) {
          const next = await getUnreadAlertCount();
          if (!cancelled) setCount(next);
        }
        sawAlertsPage.current = true;
        loaded.current = true;
        return;
      }

      const pending = markingAlerts;
      if (pending) await pending;

      if (!loaded.current || sawAlertsPage.current) {
        sawAlertsPage.current = false;
        loaded.current = true;
        const next = await getUnreadAlertCount();
        if (!cancelled) setCount(next);
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;

    function onFocus() {
      if (onAlertsPage(pathname)) return;
      void getUnreadAlertCount().then((next) => {
        setCount(next);
      });
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [enabled, pathname]);

  return (
    <AlertUnreadContext.Provider value={count}>
      {children}
    </AlertUnreadContext.Provider>
  );
}

function useAlertUnreadCount() {
  return useContext(AlertUnreadContext);
}

export function AlertNavBadge() {
  const count = useAlertUnreadCount();
  if (!count) return null;
  const label = count > 99 ? "99+" : String(count);

  return (
    <span
      className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white shadow-sm"
      aria-label={`${label} התראות חדשות`}
    >
      {label}
    </span>
  );
}

export function AlertMenuDot() {
  const count = useAlertUnreadCount();
  if (!count) return null;
  const label = count > 99 ? "99+" : String(count);

  return (
    <span
      className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
      aria-label={`${label} התראות חדשות`}
    >
      {label}
    </span>
  );
}
