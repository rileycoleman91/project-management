import React from "react";
import { useData } from "../data/DataProvider";
import GanttChart from "../components/GanttChart";
import { TODAY } from "../lib/format";

export default function ScheduleView({ goProject }) {
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
