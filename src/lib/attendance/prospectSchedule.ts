export type ProspectVisitMark = {
  session_id: string;
  status: "arrived" | "no_show";
};

export type ProspectScheduleSession = {
  id: string;
  session_date: string;
  start_time: string;
  end_time?: string | null;
  weekly_slot_id?: string | null;
};

export type ProspectScheduleAnchor = {
  session_id: string | null;
  trial_date: string;
  weekly_slot_id?: string | null;
  status: string;
};

export function parseVisitStatus(
  status: string
): ProspectVisitMark["status"] | null {
  if (status === "arrived" || status === "no_show") return status;
  return null;
}

function compareSessions(
  a: ProspectScheduleSession,
  b: ProspectScheduleSession
) {
  const byDate = a.session_date.localeCompare(b.session_date);
  if (byDate !== 0) return byDate;
  return a.start_time.localeCompare(b.start_time);
}

/** מפגשים מהמועד הראשון והלאה, באותו שיבוע שבועי. */
export function eligibleProspectSessions(
  prospect: ProspectScheduleAnchor,
  sessions: ProspectScheduleSession[]
): ProspectScheduleSession[] {
  const anchor = prospect.session_id
    ? sessions.find((session) => session.id === prospect.session_id)
    : undefined;
  const startDate = anchor?.session_date ?? prospect.trial_date;
  const slotId = anchor?.weekly_slot_id ?? prospect.weekly_slot_id ?? null;

  return sessions
    .filter((session) => {
      if (session.session_date < startDate && session.id !== prospect.session_id) {
        return false;
      }
      if (!slotId) return true;
      return session.weekly_slot_id === slotId;
    })
    .sort(compareSessions);
}

/**
 * המועד הפתוח הבא: מדלגים על מפגש שסומן, ועל מפגש שתאריכו עבר בלי סימון.
 * כך מי שלא הגיעה, או שהגיעה ועדיין לא נרשמה, עוברת למפגש שאחריו.
 */
export function currentProspectSessionId(
  prospect: ProspectScheduleAnchor,
  sessions: ProspectScheduleSession[],
  visits: ProspectVisitMark[],
  today: string
): string | null {
  if (prospect.status === "cancelled") return null;
  const marked = new Set(visits.map((visit) => visit.session_id));
  for (const session of eligibleProspectSessions(prospect, sessions)) {
    if (marked.has(session.id)) continue;
    if (session.session_date < today) continue;
    return session.id;
  }
  return null;
}

export function currentProspectSession(
  prospect: ProspectScheduleAnchor,
  sessions: ProspectScheduleSession[],
  visits: ProspectVisitMark[],
  today: string
): ProspectScheduleSession | null {
  const sessionId = currentProspectSessionId(prospect, sessions, visits, today);
  if (!sessionId) return null;
  return sessions.find((session) => session.id === sessionId) ?? null;
}

/** מופיעה במועד הנוכחי, ובמועדים שכבר סומנו כדי שאפשר לתקן. */
export function prospectAppearsOnSession(
  prospect: ProspectScheduleAnchor,
  sessionId: string,
  sessions: ProspectScheduleSession[],
  visits: ProspectVisitMark[],
  today: string
): boolean {
  if (prospect.status === "cancelled") return false;
  const eligible = eligibleProspectSessions(prospect, sessions);
  if (!eligible.some((session) => session.id === sessionId)) return false;
  if (visits.some((visit) => visit.session_id === sessionId)) return true;
  return currentProspectSessionId(prospect, sessions, visits, today) === sessionId;
}

export function summarizeProspectVisits(visits: ProspectVisitMark[]) {
  let arrived = 0;
  let noShow = 0;
  for (const visit of visits) {
    if (visit.status === "arrived") arrived += 1;
    else noShow += 1;
  }
  return { arrived, noShow };
}
