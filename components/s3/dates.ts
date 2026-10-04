// Local-time day helpers. Days are "YYYY-MM-DD" strings in the shop's (browser's) timezone.

const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());

export function parseDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(day: string, n: number) {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
/** Start of the day as an ISO timestamp (for created_at >=). */
export const dayStartISO = (day: string) => parseDay(day).toISOString();
/** Start of the next day (for created_at <). */
export const dayEndISO = (day: string) => parseDay(addDays(day, 1)).toISOString();
export const dayOf = (iso: string) => ymd(new Date(iso));
export const monthStart = (day: string) => `${day.slice(0, 8)}01`;

export const dayLabel = (day: string) =>
  parseDay(day).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" });
export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" });
