"use client";
import TaskCategoryBadge from "@/components/TaskCategoryBadge";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────
type Task = {
  id: string;
  title: string;
  description?: string;
  category?: string | null;
  subCategory?: string | null;
  taskType?: string | null;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  completedAt?: string;
  _type: "internal" | "client";
  client?: { id: string; name: string; company?: string };
};

type Employee = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  status: string;
  portalEnabled: boolean;
  joinedAt: string;
  tasks: Omit<Task, "_type" | "client">[];
};

// ── Constants ────────────────────────────────────────────────────────────────
const DEPTS    = ["Engineering", "Design", "Marketing", "Sales", "HR", "Finance", "Operations"];
const STATUSES = ["ACTIVE", "INACTIVE", "ON_LEAVE"];
const PRIS     = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const INT_S    = ["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"];
const CLI_S    = ["PENDING", "IN_PROGRESS", "COMPLETED", "CHANGES_REQUIRED", "OVERDUE"];

const STATUS_DOT: Record<string, string> = {
  PENDING: "#2a2a2a",
  IN_PROGRESS: "#888",
  COMPLETED: "#fff",
  CHANGES_REQUIRED: "#f59e0b",
  OVERDUE: "#ef4444",
};
const STATUS_TXT: Record<string, string> = {
  PENDING: "var(--text-2)",
  IN_PROGRESS: "var(--text-1)",
  COMPLETED: "var(--text-0)",
  CHANGES_REQUIRED: "#f59e0b",
  OVERDUE: "#ef4444",
};

// ── Creative content type filters ────────────────────────────────────────────
// Each entry defines the pill label and the keywords used to fuzzy-match
// against task title, description, category, subCategory, and taskType.
const CONTENT_FILTERS = [
  {
    key: "reels",
    label: "Reels",
    icon: "▶",
    keywords: ["reel", "reels", "short video", "short clip", "instagram reel", "fb reel"],
  },
  {
    key: "carousel",
    label: "Carousel",
    icon: "◫",
    keywords: ["carousel", "carousel post", "swipe", "multi-image", "multi image", "slide post"],
  },
  {
    key: "creative",
    label: "Creative Posts",
    icon: "✦",
    keywords: ["creative post", "creative", "graphic post", "static post", "design post", "social post"],
  },
  {
    key: "ads_creative",
    label: "Ads Creative",
    icon: "◈",
    keywords: ["ads creative", "ad creative", "paid creative", "sponsored creative", "ad design", "advertising creative"],
  },
  {
    key: "ads_reel",
    label: "Ads Reels",
    icon: "▶◈",
    keywords: ["ads reel", "ad reel", "reel ad", "paid reel", "sponsored reel", "video ad", "reel advertisement"],
  },
  {
    key: "ads_carousel",
    label: "Ads Carousel",
    icon: "◫◈",
    keywords: ["ads carousel", "ad carousel", "carousel ad", "paid carousel", "sponsored carousel", "carousel advertisement"],
  },
  {
    key: "banner",
    label: "Website Banner",
    icon: "▬",
    keywords: ["website banner", "web banner", "banner", "hero banner", "landing banner", "site banner", "header banner"],
  },
  {
    key: "catalogue",
    label: "Catalogue",
    icon: "⊟",
    keywords: ["catalogue", "catalog", "catalogue image", "catalog image", "product catalogue", "product catalog", "lookbook"],
  },
] as const;

type ContentFilterKey = (typeof CONTENT_FILTERS)[number]["key"] | null;

/** Returns true if the task text matches any keyword for the given filter */
function taskMatchesContentFilter(task: Task, filterKey: ContentFilterKey): boolean {
  if (!filterKey) return true;
  const filter = CONTENT_FILTERS.find((f) => f.key === filterKey);
  if (!filter) return true;

  const haystack = [
    task.title,
    task.description,
    task.category,
    task.subCategory,
    task.taskType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return filter.keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

// ── Quick-month presets ──────────────────────────────────────────────────────
const MONTH_PRESETS = [
  {
    label: "This Month",
    getValue: () => {
      const n = new Date();
      return {
        from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0],
        to: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0],
      };
    },
  },
  {
    label: "Last Month",
    getValue: () => {
      const n = new Date();
      return {
        from: new Date(n.getFullYear(), n.getMonth() - 1, 1).toISOString().split("T")[0],
        to: new Date(n.getFullYear(), n.getMonth(), 0).toISOString().split("T")[0],
      };
    },
  },
  {
    label: "Last 7 Days",
    getValue: () => {
      const n = new Date();
      const p = new Date(n);
      p.setDate(p.getDate() - 6);
      return { from: p.toISOString().split("T")[0], to: n.toISOString().split("T")[0] };
    },
  },
  {
    label: "Last 30 Days",
    getValue: () => {
      const n = new Date();
      const p = new Date(n);
      p.setDate(p.getDate() - 29);
      return { from: p.toISOString().split("T")[0], to: n.toISOString().split("T")[0] };
    },
  },
  {
    label: "Last 3 Mo",
    getValue: () => {
      const n = new Date();
      return {
        from: new Date(n.getFullYear(), n.getMonth() - 2, 1).toISOString().split("T")[0],
        to: n.toISOString().split("T")[0],
      };
    },
  },
];

// ── DateRangeFilter ──────────────────────────────────────────────────────────
function DateRangeFilter({
  from,
  to,
  onChange,
  onClear,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from, to });
  const active = !!(from || to);

  function applyPreset(preset: (typeof MONTH_PRESETS)[0]) {
    const v = preset.getValue();
    onChange(v.from, v.to);
    setDraft(v);
    setOpen(false);
  }

  function applyCustom() {
    onChange(draft.from, draft.to);
    setOpen(false);
  }

  function handleClear() {
    setDraft({ from: "", to: "" });
    onClear();
    setOpen(false);
  }

  useEffect(() => {
    setDraft({ from, to });
  }, [from, to]);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${active ? "rgba(255,255,255,0.25)" : "var(--border-0)"}`,
          background: active ? "rgba(255,255,255,0.07)" : "transparent",
          color: active ? "var(--text-0)" : "var(--text-2)",
          fontSize: 11,
          cursor: "pointer",
          transition: "all .15s",
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {active
          ? `${from ? formatDate(from) : "…"} → ${to ? formatDate(to) : "…"}`
          : "Date Range"}
        {active && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            style={{ marginLeft: 2, opacity: 0.5, lineHeight: 1, cursor: "pointer" }}
          >
            ✕
          </span>
        )}
        <svg
          width="8"
          height="8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              zIndex: 100,
              background: "var(--surface-1)",
              border: "1px solid var(--border-0)",
              borderRadius: "var(--radius-md)",
              padding: 14,
              width: 260,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <p
              style={{
                fontSize: 10,
                color: "var(--text-2)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              Quick Select
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
              {MONTH_PRESETS.map((p) => {
                const v = p.getValue();
                const isActive = from === v.from && to === v.to;
                return (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    style={{
                      fontSize: 10,
                      padding: "3px 8px",
                      borderRadius: 999,
                      border: `1px solid ${isActive ? "rgba(255,255,255,0.3)" : "var(--border-0)"}`,
                      background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                      color: isActive ? "var(--text-0)" : "var(--text-2)",
                      cursor: "pointer",
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <p
              style={{
                fontSize: 10,
                color: "var(--text-2)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              Custom Range
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div>
                <p style={{ fontSize: 10, color: "var(--text-2)", marginBottom: 4 }}>From</p>
                <input
                  className="input"
                  type="date"
                  style={{ fontSize: 11, padding: "5px 8px" }}
                  value={draft.from}
                  onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                />
              </div>
              <div>
                <p style={{ fontSize: 10, color: "var(--text-2)", marginBottom: 4 }}>To</p>
                <input
                  className="input"
                  type="date"
                  style={{ fontSize: 11, padding: "5px 8px" }}
                  value={draft.to}
                  onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: 11 }}
                onClick={handleClear}
              >
                Clear
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, fontSize: 11 }}
                disabled={!draft.from && !draft.to}
                onClick={applyCustom}
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── ContentTypeFilter ────────────────────────────────────────────────────────
function ContentTypeFilter({
  value,
  onChange,
}: {
  value: ContentFilterKey;
  onChange: (v: ContentFilterKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = value !== null;
  const current = CONTENT_FILTERS.find((f) => f.key === value);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${active ? "rgba(255,255,255,0.25)" : "var(--border-0)"}`,
          background: active ? "rgba(255,255,255,0.07)" : "transparent",
          color: active ? "var(--text-0)" : "var(--text-2)",
          fontSize: 11,
          cursor: "pointer",
          transition: "all .15s",
          whiteSpace: "nowrap",
        }}
      >
        {/* film-strip icon */}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="20" rx="2" />
          <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5" />
        </svg>
        {active ? current?.label : "Content Type"}
        {active && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false); }}
            style={{ marginLeft: 2, opacity: 0.5, lineHeight: 1, cursor: "pointer" }}
          >
            ✕
          </span>
        )}
        <svg
          width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              zIndex: 100,
              background: "var(--surface-1)",
              border: "1px solid var(--border-0)",
              borderRadius: "var(--radius-md)",
              padding: 10,
              width: 220,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <p style={{ fontSize: 10, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, paddingLeft: 4 }}>
              Filter by content type
            </p>

            {/* "All" option */}
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "7px 8px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: value === null ? "rgba(255,255,255,0.08)" : "transparent",
                color: value === null ? "var(--text-0)" : "var(--text-2)",
                fontSize: 12,
                cursor: "pointer",
                textAlign: "left",
                transition: "background .12s",
              }}
            >
              <span style={{ fontSize: 11, width: 18, textAlign: "center", opacity: 0.5 }}>✦</span>
              All types
              {value === null && (
                <svg style={{ marginLeft: "auto" }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>

            <div style={{ height: 1, background: "var(--border-0)", margin: "6px 0" }} />

            {CONTENT_FILTERS.map((f) => {
              const isSelected = value === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => { onChange(f.key); setOpen(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "7px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background: isSelected ? "rgba(255,255,255,0.08)" : "transparent",
                    color: isSelected ? "var(--text-0)" : "var(--text-2)",
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background .12s",
                  }}
                >
                  <span style={{ fontSize: 10, width: 18, textAlign: "center", letterSpacing: "-0.02em", opacity: isSelected ? 1 : 0.5 }}>
                    {f.icon}
                  </span>
                  {f.label}
                  {isSelected && (
                    <svg style={{ marginLeft: "auto" }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── RangeDateChart ───────────────────────────────────────────────────────────
function RangeDateChart({
  labels,
  intData,
  cliData,
  ovdData,
}: {
  labels: string[];
  intData: number[];
  cliData: number[];
  ovdData: number[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Store the chart instance so we can destroy it on re-render
  const chartRef = useRef<unknown>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    // Chart.js loaded as UMD global via <script> in layout
    const ChartJS = (window as unknown as { Chart: new (...args: unknown[]) => { destroy: () => void } }).Chart;
    if (!ChartJS) return;

    // Destroy previous instance to avoid "Canvas already in use" error
    if (chartRef.current) {
      (chartRef.current as { destroy: () => void }).destroy();
    }

    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const gridCol = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
    const lblCol  = isDark ? "#666" : "#999";

    chartRef.current = new ChartJS(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Internal",
            data: intData,
            backgroundColor: "#3b82f6",
            borderRadius: 3,
            barThickness: labels.length > 10 ? 8 : 12,
          },
          {
            label: "Client",
            data: cliData,
            backgroundColor: "#a78bfa",
            borderRadius: 3,
            barThickness: labels.length > 10 ? 8 : 12,
          },
          {
            label: "Overdue",
            data: ovdData,
            backgroundColor: "#ef4444",
            borderRadius: 3,
            barThickness: labels.length > 10 ? 8 : 12,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(0,0,0,0.85)",
            titleFont: { size: 11 },
            bodyFont: { size: 11 },
            padding: 8,
            callbacks: {
              title: (items: { label: string }[]) => items[0]?.label,
              label: (item: { dataset: { label: string }; raw: number }) =>
                ` ${item.dataset.label}: ${item.raw}`,
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            ticks: {
              color: lblCol,
              font: { size: 10 },
              maxRotation: labels.length > 8 ? 45 : 0,
              autoSkip: labels.length > 14,
            },
            grid: { display: false },
          },
          y: {
            stacked: true,
            ticks: { color: lblCol, font: { size: 10 }, stepSize: 1, precision: 0 },
            grid: { color: gridCol },
            beginAtZero: true,
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        (chartRef.current as { destroy: () => void }).destroy();
        chartRef.current = null;
      }
    };
  }, [labels, intData, cliData, ovdData]);

  return (
    <div>
      <p
        style={{
          fontSize: 10,
          color: "var(--text-2)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
          fontWeight: 500,
        }}
      >
        Tasks by end date
      </p>
      <div style={{ position: "relative", width: "100%", height: 140 }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Stacked bar chart showing internal, client and overdue task counts grouped by end date"
        />
      </div>
      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
        {(
          [
            ["#3b82f6", "Internal"],
            ["#a78bfa", "Client"],
            ["#ef4444", "Overdue"],
          ] as [string, string][]
        ).map(([color, label]) => (
          <span
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              color: "var(--text-2)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: color,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── RangeSummary ─────────────────────────────────────────────────────────────
function RangeSummary({
  tasks,
  from,
  to,
}: {
  tasks: Task[];
  from: string;
  to: string;
}) {
  // Only render when a date filter is active
  if (!from && !to) return null;

  const total     = tasks.length;
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  const inProg    = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const pending   = tasks.filter((t) => t.status === "PENDING").length;
  const overdue   = tasks.filter(
    (t) => new Date(t.endDate) < new Date() && t.status !== "COMPLETED"
  ).length;
  const internal  = tasks.filter((t) => t._type === "internal").length;
  const client    = tasks.filter((t) => t._type === "client").length;
  const rate      = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Group by end date for the chart
  const byDate: Record<string, { internal: number; client: number; overdue: number }> = {};
  tasks.forEach((t) => {
    const d = t.endDate.split("T")[0];
    if (!byDate[d]) byDate[d] = { internal: 0, client: 0, overdue: 0 };
    if (t._type === "internal") byDate[d].internal++;
    else byDate[d].client++;
    if (new Date(t.endDate) < new Date() && t.status !== "COMPLETED") byDate[d].overdue++;
  });
  const sortedDates = Object.keys(byDate).sort();
  const chartLabels = sortedDates.map((d) => formatDate(d));
  const intData     = sortedDates.map((d) => byDate[d].internal);
  const cliData     = sortedDates.map((d) => byDate[d].client);
  const ovdData     = sortedDates.map((d) => byDate[d].overdue);

  const stats = [
    { label: "Total in range", value: String(total),        color: "var(--text-0)" },
    { label: "Completed",      value: `${completed} (${rate}%)`, color: "#4ade80" },
    { label: "In Progress",    value: String(inProg),        color: "var(--text-1)" },
    { label: "Pending",        value: String(pending),       color: "var(--text-2)" },
    { label: "Overdue",        value: String(overdue),       color: "#ef4444" },
    { label: "Internal / Client", value: `${internal} / ${client}`, color: "var(--text-2)" },
  ];

  return (
    <div
      style={{
        padding: "14px 20px",
        borderBottom: "1px solid var(--border-0)",
        background: "var(--surface-2)",
      }}
    >
      {/* Section label */}
      <p
        style={{
          fontSize: 10,
          color: "var(--text-2)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 10,
          fontWeight: 500,
        }}
      >
        Range Summary
        {from && to && (
          <span style={{ marginLeft: 6, fontWeight: 400 }}>
            — {formatDate(from)} to {formatDate(to)}
          </span>
        )}
      </p>

      {/* Stat pills */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: total > 0 && sortedDates.length > 0 ? 14 : 0,
        }}
      >
        {stats.map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: "var(--surface-3)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-0)",
              padding: "7px 12px",
              minWidth: 70,
            }}
          >
            <p
              style={{
                fontSize: 18,
                fontWeight: 600,
                color,
                lineHeight: 1.1,
                fontFamily: '"Bebas Neue", sans-serif',
                letterSpacing: "0.04em",
              }}
            >
              {value}
            </p>
            <p
              style={{
                fontSize: 9,
                color: "var(--text-2)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginTop: 3,
              }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Date-wise chart — only if there are tasks with distinct end dates */}
      {total > 0 && sortedDates.length > 0 && (
        <div
          style={{
            background: "var(--surface-3)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-0)",
            padding: "12px 14px",
          }}
        >
          <RangeDateChart
            labels={chartLabels}
            intData={intData}
            cliData={cliData}
            ovdData={ovdData}
          />
        </div>
      )}

      {/* Empty state within range */}
      {total === 0 && (
        <p style={{ fontSize: 11, color: "var(--text-2)", fontStyle: "italic" }}>
          No tasks fall within this date range.
        </p>
      )}
    </div>
  );
}

// ── TaskModal ────────────────────────────────────────────────────────────────
function TaskModal({
  employeeId,
  task,
  onClose,
  onSave,
}: {
  employeeId: string;
  task?: Task | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isClient = task?._type === "client";
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    priority: task?.priority || "MEDIUM",
    status: task?.status || "PENDING",
    startDate: task?.startDate
      ? task.startDate.split("T")[0]
      : new Date().toISOString().split("T")[0],
    endDate: task?.endDate ? task.endDate.split("T")[0] : "",
    employeeId,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const statuses = isClient ? CLI_S : INT_S;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = task
        ? isClient
          ? `/api/client-tasks/${task.id}`
          : `/api/tasks/${task.id}`
        : `/api/tasks`;
      const res = await fetch(url, {
        method: task ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      onSave();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop anim-in">
      <div className="modal anim-scale">
        <div className="modal-header">
          <div>
            <p className="section-title">{task ? "Edit Task" : "Assign Task"}</p>
            {isClient && task?.client && (
              <p style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>
                Client: {task.client.company || task.client.name}
              </p>
            )}
          </div>
          <button className="btn-ghost btn-icon" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {error && (
            <div
              style={{
                padding: "8px 12px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "var(--radius-sm)",
                color: "#ef4444",
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}
          <form
            onSubmit={submit}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div>
              <p className="label" style={{ marginBottom: 5 }}>
                Title *
              </p>
              <input
                className="input"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Task name…"
                disabled={isClient}
              />
            </div>
            <div>
              <p className="label" style={{ marginBottom: 5 }}>
                Description
              </p>
              <textarea
                className="input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                style={{ minHeight: 60 }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <p className="label" style={{ marginBottom: 5 }}>
                  Priority
                </p>
                <select
                  className="input"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  {PRIS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="label" style={{ marginBottom: 5 }}>
                  Status
                </p>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="label" style={{ marginBottom: 5 }}>
                  Start Date *
                </p>
                <input
                  className="input"
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <p className="label" style={{ marginBottom: 5 }}>
                  End Date *
                </p>
                <input
                  className="input"
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={loading}
              >
                {loading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : null}
                {loading ? "Saving…" : task ? "Save Changes" : "Assign"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── PortalSettings ───────────────────────────────────────────────────────────
function PortalSettings({
  employeeId,
  portalEnabled,
  onSave,
}: {
  employeeId: string;
  portalEnabled: boolean;
  onSave: () => void;
}) {
  const [pw, setPw]           = useState("");
  const [enabled, setEnabled] = useState(portalEnabled);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch(`/api/employees/${employeeId}/set-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw || undefined, portalEnabled: enabled }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(d.error || "Failed");
      return;
    }
    setSaved(true);
    setPw("");
    setTimeout(() => setSaved(false), 3000);
    onSave();
  }

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/employee-login`
      : "/employee-login";

  return (
    <div className="card" style={{ padding: 16, marginTop: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-0)", marginBottom: 12 }}>
        Portal Access
      </p>
      {error && (
        <div
          style={{
            padding: "6px 10px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "var(--radius-sm)",
            color: "#ef4444",
            fontSize: 11,
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      )}
      {saved && (
        <div
          style={{
            padding: "6px 10px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-1)",
            fontSize: 11,
            marginBottom: 10,
          }}
        >
          ✓ Saved
        </div>
      )}
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 10px",
            background: "var(--surface-3)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <div>
            <p style={{ fontSize: 12, color: "var(--text-1)" }}>Enable Portal</p>
            <p style={{ fontSize: 10, color: "var(--text-2)", marginTop: 1 }}>
              {enabled ? "Employee can log in" : "Disabled"}
            </p>
          </div>
          <label className="toggle-wrap">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
        <div>
          <p className="label" style={{ marginBottom: 5 }}>
            {portalEnabled ? "Change Password" : "Set Password"}
          </p>
          <input
            className="input"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder={portalEnabled ? "Leave blank to keep current" : "Min 6 characters"}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
          style={{ fontSize: 12 }}
        >
          {saving ? <span className="spinner" style={{ width: 12, height: 12 }} /> : null}
          Save Portal Settings
        </button>
      </form>
      <div
        style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-0)" }}
      >
        <p style={{ fontSize: 10, color: "var(--text-2)", marginBottom: 5 }}>Share this link:</p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 8px",
            background: "var(--surface-3)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "var(--text-1)",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {url}
          </span>
          <button
            type="button"
            className="btn-ghost btn-icon"
            style={{ padding: 3 }}
            onClick={() => navigator.clipboard.writeText(url)}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeeDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [employee, setEmployee]       = useState<Employee | null>(null);
  const [allTasks, setAllTasks]       = useState<Task[]>([]);
  const [loading, setLoading]         = useState(true);
  const [taskModal, setTaskModal]     = useState<"add" | "edit" | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editEmp, setEditEmp]         = useState(false);
  const [form, setForm]               = useState({ name: "", email: "", phone: "", department: "", position: "", status: "" });
  const [saving, setSaving]           = useState(false);
  const [tabSource, setTabSource]     = useState<"all" | "internal" | "client">("all");

  // ── Date range state ──────────────────────────────────────────────────────
  const [dateFrom, setDateFrom]           = useState("");
  const [dateTo, setDateTo]               = useState("");

  // ── Content type filter ───────────────────────────────────────────────────
  const [contentFilter, setContentFilter] = useState<ContentFilterKey>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [er, cr] = await Promise.all([
      fetch(`/api/employees/${id}`),
      fetch(`/api/client-tasks?employeeId=${id}`),
    ]);
    if (!er.ok) {
      router.push("/dashboard/employees");
      return;
    }
    const [ed, cd] = await Promise.all([er.json(), cr.json()]);
    setEmployee(ed);
    setForm({
      name: ed.name,
      email: ed.email,
      phone: ed.phone || "",
      department: ed.department,
      position: ed.position,
      status: ed.status,
    });
    const internal: Task[] = (ed.tasks || []).map(
      (t: Omit<Task, "_type" | "client">) => ({ ...t, _type: "internal" as const })
    );
    const client: Task[] = (Array.isArray(cd) ? cd : []).map(
      (t: Task & { client: { id: string; name: string; company?: string } }) => ({
        ...t,
        _type: "client" as const,
      })
    );
    setAllTasks([...internal, ...client]);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function markComplete(task: Task) {
    const url =
      task._type === "client"
        ? `/api/client-tasks/${task.id}`
        : `/api/tasks/${task.id}`;
    await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    load();
  }

  async function deleteTask(task: Task) {
    const url =
      task._type === "client"
        ? `/api/client-tasks/${task.id}`
        : `/api/tasks/${task.id}`;
    await fetch(url, { method: "DELETE" });
    load();
  }

  async function saveEmployee(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setEditEmp(false);
    load();
  }

  // ── Filtering logic ───────────────────────────────────────────────────────
  const dateFiltered = useMemo(() => {
    if (!dateFrom && !dateTo) return allTasks;
    return allTasks.filter((task) => {
      const start = task.startDate.split("T")[0];
      const end   = task.endDate.split("T")[0];
      if (dateFrom && end < dateFrom) return false;
      if (dateTo && start > dateTo)   return false;
      return true;
    });
  }, [allTasks, dateFrom, dateTo]);

  // Apply content type filter on top of date filter
  const contentFiltered = useMemo(
    () =>
      contentFilter
        ? dateFiltered.filter((t) => taskMatchesContentFilter(t, contentFilter))
        : dateFiltered,
    [dateFiltered, contentFilter]
  );

  const internal = contentFiltered.filter((t) => t._type === "internal");
  const client   = contentFiltered.filter((t) => t._type === "client");
  const visible  =
    tabSource === "internal"
      ? internal
      : tabSource === "client"
      ? client
      : contentFiltered;

  // Stats always based on full allTasks for sidebar
  const totalDone = allTasks.filter((t) => t.status === "COMPLETED").length;
  const rate      = allTasks.length > 0 ? Math.round((totalDone / allTasks.length) * 100) : 0;

  const dateActive    = !!(dateFrom || dateTo);
  const contentActive = contentFilter !== null;
  const anyFilter     = dateActive || contentActive;

  if (loading)
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="spinner" />
      </div>
    );
  if (!employee) return null;

  return (
    <div style={{ padding: "40px 36px", maxWidth: 1200, margin: "0 auto" }}>
      <Link
        href="/dashboard/employees"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--text-2)",
          fontSize: 12,
          textDecoration: "none",
          marginBottom: 28,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
        {/* ── Profile Sidebar ── */}
        <div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                className="avatar avatar-lg"
                style={{ margin: "0 auto 10px", borderRadius: 14 }}
              >
                {employee.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-0)" }}>
                {employee.name}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
                {employee.position}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "var(--surface-3)",
                    border: "1px solid var(--border-2)",
                    color: "var(--text-1)",
                  }}
                >
                  {employee.department}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "var(--surface-3)",
                    border: "1px solid var(--border-2)",
                    color: "var(--text-2)",
                  }}
                >
                  {employee.status.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}
            >
              {(
                [
                  ["Total", allTasks.length],
                  ["Done", totalDone],
                  [
                    "Internal",
                    allTasks.filter((t) => t._type === "internal" && t.status === "COMPLETED").length,
                  ],
                  [
                    "Client",
                    allTasks.filter((t) => t._type === "client" && t.status === "COMPLETED").length,
                  ],
                ] as [string, number][]
              ).map(([l, v]) => (
                <div
                  key={l}
                  style={{
                    background: "var(--surface-2)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 6px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: 20,
                      fontFamily: '"Bebas Neue", sans-serif',
                      color: "var(--text-0)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {v}
                  </p>
                  <p
                    style={{
                      fontSize: 9,
                      color: "var(--text-2)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginTop: 1,
                    }}
                  >
                    {l}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <p style={{ fontSize: 10, color: "var(--text-2)" }}>Completion</p>
                <p style={{ fontSize: 10, fontWeight: 500, color: "var(--text-0)" }}>{rate}%</p>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${rate}%` }} />
              </div>
            </div>

            {/* Contact / Edit */}
            {!editEmp ? (
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-2)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {employee.email}
                    </span>
                  </div>
                  {employee.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2.74h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z" />
                      </svg>
                      <span style={{ fontSize: 11, color: "var(--text-2)" }}>{employee.phone}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span style={{ fontSize: 11, color: "var(--text-2)" }}>
                      Joined {formatDate(employee.joinedAt)}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 12 }}
                    onClick={() => setEditEmp(true)}
                  >
                    Edit Profile
                  </button>
                  <Link
                    href={`/dashboard/employees/${id}/attendance`}
                    className="btn btn-secondary"
                    style={{ fontSize: 12, textDecoration: "none", justifyContent: "center" }}
                  >
                    View Attendance
                  </Link>
                </div>
              </div>
            ) : (
              <form
                onSubmit={saveEmployee}
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                {(
                  [
                    { k: "name",     l: "Name",     req: true },
                    { k: "email",    l: "Email",    req: true },
                    { k: "phone",    l: "Phone",    req: false },
                    { k: "position", l: "Position", req: true },
                  ] as { k: keyof typeof form; l: string; req: boolean }[]
                ).map(({ k, l, req }) => (
                  <div key={k}>
                    <p className="label" style={{ marginBottom: 4 }}>
                      {l}
                    </p>
                    <input
                      className="input"
                      required={req}
                      value={form[k]}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                ))}
                <div>
                  <p className="label" style={{ marginBottom: 4 }}>
                    Department
                  </p>
                  <select
                    className="input"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    style={{ fontSize: 12 }}
                  >
                    {DEPTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="label" style={{ marginBottom: 4 }}>
                    Status
                  </p>
                  <select
                    className="input"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={{ fontSize: 12 }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: 12 }}
                    onClick={() => setEditEmp(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: 12 }}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            )}
          </div>
          <PortalSettings
            employeeId={id}
            portalEnabled={employee.portalEnabled}
            onSave={load}
          />
        </div>

        {/* ── Tasks Panel ── */}
        <div className="card" style={{ overflow: "hidden", alignSelf: "start" }}>
          {/* Header */}
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--border-0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p className="section-title">Tasks</p>
              <p style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>
                {anyFilter
                  ? `${visible.filter((t) => t.status === "COMPLETED").length} of ${visible.length} in view`
                  : `${totalDone} of ${allTasks.length} completed`}
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setSelectedTask(null);
                setTaskModal("add");
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Assign
            </button>
          </div>

          {/* Tabs + filter row */}
          <div
            style={{
              padding: "10px 16px",
              borderBottom: "1px solid var(--border-0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {(
                [
                  ["all",      "All",      contentFiltered.length],
                  ["internal", "Internal", internal.length],
                  ["client",   "Client",   client.length],
                ] as const
              ).map(([k, l, c]) => (
                <button
                  key={k}
                  className={`filter-tab${tabSource === k ? " active" : ""}`}
                  style={{ fontSize: 11, padding: "4px 10px" }}
                  onClick={() => setTabSource(k)}
                >
                  {l} <span className="count">{c}</span>
                </button>
              ))}
            </div>

            {/* Right-side filters */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <ContentTypeFilter
                value={contentFilter}
                onChange={setContentFilter}
              />
              <DateRangeFilter
                from={dateFrom}
                to={dateTo}
                onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
                onClear={() => { setDateFrom(""); setDateTo(""); }}
              />
            </div>
          </div>

          {/* Active content-type badge */}
          {contentActive && (
            <div
              style={{
                padding: "6px 16px",
                background: "rgba(255,255,255,0.03)",
                borderBottom: "1px solid var(--border-0)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="2" />
                <path d="M7 2v20M17 2v20M2 12h20" />
              </svg>
              <span style={{ fontSize: 10, color: "var(--text-2)" }}>
                Showing: <span style={{ color: "var(--text-1)", fontWeight: 500 }}>
                  {CONTENT_FILTERS.find((f) => f.key === contentFilter)?.label}
                </span>
                {" "}— {visible.length} task{visible.length !== 1 ? "s" : ""} matched
              </span>
              <button
                onClick={() => setContentFilter(null)}
                style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-2)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Clear ✕
              </button>
            </div>
          )}

          {/* ── Range Summary (new) ── */}
          <RangeSummary tasks={visible} from={dateFrom} to={dateTo} />

          {/* Task list */}
          {visible.length === 0 ? (
            <div className="empty" style={{ padding: 40 }}>
              <p style={{ color: "var(--text-2)", fontSize: 12 }}>
                {contentActive
                  ? `No tasks found matching "${CONTENT_FILTERS.find((f) => f.key === contentFilter)?.label}"`
                  : dateActive
                  ? "No tasks found in this date range"
                  : tabSource === "client"
                  ? "No client tasks assigned"
                  : "No tasks assigned"}
              </p>
              {anyFilter && (
                <button
                  onClick={() => { setDateFrom(""); setDateTo(""); setContentFilter(null); }}
                  style={{ marginTop: 8, fontSize: 11, color: "var(--text-2)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div>
              {visible.map((task) => {
                const overdue =
                  new Date(task.endDate) < new Date() && task.status !== "COMPLETED";
                return (
                  <div
                    key={`${task._type}-${task.id}`}
                    style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-0)" }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      {/* Complete toggle */}
                      <button
                        onClick={() => task.status !== "COMPLETED" && markComplete(task)}
                        style={{
                          marginTop: 2,
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: `1.5px solid ${task.status === "COMPLETED" ? "#fff" : "var(--border-3)"}`,
                          background: task.status === "COMPLETED" ? "#fff" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                          transition: "all .15s",
                        }}
                      >
                        {task.status === "COMPLETED" && (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#060606" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                            marginBottom: 3,
                          }}
                        >
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color:
                                task.status === "COMPLETED"
                                  ? "var(--text-2)"
                                  : "var(--text-0)",
                              textDecoration:
                                task.status === "COMPLETED" ? "line-through" : "none",
                            }}
                          >
                            {task.title}
                          </p>
                          <span
                            style={{
                              fontSize: 9,
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                              color: "var(--text-2)",
                            }}
                          >
                            {task.priority}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <div
                              className="dot"
                              style={{
                                background: STATUS_DOT[task.status] || "#444",
                                width: 4,
                                height: 4,
                              }}
                            />
                            <span
                              style={{
                                fontSize: 9,
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                color: STATUS_TXT[task.status] || "var(--text-2)",
                              }}
                            >
                              {task.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          {task._type === "client" && task.client && (
                            <Link
                              href={`/dashboard/clients/${task.client.id}`}
                              style={{
                                fontSize: 9,
                                padding: "1px 6px",
                                borderRadius: 999,
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "var(--text-1)",
                                textDecoration: "none",
                              }}
                            >
                              {task.client.company || task.client.name}
                            </Link>
                          )}
                        </div>
                        {task.description && (
                          <p style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 3 }}>
                            {task.description}
                          </p>
                        )}
                        <p style={{ fontSize: 10, color: "var(--text-2)" }}>
                          {formatDate(task.startDate)} →{" "}
                          <span style={{ color: overdue ? "#ef4444" : "var(--text-2)" }}>
                            {formatDate(task.endDate)}
                            {overdue ? " ⚠" : ""}
                          </span>
                          {task.completedAt && (
                            <span style={{ color: "var(--text-0)", marginLeft: 6 }}>
                              ✓ {formatDate(task.completedAt)}
                            </span>
                          )}
                        </p>
                      </div>

                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        <button
                          className="btn-ghost btn-icon"
                          onClick={() => {
                            setSelectedTask(task);
                            setTaskModal("edit");
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="btn-ghost btn-icon"
                          onClick={() => deleteTask(task)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {(taskModal === "add" || taskModal === "edit") && (
        <TaskModal
          employeeId={id}
          task={taskModal === "edit" ? selectedTask : null}
          onClose={() => setTaskModal(null)}
          onSave={load}
        />
      )}
    </div>
  );
}
