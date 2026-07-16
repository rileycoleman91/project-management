import React, { useState } from "react";
import { Phone, Plus, Pencil, Trash2 } from "lucide-react";
import { useData } from "../data/DataProvider";
import { useAuth } from "../auth/AuthProvider";
import EntityModal from "../components/EntityModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { TEAM_FIELDS } from "../lib/fieldSchemas";
import { createTeamMember, updateTeamMember, deleteTeamMember } from "../lib/api";

export default function TeamView() {
  const { team, teamByProject, projects, refresh } = useData();
  const { isAdmin } = useAuth();
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const types = ["All", "Staff", "Subcontractor"];
  const filtered = team.filter((t) => filter === "All" || t.type === filter);

  const projectsForMember = (memberId) =>
    Object.entries(teamByProject)
      .filter(([, members]) => members.some((m) => m.id === memberId))
      .map(([pid]) => projects.find((p) => p.id === pid))
      .filter(Boolean);

  const handleSubmit = async (values) => {
    if (modal.mode === "edit") {
      await updateTeamMember(modal.member.id, values);
    } else {
      await createTeamMember(values);
    }
    await refresh();
    setModal(null);
  };

  return (
    <div className="p-4 sm:p-8 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
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
        <button onClick={() => setModal({ mode: "new" })} className="flex items-center gap-1.5 f-body text-sm bg-orange-600 text-white px-3.5 py-2 rounded-md hover:bg-orange-700 whitespace-nowrap">
          <Plus size={15} /> Add Member
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white border border-stone-200 rounded-md p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="f-display text-base text-stone-900">{t.name}</div>
                <div className="f-body text-xs text-stone-500">{t.role}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="f-mono text-[10px] uppercase text-stone-400 border border-stone-200 rounded px-1.5 py-0.5">{t.trade}</span>
                <button onClick={() => setModal({ mode: "edit", member: t })} className="text-stone-400 hover:text-orange-600"><Pencil size={13} /></button>
                {isAdmin && <button onClick={() => setDeleting(t)} className="text-stone-400 hover:text-red-600"><Trash2 size={13} /></button>}
              </div>
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

      {modal && (
        <EntityModal
          title={modal.mode === "edit" ? "Edit Team Member" : "Add Team Member"}
          fields={TEAM_FIELDS}
          initialValues={modal.member}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete Team Member"
          message={`Remove "${deleting.name}" and unassign them from every project?`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await deleteTeamMember(deleting.id);
            await refresh();
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
