import React from "react";
import { TODAY, PHASE_BAR_COLOR } from "../lib/format";

export default function GanttChart({ rows, rangeStart, rangeEnd, onRowClick }) {
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
