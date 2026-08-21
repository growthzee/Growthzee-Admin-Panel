// lib/birthdays.ts — birthday helpers shared by the dashboard, employee list and profiles

/**
 * Legacy hardcoded birthdays (DD/MM/YYYY), kept only as a fallback for records
 * that predate the `dateOfBirth` column. Anything stored on the employee wins.
 */
export const LEGACY_BIRTHDAYS: Record<string, string> = {
  "Simran Singh": "17/10/2001",
  "Ayan Pakhira": "19/07/1995",
  "Ashutosh Bhaskar": "31/03/1997",
  "Arindam Biswas": "28/10/2003",
  "Ritik Singh": "20/08/2001",
  "Riya Kashyap": "09/05/1999",
  "Ashlesha Kadwey": "15/06/2002",
  "Pankaj Chandrawanshi": "25/01/2000",
};

export type BirthdayInfo = {
  date: Date;
  day: number;
  month: number;
  /** Null when only day/month are known */
  year: number | null;
  age: number | null;
  daysUntil: number;
  isToday: boolean;
  isTomorrow: boolean;
  /** e.g. "17 October" */
  label: string;
  /** e.g. "Mon, 17 Oct 2026" — the upcoming occurrence */
  nextLabel: string;
};

function normaliseName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Resolve a birthday from the stored column, else the legacy name-matched list */
export function resolveBirthday(
  employee: { name: string; dateOfBirth?: string | Date | null },
  now = new Date(),
): BirthdayInfo | null {
  let day: number, month: number, year: number | null;

  if (employee.dateOfBirth) {
    const d = new Date(employee.dateOfBirth);
    if (isNaN(d.getTime())) return null;
    day = d.getUTCDate();
    month = d.getUTCMonth() + 1;
    year = d.getUTCFullYear();
  } else {
    const key = Object.keys(LEGACY_BIRTHDAYS).find(
      (n) => normaliseName(n) === normaliseName(employee.name),
    );
    if (!key) return null;
    const [dd, mm, yyyy] = LEGACY_BIRTHDAYS[key].split("/").map(Number);
    day = dd; month = mm; year = yyyy || null;
  }

  if (!day || !month) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);

  const daysUntil = Math.round((next.getTime() - today.getTime()) / 86400000);

  let age: number | null = null;
  if (year) {
    age = today.getFullYear() - year;
    // Not had this year's birthday yet
    if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--;
  }

  return {
    date: new Date(year ?? 2000, month - 1, day),
    day, month, year, age, daysUntil,
    isToday: daysUntil === 0,
    isTomorrow: daysUntil === 1,
    label: new Date(2000, month - 1, day).toLocaleDateString("en-US", { day: "numeric", month: "long" }),
    nextLabel: next.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
  };
}

/** Upcoming birthdays across a team, soonest first */
export function upcomingBirthdays<T extends { name: string; dateOfBirth?: string | Date | null }>(
  employees: T[],
  withinDays = 30,
  now = new Date(),
): { employee: T; birthday: BirthdayInfo }[] {
  return employees
    .map((employee) => ({ employee, birthday: resolveBirthday(employee, now) }))
    .filter((x): x is { employee: T; birthday: BirthdayInfo } => x.birthday !== null)
    .filter((x) => x.birthday.daysUntil <= withinDays)
    .sort((a, b) => a.birthday.daysUntil - b.birthday.daysUntil);
}

/** "Today", "Tomorrow", "in 5 days" */
export function countdownLabel(b: BirthdayInfo) {
  if (b.isToday) return "Today";
  if (b.isTomorrow) return "Tomorrow";
  return `in ${b.daysUntil} days`;
}

/** YYYY-MM-DD for date inputs */
export function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
