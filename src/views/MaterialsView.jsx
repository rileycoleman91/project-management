import React, { useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import { useData } from "../data/DataProvider";
import { StatusBadge } from "../components/ui";
import { exportCsv } from "../lib/csv";
import { fmtMoney } from "../lib/format";

// Portfolio-wide view over every material across every project/room, so
// staff can search or filter by project and/or room without having to open
// each project individually.
export default function MaterialsView({ goProject }) {
  const { projects, rooms, materials } = useData();
  const [q, setQ] = useState("");
  const [projectFilter, setProjectFilter] = useState("All");
  const [roomFilter, setRoomFilter] = useState("All");

  const rows = useMemo(() => {
    return projects.flatMap((p) =>
      (materials[p.id] || []).map((m) => ({
        ...m,
        projectName: p.name,
        roomName: (rooms[p.id] || []).find((r) => r.id === m.roomId)?.name || "",
      }))
    );
  }, [projects, rooms, materials]);

  const roomOptions = useMemo(() => {
    const names = new Set(rows.filter((r) => projectFilter === "All" || r.projectName === projectFilter).map((r) => r.roomName));
    return ["All", ...Array.from(names).sort()];
  }, [rows, projectFilter]);

  const filtered = rows.filter((r) => {
    const matchesQ = `${r.item} ${r.manufacturer} ${r.color} ${r.details}`.toLowerCase().includes(q.toLowerCase());
    const matchesProject = projectFilter === "All" || r.projectName === projectFilter;
    const matchesRoom = roomFilter === "All" || r.roomName === roomFilter;
    return matchesQ && matchesProject && matchesRoom;
  });

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search item, manufacturer, color…"
            className="w-full f-body text-sm pl-9 pr-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        <select
          value={projectFilter}
          onChange={(e) => { setProjectFilter(e.target.value); setRoomFilter("All"); }}
          className="f-body text-sm border border-stone-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option>All</option>
          {projects.map((p) => <option key={p.id}>{p.name}</option>)}
        </select>
        <select
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          className="f-body text-sm border border-stone-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {roomOptions.map((r) => <option key={r}>{r}</option>)}
        </select>
        <button
          onClick={() => exportCsv("materials.csv",
            [{ key: "projectName", label: "Project" }, { key: "roomName", label: "Room" }, { key: "item", label: "Item" }, { key: "manufacturer", label: "Manufacturer" }, { key: "color", label: "Color" }, { key: "details", label: "Details" }, { key: "cost", label: "Cost" }, { key: "status", label: "Status" }],
            filtered)}
          disabled={filtered.length === 0}
          className="sm:ml-auto flex items-center gap-1.5 f-body text-sm border border-stone-300 text-stone-700 px-3.5 py-2 rounded-md hover:bg-stone-50 disabled:opacity-40 whitespace-nowrap"
        >
          <Download size={15} /> Export
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-md overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center f-body text-sm text-stone-400">No materials match.</div>
        ) : (
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="f-mono text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
                <td className="px-5 py-2">Project</td>
                <td className="px-5 py-2">Room</td>
                <td className="px-5 py-2">Item</td>
                <td className="px-5 py-2 hidden md:table-cell">Manufacturer</td>
                <td className="px-5 py-2 hidden md:table-cell">Color</td>
                <td className="px-5 py-2 hidden lg:table-cell">Cost</td>
                <td className="px-5 py-2">Status</td>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50 cursor-pointer" onClick={() => goProject(m.projectId, "Materials")}>
                  <td className="px-5 py-3 f-body text-sm text-stone-800 font-medium">{m.projectName}</td>
                  <td className="px-5 py-3 f-body text-sm text-stone-600">{m.roomName}</td>
                  <td className="px-5 py-3 f-body text-sm text-stone-800">{m.item}</td>
                  <td className="px-5 py-3 f-body text-xs text-stone-500 hidden md:table-cell">{m.manufacturer}</td>
                  <td className="px-5 py-3 f-body text-xs text-stone-500 hidden md:table-cell">{m.color}</td>
                  <td className="px-5 py-3 f-mono text-xs text-stone-500 hidden lg:table-cell">{m.cost != null ? fmtMoney(m.cost) : "—"}</td>
                  <td className="px-5 py-3"><StatusBadge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
