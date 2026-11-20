export const MAURITIUS_TZ = "Indian/Mauritius";

export function mauritiusTodayISO(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MAURITIUS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function mauritiusClock(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MAURITIUS_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${hour}:${get("minute")}`;
}

export function addMauritiusDays(day: string, days: number): string {
  const anchor = new Date(`${day}T12:00:00+04:00`);
  return mauritiusTodayISO(new Date(anchor.getTime() + days * 24 * 60 * 60 * 1000));
}

export function mauritiusDayBounds(day: string): { startMs: number; endMs: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("bad day");
  const startMs = Date.parse(`${day}T00:00:00+04:00`);
  if (Number.isNaN(startMs)) throw new Error("bad day");
  return { startMs, endMs: startMs + 24 * 60 * 60 * 1000 };
}

export function atMauritius(day: string, time: string): Date {
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error("bad time");
  return new Date(`${day}T${time}:00+04:00`);
}

export function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function formatWhen(iso: string, locale: "en" | "fr"): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-MU" : "en-GB", {
    timeZone: MAURITIUS_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}
