// lib/workLinks.ts — shared helpers for employee-submitted work URLs

export const WORK_LINK_TYPES = [
  { value: "DRIVE",  label: "Google Drive",  emoji: "📁" },
  { value: "DOC",    label: "Google Doc",    emoji: "📄" },
  { value: "SHEET",  label: "Google Sheet",  emoji: "📊" },
  { value: "SLIDE",  label: "Google Slides", emoji: "📽️" },
  { value: "PDF",    label: "PDF",           emoji: "🧾" },
  { value: "DESIGN", label: "Design file",   emoji: "🎨" },
  { value: "VIDEO",  label: "Video",         emoji: "🎬" },
  { value: "OTHER",  label: "Other link",    emoji: "🔗" },
] as const;

export type WorkLinkTypeValue = (typeof WORK_LINK_TYPES)[number]["value"];

export function linkTypeLabel(t: string) {
  return WORK_LINK_TYPES.find((x) => x.value === t)?.label ?? t;
}
export function linkTypeEmoji(t: string) {
  return WORK_LINK_TYPES.find((x) => x.value === t)?.emoji ?? "🔗";
}

/** Best-guess the link type from the URL so employees rarely have to pick */
export function detectLinkType(url: string): WorkLinkTypeValue {
  const u = url.toLowerCase();
  if (u.includes("docs.google.com/spreadsheets")) return "SHEET";
  if (u.includes("docs.google.com/presentation")) return "SLIDE";
  if (u.includes("docs.google.com/document")) return "DOC";
  if (u.includes("drive.google.com")) return "DRIVE";
  if (u.endsWith(".pdf") || u.includes(".pdf?")) return "PDF";
  if (u.includes("figma.com") || u.includes("canva.com") || u.includes("behance.net")) return "DESIGN";
  if (u.includes("youtube.com") || u.includes("youtu.be") || u.includes("vimeo.com") || u.includes("loom.com")) return "VIDEO";
  return "OTHER";
}

/** Accepts http(s) URLs only — everything else is rejected before hitting the DB */
export function isValidUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Short, readable host for display (e.g. "drive.google.com") */
export function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}
