// Records are written as of the anchor, 28 October 2026 at 11:30 in Germany, and
// move with the calendar by whole days: dates, timestamps and [[YYYY-MM-DD]] in
// prose alike. The demo clock stands at the anchor's time of day every day
// (11:30, or 12:30 in summer time), so a deadline "in 3 days" and an SLA with
// "3:40 h left" read the same on every day and at every hour; a recording made
// next month tells the same story.
export const ANCHOR = "2026-10-28T10:30:00Z";
const DAY = 86_400_000;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T/;
const TOKEN = /\[\[(\d{4}-\d{2}-\d{2})\]\]/g;

const daysSinceAnchor = (now: Date) => Math.max(0, Math.floor((now.getTime() - Date.parse(ANCHOR.slice(0, 10))) / DAY));

/** The demo clock: today at the anchor's time of day. */
export const demoNow = (now: Date) => new Date(Date.parse(ANCHOR) + daysSinceAnchor(now) * DAY);

export const isoDay = (date: Date) => date.toISOString().slice(0, 10);
export const addDays = (iso: string, days: number) => isoDay(new Date(Date.parse(iso.slice(0, 10)) + days * DAY));

const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Calendar months, as contract notice periods count them; a month-end stays a month-end. */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const day = d === lastDay(y, m) ? lastDay(year, month) : Math.min(d, lastDay(year, month));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const germanDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

/** Deep copy moved by `days`; [[YYYY-MM-DD]] in prose becomes a German date. */
export function shiftAll<T>(value: T, days: number): T {
  if (typeof value === "string") {
    if (TIMESTAMP.test(value)) return new Date(Date.parse(value) + days * DAY).toISOString().replace(".000Z", "Z") as T;
    if (DATE.test(value)) return addDays(value, days) as T;
    return value.replace(TOKEN, (_, iso: string) => germanDate(addDays(iso, days))) as T;
  }
  if (Array.isArray(value)) return value.map((item) => shiftAll(item, days)) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shiftAll(item, days)])) as T;
  return value;
}

/** The current dataset, recomputed once per day. */
export function shifted<T>(raw: T, now: () => Date) {
  let cached: { days: number; data: T } | undefined;
  return () => {
    const days = daysSinceAnchor(now());
    if (cached?.days !== days) cached = { days, data: shiftAll(raw, days) };
    return cached.data;
  };
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / DAY);
}
