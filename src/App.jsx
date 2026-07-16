import React, { useState } from "react";
import {
  LayoutDashboard, Building2, Calendar, DollarSign, Users, ClipboardList,
  FileText, AlertTriangle, ChevronRight, ArrowLeft,
  Search, MapPin, Phone, HardHat, Flag, TrendingUp, X, Plus, LogOut, Clock
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import LoginPage from "./auth/LoginPage";
import { DataProvider, useData } from "./data/DataProvider";
import { createProject, updatePunchlistStatus } from "./lib/api";
import { isSupabaseConfigured } from "./lib/supabase";

/* ---------------------------------------------------------------
   CONSTANTS
--------------------------------------------------------------- */
const TODAY = new Date();

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.f-display { font-family: 'Oswald', sans-serif; }
.f-body { font-family: 'Inter', sans-serif; }
.f-mono { font-family: 'IBM Plex Mono', monospace; }
`;

/* ---------------------------------------------------------------
   HELPERS
--------------------------------------------------------------- */
const fmtMoney = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtMoneyShort = (n) => {
  if (n >= 1000) return "$" + (n / 1000).toFixed(0) + "k";
  return "$" + n;
};
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

const STATUS_STYLES = {
  "On Schedule": "bg-green-50 text-green-700 border-green-200",
  "Behind Schedule": "bg-red-50 text-red-700 border-red-200",
  "Pre-Construction": "bg-stone-100 text-stone-600 border-stone-300",
  "Punch List": "bg-amber-50 text-amber-700 border-amber-200",
  "Complete": "bg-green-50 text-green-700 border-green-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  "Upcoming": "bg-stone-100 text-stone-500 border-stone-300",
  "Delayed": "bg-red-50 text-red-700 border-red-200",
  "Open": "bg-amber-50 text-amber-700 border-amber-200",
  "Approved": "bg-green-50 text-green-700 border-green-200",
  "Current": "bg-blue-50 text-blue-700 border-blue-200",
  "Signed": "bg-green-50 text-green-700 border-green-200",
  "Draft": "bg-stone-100 text-stone-600 border-stone-300",
};
const statusStyle = (s) => STATUS_STYLES[s] || "bg-stone-100 text-stone-600 border-stone-300";

const PHASE_BAR_COLOR = {
  "Complete": "bg-green-600",
  "In Progress": "bg-orange-600",
  "Delayed": "bg-red-600",
  "Upcoming": "bg-stone-300",
};

const PUNCH_STATUS_CYCLE = { "Open": "In Progress", "In Progress": "Complete", "Complete": "Open" };

/* ---------------------------------------------------------------
   SMALL UI PRIMITIVES
--------------------------------------------------------------- */
function StatusBadge({ status, onClick }) {
  return (
    <span
      onClick={onClick}
      className={`f-mono inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide px-2 py-1 rounded border ${statusStyle(status)} ${onClick ? "cursor-pointer" : ""}`}
    >
      {status}
    </span>
  );
}

function ProgressBar({ pct, colorClass = "bg-orange-600" }) {
  return (
    <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
      <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent = "text-orange-600" }) {
  return (
    <div className="bg-white border border-stone-200 rounded-md p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="f-body text-xs uppercase tracking-wide text-stone-500">{label}</span>
        <Icon size={16} className={accent} />
      </div>
      <div className="f-mono text-2xl text-stone-900 font-semibold leading-none">{value}</div>
      {sub && <span className="f-body text-xs text-stone-500">{sub}</span>}
    </div>
  );
}

/* ---------------------------------------------------------------
   GANTT
--------------------------------------------------------------- */
function GanttChart({ rows, rangeStart, rangeEnd, onRowClick }) {
  const total = new Date(rangeEnd) - new Date(rangeStart);
  const pct = (d) => ((new Date(d) - new Date(rangeStart)) / total) * 100;
  const todayPct = pct(TODAY.toISOString().slice(0, 10));

  const months = [];
  let cursor = new Date(rangeStart);
  cursor.setDate(1);
  while (cursor <= new Date(rangeEnd)) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div className="bg-white border border-stone-200 rounded-md overflow-x-auto">
      <div className="min-w-[640px]">
      <div className="relative border-b border-stone-200 bg-stone-50" style={{ height: 32 }}>
        {months.map((m, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-stone-200 f-mono text-[10px] text-stone-500 pl-1.5 pt-2 uppercase"
            style={{ left: `${pct(m.toISOString().slice(0, 10))}%` }}
          >
            {m.toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
          </div>
        ))}
      </div>
      <div className="relative">
        {/* blueprint grid */}
        <div className="absolute inset-0 pointer-events-none">
          {months.map((m, i) => (
            <div key={i} className="absolute top-0 bottom-0 border-l border-blue-100" style={{ left: `${pct(m.toISOString().slice(0, 10))}%` }} />
          ))}
          {todayPct >= 0 && todayPct <= 100 && (
            <div className="absolute top-0 bottom-0 border-l-2 border-orange-500" style={{ left: `${todayPct}%` }}>
              <div className="f-mono text-[9px] uppercase text-orange-600 bg-orange-50 border border-orange-200 rounded px-1 -translate-x-1/2 mt-1">Today</div>
            </div>
          )}
        </div>
        {rows.map((row, i) => {
          const left = pct(row.start);
          const width = Math.max(pct(row.end) - left, 1);
          return (
            <div
              key={i}
              className={`relative flex items-center border-b border-stone-100 last:border-b-0 h-11 ${onRowClick ? "cursor-pointer hover:bg-stone-50" : ""}`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              <div className="w-36 shrink-0 pl-3 pr-2 f-body text-xs text-stone-700 truncate">{row.label}</div>
              <div className="relative flex-1 h-full">
                <div
                  className={`absolute top-2.5 h-6 rounded-sm ${PHASE_BAR_COLOR[row.status] || "bg-stone-400"} shadow-sm flex items-center px-2`}
                  style={{ left: `${left}%`, width: `${width}%`, minWidth: 4 }}
                >
                  {width > 10 && <span className="f-mono text-[10px] text-white truncate">{row.status}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   SIDEBAR + TOPBAR
--------------------------------------------------------------- */
const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "projects", label: "Projects", icon: Building2 },
  { key: "schedule", label: "Schedule", icon: Calendar },
  { key: "budget", label: "Budget", icon: DollarSign },
  { key: "team", label: "Team", icon: Users },
];

function Sidebar({ view, setView, setSelectedProject }) {
  const { session, signOut } = useAuth();
  return (
    <div className="hidden sm:flex w-56 shrink-0 bg-stone-900 text-stone-300 flex-col h-full">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-stone-800">
        <div className="w-8 h-8 rounded-sm bg-orange-600 flex items-center justify-center shrink-0">
          <HardHat size={18} className="text-white" />
        </div>
        <div className="f-display text-lg tracking-wide text-white leading-none">SITELINE</div>
      </div>
      <nav className="flex-1 py-4">
        {NAV_ITEMS.map((it) => {
          const active = view === it.key;
          return (
            <button
              key={it.key}
              onClick={() => { setView(it.key); setSelectedProject(null); }}
              className={`w-full flex items-center gap-3 px-5 py-2.5 f-body text-sm transition-colors ${
                active ? "bg-stone-800 text-white border-l-2 border-orange-600" : "border-l-2 border-transparent hover:bg-stone-800/60 hover:text-white"
              }`}
            >
              <it.icon size={16} />
              {it.label}
            </button>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-stone-800">
        <div className="f-mono text-[10px] text-stone-500 uppercase tracking-wide truncate mb-2">{session?.user?.email}</div>
        <button onClick={signOut} className="flex items-center gap-1.5 f-body text-xs text-stone-400 hover:text-white">
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </div>
  );
}

function MobileTopBar({ onSelectHome }) {
  const { signOut } = useAuth();
  return (
    <div className="sm:hidden flex items-center justify-between gap-2 px-4 py-3 bg-stone-900 border-b border-stone-800 shrink-0">
      <button onClick={onSelectHome} className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-sm bg-orange-600 flex items-center justify-center shrink-0">
          <HardHat size={15} className="text-white" />
        </div>
        <div className="f-display text-base tracking-wide text-white leading-none">SITELINE</div>
      </button>
      <button onClick={signOut} className="text-stone-400 hover:text-white">
        <LogOut size={16} />
      </button>
    </div>
  );
}

function BottomNav({ view, setView, setSelectedProject }) {
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-stone-900 border-t border-stone-800 flex" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {NAV_ITEMS.map((it) => {
        const active = view === it.key;
        return (
          <button
            key={it.key}
            onClick={() => { setView(it.key); setSelectedProject(null); }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 f-mono text-[10px] uppercase tracking-wide ${active ? "text-orange-500" : "text-stone-500"}`}
          >
            <it.icon size={18} />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function TopBar({ title, breadcrumb, onBack }) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-stone-200 bg-white">
      <div className="min-w-0">
        {breadcrumb && (
          <button onClick={onBack} className="flex items-center gap-1 f-mono text-xs text-stone-500 hover:text-orange-600 mb-1 uppercase tracking-wide">
            <ArrowLeft size={12} /> {breadcrumb}
          </button>
        )}
        <h1 className="f-display text-xl sm:text-2xl text-stone-900 tracking-wide truncate">{title}</h1>
      </div>
      <div className="hidden md:block f-mono text-xs text-stone-400 uppercase tracking-wide shrink-0 ml-4">{TODAY.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
    </div>
  );
}

/* ---------------------------------------------------------------
   DASHBOARD VIEW
--------------------------------------------------------------- */
function DashboardView({ goProject }) {
  const { projects, schedules, punchlists, alerts } = useData();
  const active = projects.filter((p) => p.status !== "Pre-Construction");
  const totalBudget = projects.reduce((s, p) => s + p.budgetTotal, 0);
  const totalSpent = projects.reduce((s, p) => s + p.budgetSpent, 0);
  const upcomingMilestones = Object.entries(schedules)
    .flatMap(([pid, phases]) => phases.map((ph) => ({ ...ph, pid })))
    .filter((ph) => ph.status === "In Progress" || ph.status === "Delayed")
    .sort((a, b) => new Date(a.end) - new Date(b.end));

  return (
    <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Building2} label="Active Projects" value={active.length} sub={`${projects.length} total in portfolio`} />
        <StatCard icon={DollarSign} label="Portfolio Budget" value={fmtMoneyShort(totalBudget)} sub={`${fmtMoneyShort(totalSpent)} committed to date`} accent="text-blue-700" />
        <StatCard icon={AlertTriangle} label="Open Alerts" value={alerts.length} sub="Requiring PM attention" accent="text-red-600" />
        <StatCard icon={ClipboardList} label="Open Punch Items" value={Object.values(punchlists).flat().filter(p => p.status !== "Complete").length} sub="Across all projects" accent="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-md">
          <div className="px-5 py-4 border-b border-stone-200 flex items-center gap-2">
            <Flag size={15} className="text-orange-600" />
            <h2 className="f-display text-sm tracking-wide text-stone-800 uppercase">Alerts</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {alerts.length === 0 && <div className="px-5 py-6 f-body text-sm text-stone-400">No open alerts.</div>}
            {alerts.map((a, i) => {
              const proj = projects.find((p) => p.id === a.project);
              if (!proj) return null;
              return (
                <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-stone-50 cursor-pointer" onClick={() => goProject(a.project)}>
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${a.level === "high" ? "bg-red-600" : "bg-amber-500"}`} />
                  <div className="flex-1">
                    <div className="f-body text-sm text-stone-800">{a.text}</div>
                    <div className="f-mono text-[11px] text-stone-400 uppercase mt-0.5">{proj.name}</div>
                  </div>
                  <ChevronRight size={15} className="text-stone-300 mt-1" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-md">
          <div className="px-5 py-4 border-b border-stone-200 flex items-center gap-2">
            <Clock size={15} className="text-blue-700" />
            <h2 className="f-display text-sm tracking-wide text-stone-800 uppercase">Phases In Motion</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {upcomingMilestones.map((m, i) => {
              const proj = projects.find((p) => p.id === m.pid);
              if (!proj) return null;
              return (
                <div key={i} className="px-5 py-3 hover:bg-stone-50 cursor-pointer" onClick={() => goProject(m.pid)}>
                  <div className="flex items-center justify-between">
                    <span className="f-body text-sm text-stone-800">{m.phase}</span>
                    <StatusBadge status={m.status} />
                  </div>
                  <div className="f-mono text-[11px] text-stone-400 mt-1">{proj.name} · target {fmtDate(m.end)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-md">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-orange-600" />
            <h2 className="f-display text-sm tracking-wide text-stone-800 uppercase">Portfolio Overview</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="f-mono text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
              <td className="px-5 py-2">Project</td>
              <td className="px-5 py-2 hidden md:table-cell">Phase</td>
              <td className="px-5 py-2">Status</td>
              <td className="px-5 py-2">Progress</td>
              <td className="px-5 py-2 hidden lg:table-cell">Target</td>
              <td className="px-5 py-2 hidden md:table-cell">Budget</td>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50 cursor-pointer" onClick={() => goProject(p.id)}>
                <td className="px-5 py-3 f-body text-sm text-stone-800 font-medium">{p.name}</td>
                <td className="px-5 py-3 f-body text-sm text-stone-500 hidden md:table-cell">{p.phase}</td>
                <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-5 py-3 w-32 sm:w-40">
                  <div className="flex items-center gap-2">
                    <ProgressBar pct={p.percentComplete} />
                    <span className="f-mono text-xs text-stone-500 w-8">{p.percentComplete}%</span>
                  </div>
                </td>
                <td className="px-5 py-3 f-mono text-xs text-stone-500 hidden lg:table-cell">{fmtDate(p.target)}</td>
                <td className="px-5 py-3 f-mono text-xs text-stone-500 hidden md:table-cell">{fmtMoneyShort(p.budgetSpent)} / {fmtMoneyShort(p.budgetTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   NEW PROJECT MODAL
--------------------------------------------------------------- */
function NewProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "", type: "", address: "", client: "",
    status: "Pre-Construction", phase: "Planning",
    start: "", target: "", budgetTotal: "",
    pm: "", superintendent: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const created = await createProject({ ...form, budgetTotal: Number(form.budgetTotal) || 0 });
      onCreated(created);
    } catch (err) {
      setError(err.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full mt-1 f-body text-sm px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500";
  const labelClass = "f-mono text-[11px] uppercase tracking-wide text-stone-500";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4">
      <div className="bg-white rounded-md w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <h2 className="f-display text-lg text-stone-900 tracking-wide">New Project</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className={labelClass}>Project Name</label>
            <input required value={form.name} onChange={set("name")} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Type</label>
              <input required value={form.type} onChange={set("type")} className={inputClass} placeholder="New Build, Remodel…" />
            </div>
            <div>
              <label className={labelClass}>Client</label>
              <input required value={form.client} onChange={set("client")} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input required value={form.address} onChange={set("address")} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start Date</label>
              <input required type="date" value={form.start} onChange={set("start")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Target Completion</label>
              <input required type="date" value={form.target} onChange={set("target")} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Total Budget</label>
              <input required type="number" min="0" value={form.budgetTotal} onChange={set("budgetTotal")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={form.status} onChange={set("status")} className={inputClass}>
                {Object.keys(STATUS_STYLES).filter(s => ["On Schedule","Behind Schedule","Pre-Construction","Punch List"].includes(s)).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Project Manager</label>
              <input value={form.pm} onChange={set("pm")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Superintendent</label>
              <input value={form.superintendent} onChange={set("superintendent")} className={inputClass} />
            </div>
          </div>
          {error && <div className="f-body text-sm text-red-600">{error}</div>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 f-body text-sm border border-stone-300 text-stone-700 px-3.5 py-2 rounded-md hover:bg-stone-50">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 f-body text-sm bg-orange-600 text-white px-3.5 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50">
              {submitting ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   PROJECTS VIEW
--------------------------------------------------------------- */
function ProjectsView({ goProject }) {
  const { projects, refresh } = useData();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showNew, setShowNew] = useState(false);
  const statuses = ["All", ...new Set(projects.map((p) => p.status))];

  const filtered = projects.filter((p) => {
    const matchesQ = (p.name + p.client + p.address).toLowerCase().includes(q.toLowerCase());
    const matchesStatus = statusFilter === "All" || p.status === statusFilter;
    return matchesQ && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects, clients, addresses…"
            className="w-full f-body text-sm pl-9 pr-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none f-body text-sm border border-stone-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => setShowNew(true)} className="sm:ml-auto flex items-center gap-1.5 f-body text-sm bg-orange-600 text-white px-3.5 py-2 rounded-md hover:bg-orange-700 whitespace-nowrap">
            <Plus size={15} /> <span className="hidden xs:inline sm:inline">New Project</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((p) => (
          <div
            key={p.id}
            onClick={() => goProject(p.id)}
            className="bg-white border border-stone-200 rounded-md p-4 sm:p-5 hover:border-orange-300 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="f-display text-lg text-stone-900 tracking-wide">{p.name}</div>
                <div className="f-body text-xs text-stone-500">{p.type}</div>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <div className="flex items-center gap-1.5 mt-3 f-body text-xs text-stone-500">
              <MapPin size={12} /> {p.address}
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="f-mono text-[11px] uppercase text-stone-400">Progress</span>
                <span className="f-mono text-[11px] text-stone-600">{p.percentComplete}%</span>
              </div>
              <ProgressBar pct={p.percentComplete} colorClass={p.status === "Behind Schedule" ? "bg-red-600" : "bg-orange-600"} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-stone-100">
              <div>
                <div className="f-mono text-[10px] uppercase text-stone-400">Client</div>
                <div className="f-body text-xs text-stone-700 truncate">{p.client}</div>
              </div>
              <div>
                <div className="f-mono text-[10px] uppercase text-stone-400">PM</div>
                <div className="f-body text-xs text-stone-700">{p.pm}</div>
              </div>
              <div>
                <div className="f-mono text-[10px] uppercase text-stone-400">Target</div>
                <div className="f-body text-xs text-stone-700">{fmtDate(p.target)}</div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center f-body text-sm text-stone-400 py-8">No projects match your search.</div>
        )}
      </div>

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={async (created) => {
            setShowNew(false);
            await refresh();
            goProject(created.id);
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   PORTFOLIO SCHEDULE VIEW
--------------------------------------------------------------- */
function ScheduleView({ goProject }) {
  const { projects } = useData();
  const starts = projects.map((p) => p.start).sort();
  const targets = projects.map((p) => p.target).sort();
  const rangeStart = starts[0] || TODAY.toISOString().slice(0, 10);
  const rangeEnd = targets[targets.length - 1] || TODAY.toISOString().slice(0, 10);
  const rows = projects.map((p) => ({
    label: p.name,
    start: p.start,
    end: p.target,
    status: p.status === "Behind Schedule" ? "Delayed" : p.status === "Pre-Construction" ? "Upcoming" : p.percentComplete === 100 ? "Complete" : "In Progress",
    pid: p.id,
  }));
  return (
    <div className="p-4 sm:p-8 space-y-4">
      <p className="f-body text-sm text-stone-500 max-w-2xl">Portfolio-wide timeline from project start to target completion. Click a project bar to open its full phase-level schedule. Swipe to scroll horizontally.</p>
      {rows.length > 0
        ? <GanttChart rows={rows} rangeStart={rangeStart} rangeEnd={rangeEnd} onRowClick={(r) => goProject(r.pid)} />
        : <div className="f-body text-sm text-stone-400">No projects yet.</div>}
    </div>
  );
}

/* ---------------------------------------------------------------
   PORTFOLIO BUDGET VIEW
--------------------------------------------------------------- */
function BudgetView({ goProject }) {
  const { projects } = useData();
  const totalBudget = projects.reduce((s, p) => s + p.budgetTotal, 0);
  const totalSpent = projects.reduce((s, p) => s + p.budgetSpent, 0);
  const chartData = projects.map((p) => ({ name: p.name.split(" ")[0], Budgeted: p.budgetTotal, Spent: p.budgetSpent }));

  return (
    <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={DollarSign} label="Total Contracted" value={fmtMoneyShort(totalBudget)} accent="text-blue-700" />
        <StatCard icon={TrendingUp} label="Total Committed" value={fmtMoneyShort(totalSpent)} sub={totalBudget ? `${Math.round((totalSpent / totalBudget) * 100)}% of portfolio` : undefined} />
        <StatCard icon={DollarSign} label="Remaining" value={fmtMoneyShort(totalBudget - totalSpent)} accent="text-green-700" />
      </div>

      <div className="bg-white border border-stone-200 rounded-md p-4 sm:p-5">
        <h2 className="f-display text-sm tracking-wide text-stone-800 uppercase mb-4">Budgeted vs. Committed by Project</h2>
        <div className="overflow-x-auto">
        <div className="min-w-[480px]">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} stroke="#a8a29e" />
            <YAxis tickFormatter={fmtMoneyShort} tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} stroke="#a8a29e" />
            <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 6 }} />
            <Bar dataKey="Budgeted" fill="#d6d3d1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Spent" fill="#ea580c" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-md overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="f-mono text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
              <td className="px-5 py-2">Project</td>
              <td className="px-5 py-2 hidden sm:table-cell">Budgeted</td>
              <td className="px-5 py-2 hidden sm:table-cell">Committed</td>
              <td className="px-5 py-2 hidden md:table-cell">Remaining</td>
              <td className="px-5 py-2">% Spent</td>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const pctSpent = p.budgetTotal ? Math.round((p.budgetSpent / p.budgetTotal) * 100) : 0;
              const watch = pctSpent - p.percentComplete > 8;
              return (
                <tr key={p.id} className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50 cursor-pointer" onClick={() => goProject(p.id)}>
                  <td className="px-5 py-3 f-body text-sm text-stone-800 font-medium">{p.name}</td>
                  <td className="px-5 py-3 f-mono text-xs text-stone-600 hidden sm:table-cell">{fmtMoney(p.budgetTotal)}</td>
                  <td className="px-5 py-3 f-mono text-xs text-stone-600 hidden sm:table-cell">{fmtMoney(p.budgetSpent)}</td>
                  <td className="px-5 py-3 f-mono text-xs text-stone-600 hidden md:table-cell">{fmtMoney(p.budgetTotal - p.budgetSpent)}</td>
                  <td className="px-5 py-3">
                    <span className={`f-mono text-xs px-1.5 py-0.5 rounded ${watch ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-600"}`}>{pctSpent}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   TEAM VIEW
--------------------------------------------------------------- */
function TeamView() {
  const { team, teamByProject, projects } = useData();
  const [filter, setFilter] = useState("All");
  const types = ["All", "Staff", "Subcontractor"];
  const filtered = team.filter((t) => filter === "All" || t.type === filter);

  const projectsForMember = (memberId) =>
    Object.entries(teamByProject)
      .filter(([, members]) => members.some((m) => m.id === memberId))
      .map(([pid]) => projects.find((p) => p.id === pid))
      .filter(Boolean);

  return (
    <div className="p-4 sm:p-8 space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`shrink-0 f-body text-sm px-3 py-1.5 rounded-md border ${filter === t ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-300 hover:border-stone-400"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white border border-stone-200 rounded-md p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="f-display text-base text-stone-900">{t.name}</div>
                <div className="f-body text-xs text-stone-500">{t.role}</div>
              </div>
              <span className="f-mono text-[10px] uppercase text-stone-400 border border-stone-200 rounded px-1.5 py-0.5">{t.trade}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-3 f-body text-xs text-stone-600">
              <Phone size={12} /> {t.phone}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {projectsForMember(t.id).map((proj) => (
                <span key={proj.id} className="f-mono text-[10px] bg-stone-100 text-stone-600 rounded px-1.5 py-0.5">{proj.name.split(" ")[0]}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   PROJECT DETAIL VIEW
--------------------------------------------------------------- */
function ProjectDetail({ project, back }) {
  const { schedules, budgets, punchlists, documents, teamByProject, refresh } = useData();
  const [tab, setTab] = useState("Overview");
  const tabs = ["Overview", "Schedule", "Budget", "Punch List", "Documents", "Team"];
  const phases = schedules[project.id] || [];
  const budget = budgets[project.id] || [];
  const punch = punchlists[project.id] || [];
  const docs = documents[project.id] || [];
  const crew = teamByProject[project.id] || [];
  const budgetChart = budget.map((b) => ({ name: b.category, Budgeted: b.budgeted, Actual: b.actual }));
  const pctSpent = project.budgetTotal ? Math.round((project.budgetSpent / project.budgetTotal) * 100) : 0;

  const cyclePunchStatus = async (item) => {
    await updatePunchlistStatus(item.id, PUNCH_STATUS_CYCLE[item.status]);
    refresh();
  };

  return (
    <div>
      <TopBar title={project.name} breadcrumb="All Projects" onBack={back} />
      <div className="px-4 sm:px-8 pt-4 sm:pt-5 flex items-center gap-3 sm:gap-4 flex-wrap">
        <StatusBadge status={project.status} />
        <span className="f-body text-sm text-stone-500 flex items-center gap-1"><MapPin size={13} />{project.address}</span>
        <span className="f-body text-sm text-stone-500">Client: {project.client}</span>
        <span className="f-body text-sm text-stone-500 hidden sm:inline">PM: {project.pm}</span>
        <span className="f-body text-sm text-stone-500 hidden sm:inline">Superintendent: {project.superintendent}</span>
      </div>

      <div className="px-4 sm:px-8 mt-4 sm:mt-5 border-b border-stone-200 flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 f-body text-sm px-3 sm:px-4 py-2.5 border-b-2 -mb-px whitespace-nowrap ${tab === t ? "border-orange-600 text-stone-900 font-medium" : "border-transparent text-stone-500 hover:text-stone-700"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-8 sm:pt-6 pt-5">
        {tab === "Overview" && (
          <div className="space-y-5 sm:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard icon={TrendingUp} label="Complete" value={`${project.percentComplete}%`} />
              <StatCard icon={DollarSign} label="Budget Spent" value={`${pctSpent}%`} sub={`${fmtMoney(project.budgetSpent)} of ${fmtMoney(project.budgetTotal)}`} accent="text-blue-700" />
              <StatCard icon={Calendar} label="Days to Target" value={Math.max(daysBetween(TODAY.toISOString().slice(0,10), project.target), 0)} sub={fmtDate(project.target)} accent="text-amber-600" />
              <StatCard icon={ClipboardList} label="Open Punch Items" value={punch.filter(p => p.status !== "Complete").length} accent="text-red-600" />
            </div>
            <div className="bg-white border border-stone-200 rounded-md p-5">
              <h2 className="f-display text-sm tracking-wide text-stone-800 uppercase mb-4">Current Phase — {project.phase}</h2>
              <ProgressBar pct={project.percentComplete} colorClass={project.status === "Behind Schedule" ? "bg-red-600" : "bg-orange-600"} />
              <div className="flex justify-between mt-2 f-mono text-xs text-stone-500">
                <span>{fmtDate(project.start)}</span>
                <span>{fmtDate(project.target)}</span>
              </div>
            </div>
            <div className="bg-white border border-stone-200 rounded-md p-5">
              <h2 className="f-display text-sm tracking-wide text-stone-800 uppercase mb-3">Next Phases</h2>
              <div className="space-y-2">
                {phases.filter((p) => p.status !== "Complete").slice(0, 3).map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-b-0">
                    <span className="f-body text-sm text-stone-700">{p.phase}</span>
                    <div className="flex items-center gap-3">
                      <span className="f-mono text-xs text-stone-400">{fmtDate(p.start)} – {fmtDate(p.end)}</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
                {phases.filter((p) => p.status !== "Complete").length === 0 && (
                  <div className="f-body text-sm text-stone-400 py-2">All phases complete.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "Schedule" && (
          phases.length > 0
            ? <GanttChart
                rows={phases.map((p) => ({ label: p.phase, start: p.start, end: p.end, status: p.status }))}
                rangeStart={project.start}
                rangeEnd={project.target}
              />
            : <div className="f-body text-sm text-stone-400">No schedule phases yet.</div>
        )}

        {tab === "Budget" && (
          <div className="space-y-6">
            {budget.length > 0 && (
              <div className="bg-white border border-stone-200 rounded-md p-4 sm:p-5">
                <h2 className="f-display text-sm tracking-wide text-stone-800 uppercase mb-4">Budgeted vs. Actual by Category</h2>
                <div className="overflow-x-auto">
                <div className="min-w-[420px]">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={budgetChart} layout="vertical" margin={{ left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                    <XAxis type="number" tickFormatter={fmtMoneyShort} tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} stroke="#a8a29e" />
                    <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fontFamily: "Inter" }} stroke="#a8a29e" />
                    <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 6 }} />
                    <Bar dataKey="Budgeted" fill="#d6d3d1" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="Actual" fill="#ea580c" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                </div>
                </div>
              </div>
            )}
            <div className="bg-white border border-stone-200 rounded-md overflow-x-auto">
              {budget.length === 0 ? (
                <div className="p-8 text-center f-body text-sm text-stone-400">No budget line items yet.</div>
              ) : (
              <table className="w-full min-w-[420px]">
                <thead>
                  <tr className="f-mono text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
                    <td className="px-5 py-2">Category</td>
                    <td className="px-5 py-2">Budgeted</td>
                    <td className="px-5 py-2">Actual</td>
                    <td className="px-5 py-2">Variance</td>
                  </tr>
                </thead>
                <tbody>
                  {budget.map((b, i) => {
                    const variance = b.budgeted - b.actual;
                    return (
                      <tr key={i} className="border-b border-stone-100 last:border-b-0">
                        <td className="px-5 py-2.5 f-body text-sm text-stone-800">{b.category}</td>
                        <td className="px-5 py-2.5 f-mono text-xs text-stone-600">{fmtMoney(b.budgeted)}</td>
                        <td className="px-5 py-2.5 f-mono text-xs text-stone-600">{fmtMoney(b.actual)}</td>
                        <td className={`px-5 py-2.5 f-mono text-xs ${variance < 0 ? "text-red-600" : "text-green-700"}`}>{variance < 0 ? "-" : "+"}{fmtMoney(Math.abs(variance))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>
          </div>
        )}

        {tab === "Punch List" && (
          <div className="bg-white border border-stone-200 rounded-md">
            {punch.length === 0 ? (
              <div className="p-8 text-center f-body text-sm text-stone-400">No punch list items yet — this project hasn't reached final walkthrough.</div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[420px]">
                <thead>
                  <tr className="f-mono text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
                    <td className="px-5 py-2">Item</td>
                    <td className="px-5 py-2 hidden sm:table-cell">Location</td>
                    <td className="px-5 py-2 hidden sm:table-cell">Trade</td>
                    <td className="px-5 py-2">Status</td>
                  </tr>
                </thead>
                <tbody>
                  {punch.map((p, i) => (
                    <tr key={i} className="border-b border-stone-100 last:border-b-0">
                      <td className="px-5 py-3 f-body text-sm text-stone-800">{p.item}</td>
                      <td className="px-5 py-3 f-body text-xs text-stone-500 hidden sm:table-cell">{p.location}</td>
                      <td className="px-5 py-3 f-mono text-xs text-stone-500 hidden sm:table-cell">{p.trade}</td>
                      <td className="px-5 py-3"><StatusBadge status={p.status} onClick={() => cyclePunchStatus(p)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )}

        {tab === "Documents" && (
          <div className="bg-white border border-stone-200 rounded-md overflow-x-auto">
            {docs.length === 0 ? (
              <div className="p-8 text-center f-body text-sm text-stone-400">No documents yet.</div>
            ) : (
            <table className="w-full min-w-[460px]">
              <thead>
                <tr className="f-mono text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
                  <td className="px-5 py-2">Document</td>
                  <td className="px-5 py-2 hidden sm:table-cell">Category</td>
                  <td className="px-5 py-2 hidden sm:table-cell">Date</td>
                  <td className="px-5 py-2">Status</td>
                </tr>
              </thead>
              <tbody>
                {docs.map((d, i) => (
                  <tr key={i} className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50">
                    <td className="px-5 py-3 f-body text-sm text-stone-800"><span className="flex items-center gap-2"><FileText size={14} className="text-stone-400 shrink-0" />{d.name}</span></td>
                    <td className="px-5 py-3 f-mono text-xs text-stone-500 hidden sm:table-cell">{d.category}</td>
                    <td className="px-5 py-3 f-mono text-xs text-stone-500 hidden sm:table-cell">{fmtDate(d.date)}</td>
                    <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        )}

        {tab === "Team" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {crew.length === 0 && <div className="f-body text-sm text-stone-400">No team assigned yet.</div>}
            {crew.map((t) => (
              <div key={t.id} className="bg-white border border-stone-200 rounded-md p-4">
                <div className="f-display text-base text-stone-900">{t.name}</div>
                <div className="f-body text-xs text-stone-500">{t.role} · {t.trade}</div>
                <div className="flex items-center gap-1.5 mt-2 f-body text-xs text-stone-600"><Phone size={12} />{t.phone}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   DASHBOARD SHELL (authenticated + data loaded)
--------------------------------------------------------------- */
function DashboardShell() {
  const [view, setView] = useState("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const { projects, loading, error } = useData();

  const goProject = (id) => setSelectedProjectId(id);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const titles = {
    dashboard: "Dashboard",
    projects: "Projects",
    schedule: "Schedule",
    budget: "Budget",
    team: "Team",
  };

  return (
    <div className="flex flex-col sm:flex-row h-screen bg-stone-100 f-body" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <Sidebar view={view} setView={setView} setSelectedProject={setSelectedProjectId} />
      <MobileTopBar onSelectHome={() => { setView("dashboard"); setSelectedProjectId(null); }} />
      <div className="flex-1 overflow-y-auto pb-14 sm:pb-0">
        {loading ? (
          <div className="flex items-center justify-center h-full f-body text-sm text-stone-400">Loading portfolio…</div>
        ) : error ? (
          <div className="flex items-center justify-center h-full f-body text-sm text-red-600 px-8 text-center">{error}</div>
        ) : selectedProject ? (
          <ProjectDetail project={selectedProject} back={() => setSelectedProjectId(null)} />
        ) : (
          <>
            <TopBar title={titles[view]} />
            {view === "dashboard" && <DashboardView goProject={goProject} />}
            {view === "projects" && <ProjectsView goProject={goProject} />}
            {view === "schedule" && <ScheduleView goProject={goProject} />}
            {view === "budget" && <BudgetView goProject={goProject} />}
            {view === "team" && <TeamView />}
          </>
        )}
      </div>
      <BottomNav view={view} setView={setView} setSelectedProject={setSelectedProjectId} />
    </div>
  );
}

/* ---------------------------------------------------------------
   AUTH GATE
--------------------------------------------------------------- */
function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center f-body text-sm text-stone-400">Loading…</div>;
  }
  if (!session) {
    return <LoginPage />;
  }
  return (
    <DataProvider>
      <DashboardShell />
    </DataProvider>
  );
}

/* ---------------------------------------------------------------
   APP ROOT
--------------------------------------------------------------- */
export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 f-body p-8">
        <div className="max-w-md text-center space-y-2">
          <h1 className="f-display text-xl text-stone-900">Supabase not configured</h1>
          <p className="f-body text-sm text-stone-500">
            Copy <code className="f-mono bg-stone-200 px-1 rounded">.env.local.example</code> to{" "}
            <code className="f-mono bg-stone-200 px-1 rounded">.env.local</code>, fill in your Supabase project URL and anon key, and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
