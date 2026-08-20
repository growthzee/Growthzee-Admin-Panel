"use client";
import TaskCategoryBadge from "@/components/TaskCategoryBadge";
import { useState, useEffect, useCallback } from "react";
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
  completedAt?: string | null;
  _type: "internal" | "client";
  client?: { id: string; name: string; company?: string } | null;
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

type AttendanceRecord = { date: string; status: string };

// ── Constants ────────────────────────────────────────────────────────────────
const DEPTS    = ["Engineering", "Design", "Marketing", "Sales", "HR", "Finance", "Operations"];
const STATUSES = ["ACTIVE", "INACTIVE", "ON_LEAVE"];
const PRIS     = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const INT_S    = ["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"];
const CLI_S    = ["PENDING", "IN_PROGRESS", "COMPLETED", "CHANGES_REQUIRED", "OVERDUE"];

const S_BADGE: Record<string, string> = {
  PENDING: "badge-gray", IN_PROGRESS: "badge-blue", COMPLETED: "badge-green",
  CHANGES_REQUIRED: "badge-amber", OVERDUE: "badge-red",
};
const S_LABEL: Record<string, string> = {
  PENDING: "Pending", IN_PROGRESS: "In progress", COMPLETED: "Done",
  CHANGES_REQUIRED: "Changes needed", OVERDUE: "Overdue",
};

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "tasks", label: "Tasks" },
  { key: "attendance", label: "Attendance" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// Creative content-type filters — fuzzy-matched against task text
const CONTENT_FILTERS = [
  { key: "reels",        label: "Reels",           keywords: ["reel", "reels", "short video", "short clip"] },
  { key: "carousel",     label: "Carousel",        keywords: ["carousel", "swipe", "multi-image", "multi image"] },
  { key: "creative",     label: "Creative Posts",  keywords: ["creative post", "creative", "graphic post", "static post", "design post", "social post"] },
  { key: "ads_creative", label: "Ads Creative",    keywords: ["ads creative", "ad creative", "paid creative", "ad design"] },
  { key: "ads_reel",     label: "Ads Reels",       keywords: ["ads reel", "ad reel", "reel ad", "paid reel", "video ad"] },
  { key: "ads_carousel", label: "Ads Carousel",    keywords: ["ads carousel", "ad carousel", "carousel ad", "paid carousel"] },
  { key: "banner",       label: "Website Banner",  keywords: ["website banner", "web banner", "banner", "hero banner", "landing banner"] },
  { key: "catalogue",    label: "Catalogue",       keywords: ["catalogue", "catalog", "product catalogue", "lookbook"] },
] as const;
type ContentFilterKey = (typeof CONTENT_FILTERS)[number]["key"] | null;

function taskMatchesContentFilter(task: Task, filterKey: ContentFilterKey): boolean {
  if (!filterKey) return true;
  const filter = CONTENT_FILTERS.find((f) => f.key === filterKey);
  if (!filter) return true;
  const haystack = [task.title, task.description, task.category, task.subCategory, task.taskType]
    .filter(Boolean).join(" ").toLowerCase();
  return filter.keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

function isOverdue(t: Task, now: Date) {
  return t.status !== "COMPLETED" && new Date(t.endDate) < now;
}

/** Group key used by the Overview checklist: client tasks by category, internal tasks together */
function groupKey(t: Task) {
  return t._type === "client" ? (t.category || "Uncategorized") : "Internal Tasks";
}
function groupEmoji(group: string) {
  const map: Record<string, string> = {
    "Internal Tasks": "🗂️", "Social Media Management": "📱", "Paid Ads (Performance Marketing)": "📢",
    "Website / SEO": "🌐", "E-commerce Management": "🛒", "Client Management": "🤝",
    "Reporting & Analysis": "📊", "Strategy & Planning": "🧠", "Video Production": "🎬",
    "Automation / Tools": "🤖", "Uncategorized": "📋",
  };
  return map[group] || "📋";
}

// ── TaskDetailModal — inspect a single task ──────────────────────────────────
function TaskDetailModal({
  task, onClose, onEdit, onComplete,
}: {
  task: Task;
  onClose: () => void;
  onEdit: () => void;
  onComplete: () => void;
}) {
  const overdue = isOverdue(task, new Date());
  return (
    <div className="modal-backdrop anim-in" onClick={onClose}>
      <div className="modal anim-scale" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="section-title">Task details</p>
            <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 2 }}>
              {task._type === "client" ? "Client task" : "Internal task"}
            </p>
          </div>
          <button className="btn-ghost btn-icon" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body" style={{ maxHeight: "78vh", overflowY: "auto" }}>
          {task.category && (
            <div style={{ marginBottom: 12 }}>
              <TaskCategoryBadge category={task.category} subCategory={task.subCategory} taskType={task.taskType} />
            </div>
          )}

          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--tx-primary)", marginBottom: 6 }}>{task.title}</p>
          {task.description && (
            <p style={{ fontSize: 13, color: "var(--tx-secondary)", lineHeight: 1.6, marginBottom: 14 }}>{task.description}</p>
          )}

          <div className="divider" style={{ margin: "14px 0" }} />

          <div className="property-row">
            <span className="property-label">Status</span>
            <span className="property-value">
              <span className={`badge ${overdue ? "badge-red" : S_BADGE[task.status] || "badge-gray"}`}>
                {overdue ? "Overdue" : S_LABEL[task.status] || task.status}
              </span>
            </span>
          </div>
          <div className="property-row">
            <span className="property-label">Priority</span>
            <span className="property-value"><span className="badge badge-gray">{task.priority}</span></span>
          </div>
          {task.client && (
            <div className="property-row">
              <span className="property-label">Client</span>
              <span className="property-value">
                <Link href={`/dashboard/clients/${task.client.id}`} style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13 }}>
                  {task.client.company || task.client.name} →
                </Link>
              </span>
            </div>
          )}
          <div className="property-row">
            <span className="property-label">Start date</span>
            <span className="property-value">{formatDate(task.startDate)}</span>
          </div>
          <div className="property-row">
            <span className="property-label">Due date</span>
            <span className="property-value" style={{ color: overdue ? "var(--red)" : "var(--tx-primary)" }}>
              {formatDate(task.endDate)}{overdue ? " ⚠" : ""}
            </span>
          </div>
          {task.completedAt && (
            <div className="property-row">
              <span className="property-label">Completed on</span>
              <span className="property-value" style={{ color: "var(--green)" }}>✓ {formatDate(task.completedAt)}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Close</button>
            {task.status !== "COMPLETED" && (
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onComplete}>Mark complete</button>
            )}
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onEdit}>Edit task</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TaskModal — assign / edit ────────────────────────────────────────────────
function TaskModal({
  employeeId, task, onClose, onSave,
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
    startDate: task?.startDate ? task.startDate.split("T")[0] : new Date().toISOString().split("T")[0],
    endDate: task?.endDate ? task.endDate.split("T")[0] : "",
    employeeId,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const statuses = isClient ? CLI_S : INT_S;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = task
        ? isClient ? `/api/client-tasks/${task.id}` : `/api/tasks/${task.id}`
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
            <p className="section-title">{task ? "Edit task" : "Assign task"}</p>
            {isClient && task?.client && (
              <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 2 }}>
                Client: {task.client.company || task.client.name}
              </p>
            )}
          </div>
          <button className="btn-ghost btn-icon" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ padding: "8px 12px", background: "var(--red-bg)", borderRadius: "var(--r-md)", color: "var(--red)", fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="label" style={{ marginBottom: 5 }}>Title *</label>
              <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task name…" disabled={isClient} />
            </div>
            <div>
              <label className="label" style={{ marginBottom: 5 }}>Description</label>
              <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ minHeight: 60 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="label" style={{ marginBottom: 5 }}>Priority</label>
                <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {PRIS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label" style={{ marginBottom: 5 }}>Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="label" style={{ marginBottom: 5 }}>Start date *</label>
                <input className="input" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label className="label" style={{ marginBottom: 5 }}>End date *</label>
                <input className="input" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                {loading && <span className="spinner" style={{ width: 13, height: 13, borderTopColor: "rgba(255,255,255,0.7)" }} />}
                {loading ? "Saving…" : task ? "Save changes" : "Assign"}
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
  employeeId, portalEnabled, onSave,
}: {
  employeeId: string;
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
    const res = await fetch(`/api/employees/${employeeId}/set-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw || undefined, portalEnabled: enabled }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error || "Failed"); return; }
    setSaved(true);
    setPw("");
    setTimeout(() => setSaved(false), 3000);
    onSave();
  }

  const url = typeof window !== "undefined" ? `${window.location.origin}/employee-login` : "/employee-login";

  return (
    <div className="card" style={{ padding: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-primary)", marginBottom: 12 }}>Portal Access</p>
      {error && (
        <div style={{ padding: "6px 10px", background: "var(--red-bg)", borderRadius: "var(--r-sm)", color: "var(--red)", fontSize: 12, marginBottom: 10 }}>{error}</div>
      )}
      {saved && (
        <div style={{ padding: "6px 10px", background: "var(--green-bg)", borderRadius: "var(--r-sm)", color: "var(--green)", fontSize: 12, marginBottom: 10 }}>✓ Saved</div>
      )}
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "var(--hover-bg)", borderRadius: "var(--r-sm)" }}>
          <div>
            <p style={{ fontSize: 13, color: "var(--tx-primary)" }}>Enable portal</p>
            <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 1 }}>{enabled ? "Employee can log in" : "Disabled"}</p>
          </div>
          <label className="toggle-wrap">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
        <div>
          <label className="label" style={{ marginBottom: 5 }}>{portalEnabled ? "Change password" : "Set password"}</label>
          <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={portalEnabled ? "Leave blank to keep current" : "Min 6 characters"} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ fontSize: 12.5 }}>
          {saving && <span className="spinner" style={{ width: 12, height: 12, borderTopColor: "rgba(255,255,255,0.7)" }} />}
          Save portal settings
        </button>
      </form>
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
        <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginBottom: 5 }}>Portal login link:</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: "var(--hover-bg)", borderRadius: "var(--r-sm)" }}>
          <span style={{ fontSize: 11, color: "var(--tx-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
          <button type="button" className="btn-ghost btn-icon" style={{ padding: 3 }} onClick={() => navigator.clipboard.writeText(url)}>
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

// ── Main page ────────────────────────────────────────────────────────────────
export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [attLoading, setAttLoading] = useState(true);

  const [tab, setTab] = useState<TabKey>("overview");
  const [taskModal, setTaskModal] = useState<"add" | "edit" | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [editEmp, setEditEmp] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", department: "", position: "", status: "" });
  const [saving, setSaving] = useState(false);

  // Task tab filters
  const [sourceFilter, setSourceFilter] = useState<"all" | "internal" | "client">("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");
  const [contentFilter, setContentFilter] = useState<ContentFilterKey>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [er, cr] = await Promise.all([
      fetch(`/api/employees/${id}`),
      fetch(`/api/client-tasks?employeeId=${id}`),
    ]);
    if (!er.ok) { router.push("/dashboard/employees"); return; }
    const [ed, cd] = await Promise.all([er.json(), cr.json()]);
    setEmployee(ed);
    setForm({
      name: ed.name, email: ed.email, phone: ed.phone || "",
      department: ed.department, position: ed.position, status: ed.status,
    });
    const internal: Task[] = (ed.tasks || []).map((t: Omit<Task, "_type" | "client">) => ({ ...t, _type: "internal" as const }));
    const client: Task[] = (Array.isArray(cd) ? cd : []).map((t: Omit<Task, "_type">) => ({ ...t, _type: "client" as const }));
    setAllTasks([...internal, ...client]);
    setLoading(false);

    // Attendance since joining (capped at the last 365 days)
    setAttLoading(true);
    const joined = new Date(ed.joinedAt);
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    const from = joined > oneYearAgo ? joined : oneYearAgo;
    const ar = await fetch(`/api/attendance/${id}?from=${from.toISOString().split("T")[0]}&to=${new Date().toISOString().split("T")[0]}`);
    const ad = await ar.json();
    setAttendance(Array.isArray(ad) ? ad : []);
    setAttLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(task: Task, status: string) {
    const url = task._type === "client" ? `/api/client-tasks/${task.id}` : `/api/tasks/${task.id}`;
    await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  }
  async function deleteTask(task: Task) {
    const url = task._type === "client" ? `/api/client-tasks/${task.id}` : `/api/tasks/${task.id}`;
    await fetch(url, { method: "DELETE" });
    load();
  }
  async function saveEmployee(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/employees/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setEditEmp(false);
    load();
  }

  /** Jump to the Tasks tab pre-filtered — lets you drill into a stat card's tasks */
  function drillInto(status: string) {
    setStatusFilter(status);
    setSourceFilter("all");
    setGroupFilter("All");
    setContentFilter(null);
    setTab("tasks");
  }

  if (loading)
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="spinner" />
      </div>
    );
  if (!employee) return null;

  const now = new Date();
  const completed = allTasks.filter((t) => t.status === "COMPLETED").length;
  const pending = allTasks.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS").length;
  const overdue = allTasks.filter((t) => isOverdue(t, now)).length;
  const rate = allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0;

  // Attendance summary
  const attPresent = attendance.filter((a) => a.status === "PRESENT").length;
  const attAbsent = attendance.filter((a) => a.status === "ABSENT").length;
  const attHalf = attendance.filter((a) => a.status === "HALF_DAY").length;
  const attLeave = attendance.filter((a) => a.status === "LEAVE").length;
  const attHoliday = attendance.filter((a) => a.status === "HOLIDAY").length;
  const daysWorked = attPresent + attHalf * 0.5;
  const workableDays = attendance.length - attHoliday;
  const attendanceRate = workableDays > 0 ? Math.round((daysWorked / workableDays) * 100) : 0;

  // Grouped breakdown (Overview checklist + Tasks tab group filter)
  const groupMap = new Map<string, Task[]>();
  for (const t of allTasks) {
    const key = groupKey(t);
    groupMap.set(key, [...(groupMap.get(key) || []), t]);
  }
  const groups = Array.from(groupMap.entries()).sort((a, b) => b[1].length - a[1].length);

  // Tasks tab filtering
  const tasksForTable = allTasks.filter((t) => {
    if (sourceFilter !== "all" && t._type !== sourceFilter) return false;
    if (groupFilter !== "All" && groupKey(t) !== groupFilter) return false;
    if (statusFilter === "OVERDUE" ? !isOverdue(t, now) : statusFilter && t.status !== statusFilter) return false;
    if (!taskMatchesContentFilter(t, contentFilter)) return false;
    if (dateFrom && t.endDate.split("T")[0] < dateFrom) return false;
    if (dateTo && t.startDate.split("T")[0] > dateTo) return false;
    return true;
  });
  const anyFilter = !!(statusFilter || contentFilter || dateFrom || dateTo || groupFilter !== "All" || sourceFilter !== "all");

  return (
    <div className="page-section" style={{ maxWidth: 1180 }}>
      <div className="breadcrumb">
        <Link href="/dashboard/employees">Employees</Link>
        <span className="breadcrumb-sep">/</span>
        <span style={{ color: "var(--tx-primary)" }}>{employee.name}</span>
      </div>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }} className="anim-up">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="avatar avatar-lg" style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff" }}>
            {employee.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 className="page-title" style={{ fontSize: 22 }}>{employee.name}</h1>
              <span className={`badge ${employee.status === "ACTIVE" ? "badge-green" : employee.status === "ON_LEAVE" ? "badge-amber" : "badge-red"}`}>
                {employee.status.replace("_", " ")}
              </span>
              {employee.portalEnabled && <span className="badge badge-blue">Portal enabled</span>}
            </div>
            <p style={{ fontSize: 13, color: "var(--tx-tertiary)", marginTop: 3 }}>{employee.position} · {employee.department}</p>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setSelectedTask(null); setTaskModal("add"); }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Assign task
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

      {/* ── Overview ───────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="tab-fade">
          {/* Stat cards — click to drill into the matching tasks */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            {([
              ["Total tasks", allTasks.length, "var(--accent)", ""],
              ["Completed", completed, "var(--green)", "COMPLETED"],
              ["Pending", pending, "var(--amber)", "PENDING"],
              ["Overdue", overdue, "var(--red)", "OVERDUE"],
            ] as [string, number, string, string][]).map(([l, v, c, filterKey]) => (
              <button
                key={l}
                className="stat-card"
                onClick={() => drillInto(filterKey)}
                title={`View ${l.toLowerCase()}`}
                style={{ padding: "14px 16px", textAlign: "left", cursor: "pointer", font: "inherit" }}
              >
                <p className="label-text" style={{ marginBottom: 8 }}>{l}</p>
                <p className="stat-value" style={{ fontSize: 22, color: c }}>{v}</p>
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
            {/* Checklist view (grouped breakdown) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="card" style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <p className="section-title">Task Completion</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{rate}%</p>
                </div>
                <div className="progress-track" style={{ height: 6 }}><div className="progress-fill" style={{ width: `${rate}%` }} /></div>
              </div>

              {groups.length === 0 ? (
                <div className="card empty" style={{ padding: 50 }}>
                  <p style={{ fontWeight: 500, color: "var(--tx-secondary)" }}>No tasks yet</p>
                  <p style={{ fontSize: 13 }}>Assign the first task to this employee</p>
                </div>
              ) : groups.map(([group, groupTasks]) => {
                const gDone = groupTasks.filter((t) => t.status === "COMPLETED").length;
                const gPct = Math.round((gDone / groupTasks.length) * 100);
                return (
                  <div key={group} className="card" style={{ overflow: "hidden" }}>
                    <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--tx-primary)" }}>{groupEmoji(group)} {group}</p>
                        <p style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>{gDone}/{groupTasks.length} done</p>
                      </div>
                      <div className="progress-track" style={{ height: 5 }}><div className="progress-fill" style={{ width: `${gPct}%` }} /></div>
                    </div>
                    {groupTasks.map((t) => {
                      const tOverdue = isOverdue(t, now);
                      return (
                        <button
                          key={`${t._type}-${t.id}`}
                          onClick={() => setDetailTask(t)}
                          title="View task details"
                          className="checklist-row"
                          style={{
                            display: "flex", alignItems: "center", gap: 10, width: "100%",
                            padding: "9px 18px",
                            background: "transparent",
                            border: "none", borderBottom: "1px solid var(--border)",
                            cursor: "pointer", textAlign: "left", font: "inherit",
                          }}
                        >
                          <span style={{
                            width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                            border: t.status === "COMPLETED" ? "none" : "1.5px solid var(--border-md)",
                            background: t.status === "COMPLETED" ? "var(--green)" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {t.status === "COMPLETED" && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                          </span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: t.status === "COMPLETED" ? "var(--tx-tertiary)" : "var(--tx-primary)", textDecoration: t.status === "COMPLETED" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.title}
                          </span>
                          {t.client && (
                            <span className="badge badge-purple" style={{ flexShrink: 0, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {t.client.company || t.client.name}
                            </span>
                          )}
                          <span className={`badge ${tOverdue ? "badge-red" : S_BADGE[t.status] || "badge-gray"}`} style={{ flexShrink: 0 }}>
                            {tOverdue ? "Overdue" : S_LABEL[t.status] || t.status}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Right rail: employee info + portal */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="card" style={{ padding: 18 }}>
                {!editEmp ? (
                  <div>
                    <p className="section-title" style={{ marginBottom: 10 }}>Employee Info</p>
                    {([
                      ["Email", employee.email],
                      ["Phone", employee.phone],
                      ["Department", employee.department],
                      ["Position", employee.position],
                      ["Joined", formatDate(employee.joinedAt)],
                    ] as [string, string | undefined][]).filter(([, v]) => v).map(([l, v]) => (
                      <div key={l} className="property-row">
                        <span className="property-label">{l}</span>
                        <span className="property-value" style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
                      </div>
                    ))}
                    <button className="btn btn-secondary" style={{ width: "100%", marginTop: 10, fontSize: 12.5 }} onClick={() => setEditEmp(true)}>Edit employee</button>
                    <Link href={`/dashboard/employees/${id}/attendance`} className="btn btn-secondary" style={{ width: "100%", marginTop: 6, fontSize: 12.5, textDecoration: "none", justifyContent: "center" }}>
                      Attendance calendar
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={saveEmployee} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {([
                      { k: "name", l: "Name", req: true },
                      { k: "email", l: "Email", req: true },
                      { k: "phone", l: "Phone", req: false },
                      { k: "position", l: "Position", req: true },
                    ] as { k: keyof typeof form; l: string; req: boolean }[]).map(({ k, l, req }) => (
                      <div key={k}>
                        <label className="label" style={{ marginBottom: 4 }}>{l}</label>
                        <input className="input" required={req} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={{ fontSize: 12.5 }} />
                      </div>
                    ))}
                    <div>
                      <label className="label" style={{ marginBottom: 4 }}>Department</label>
                      <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={{ fontSize: 12.5 }}>
                        {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label" style={{ marginBottom: 4 }}>Status</label>
                      <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ fontSize: 12.5 }}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <button type="button" className="btn btn-secondary" style={{ flex: 1, fontSize: 12 }} onClick={() => setEditEmp(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1, fontSize: 12 }} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                    </div>
                  </form>
                )}
              </div>
              <PortalSettings employeeId={id} portalEnabled={employee.portalEnabled} onSave={load} />
            </div>
          </div>
        </div>
      )}

      {/* ── Tasks ──────────────────────────────────────────────────── */}
      {tab === "tasks" && (
        <div className="card tab-fade" style={{ overflow: "hidden" }}>
          <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div className="filter-tabs-wrap" style={{ marginRight: "auto" }}>
                <button className={`filter-tab${groupFilter === "All" ? " active" : ""}`} onClick={() => setGroupFilter("All")}>
                  All <span className="count">{allTasks.length}</span>
                </button>
                {groups.map(([group, groupTasks]) => (
                  <button key={group} className={`filter-tab${groupFilter === group ? " active" : ""}`} onClick={() => setGroupFilter(group)}>
                    {groupEmoji(group)} {group} <span className="count">{groupTasks.length}</span>
                  </button>
                ))}
              </div>
              <div className="filter-tabs-wrap">
                {([["", "All status"], ["PENDING", "Pending"], ["IN_PROGRESS", "Active"], ["COMPLETED", "Done"], ["CHANGES_REQUIRED", "Changes"], ["OVERDUE", "Overdue"]] as [string, string][]).map(([k, l]) => (
                  <button key={k} className={`filter-tab${statusFilter === k ? " active" : ""}`} onClick={() => setStatusFilter(k)}>{l}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div className="filter-tabs-wrap" style={{ marginRight: "auto" }}>
                {([["all", "All sources"], ["internal", "Internal"], ["client", "Client"]] as const).map(([k, l]) => (
                  <button key={k} className={`filter-tab${sourceFilter === k ? " active" : ""}`} onClick={() => setSourceFilter(k)}>{l}</button>
                ))}
              </div>
              <select className="input" value={contentFilter ?? ""} onChange={(e) => setContentFilter((e.target.value || null) as ContentFilterKey)} style={{ width: "auto", maxWidth: 165, fontSize: 12.5 }}>
                <option value="">All content types</option>
                {CONTENT_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
              <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: "auto", fontSize: 12.5 }} title="Due on or after" />
              <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: "auto", fontSize: 12.5 }} title="Starting on or before" />
              {anyFilter && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setStatusFilter(""); setContentFilter(null); setDateFrom(""); setDateTo(""); setGroupFilter("All"); setSourceFilter("all"); }}>
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {tasksForTable.length === 0 ? (
            <div className="empty" style={{ padding: 40 }}>
              <p style={{ fontWeight: 500, color: "var(--tx-secondary)" }}>No tasks</p>
              <p style={{ fontSize: 13 }}>{anyFilter ? "No tasks match the current filters" : "Assign the first task to this employee"}</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr><th>Task</th><th>Category</th><th>Client</th><th>Due date</th><th>Priority</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {tasksForTable.map((task) => {
                    const tOverdue = isOverdue(task, now);
                    return (
                      <tr key={`${task._type}-${task.id}`} onClick={() => setDetailTask(task)} title="View task details">
                        <td style={{ maxWidth: 220 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: task.status === "COMPLETED" ? "var(--tx-tertiary)" : "var(--tx-primary)", textDecoration: task.status === "COMPLETED" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {task.title}
                          </p>
                          {task.taskType && <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.taskType}</p>}
                          {task.completedAt && <p style={{ fontSize: 11.5, color: "var(--green)" }}>✓ {formatDate(task.completedAt)}</p>}
                        </td>
                        <td>
                          {task.category
                            ? <TaskCategoryBadge category={task.category} compact />
                            : <span className="badge badge-gray">Internal</span>}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {task.client ? (
                            <Link href={`/dashboard/clients/${task.client.id}`} style={{ fontSize: 12.5, color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap" }}>
                              {task.client.company || task.client.name}
                            </Link>
                          ) : <span style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>—</span>}
                        </td>
                        <td style={{ fontSize: 12.5, color: tOverdue ? "var(--red)" : "var(--tx-secondary)", whiteSpace: "nowrap" }}>
                          {formatDate(task.endDate)}{tOverdue ? " ⚠" : ""}
                        </td>
                        <td><span className="badge badge-gray">{task.priority}</span></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <select value={task.status} onChange={(e) => updateStatus(task, e.target.value)} className="input" style={{ width: "auto", padding: "4px 8px", fontSize: 11.5, height: "auto" }}>
                            {(task._type === "client" ? CLI_S : INT_S).map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                          </select>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                            <button className="btn-ghost btn-icon" title="View details" onClick={() => setDetailTask(task)}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                            </button>
                            <button className="btn-ghost btn-icon" title="Edit" onClick={() => { setSelectedTask(task); setTaskModal("edit"); }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </button>
                            <button className="btn-ghost btn-icon" title="Delete" onClick={() => deleteTask(task)}>
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

      {/* ── Attendance ─────────────────────────────────────────────── */}
      {tab === "attendance" && (
        <div className="tab-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div className="stat-card" style={{ padding: "16px 18px" }}>
              <p className="label-text" style={{ marginBottom: 8 }}>Days worked</p>
              <p className="stat-value" style={{ fontSize: 26, color: "var(--green)" }}>{attLoading ? "…" : daysWorked}</p>
              <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 4 }}>of {workableDays} working days</p>
            </div>
            <div className="stat-card" style={{ padding: "16px 18px" }}>
              <p className="label-text" style={{ marginBottom: 8 }}>Attendance rate</p>
              <p className="stat-value" style={{ fontSize: 26, color: "var(--accent)" }}>{attLoading ? "…" : `${attendanceRate}%`}</p>
              <div className="progress-track" style={{ height: 5, marginTop: 8 }}><div className="progress-fill" style={{ width: `${attendanceRate}%` }} /></div>
            </div>
            <div className="stat-card" style={{ padding: "16px 18px" }}>
              <p className="label-text" style={{ marginBottom: 8 }}>Leaves taken</p>
              <p className="stat-value" style={{ fontSize: 26, color: "var(--amber)" }}>{attLoading ? "…" : attLeave}</p>
              <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 4 }}>since {formatDate(employee.joinedAt)}</p>
            </div>
          </div>

          <div className="card" style={{ padding: "16px 18px" }}>
            <p className="section-title" style={{ marginBottom: 14 }}>Breakdown</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              {([
                ["Present", attPresent, "var(--green)"],
                ["Absent", attAbsent, "var(--red)"],
                ["Half day", attHalf, "var(--tx-secondary)"],
                ["Leave", attLeave, "var(--amber)"],
                ["Holiday", attHoliday, "var(--blue)"],
              ] as [string, number, string][]).map(([l, v, c]) => (
                <div key={l} style={{ background: "var(--hover-bg)", borderRadius: "var(--r-md)", padding: "12px 8px", textAlign: "center" }}>
                  <p style={{ fontSize: 20, fontWeight: 700, color: c, letterSpacing: "-0.02em" }}>{attLoading ? "…" : v}</p>
                  <p style={{ fontSize: 11, color: "var(--tx-tertiary)", marginTop: 3 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: "20px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--tx-primary)", marginBottom: 3 }}>Want the full calendar view?</p>
              <p style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>Mark daily attendance and browse any month</p>
            </div>
            <Link href={`/dashboard/employees/${id}/attendance`} className="btn btn-primary btn-sm" style={{ textDecoration: "none", flexShrink: 0 }}>
              Open calendar
            </Link>
          </div>
        </div>
      )}

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onEdit={() => { setSelectedTask(detailTask); setDetailTask(null); setTaskModal("edit"); }}
          onComplete={async () => { await updateStatus(detailTask, "COMPLETED"); setDetailTask(null); }}
        />
      )}

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
