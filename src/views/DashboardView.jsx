import React from "react";
import { Building2, DollarSign, AlertTriangle, ClipboardList, Flag, Clock, ChevronRight } from "lucide-react";
import { useData } from "../data/DataProvider";
import { StatCard, StatusBadge, ProgressBar } from "../components/ui";
import { fmtDate, fmtMoneyShort } from "../lib/format";

export default function DashboardView({ goProject }) {
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
            {alerts.map((a) => {
              const proj = projects.find((p) => p.id === a.project);
              if (!proj) return null;
              return (
                <div key={a.id} className="px-5 py-3 flex items-start gap-3 hover:bg-stone-50 cursor-pointer" onClick={() => goProject(a.project)}>
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
