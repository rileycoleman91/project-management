import React from "react";
import { Download, AlertTriangle, ClipboardList, Clock } from "lucide-react";
import { useData } from "../data/DataProvider";
import { StatusBadge } from "../components/ui";
import { fmtDate, fmtMoney, TODAY, daysBetween } from "../lib/format";
import { exportCsv } from "../lib/csv";

export default function ReportsView({ goProject }) {
  const { projects, punchlists, schedules } = useData();

  const overBudget = projects
    .map((p) => ({ ...p, pctSpent: p.budgetTotal ? Math.round((p.budgetSpent / p.budgetTotal) * 100) : 0 }))
    .filter((p) => p.pctSpent - p.percentComplete > 8);

  const openPunchItems = Object.entries(punchlists)
    .flatMap(([pid, items]) => items.filter((i) => i.status !== "Complete").map((i) => ({ ...i, pid })))
    .map((i) => ({ ...i, projectName: projects.find((p) => p.id === i.pid)?.name || "" }));

  const upcomingMilestones = Object.entries(schedules)
    .flatMap(([pid, phases]) => phases.map((ph) => ({ ...ph, pid })))
    .filter((ph) => ph.status !== "Complete" && daysBetween(TODAY.toISOString().slice(0, 10), ph.end) <= 30 && daysBetween(TODAY.toISOString().slice(0, 10), ph.end) >= 0)
    .sort((a, b) => new Date(a.end) - new Date(b.end))
    .map((ph) => ({ ...ph, projectName: projects.find((p) => p.id === ph.pid)?.name || "" }));

  const exportOverBudget = () =>
    exportCsv("over-budget-projects.csv",
      [{ key: "name", label: "Project" }, { key: "budgetTotal", label: "Budgeted" }, { key: "budgetSpent", label: "Spent" }, { key: "pctSpent", label: "% Spent" }, { key: "percentComplete", label: "% Complete" }],
      overBudget);

  const exportPunch = () =>
    exportCsv("open-punch-items.csv",
      [{ key: "projectName", label: "Project" }, { key: "item", label: "Item" }, { key: "location", label: "Location" }, { key: "trade", label: "Trade" }, { key: "status", label: "Status" }],
      openPunchItems);

  const exportMilestones = () =>
    exportCsv("upcoming-milestones.csv",
      [{ key: "projectName", label: "Project" }, { key: "phase", label: "Phase" }, { key: "end", label: "Target Date" }, { key: "status", label: "Status" }],
      upcomingMilestones);

  return (
    <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
      <div className="bg-white border border-stone-200 rounded-md">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-600" />
            <h2 className="f-display text-sm tracking-wide text-stone-800 uppercase">Over-Budget Projects</h2>
          </div>
          <button onClick={exportOverBudget} disabled={overBudget.length === 0} className="flex items-center gap-1.5 f-mono text-[11px] uppercase text-stone-500 hover:text-orange-600 disabled:opacity-30 disabled:hover:text-stone-500">
            <Download size={13} /> Export CSV
          </button>
        </div>
        {overBudget.length === 0 ? (
          <div className="p-6 f-body text-sm text-stone-400">No projects spending ahead of progress right now.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {overBudget.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-stone-50 cursor-pointer" onClick={() => goProject(p.id)}>
                <span className="f-body text-sm text-stone-800">{p.name}</span>
                <span className="f-mono text-xs text-stone-500">{p.pctSpent}% spent · {p.percentComplete}% complete · {fmtMoney(p.budgetSpent)} of {fmtMoney(p.budgetTotal)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-md">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={15} className="text-amber-600" />
            <h2 className="f-display text-sm tracking-wide text-stone-800 uppercase">Open Punch Items — Company Wide</h2>
          </div>
          <button onClick={exportPunch} disabled={openPunchItems.length === 0} className="flex items-center gap-1.5 f-mono text-[11px] uppercase text-stone-500 hover:text-orange-600 disabled:opacity-30 disabled:hover:text-stone-500">
            <Download size={13} /> Export CSV
          </button>
        </div>
        {openPunchItems.length === 0 ? (
          <div className="p-6 f-body text-sm text-stone-400">No open punch items.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {openPunchItems.map((i) => (
              <div key={i.id} className="px-5 py-3 flex items-center justify-between hover:bg-stone-50 cursor-pointer" onClick={() => goProject(i.pid)}>
                <div>
                  <div className="f-body text-sm text-stone-800">{i.item}</div>
                  <div className="f-mono text-[11px] text-stone-400 uppercase">{i.projectName} · {i.location}</div>
                </div>
                <StatusBadge status={i.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-md">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-blue-700" />
            <h2 className="f-display text-sm tracking-wide text-stone-800 uppercase">Milestones Due in 30 Days</h2>
          </div>
          <button onClick={exportMilestones} disabled={upcomingMilestones.length === 0} className="flex items-center gap-1.5 f-mono text-[11px] uppercase text-stone-500 hover:text-orange-600 disabled:opacity-30 disabled:hover:text-stone-500">
            <Download size={13} /> Export CSV
          </button>
        </div>
        {upcomingMilestones.length === 0 ? (
          <div className="p-6 f-body text-sm text-stone-400">Nothing due in the next 30 days.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {upcomingMilestones.map((m, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-stone-50 cursor-pointer" onClick={() => goProject(m.pid)}>
                <div>
                  <div className="f-body text-sm text-stone-800">{m.phase}</div>
                  <div className="f-mono text-[11px] text-stone-400 uppercase">{m.projectName} · due {fmtDate(m.end)}</div>
                </div>
                <StatusBadge status={m.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
