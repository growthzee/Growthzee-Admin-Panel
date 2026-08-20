// lib/leave.ts — shared helpers for the leave-request feature

export const LEAVE_REASONS = [
  { value: "SICK",        label: "Sick leave",            emoji: "🤒" },
  { value: "CASUAL",      label: "Casual leave",          emoji: "🙂" },
  { value: "ANNUAL",      label: "Annual / vacation",     emoji: "🏖️" },
  { value: "EMERGENCY",   label: "Emergency",             emoji: "🚨" },
  { value: "PERSONAL",    label: "Personal reasons",      emoji: "🙋" },
  { value: "BEREAVEMENT", label: "Bereavement",           emoji: "🕊️" },
  { value: "MATERNITY",   label: "Maternity leave",       emoji: "👶" },
  { value: "PATERNITY",   label: "Paternity leave",       emoji: "👨‍👦" },
  { value: "UNPAID",      label: "Unpaid leave",          emoji: "📉" },
  { value: "OTHER",       label: "Other",                 emoji: "📝" },
] as const;

export type LeaveReasonValue = (typeof LEAVE_REASONS)[number]["value"];

export function reasonLabel(reason: string) {
  return LEAVE_REASONS.find((r) => r.value === reason)?.label ?? reason;
}
export function reasonEmoji(reason: string) {
  return LEAVE_REASONS.find((r) => r.value === reason)?.emoji ?? "📝";
}

export const LEAVE_STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-amber",
  APPROVED: "badge-green",
  REJECTED: "badge-red",
  CANCELLED: "badge-gray",
};
export const LEAVE_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

/** Parse a YYYY-MM-DD string as a local date at noon, avoiding timezone drift */
export function parseDateOnly(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Every date in the inclusive range, excluding Sundays — matching the
 * weekend convention used by the attendance calendar.
 */
export function workingDatesInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0);
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12, 0, 0);
  while (cursor <= last) {
    if (cursor.getDay() !== 0) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
