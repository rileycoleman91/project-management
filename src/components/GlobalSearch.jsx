import React, { useMemo, useState, useRef, useEffect } from "react";
import { Search, Building2, ClipboardList, FileText, Users, X } from "lucide-react";
import { useData } from "../data/DataProvider";

const TYPE_FILTERS = ["All", "Projects", "Punch List", "Documents", "Team"];
const TYPE_ICON = { Projects: Building2, "Punch List": ClipboardList, Documents: FileText, Team: Users };

// Client-side search across everything already loaded into DataProvider —
// no extra network round trip needed since the whole portfolio is in memory.
export default function GlobalSearch({ onNavigate }) {
  const { projects, punchlists, documents, team } = useData();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { Projects: [], "Punch List": [], Documents: [], Team: [] };

    const projectName = (id) => projects.find((p) => p.id === id)?.name || "";

    const matchProjects = projects
      .filter((p) => `${p.name} ${p.client} ${p.address}`.toLowerCase().includes(q))
      .map((p) => ({ id: p.id, label: p.name, sub: p.client, nav: { view: "dashboard", projectId: p.id } }));

    const matchPunch = Object.entries(punchlists)
      .flatMap(([pid, items]) => items.map((it) => ({ ...it, pid })))
      .filter((it) => `${it.item} ${it.location} ${it.trade}`.toLowerCase().includes(q))
      .map((it) => ({ id: it.id, label: it.item, sub: `${projectName(it.pid)} · ${it.location || ""}`, nav: { view: "dashboard", projectId: it.pid, tab: "Punch List" } }));

    const matchDocs = Object.entries(documents)
      .flatMap(([pid, docs]) => docs.map((d) => ({ ...d, pid })))
      .filter((d) => `${d.name} ${d.category}`.toLowerCase().includes(q))
      .map((d) => ({ id: d.id, label: d.name, sub: `${projectName(d.pid)} · ${d.category}`, nav: { view: "dashboard", projectId: d.pid, tab: "Documents" } }));

    const matchTeam = team
      .filter((t) => `${t.name} ${t.role} ${t.trade}`.toLowerCase().includes(q))
      .map((t) => ({ id: t.id, label: t.name, sub: t.role, nav: { view: "team" } }));

    return { Projects: matchProjects, "Punch List": matchPunch, Documents: matchDocs, Team: matchTeam };
  }, [query, projects, punchlists, documents, team]);

  const visibleGroups = typeFilter === "All" ? TYPE_FILTERS.slice(1) : [typeFilter];
  const totalCount = visibleGroups.reduce((sum, g) => sum + results[g].length, 0);

  const handleSelect = (nav) => {
    onNavigate(nav);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search everything…"
          className="w-full f-body text-sm pl-9 pr-8 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
            <X size={14} />
          </button>
        )}
      </div>

      {open && query && (
        <div className="absolute mt-1 w-full bg-white border border-stone-200 rounded-md shadow-lg z-40 max-h-96 overflow-y-auto">
          <div className="flex gap-1 p-2 border-b border-stone-100 overflow-x-auto">
            {TYPE_FILTERS.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`shrink-0 f-mono text-[10px] uppercase px-2 py-1 rounded ${typeFilter === t ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
              >
                {t}
              </button>
            ))}
          </div>
          {totalCount === 0 ? (
            <div className="p-4 f-body text-sm text-stone-400 text-center">No matches.</div>
          ) : (
            visibleGroups.map((group) =>
              results[group].length === 0 ? null : (
                <div key={group}>
                  <div className="px-3 py-1.5 f-mono text-[10px] uppercase tracking-wide text-stone-400 bg-stone-50">{group}</div>
                  {results[group].slice(0, 8).map((r) => {
                    const Icon = TYPE_ICON[group];
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleSelect(r.nav)}
                        className="px-3 py-2 flex items-center gap-2 hover:bg-stone-50 cursor-pointer"
                      >
                        <Icon size={13} className="text-stone-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="f-body text-sm text-stone-800 truncate">{r.label}</div>
                          {r.sub && <div className="f-mono text-[10px] text-stone-400 truncate">{r.sub}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )
          )}
        </div>
      )}
    </div>
  );
}
