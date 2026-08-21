// lib/workSchedule.ts — single source of truth for the company's working week and hours

/** Working days: Monday–Friday (0 = Sunday … 6 = Saturday) */
export const WORKING_WEEKDAYS = [1, 2, 3, 4, 5];
export const WORK_START = "10:00";
export const WORK_END = "19:00";
export const WORK_HOURS_LABEL = "10:00 AM – 7:00 PM";
export const WORK_WEEK_LABEL = "Monday – Friday";
export const WORK_HOURS_PER_DAY = 9;

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** True for Mon–Fri, false for Sat/Sun */
export function isWorkingDay(date: Date) {
  return WORKING_WEEKDAYS.includes(date.getDay());
}
export function isWeekendDay(date: Date) {
  return !isWorkingDay(date);
}

/** Every working date in an inclusive range, skipping weekends */
export function workingDatesInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0);
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12, 0, 0);
  while (cursor <= last) {
    if (isWorkingDay(cursor)) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/** Count of working days in a given month (1-indexed month) */
export function workingDaysInMonth(year: number, month: number) {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    if (isWorkingDay(new Date(year, month - 1, d))) count++;
  }
  return count;
}

export function pad(n: number) { return String(n).padStart(2, "0"); }
/** Local YYYY-MM-DD (avoids the UTC shift toISOString would introduce) */
export function dateKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

export type AttendanceStatusValue = "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE" | "HOLIDAY" | "WEEKEND";

export const ATTENDANCE_CFG: Record<AttendanceStatusValue, { label: string; short: string; color: string; bg: string }> = {
  PRESENT:  { label: "Present",  short: "P", color: "var(--green)",       bg: "var(--green-bg)" },
  ABSENT:   { label: "Absent",   short: "A", color: "var(--red)",         bg: "var(--red-bg)" },
  HALF_DAY: { label: "Half day", short: "½", color: "var(--blue)",        bg: "var(--blue-bg)" },
  LEAVE:    { label: "Leave",    short: "L", color: "var(--amber)",       bg: "var(--amber-bg)" },
  HOLIDAY:  { label: "Holiday",  short: "H", color: "var(--purple)",      bg: "var(--purple-bg)" },
  WEEKEND:  { label: "Weekend",  short: "—", color: "var(--tx-tertiary)", bg: "var(--gray-tag)" },
};

/** Statuses an admin can assign (WEEKEND is derived, never picked) */
export const MARKABLE_STATUSES: AttendanceStatusValue[] = ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "HOLIDAY"];
