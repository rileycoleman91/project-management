import React, { useState } from "react";
import { Search, MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { useData } from "../data/DataProvider";
import { useAuth } from "../auth/AuthProvider";
import { StatusBadge, ProgressBar } from "../components/ui";
import EntityModal from "../components/EntityModal";
import ConfirmDialog from "../components/ConfirmDialog";
import NewProjectFlow from "../components/NewProjectFlow";
import { PROJECT_FIELDS } from "../lib/fieldSchemas";
import { fmtDate } from "../lib/format";
import { updateProject, deleteProject } from "../lib/api";

export default function ProjectsView({ goProject }) {
  const { projects, refresh } = useData();
  const { canEdit } = useAuth();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modal, setModal] = useState(null); // { mode: 'new' | 'edit', project? }
  const [deleting, setDeleting] = useState(null);
  const statuses = ["All", ...new Set(projects.map((p) => p.status))];

  const filtered = projects.filter((p) => {
    const matchesQ = (p.name + p.client + p.address).toLowerCase().includes(q.toLowerCase());
    const matchesStatus = statusFilter === "All" || p.status === statusFilter;
    return matchesQ && matchesStatus;
  });

  const handleEditSubmit = async (values) => {
    await updateProject(modal.project.id, values);
    await refresh();
    setModal(null);
  };

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
          {canEdit && (
            <button onClick={() => setModal({ mode: "new" })} className="sm:ml-auto flex items-center gap-1.5 f-body text-sm bg-orange-600 text-white px-3.5 py-2 rounded-md hover:bg-orange-700 whitespace-nowrap">
              <Plus size={15} /> <span className="hidden xs:inline sm:inline">New Project</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="bg-white border border-stone-200 rounded-md p-4 sm:p-5 hover:border-orange-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="cursor-pointer flex-1 min-w-0" onClick={() => goProject(p.id)}>
                <div className="f-display text-lg text-stone-900 tracking-wide">{p.name}</div>
                <div className="f-body text-xs text-stone-500">{p.type}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={p.status} />
                {canEdit && (
                  <>
                    <button onClick={() => setModal({ mode: "edit", project: p })} className="text-stone-400 hover:text-orange-600"><Pencil size={14} /></button>
                    <button onClick={() => setDeleting(p)} className="text-stone-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 f-body text-xs text-stone-500 cursor-pointer" onClick={() => goProject(p.id)}>
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

      {modal?.mode === "new" && (
        <NewProjectFlow
          onClose={() => setModal(null)}
          onCreated={async (id) => {
            setModal(null);
            await refresh();
            goProject(id);
          }}
        />
      )}

      {modal?.mode === "edit" && (
        <EntityModal
          title="Edit Project"
          fields={PROJECT_FIELDS}
          initialValues={modal.project}
          onClose={() => setModal(null)}
          onSubmit={handleEditSubmit}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete Project"
          message={`Delete "${deleting.name}" and all of its schedule, budget, punch list, and document data? This can't be undone.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await deleteProject(deleting.id);
            await refresh();
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
