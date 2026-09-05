// Shared helpers for the "month picker" pattern used by salary advances and salary slips.
// A month is always stored as a UTC first-of-month DateTime, e.g. "2026-10" -> 2026-10-01T00:00:00Z.

export function parseMonthInput(value: string): Date {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

export function monthToInputValue(date: Date | string): string {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function daysInMonth(date: Date | string): number {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}
