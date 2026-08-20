"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import TaskCategoryPicker from "@/components/TaskCategoryPicker";
import TaskCategoryBadge from "@/components/TaskCategoryBadge";

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
  { key: "files", label: "Files" },
  { key: "reports", label: "Reports" },
  { key: "invoices", label: "Invoices" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

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

      {(tab === "files" || tab === "reports" || tab === "invoices") && (
        <div className="card empty anim-up" style={{ padding: 70 }}>
          <p style={{ fontSize: 26, marginBottom: 8 }}>{tab === "files" ? "📁" : tab === "reports" ? "📄" : "🧾"}</p>
          <p style={{ fontWeight: 600, color: "var(--tx-secondary)" }}>{TABS.find((t) => t.key === tab)?.label} coming soon</p>
          <p style={{ fontSize: 13 }}>This section isn&apos;t wired up to data yet.</p>
        </div>
      )}

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
