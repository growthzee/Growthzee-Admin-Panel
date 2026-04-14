import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// B&W status styles
export function getStatusStyle(status: string): { dot: string; text: string; bg: string; border: string } {
  const map: Record<string, { dot: string; text: string; bg: string; border: string }> = {
    ACTIVE:           { dot: "bg-white",       text: "text-white",   bg: "bg-white/10",  border: "border-white/20" },
    INACTIVE:         { dot: "bg-[#444]",       text: "text-[#555]",  bg: "bg-[#111]",    border: "border-[#222]" },
    ON_LEAVE:         { dot: "bg-[#888]",       text: "text-[#888]",  bg: "bg-[#1a1a1a]", border: "border-[#2a2a2a]" },
    PENDING:          { dot: "bg-[#555]",       text: "text-[#666]",  bg: "bg-[#111]",    border: "border-[#1e1e1e]" },
    IN_PROGRESS:      { dot: "bg-[#ccc]",       text: "text-[#bbb]",  bg: "bg-[#1a1a1a]", border: "border-[#2a2a2a]" },
    COMPLETED:        { dot: "bg-white",        text: "text-white",   bg: "bg-white/10",  border: "border-white/20" },
    CHANGES_REQUIRED: { dot: "bg-[#f59e0b]",    text: "text-[#f59e0b]", bg: "bg-[#f59e0b]/10", border: "border-[#f59e0b]/20" },
    OVERDUE:          { dot: "bg-red-500",      text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
    PROSPECT:         { dot: "bg-[#888]",       text: "text-[#888]",  bg: "bg-[#1a1a1a]", border: "border-[#2a2a2a]" },
  };
  return map[status] || { dot: "bg-[#444]", text: "text-[#555]", bg: "bg-[#111]", border: "border-[#1e1e1e]" };
}

export function getPriorityStyle(priority: string): { text: string; bg: string } {
  const map: Record<string, { text: string; bg: string }> = {
    LOW:    { text: "text-[#444]", bg: "bg-[#111]" },
    MEDIUM: { text: "text-[#888]", bg: "bg-[#1a1a1a]" },
    HIGH:   { text: "text-[#ccc]", bg: "bg-[#222]" },
    URGENT: { text: "text-white",  bg: "bg-white/10" },
  };
  return map[priority] || { text: "text-[#555]", bg: "bg-[#111]" };
}

export function getDepartmentStyle(dept: string): string {
  // All departments get a clean monochrome pill, differentiated only by shade
  const shades: Record<string, string> = {
    Engineering: "text-white bg-white/10 border-white/15",
    Design:      "text-[#ccc] bg-[#1e1e1e] border-[#2a2a2a]",
    Marketing:   "text-[#bbb] bg-[#1a1a1a] border-[#252525]",
    Sales:       "text-[#aaa] bg-[#181818] border-[#222]",
    HR:          "text-[#999] bg-[#161616] border-[#202020]",
    Finance:     "text-[#888] bg-[#141414] border-[#1e1e1e]",
    Operations:  "text-[#777] bg-[#121212] border-[#1c1c1c]",
  };
  return shades[dept] || "text-[#666] bg-[#111] border-[#1e1e1e]";
}

// Legacy compatibility aliases
export function getStatusColor(status: string): string {
  const s = getStatusStyle(status);
  return `${s.bg} ${s.text} ${s.border}`;
}
export function getPriorityColor(priority: string): string {
  const p = getPriorityStyle(priority);
  return `${p.bg} ${p.text}`;
}
export function getDepartmentColor(dept: string): string {
  return getDepartmentStyle(dept);
}
