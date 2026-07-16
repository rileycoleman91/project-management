import React from "react";
import { statusStyle } from "../lib/format";

export function StatusBadge({ status, onClick }) {
  return (
    <span
      onClick={onClick}
      className={`f-mono inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide px-2 py-1 rounded border ${statusStyle(status)} ${onClick ? "cursor-pointer" : ""}`}
    >
      {status}
    </span>
  );
}

export function ProgressBar({ pct, colorClass = "bg-orange-600" }) {
  return (
    <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
      <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sub, accent = "text-orange-600" }) {
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

export function IconButton({ icon: Icon, onClick, title, className = "" }) {
  return (
    <button onClick={onClick} title={title} className={`text-stone-400 hover:text-orange-600 p-1 ${className}`}>
      <Icon size={14} />
    </button>
  );
}
