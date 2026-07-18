import React, { useState, useRef, useEffect } from "react";
import { statusStyle } from "../lib/format";

// Renders exactly like a plain status badge. Pass `options` + `onChange`
// (typically gated behind canEdit at the call site) to make it clickable —
// it opens a small dropdown of the other valid statuses in place, so you
// don't have to open the full edit modal just to change one field.
export function StatusBadge({ status, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const interactive = Boolean(options?.length && onChange);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const badge = (
    <span
      onClick={interactive ? (e) => { e.stopPropagation(); setOpen((o) => !o); } : undefined}
      className={`f-mono inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide px-2 py-1 rounded border ${statusStyle(status)} ${interactive ? "cursor-pointer" : ""}`}
    >
      {status}
    </span>
  );

  if (!interactive) return badge;

  return (
    <span ref={ref} className="relative inline-block">
      {badge}
      {open && (
        <div className="absolute z-30 mt-1 min-w-[130px] bg-white border border-stone-200 rounded-md shadow-lg py-1">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                if (opt !== status) onChange(opt);
              }}
              className={`w-full text-left px-3 py-1.5 f-mono text-[11px] uppercase tracking-wide hover:bg-stone-50 ${opt === status ? "text-stone-900 font-medium" : "text-stone-500"}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
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
