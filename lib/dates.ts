export function kstToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function shiftDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
}
export function dateRange(days: number, today = kstToday()) { return { from: shiftDate(today, -(days - 1)), to: today }; }
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z"); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === value;
}
