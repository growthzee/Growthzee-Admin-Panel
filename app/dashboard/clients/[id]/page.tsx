"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import TaskCategoryPicker from "@/components/TaskCategoryPicker";
import TaskCategoryBadge from "@/components/TaskCategoryBadge";
import {
  MONTHS as BILLING_MONTHS,
  money,
  invoiceTotals,
  computeInvoice,
  amountInWords,
  TAX_MODES,
  INVOICE_STATUS_BADGE,
  INVOICE_STATUS_LABEL,
} from "@/lib/billing";
import { hostOf, linkTypeEmoji, linkTypeLabel } from "@/lib/workLinks";

type Employee = {
  id: string;
  name: string;
  department: string;
  position: string;
};
type ClientTask = {
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
  createdAt: string;
  employee?: Employee | null;
};
type Client = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  notes?: string;
  status: string;
  createdAt: string;
  portalEnabled: boolean;
  clientTasks: ClientTask[];
};

const PRIS = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TASK_S = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CHANGES_REQUIRED",
  "OVERDUE",
];
const CLIENT_S = ["ACTIVE", "INACTIVE", "PROSPECT"];
const S_BADGE: Record<string, string> = {
  PENDING: "badge-gray",
  IN_PROGRESS: "badge-blue",
  COMPLETED: "badge-green",
  CHANGES_REQUIRED: "badge-amber",
  OVERDUE: "badge-red",
};
const S_LABEL: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Done",
  CHANGES_REQUIRED: "Changes needed",
  OVERDUE: "Overdue",
};

function TaskModal({
  clientId,
  task,
  employees,
  onClose,
  onSave,
}: {
  clientId: string;
  task?: ClientTask | null;
  employees: Employee[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    category: task?.category || "",
    subCategory: task?.subCategory || "",
    taskType: task?.taskType || "",
    priority: task?.priority || "MEDIUM",
    status: task?.status || "PENDING",
    startDate: task?.startDate
      ? task.startDate.split("T")[0]
      : new Date().toISOString().split("T")[0],
    endDate: task?.endDate ? task.endDate.split("T")[0] : "",
    employeeId: task?.employee?.id || "",
    clientId,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill title from taskType if title is empty
  useEffect(() => {
    if (form.taskType && !task) {
      setForm((f) => ({ ...f, title: f.taskType }));
    }
  }, [form.taskType]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = task ? `/api/client-tasks/${task.id}` : "/api/client-tasks";
      const res = await fetch(url, {
        method: task ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, employeeId: form.employeeId || null }),
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
      <div className="modal anim-scale" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <p className="section-title">{task ? "Edit task" : "Create task"}</p>
          <button className="btn-ghost btn-icon" onClick={onClose}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div
          className="modal-body"
          style={{ maxHeight: "82vh", overflowY: "auto" }}
        >
          {error && (
            <div
              style={{
                padding: "8px 12px",
                background: "var(--red-bg)",
                borderRadius: "var(--r-md)",
                color: "var(--red)",
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}
          <form
            onSubmit={submit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {/* ── Category picker (3-level) ─── */}
            <div
              style={{
                padding: "14px",
                background: "var(--hover-bg)",
                borderRadius: "var(--r-lg)",
                border: "1px solid var(--border)",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--tx-tertiary)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Task Category
              </p>
              <TaskCategoryPicker
                category={form.category}
                subCategory={form.subCategory}
                taskType={form.taskType}
                onChange={(cat, sub, task_) =>
                  setForm((f) => ({
                    ...f,
                    category: cat,
                    subCategory: sub,
                    taskType: task_,
                  }))
                }
              />
            </div>

            {/* ── Title ─── */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "var(--tx-secondary)",
                  marginBottom: 5,
                }}
              >
                Title *
              </label>
              <input
                className="input"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What needs to be done?"
              />
            </div>

            {/* ── Description ─── */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "var(--tx-secondary)",
                  marginBottom: 5,
                }}
              >
                Description
              </label>
              <textarea
                className="input"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
                style={{ minHeight: 60 }}
                placeholder="Additional notes…"
              />
            </div>

            {/* ── Assign + Priority + Status ─── */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "var(--tx-secondary)",
                  marginBottom: 5,
                }}
              >
                Assign to employee
              </label>
              <select
                className="input"
                value={form.employeeId}
                onChange={(e) =>
                  setForm({ ...form, employeeId: e.target.value })
                }
              >
                <option value="">— Unassigned —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — {e.department}
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "var(--tx-secondary)",
                    marginBottom: 5,
                  }}
                >
                  Priority
                </label>
                <select
                  className="input"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                >
                  {PRIS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "var(--tx-secondary)",
                    marginBottom: 5,
                  }}
                >
                  Status
                </label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {TASK_S.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "var(--tx-secondary)",
                    marginBottom: 5,
                  }}
                >
                  Start date *
                </label>
                <input
                  className="input"
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "var(--tx-secondary)",
                    marginBottom: 5,
                  }}
                >
                  End date *
                </label>
                <input
                  className="input"
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
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
                {loading && (
                  <span
                    className="spinner"
                    style={{
                      width: 13,
                      height: 13,
                      borderTopColor: "rgba(255,255,255,0.7)",
                    }}
                  />
                )}
                {loading ? "Saving…" : task ? "Save changes" : "Create task"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function PortalSettings({
  clientId,
  portalEnabled,
  onSave,
}: {
  clientId: string;
  portalEnabled: boolean;
  onSave: () => void;
}) {
  const [pw, setPw] = useState("");
  const [enabled, setEnabled] = useState(portalEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch(`/api/clients/${clientId}/set-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: pw || undefined,
        portalEnabled: enabled,
      }),
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
      ? `${window.location.origin}/client-login`
      : "/client-login";
  return (
    <div className="card" style={{ padding: 16 }}>
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--tx-primary)",
          marginBottom: 12,
        }}
      >
        Portal Access
      </p>
      {error && (
        <div
          style={{
            padding: "6px 10px",
            background: "var(--red-bg)",
            borderRadius: "var(--r-sm)",
            color: "var(--red)",
            fontSize: 12,
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
            background: "var(--green-bg)",
            borderRadius: "var(--r-sm)",
            color: "var(--green)",
            fontSize: 12,
            marginBottom: 10,
          }}
        >
          ✓ Saved
        </div>
      )}
      <form
        onSubmit={submit}
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 10px",
            background: "var(--hover-bg)",
            borderRadius: "var(--r-sm)",
          }}
        >
          <div>
            <p style={{ fontSize: 13, color: "var(--tx-primary)" }}>
              Enable Portal
            </p>
            <p
              style={{
                fontSize: 11.5,
                color: "var(--tx-tertiary)",
                marginTop: 1,
              }}
            >
              {enabled ? "Client can log in" : "Disabled"}
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
          <label
            style={{
              display: "block",
              fontSize: 12.5,
              fontWeight: 500,
              color: "var(--tx-secondary)",
              marginBottom: 5,
            }}
          >
            {portalEnabled ? "Change Password" : "Set Password"}
          </label>
          <input
            className="input"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder={
              portalEnabled ? "Leave blank to keep current" : "Min 6 characters"
            }
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
          style={{ fontSize: 12.5 }}
        >
          {saving && (
            <span
              className="spinner"
              style={{
                width: 12,
                height: 12,
                borderTopColor: "rgba(255,255,255,0.7)",
              }}
            />
          )}
          Save portal settings
        </button>
      </form>
      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--border)",
        }}
      >
        <p
          style={{
            fontSize: 11.5,
            color: "var(--tx-tertiary)",
            marginBottom: 5,
          }}
        >
          Portal login link:
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 8px",
            background: "var(--hover-bg)",
            borderRadius: "var(--r-sm)",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--tx-secondary)",
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
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "tasks", label: "Tasks" },
  { key: "workUrls", label: "Work URLs" },
  { key: "targets", label: "Targets" },
  { key: "invoices", label: "Invoices" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

type WorkLink = {
  id: string; title: string; url: string; linkType: string; note?: string | null; createdAt: string;
  employee?: { id: string; name: string; department: string; position: string } | null;
};

/** Deliverable URLs submitted by employees from their portal */
function WorkUrlsTab({ clientId }: { clientId: string }) {
  const [links, setLinks] = useState<WorkLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/work-links?clientId=${clientId}`);
    const d = await res.json();
    setLinks(Array.isArray(d) ? d : []);
    setLoading(false);
  }, [clientId]);
  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    await fetch(`/api/work-links/${id}`, { method: "DELETE" });
    load();
  }

  const typesPresent = Array.from(new Set(links.map((l) => l.linkType)));
  const q = search.trim().toLowerCase();
  const filtered = links.filter((l) => {
    if (typeFilter !== "All" && l.linkType !== typeFilter) return false;
    if (q) {
      const hay = [l.title, l.note, l.url, l.employee?.name].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="card tab-fade" style={{ overflow: "hidden" }}>
      <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ marginRight: "auto" }}>
          <p className="section-title">Work URLs ({filtered.length})</p>
          <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginTop: 2 }}>
            Drive, Docs, Sheets and PDFs submitted by the team for this client
          </p>
        </div>
        {typesPresent.length > 1 && (
          <div className="filter-tabs-wrap">
            <button className={`filter-tab${typeFilter === "All" ? " active" : ""}`} onClick={() => setTypeFilter("All")}>
              All <span className="count">{links.length}</span>
            </button>
            {typesPresent.map((t) => (
              <button key={t} className={`filter-tab${typeFilter === t ? " active" : ""}`} onClick={() => setTypeFilter(t)}>
                {linkTypeEmoji(t)} {linkTypeLabel(t)}
              </button>
            ))}
          </div>
        )}
        <div className="search-wrap" style={{ maxWidth: 190 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search links…" />
        </div>
      </div>

      {loading ? (
        <div className="empty" style={{ padding: 50 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty" style={{ padding: 60 }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>🔗</p>
          <p style={{ fontWeight: 600, color: "var(--tx-secondary)" }}>
            {links.length === 0 ? "No work links submitted yet" : "No links match your search"}
          </p>
          <p style={{ fontSize: 13 }}>
            {links.length === 0
              ? "Employees submit these from their portal under “Work links”"
              : "Try a different type or search term"}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr><th>Deliverable</th><th>Type</th><th>Submitted by</th><th>Submitted</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} onClick={() => window.open(l.url, "_blank")} title="Open link">
                  <td style={{ maxWidth: 300 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {linkTypeEmoji(l.linkType)} {l.title}
                    </p>
                    <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {hostOf(l.url)}{l.note ? ` · ${l.note}` : ""}
                    </p>
                  </td>
                  <td><span className="badge badge-purple">{linkTypeLabel(l.linkType)}</span></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {l.employee ? (
                      <Link href={`/dashboard/employees/${l.employee.id}`} style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                        <div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>
                          {l.employee.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <span style={{ fontSize: 12.5, color: "var(--tx-secondary)", whiteSpace: "nowrap" }}>{l.employee.name}</span>
                      </Link>
                    ) : <span style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>—</span>}
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--tx-tertiary)", whiteSpace: "nowrap" }}>{formatDate(l.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                      <a href={l.url} target="_blank" rel="noreferrer" className="btn-ghost btn-icon" title="Open link">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                      </a>
                      <button className="btn-ghost btn-icon" title="Remove" onClick={() => remove(l.id)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type MonthlyTarget = { id: string; year: number; month: number; target: number; note?: string | null };
type InvoiceItem = { id: string; description: string; quantity: number; unitPrice: number };
type Invoice = {
  id: string; number: string; issueDate: string; dueDate?: string | null;
  periodYear?: number | null; periodMonth?: number | null; currency: string;
  taxPercent: number; notes?: string | null; status: string; items: InvoiceItem[];
};

/** Set / update the monthly delivery quota for this client */
function TargetsTab({ clientId, tasks }: { clientId: string; tasks: ClientTask[] }) {
  const now = new Date();
  const [targets, setTargets] = useState<MonthlyTarget[]>([]);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/monthly-targets?clientId=${clientId}`);
    const d = await res.json();
    setTargets(Array.isArray(d) ? d : []);
  }, [clientId]);
  useEffect(() => { load(); }, [load]);

  // Prefill the input when the selected month already has a target
  useEffect(() => {
    const existing = targets.find((t) => t.year === year && t.month === month);
    setValue(existing ? String(existing.target) : "");
    setNote(existing?.note || "");
  }, [targets, year, month]);

  /** Deliveries = client tasks completed within that month */
  function deliveredIn(y: number, m: number) {
    return tasks.filter((t) => {
      if (!t.completedAt) return false;
      const d = new Date(t.completedAt);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    }).length;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/monthly-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, year, month, target: Number(value) || 0, note }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to save");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally { setSaving(false); }
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="tab-fade" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
          <p className="section-title">Monthly delivery targets</p>
          <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginTop: 2 }}>
            Deliveries counted from tasks completed in each month
          </p>
        </div>
        {targets.length === 0 ? (
          <div className="empty" style={{ padding: 50 }}>
            <p style={{ fontSize: 22, marginBottom: 6 }}>🎯</p>
            <p style={{ fontWeight: 600, color: "var(--tx-secondary)" }}>No targets set yet</p>
            <p style={{ fontSize: 13 }}>Set a monthly quota so the client can track progress</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Month</th><th>Target</th><th>Delivered</th><th>Progress</th></tr>
            </thead>
            <tbody>
              {targets.map((t) => {
                const delivered = deliveredIn(t.year, t.month);
                const pct = t.target > 0 ? Math.min(100, Math.round((delivered / t.target) * 100)) : 0;
                const col = pct >= 100 ? "var(--green)" : pct >= 60 ? "var(--amber)" : "var(--red)";
                return (
                  <tr key={t.id} onClick={() => { setYear(t.year); setMonth(t.month); }} title="Edit this month">
                    <td style={{ fontSize: 13, fontWeight: 500, color: "var(--tx-primary)" }}>
                      {BILLING_MONTHS[t.month - 1]} {t.year}
                      {t.note && <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", fontWeight: 400 }}>{t.note}</p>}
                    </td>
                    <td><span className="badge badge-purple">{t.target}</span></td>
                    <td style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-primary)" }}>{delivered}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="mini-progress-track"><div className="mini-progress-fill" style={{ width: `${pct}%`, background: col }} /></div>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: col }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ padding: 18 }}>
        <p className="section-title" style={{ marginBottom: 12 }}>Set a monthly target</p>
        {error && (
          <div style={{ padding: "8px 11px", background: "var(--red-bg)", borderRadius: "var(--r-md)", color: "var(--red)", fontSize: 12.5, marginBottom: 12 }}>{error}</div>
        )}
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label className="label" style={{ marginBottom: 5 }}>Month</label>
              <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {BILLING_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label" style={{ marginBottom: 5 }}>Year</label>
              <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label" style={{ marginBottom: 5 }}>Total deliveries expected *</label>
            <input className="input" type="number" min={0} required value={value}
              onChange={(e) => setValue(e.target.value)} placeholder="e.g. 20" />
          </div>
          <div>
            <label className="label" style={{ marginBottom: 5 }}>Note (optional)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 12 creatives + 8 reels" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" style={{ width: 12, height: 12, borderTopColor: "rgba(255,255,255,0.7)" }} />}
            Save target
          </button>
        </form>
        <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
          The client sees this as a progress bar in their portal for the selected month.
        </p>
      </div>
    </div>
  );
}

/** Raise and manage invoices for this client */
function InvoicesTab({ clientId, client }: { clientId: string; client: Client }) {
  const now = new Date();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/invoices?clientId=${clientId}`);
    const d = await res.json();
    setInvoices(Array.isArray(d) ? d : []);
    setLoading(false);
  }, [clientId]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/invoices/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    load();
  }
  async function remove(id: string) {
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="tab-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ marginRight: "auto" }}>
            <p className="section-title">Invoices</p>
            <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginTop: 2 }}>
              {invoices.length} raised · client sees these in their portal
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm((s) => !s)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Raise invoice
          </button>
        </div>

        {loading ? (
          <div className="empty" style={{ padding: 50 }}><div className="spinner" /></div>
        ) : invoices.length === 0 ? (
          <div className="empty" style={{ padding: 50 }}>
            <p style={{ fontSize: 22, marginBottom: 6 }}>🧾</p>
            <p style={{ fontWeight: 600, color: "var(--tx-secondary)" }}>No invoices yet</p>
            <p style={{ fontSize: 13 }}>Raise one and it appears in the client portal instantly</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Invoice</th><th>Invoice date</th><th>Period</th><th>Amount</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const { total } = invoiceTotals(inv.items, inv.taxPercent);
                return (
                  <tr key={inv.id} onClick={() => window.open(`/invoice/${inv.id}`, "_blank")} title="Open printable invoice">
                    <td style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-primary)" }}>{inv.number}</td>
                    <td style={{ fontSize: 12.5, color: "var(--tx-secondary)" }}>{formatDate(inv.issueDate)}</td>
                    <td style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>
                      {inv.periodMonth && inv.periodYear ? `${BILLING_MONTHS[inv.periodMonth - 1]} ${inv.periodYear}` : "—"}
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-primary)" }}>{money(total, inv.currency)}</td>
                    <td><span className={`badge ${INVOICE_STATUS_BADGE[inv.status] || "badge-gray"}`}>{INVOICE_STATUS_LABEL[inv.status] || inv.status}</span></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                        <a href={`/invoice/${inv.id}`} target="_blank" rel="noreferrer" className="btn-ghost btn-icon" title="View / download PDF">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        </a>
                        {inv.status !== "PAID" && (
                          <button className="btn-ghost btn-icon" title="Mark paid" onClick={() => setStatus(inv.id, "PAID")}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                          </button>
                        )}
                        <button className="btn-ghost btn-icon" title="Delete" onClick={() => remove(inv.id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <InvoiceForm
          clientId={clientId}
          client={client}
          defaultYear={now.getFullYear()}
          defaultMonth={now.getMonth() + 1}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

type LineItem = { description: string; hsnCode: string; quantity: string; unitPrice: string };

function InvoiceForm({ clientId, client, defaultYear, defaultMonth, onClose, onSaved }: {
  clientId: string;
  client: Client;
  defaultYear: number; defaultMonth: number;
  onClose: () => void; onSaved: () => void;
}) {
  const today = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const [f, setF] = useState({
    issueDate: iso(today), dueDate: "", periodYear: defaultYear, periodMonth: defaultMonth,
    currency: "INR", notes: "",
    // seller
    sellerName: "", sellerAddress: "", sellerGstin: "", sellerPan: "",
    sellerPhone: "", sellerEmail: "", sellerWebsite: "",
    // buyer
    buyerGstin: "", buyerAddress: "", placeOfSupply: "",
    // tax
    taxMode: "GST_SPLIT", taxPercent: "0", cgstPercent: "9", sgstPercent: "9", igstPercent: "18",
    // adjustments
    discount: "0", roundOff: "0",
    // references
    poNumber: "", projectRef: "",
    // terms
    paymentTerms: "", lateFeeNote: "", signatureName: "",
    // bank
    bankName: "", bankAccountName: "", bankAccountNumber: "", bankIfsc: "", bankBranch: "", upiId: "",
  });
  const [items, setItems] = useState<LineItem[]>([{ description: "", hsnCode: "", quantity: "1", unitPrice: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) { setF((cur) => ({ ...cur, [k]: v })); }

  // Prefill the seller / bank / terms blocks from the saved company profile
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/company-profile");
      if (!res.ok) return;
      const p = await res.json();
      setF((cur) => ({
        ...cur,
        sellerName: p.name || "", sellerAddress: p.address || "", sellerGstin: p.gstin || "",
        sellerPan: p.pan || "", sellerPhone: p.phone || "", sellerEmail: p.email || "",
        sellerWebsite: p.website || "",
        bankName: p.bankName || "", bankAccountName: p.bankAccountName || "",
        bankAccountNumber: p.bankAccountNumber || "", bankIfsc: p.bankIfsc || "",
        bankBranch: p.bankBranch || "", upiId: p.upiId || "",
        paymentTerms: p.paymentTerms || "", lateFeeNote: p.lateFeeNote || "",
        signatureName: p.signatureName || "",
        taxMode: p.defaultTaxMode || "GST_SPLIT",
        cgstPercent: String(p.defaultCgst ?? 9), sgstPercent: String(p.defaultSgst ?? 9),
        igstPercent: String(p.defaultIgst ?? 18),
        currency: p.defaultCurrency || "INR",
        buyerAddress: client.notes ? "" : "",
      }));
    })();
  }, [client]);

  const parsed = items.map((i) => ({ quantity: Number(i.quantity) || 0, unitPrice: Number(i.unitPrice) || 0 }));
  const calc = computeInvoice(parsed, {
    taxMode: f.taxMode, taxPercent: Number(f.taxPercent), cgstPercent: Number(f.cgstPercent),
    sgstPercent: Number(f.sgstPercent), igstPercent: Number(f.igstPercent),
    discount: Number(f.discount), roundOff: Number(f.roundOff),
  });

  function updateItem(idx: number, field: keyof LineItem, val: string) {
    setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          clientId,
          dueDate: f.dueDate || null,
          taxPercent: Number(f.taxPercent) || 0,
          cgstPercent: Number(f.cgstPercent) || 0,
          sgstPercent: Number(f.sgstPercent) || 0,
          igstPercent: Number(f.igstPercent) || 0,
          discount: Number(f.discount) || 0,
          roundOff: Number(f.roundOff) || 0,
          items: items
            .filter((i) => i.description.trim())
            .map((i) => ({
              description: i.description, hsnCode: i.hsnCode,
              quantity: Number(i.quantity) || 1, unitPrice: Number(i.unitPrice) || 0,
            })),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to raise invoice");
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally { setSaving(false); }
  }

  const field = (k: keyof typeof f, label: string, placeholder = "", type = "text") => (
    <div>
      <label className="label" style={{ marginBottom: 5 }}>{label}</label>
      <input className="input" type={type} value={f[k] as string} placeholder={placeholder}
        onChange={(e) => set(k, e.target.value as (typeof f)[typeof k])} />
    </div>
  );

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <p className="section-title">New invoice</p>
          <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 2 }}>
            Company, bank and terms are prefilled from Settings
          </p>
        </div>
        <button className="btn-ghost btn-icon" onClick={onClose}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      {error && (
        <div style={{ padding: "9px 12px", background: "var(--red-bg)", borderRadius: "var(--r-md)", color: "var(--red)", fontSize: 13, marginBottom: 14 }}>{error}</div>
      )}

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* ── Invoice basics ── */}
        <div>
          <p className="label-text" style={{ marginBottom: 8 }}>Invoice details</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <div>
              <label className="label" style={{ marginBottom: 5 }}>Invoice date *</label>
              <input className="input" type="date" required value={f.issueDate} onChange={(e) => set("issueDate", e.target.value)} />
            </div>
            <div>
              <label className="label" style={{ marginBottom: 5 }}>Due date</label>
              <input className="input" type="date" value={f.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
            <div>
              <label className="label" style={{ marginBottom: 5 }}>Billing month</label>
              <select className="input" value={f.periodMonth} onChange={(e) => set("periodMonth", Number(e.target.value))}>
                {BILLING_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label" style={{ marginBottom: 5 }}>Billing year</label>
              <input className="input" type="number" value={f.periodYear} onChange={(e) => set("periodYear", Number(e.target.value))} />
            </div>
            <div>
              <label className="label" style={{ marginBottom: 5 }}>Currency</label>
              <select className="input" value={f.currency} onChange={(e) => set("currency", e.target.value)}>
                {["INR", "USD", "EUR", "GBP", "AED"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {field("poNumber", "PO number", "PO-2026-014")}
            <div style={{ gridColumn: "span 2" }}>{field("projectRef", "Project / campaign ref", "August retainer")}</div>
          </div>
        </div>

        {/* ── Buyer ── */}
        <div>
          <p className="label-text" style={{ marginBottom: 8 }}>Bill to — {client.company || client.name}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {field("buyerGstin", "Client GSTIN", "22AAAAA0000A1Z5")}
            {field("placeOfSupply", "Place of supply", "Karnataka (29)")}
            <div style={{ gridColumn: "1/-1" }}>
              <label className="label" style={{ marginBottom: 5 }}>Client billing address</label>
              <textarea className="input" rows={2} style={{ minHeight: 52 }} value={f.buyerAddress}
                onChange={(e) => set("buyerAddress", e.target.value)} placeholder="Street, city, state, PIN" />
            </div>
          </div>
        </div>

        {/* ── Line items ── */}
        <div>
          <p className="label-text" style={{ marginBottom: 8 }}>Line items *</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 80px 120px 30px", gap: 7, marginBottom: 5 }}>
            {["Description", "HSN / SAC", "Qty", "Rate", ""].map((h) => (
              <span key={h} style={{ fontSize: 10.5, color: "var(--tx-tertiary)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 110px 80px 120px 30px", gap: 7 }}>
                <input className="input" placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                <input className="input" placeholder="998365" value={item.hsnCode} onChange={(e) => updateItem(idx, "hsnCode", e.target.value)} />
                <input className="input" type="number" min={0} step="0.01" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
                <input className="input" type="number" min={0} step="0.01" placeholder="0.00" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} />
                <button type="button" className="btn btn-secondary" style={{ padding: 0 }} title="Remove line"
                  onClick={() => setItems((cur) => (cur.length === 1 ? cur : cur.filter((_, i) => i !== idx)))}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}
            onClick={() => setItems((cur) => [...cur, { description: "", hsnCode: "", quantity: "1", unitPrice: "" }])}>
            + Add line
          </button>
        </div>

        {/* ── Tax & adjustments ── */}
        <div>
          <p className="label-text" style={{ marginBottom: 8 }}>Tax &amp; adjustments</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <div style={{ gridColumn: "span 2" }}>
              <label className="label" style={{ marginBottom: 5 }}>Tax mode</label>
              <select className="input" value={f.taxMode} onChange={(e) => set("taxMode", e.target.value)}>
                {TAX_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            {f.taxMode === "GST_SPLIT" && (
              <>
                <div>
                  <label className="label" style={{ marginBottom: 5 }}>CGST %</label>
                  <input className="input" type="number" min={0} step="0.01" value={f.cgstPercent} onChange={(e) => set("cgstPercent", e.target.value)} />
                </div>
                <div>
                  <label className="label" style={{ marginBottom: 5 }}>SGST %</label>
                  <input className="input" type="number" min={0} step="0.01" value={f.sgstPercent} onChange={(e) => set("sgstPercent", e.target.value)} />
                </div>
              </>
            )}
            {f.taxMode === "IGST" && (
              <div style={{ gridColumn: "span 2" }}>
                <label className="label" style={{ marginBottom: 5 }}>IGST %</label>
                <input className="input" type="number" min={0} step="0.01" value={f.igstPercent} onChange={(e) => set("igstPercent", e.target.value)} />
              </div>
            )}
            {f.taxMode === "SIMPLE" && (
              <div style={{ gridColumn: "span 2" }}>
                <label className="label" style={{ marginBottom: 5 }}>Tax %</label>
                <input className="input" type="number" min={0} step="0.01" value={f.taxPercent} onChange={(e) => set("taxPercent", e.target.value)} />
              </div>
            )}
            <div>
              <label className="label" style={{ marginBottom: 5 }}>Discount ({f.currency})</label>
              <input className="input" type="number" min={0} step="0.01" value={f.discount} onChange={(e) => set("discount", e.target.value)} />
            </div>
            <div>
              <label className="label" style={{ marginBottom: 5 }}>Round off</label>
              <input className="input" type="number" step="0.01" value={f.roundOff} onChange={(e) => set("roundOff", e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Totals preview ── */}
        <div style={{ padding: "12px 14px", background: "var(--hover-bg)", borderRadius: "var(--r-md)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 18 }}>
            <span style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>Subtotal <strong style={{ color: "var(--tx-primary)" }}>{money(calc.subtotal, f.currency)}</strong></span>
            {calc.discount > 0 && <span style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>Discount <strong style={{ color: "var(--red)" }}>−{money(calc.discount, f.currency)}</strong></span>}
            {calc.cgst > 0 && <span style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>CGST <strong style={{ color: "var(--tx-primary)" }}>{money(calc.cgst, f.currency)}</strong></span>}
            {calc.sgst > 0 && <span style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>SGST <strong style={{ color: "var(--tx-primary)" }}>{money(calc.sgst, f.currency)}</strong></span>}
            {calc.igst > 0 && <span style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>IGST <strong style={{ color: "var(--tx-primary)" }}>{money(calc.igst, f.currency)}</strong></span>}
            {calc.flatTax > 0 && <span style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>Tax <strong style={{ color: "var(--tx-primary)" }}>{money(calc.flatTax, f.currency)}</strong></span>}
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>Total {money(calc.total, f.currency)}</span>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", textAlign: "right", marginTop: 5, fontStyle: "italic" }}>
            {amountInWords(calc.total, f.currency)}
          </p>
        </div>

        {/* ── Advanced: seller, bank, terms ── */}
        <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setShowAdvanced((s) => !s)}>
          {showAdvanced ? "▲ Hide" : "▼ Show"} company, bank &amp; terms
        </button>

        {showAdvanced && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "14px 16px", background: "var(--hover-bg)", borderRadius: "var(--r-md)" }}>
            <div>
              <p className="label-text" style={{ marginBottom: 8 }}>Your company (snapshot on this invoice)</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {field("sellerName", "Company name")}
                {field("sellerGstin", "GSTIN")}
                {field("sellerPan", "PAN")}
                {field("sellerPhone", "Phone")}
                {field("sellerEmail", "Email")}
                {field("sellerWebsite", "Website")}
                <div style={{ gridColumn: "1/-1" }}>
                  <label className="label" style={{ marginBottom: 5 }}>Address</label>
                  <textarea className="input" rows={2} style={{ minHeight: 52 }} value={f.sellerAddress} onChange={(e) => set("sellerAddress", e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <p className="label-text" style={{ marginBottom: 8 }}>Payment details</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {field("bankAccountName", "Account name")}
                {field("bankAccountNumber", "Account number")}
                {field("bankName", "Bank")}
                {field("bankIfsc", "IFSC")}
                {field("bankBranch", "Branch")}
                {field("upiId", "UPI ID")}
              </div>
            </div>

            <div>
              <p className="label-text" style={{ marginBottom: 8 }}>Terms &amp; signature</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label className="label" style={{ marginBottom: 5 }}>Payment terms</label>
                  <textarea className="input" rows={2} style={{ minHeight: 52 }} value={f.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} />
                </div>
                {field("lateFeeNote", "Late fee note")}
                {field("signatureName", "Authorised signatory")}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="label" style={{ marginBottom: 5 }}>Notes</label>
          <textarea className="input" value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={2} style={{ minHeight: 52 }} placeholder="Anything else to show on the invoice…" />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
            {saving && <span className="spinner" style={{ width: 13, height: 13, borderTopColor: "rgba(255,255,255,0.7)" }} />}
            {saving ? "Raising…" : "Raise invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}

function getCategoryEmojiLocal(label: string) {
  const map: Record<string, string> = {
    "Social Media Management": "📱", "Paid Ads (Performance Marketing)": "📢",
    "Website / SEO": "🌐", "E-commerce Management": "🛒", "Client Management": "🤝",
    "Reporting & Analysis": "📊", "Strategy & Planning": "🧠", "Video Production": "🎬",
    "Automation / Tools": "🤖", "Uncategorized": "📋",
  };
  return map[label] || "📋";
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState<"add" | "edit" | null>(null);
  const [selectedTask, setSelectedTask] = useState<ClientTask | null>(null);
  const [editClient, setEditClient] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");
  const [catFilter, setCatFilter] = useState<string>("All");
  const [cform, setCform] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    website: "",
    notes: "",
    status: "",
  });
  const [saving, setSaving] = useState(false);
  const [sf, setSf] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [cr, er] = await Promise.all([
      fetch(`/api/clients/${id}`),
      fetch("/api/employees"),
    ]);
    if (!cr.ok) {
      router.push("/dashboard/clients");
      return;
    }
    const [cd, ed] = await Promise.all([cr.json(), er.json()]);
    setClient(cd);
    setEmployees(Array.isArray(ed) ? ed : []);
    setCform({
      name: cd.name,
      email: cd.email,
      phone: cd.phone || "",
      company: cd.company || "",
      website: cd.website || "",
      notes: cd.notes || "",
      status: cd.status,
    });
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(taskId: string, status: string) {
    await fetch(`/api/client-tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }
  async function deleteTask(taskId: string) {
    await fetch(`/api/client-tasks/${taskId}`, { method: "DELETE" });
    load();
  }
  async function saveClient(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cform),
    });
    setSaving(false);
    setEditClient(false);
    load();
  }

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div className="spinner" />
      </div>
    );
  if (!client) return null;

  const tasks = client.clientTasks;
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  const changes = tasks.filter((t) => t.status === "CHANGES_REQUIRED").length;
  const now = new Date();
  const overdue = tasks.filter(
    (t) => t.status !== "COMPLETED" && new Date(t.endDate) < now,
  ).length;
  const pending = tasks.filter(
    (t) => t.status === "PENDING" || t.status === "IN_PROGRESS",
  ).length;
  const rate =
    tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
  const filtered = sf ? tasks.filter((t) => t.status === sf) : tasks;

  // Category breakdown (checklist view + task table filter)
  const catMap = new Map<string, ClientTask[]>();
  for (const t of tasks) {
    const key = t.category || "Uncategorized";
    catMap.set(key, [...(catMap.get(key) || []), t]);
  }
  const categories = Array.from(catMap.entries()).sort((a, b) => b[1].length - a[1].length);
  const tasksForTable = catFilter === "All" ? tasks : (catMap.get(catFilter) || []);

  return (
    <div className="page-section" style={{ maxWidth: 1180 }}>
      <div className="breadcrumb">
        <Link href="/dashboard/clients">Clients</Link>
        <span className="breadcrumb-sep">/</span>
        <span style={{ color: "var(--tx-primary)" }}>
          {client.company || client.name}
        </span>
      </div>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }} className="anim-up">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="avatar avatar-lg" style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff" }}>
            {client.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 className="page-title" style={{ fontSize: 22 }}>{client.name}</h1>
              <span className={`badge ${client.status === "ACTIVE" ? "badge-green" : client.status === "INACTIVE" ? "badge-red" : "badge-amber"}`}>{client.status}</span>
              {client.portalEnabled && <span className="badge badge-blue">Portal enabled</span>}
            </div>
            {client.company && <p style={{ fontSize: 13, color: "var(--tx-tertiary)", marginTop: 3 }}>{client.company}</p>}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setSelectedTask(null); setTaskModal("add"); }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New task
        </button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="filter-tabs-wrap anim-up" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.key} className={`filter-tab${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="anim-up">
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              ["Total tasks", tasks.length, "var(--accent)"],
              ["Completed", completed, "var(--green)"],
              ["Pending", pending, "var(--amber)"],
              ["Overdue", overdue, "var(--red)"],
            ].map(([l, v, c]) => (
              <div key={l as string} className="stat-card" style={{ padding: "14px 16px" }}>
                <p className="label-text" style={{ marginBottom: 8 }}>{l}</p>
                <p className="stat-value" style={{ fontSize: 22, color: c as string }}>{v}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
            {/* Checklist view (category breakdown) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="card" style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <p className="section-title">Onboarding Progress</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{rate}%</p>
                </div>
                <div className="progress-track" style={{ height: 6 }}><div className="progress-fill" style={{ width: `${rate}%` }} /></div>
              </div>

              {categories.length === 0 ? (
                <div className="card empty" style={{ padding: 50 }}>
                  <p style={{ fontWeight: 500, color: "var(--tx-secondary)" }}>No tasks yet</p>
                  <p style={{ fontSize: 13 }}>Create the first task for this client</p>
                </div>
              ) : categories.map(([cat, catTasks]) => {
                const catDone = catTasks.filter((t) => t.status === "COMPLETED").length;
                const catPct = Math.round((catDone / catTasks.length) * 100);
                return (
                  <div key={cat} className="card" style={{ overflow: "hidden" }}>
                    <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--tx-primary)" }}>{getCategoryEmojiLocal(cat)} {cat}</p>
                        <p style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>{catDone}/{catTasks.length} done</p>
                      </div>
                      <div className="progress-track" style={{ height: 5 }}><div className="progress-fill" style={{ width: `${catPct}%` }} /></div>
                    </div>
                    {catTasks.map((t) => {
                      const isOverdue = new Date(t.endDate) < now && t.status !== "COMPLETED";
                      return (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 18px", borderBottom: "1px solid var(--border)" }}>
                          <span style={{
                            width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                            border: t.status === "COMPLETED" ? "none" : "1.5px solid var(--border-md)",
                            background: t.status === "COMPLETED" ? "var(--green)" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {t.status === "COMPLETED" && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                          </span>
                          <p style={{ flex: 1, minWidth: 0, fontSize: 13, color: t.status === "COMPLETED" ? "var(--tx-tertiary)" : "var(--tx-primary)", textDecoration: t.status === "COMPLETED" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                          <span className={`badge ${isOverdue ? "badge-red" : S_BADGE[t.status] || "badge-gray"}`} style={{ flexShrink: 0 }}>{isOverdue ? "Overdue" : S_LABEL[t.status] || t.status}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Right rail: client info + portal */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="card" style={{ padding: 18 }}>
                {!editClient ? (
                  <div>
                    <p className="section-title" style={{ marginBottom: 10 }}>Client Info</p>
                    {[
                      ["Email", client.email],
                      ["Phone", client.phone],
                      ["Website", client.website],
                      ["Notes", client.notes],
                    ].filter(([, v]) => v).map(([l, v]) => (
                      <div key={l as string} className="property-row">
                        <span className="property-label">{l}</span>
                        <span className="property-value" style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
                      </div>
                    ))}
                    <button className="btn btn-secondary" style={{ width: "100%", marginTop: 10, fontSize: 12.5 }} onClick={() => setEditClient(true)}>Edit client</button>
                  </div>
                ) : (
                  <form onSubmit={saveClient} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { k: "name", l: "Name", req: true },
                      { k: "email", l: "Email", req: true },
                      { k: "phone", l: "Phone" },
                      { k: "company", l: "Company" },
                      { k: "website", l: "Website" },
                    ].map(({ k, l, req }) => (
                      <div key={k}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--tx-secondary)", marginBottom: 4 }}>{l}</label>
                        <input className="input" required={req} value={cform[k as keyof typeof cform]} onChange={(e) => setCform({ ...cform, [k]: e.target.value })} style={{ fontSize: 12.5 }} />
                      </div>
                    ))}
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--tx-secondary)", marginBottom: 4 }}>Notes</label>
                      <textarea className="input" value={cform.notes} onChange={(e) => setCform({ ...cform, notes: e.target.value })} rows={2} style={{ fontSize: 12.5, minHeight: 50 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--tx-secondary)", marginBottom: 4 }}>Status</label>
                      <select className="input" value={cform.status} onChange={(e) => setCform({ ...cform, status: e.target.value })} style={{ fontSize: 12.5 }}>
                        {CLIENT_S.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <button type="button" className="btn btn-secondary" style={{ flex: 1, fontSize: 12 }} onClick={() => setEditClient(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1, fontSize: 12 }} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                    </div>
                  </form>
                )}
              </div>
              <PortalSettings clientId={id} portalEnabled={client.portalEnabled} onSave={load} />
            </div>
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <div className="card anim-up" style={{ overflow: "hidden" }}>
          <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="filter-tabs-wrap" style={{ marginRight: "auto" }}>
              <button className={`filter-tab${catFilter === "All" ? " active" : ""}`} onClick={() => setCatFilter("All")}>All <span className="count">{tasks.length}</span></button>
              {categories.map(([cat, catTasks]) => (
                <button key={cat} className={`filter-tab${catFilter === cat ? " active" : ""}`} onClick={() => setCatFilter(cat)}>
                  {getCategoryEmojiLocal(cat)} {cat} <span className="count">{catTasks.length}</span>
                </button>
              ))}
            </div>
            <div className="filter-tabs-wrap">
              {[["", "All status"], ["PENDING", "Pending"], ["IN_PROGRESS", "Active"], ["COMPLETED", "Done"], ["CHANGES_REQUIRED", "Changes"], ["OVERDUE", "Overdue"]].map(([k, l]) => (
                <button key={k} className={`filter-tab${sf === k ? " active" : ""}`} onClick={() => setSf(k)}>{l}</button>
              ))}
            </div>
          </div>

          {(sf ? tasksForTable.filter((t) => t.status === sf) : tasksForTable).length === 0 ? (
            <div className="empty" style={{ padding: 40 }}>
              <p style={{ fontWeight: 500, color: "var(--tx-secondary)" }}>No tasks</p>
              <p style={{ fontSize: 13 }}>Create the first task for this client</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr><th>Task</th><th>Category</th><th>Assignee</th><th>Due date</th><th>Priority</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {(sf ? tasksForTable.filter((t) => t.status === sf) : tasksForTable).map((task) => {
                    const isOverdue = new Date(task.endDate) < now && task.status !== "COMPLETED";
                    return (
                      <tr key={task.id}>
                        <td style={{ maxWidth: 220 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: task.status === "COMPLETED" ? "var(--tx-tertiary)" : "var(--tx-primary)", textDecoration: task.status === "COMPLETED" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</p>
                          {task.taskType && <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.taskType}</p>}
                        </td>
                        <td>{task.category ? <TaskCategoryBadge category={task.category} compact /> : <span style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>—</span>}</td>
                        <td>
                          {task.employee ? (
                            <Link href={`/dashboard/employees/${task.employee.id}`} style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                              <div className="avatar" style={{ width: 20, height: 20, fontSize: 9 }}>{task.employee.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}</div>
                              <span style={{ fontSize: 12.5, color: "var(--tx-secondary)", whiteSpace: "nowrap" }}>{task.employee.name}</span>
                            </Link>
                          ) : <span style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>Unassigned</span>}
                        </td>
                        <td style={{ fontSize: 12.5, color: isOverdue ? "var(--red)" : "var(--tx-secondary)", whiteSpace: "nowrap" }}>{formatDate(task.endDate)}{isOverdue ? " ⚠" : ""}</td>
                        <td><span className="badge badge-gray">{task.priority}</span></td>
                        <td>
                          <select value={task.status} onChange={(e) => updateStatus(task.id, e.target.value)} className="input" style={{ width: "auto", padding: "4px 8px", fontSize: 11.5, height: "auto" }}>
                            {TASK_S.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                          </select>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                            <button className="btn-ghost btn-icon" onClick={() => { setSelectedTask(task); setTaskModal("edit"); }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </button>
                            <button className="btn-ghost btn-icon" onClick={() => deleteTask(task.id)}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "workUrls" && <WorkUrlsTab clientId={id} />}

      {tab === "targets" && <TargetsTab clientId={id} tasks={tasks} />}

      {tab === "invoices" && <InvoicesTab clientId={id} client={client} />}

      {(taskModal === "add" || taskModal === "edit") && (
        <TaskModal
          clientId={id}
          task={taskModal === "edit" ? selectedTask : null}
          employees={employees}
          onClose={() => setTaskModal(null)}
          onSave={load}
        />
      )}
    </div>
  );
}
