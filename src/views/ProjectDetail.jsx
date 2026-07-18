import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  DollarSign, Calendar, ClipboardList, TrendingUp, MapPin, Phone, FileText,
  Plus, Pencil, Trash2, Download, ExternalLink, Package, Loader2
} from "lucide-react";
import { useData } from "../data/DataProvider";
import { useAuth } from "../auth/AuthProvider";
import { TopBar } from "../layout/Layout";
import { StatCard, StatusBadge, ProgressBar } from "../components/ui";
import GanttChart from "../components/GanttChart";
import EntityModal from "../components/EntityModal";
import ConfirmDialog from "../components/ConfirmDialog";
import DropZone from "../components/DropZone";
import ExtractionReview from "../components/ExtractionReview";
import { PROJECT_FIELDS, PHASE_FIELDS, BUDGET_FIELDS, PUNCH_FIELDS, DOCUMENT_FIELDS, ROOM_FIELDS, getMaterialFields } from "../lib/fieldSchemas";
import { fmtMoney, fmtMoneyShort, fmtDate, daysBetween, TODAY, PUNCH_STATUS_CYCLE } from "../lib/format";
import { exportCsv } from "../lib/csv";
import { extractDocument } from "../lib/extraction";
import {
  updateProject,
  createPhase, updatePhase, deletePhase,
  createBudgetItem, updateBudgetItem, deleteBudgetItem,
  createPunchItem, updatePunchItem, updatePunchlistStatus, deletePunchItem,
  createDocument, updateDocument, deleteDocument, uploadDocumentFile, getDocumentDownloadUrl,
  assignTeamMember, unassignTeamMember,
  createRoom, updateRoom, deleteRoom, createMaterial, updateMaterial, deleteMaterial,
} from "../lib/api";

export default function ProjectDetail({ project, back, initialTab, onTabChange }) {
  const { schedules, budgets, punchlists, documents, teamByProject, team, rooms, materials, materialsByRoom, refresh } = useData();
  const { canEdit } = useAuth();
  const [tab, setTab] = useState(initialTab || "Overview");
  const tabs = ["Overview", "Schedule", "Budget", "Punch List", "Documents", "Materials", "Team"];
  const phases = schedules[project.id] || [];
  const budget = budgets[project.id] || [];
  const punch = punchlists[project.id] || [];
  const docs = documents[project.id] || [];
  const crew = teamByProject[project.id] || [];
  const unassigned = team.filter((t) => !crew.some((c) => c.id === t.id));
  const projectRooms = rooms[project.id] || [];
  const projectMaterials = materials[project.id] || [];
  const budgetChart = budget.map((b) => ({ name: b.category, Budgeted: b.budgeted, Actual: b.actual }));
  const pctSpent = project.budgetTotal ? Math.round((project.budgetSpent / project.budgetTotal) * 100) : 0;

  const [editingProject, setEditingProject] = useState(false);
  const [phaseModal, setPhaseModal] = useState(null);
  const [deletingPhase, setDeletingPhase] = useState(null);
  const [budgetModal, setBudgetModal] = useState(null);
  const [deletingBudget, setDeletingBudget] = useState(null);
  const [punchModal, setPunchModal] = useState(null);
  const [deletingPunch, setDeletingPunch] = useState(null);
  const [docModal, setDocModal] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [assignId, setAssignId] = useState("");
  const [roomModal, setRoomModal] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(null);
  const [materialModal, setMaterialModal] = useState(null);
  const [deletingMaterial, setDeletingMaterial] = useState(null);
  const [dropLoading, setDropLoading] = useState(false);
  const [dropError, setDropError] = useState("");
  const [pendingExtraction, setPendingExtraction] = useState(null);
  const [pendingSourceFile, setPendingSourceFile] = useState(null);

  const cyclePunchStatus = async (item) => {
    await updatePunchlistStatus(item.id, PUNCH_STATUS_CYCLE[item.status]);
    refresh();
  };

  // The file always gets archived to Documents first, regardless of whether
  // extraction finds anything usable — extraction is a bonus on top of the
  // upload, never a replacement for having the source document on hand.
  const handleDocumentDrop = async (file) => {
    setDropError("");
    setDropLoading(true);
    try {
      const filePath = await uploadDocumentFile(project.id, file);
      await createDocument(project.id, {
        name: file.name,
        category: "Uploaded",
        date: new Date().toISOString().slice(0, 10),
        status: "Current",
        filePath,
      });
      await refresh();

      const extraction = await extractDocument(file);
      const hasProposals = extraction && (extraction.budgetItems?.length || extraction.teamMembers?.length || extraction.materials?.length);
      if (hasProposals) {
        setPendingExtraction(extraction);
        setPendingSourceFile(file);
      }
    } catch (err) {
      setDropError(err.message || "Something went wrong with that file");
    } finally {
      setDropLoading(false);
    }
  };

  return (
    <div>
      <TopBar
        title={project.name}
        breadcrumb="All Projects"
        onBack={back}
        right={
          canEdit && (
            <button onClick={() => setEditingProject(true)} className="flex items-center gap-1.5 f-body text-sm border border-stone-300 text-stone-700 px-3 py-1.5 rounded-md hover:bg-stone-50">
              <Pencil size={13} /> Edit Project
            </button>
          )
        }
      />
      <div className="px-4 sm:px-8 pt-4 sm:pt-5 flex items-center gap-3 sm:gap-4 flex-wrap">
        <StatusBadge status={project.status} />
        <span className="f-body text-sm text-stone-500 flex items-center gap-1"><MapPin size={13} />{project.address}</span>
        <span className="f-body text-sm text-stone-500">Client: {project.client}</span>
        <span className="f-body text-sm text-stone-500 hidden sm:inline">PM: {project.pm}</span>
        <span className="f-body text-sm text-stone-500 hidden sm:inline">Superintendent: {project.superintendent}</span>
      </div>

      <div className="px-4 sm:px-8 mt-4 sm:mt-5 border-b border-stone-200 flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); onTabChange?.(t); }}
            className={`shrink-0 f-body text-sm px-3 sm:px-4 py-2.5 border-b-2 -mb-px whitespace-nowrap ${tab === t ? "border-orange-600 text-stone-900 font-medium" : "border-transparent text-stone-500 hover:text-stone-700"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-8 sm:pt-6 pt-5">
        {tab === "Overview" && (
          <div className="space-y-5 sm:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard icon={TrendingUp} label="Complete" value={`${project.percentComplete}%`} />
              <StatCard icon={DollarSign} label="Budget Spent" value={`${pctSpent}%`} sub={`${fmtMoney(project.budgetSpent)} of ${fmtMoney(project.budgetTotal)}`} accent="text-blue-700" />
              <StatCard icon={Calendar} label="Days to Target" value={Math.max(daysBetween(TODAY.toISOString().slice(0,10), project.target), 0)} sub={fmtDate(project.target)} accent="text-amber-600" />
              <StatCard icon={ClipboardList} label="Open Punch Items" value={punch.filter(p => p.status !== "Complete").length} accent="text-red-600" />
            </div>
            <div className="bg-white border border-stone-200 rounded-md p-5">
              <h2 className="f-display text-sm tracking-wide text-stone-800 uppercase mb-4">Current Phase — {project.phase}</h2>
              <ProgressBar pct={project.percentComplete} colorClass={project.status === "Behind Schedule" ? "bg-red-600" : "bg-orange-600"} />
              <div className="flex justify-between mt-2 f-mono text-xs text-stone-500">
                <span>{fmtDate(project.start)}</span>
                <span>{fmtDate(project.target)}</span>
              </div>
            </div>
            <div className="bg-white border border-stone-200 rounded-md p-5">
              <h2 className="f-display text-sm tracking-wide text-stone-800 uppercase mb-3">Next Phases</h2>
              <div className="space-y-2">
                {phases.filter((p) => p.status !== "Complete").slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-b-0">
                    <span className="f-body text-sm text-stone-700">{p.phase}</span>
                    <div className="flex items-center gap-3">
                      <span className="f-mono text-xs text-stone-400">{fmtDate(p.start)} – {fmtDate(p.end)}</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
                {phases.filter((p) => p.status !== "Complete").length === 0 && (
                  <div className="f-body text-sm text-stone-400 py-2">All phases complete.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "Schedule" && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <button
                onClick={() => exportCsv(`${project.name}-schedule.csv`,
                  [{ key: "phase", label: "Phase" }, { key: "start", label: "Start" }, { key: "end", label: "End" }, { key: "status", label: "Status" }, { key: "trade", label: "Trade" }],
                  phases)}
                disabled={phases.length === 0}
                className="flex items-center gap-1.5 f-body text-sm border border-stone-300 text-stone-700 px-3 py-1.5 rounded-md hover:bg-stone-50 disabled:opacity-40"
              >
                <Download size={13} /> Export
              </button>
              {canEdit && (
                <button onClick={() => setPhaseModal({ mode: "new" })} className="flex items-center gap-1.5 f-body text-sm bg-orange-600 text-white px-3 py-1.5 rounded-md hover:bg-orange-700">
                  <Plus size={13} /> Add Phase
                </button>
              )}
            </div>
            {phases.length > 0 && (
              <GanttChart
                rows={phases.map((p) => ({ label: p.phase, start: p.start, end: p.end, status: p.status }))}
                rangeStart={project.start}
                rangeEnd={project.target}
              />
            )}
            <div className="bg-white border border-stone-200 rounded-md overflow-x-auto">
              {phases.length === 0 ? (
                <div className="p-8 text-center f-body text-sm text-stone-400">No schedule phases yet.</div>
              ) : (
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="f-mono text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
                      <td className="px-5 py-2">Phase</td>
                      <td className="px-5 py-2">Dates</td>
                      <td className="px-5 py-2">Trade</td>
                      <td className="px-5 py-2">Status</td>
                      <td className="px-5 py-2"></td>
                    </tr>
                  </thead>
                  <tbody>
                    {phases.map((p) => (
                      <tr key={p.id} className="border-b border-stone-100 last:border-b-0">
                        <td className="px-5 py-2.5 f-body text-sm text-stone-800">{p.phase}</td>
                        <td className="px-5 py-2.5 f-mono text-xs text-stone-500">{fmtDate(p.start)} – {fmtDate(p.end)}</td>
                        <td className="px-5 py-2.5 f-mono text-xs text-stone-500">{p.trade}</td>
                        <td className="px-5 py-2.5"><StatusBadge status={p.status} /></td>
                        <td className="px-5 py-2.5">
                          {canEdit && (
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => setPhaseModal({ mode: "edit", phase: p })} className="text-stone-400 hover:text-orange-600"><Pencil size={14} /></button>
                              <button onClick={() => setDeletingPhase(p)} className="text-stone-400 hover:text-red-600"><Trash2 size={14} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab === "Budget" && (
          <div className="space-y-6">
            <div className="flex justify-end gap-2">
              <button
                onClick={() => exportCsv(`${project.name}-budget.csv`,
                  [{ key: "category", label: "Category" }, { key: "budgeted", label: "Budgeted" }, { key: "actual", label: "Actual" }],
                  budget)}
                disabled={budget.length === 0}
                className="flex items-center gap-1.5 f-body text-sm border border-stone-300 text-stone-700 px-3 py-1.5 rounded-md hover:bg-stone-50 disabled:opacity-40"
              >
                <Download size={13} /> Export
              </button>
              {canEdit && (
                <button onClick={() => setBudgetModal({ mode: "new" })} className="flex items-center gap-1.5 f-body text-sm bg-orange-600 text-white px-3 py-1.5 rounded-md hover:bg-orange-700">
                  <Plus size={13} /> Add Line Item
                </button>
              )}
            </div>
            {budget.length > 0 && (
              <div className="bg-white border border-stone-200 rounded-md p-4 sm:p-5">
                <h2 className="f-display text-sm tracking-wide text-stone-800 uppercase mb-4">Budgeted vs. Actual by Category</h2>
                <div className="overflow-x-auto">
                <div className="min-w-[420px]">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={budgetChart} layout="vertical" margin={{ left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                    <XAxis type="number" tickFormatter={fmtMoneyShort} tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} stroke="#a8a29e" />
                    <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fontFamily: "Inter" }} stroke="#a8a29e" />
                    <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 6 }} />
                    <Bar dataKey="Budgeted" fill="#d6d3d1" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="Actual" fill="#ea580c" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                </div>
                </div>
              </div>
            )}
            <div className="bg-white border border-stone-200 rounded-md overflow-x-auto">
              {budget.length === 0 ? (
                <div className="p-8 text-center f-body text-sm text-stone-400">No budget line items yet.</div>
              ) : (
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="f-mono text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
                    <td className="px-5 py-2">Category</td>
                    <td className="px-5 py-2">Budgeted</td>
                    <td className="px-5 py-2">Actual</td>
                    <td className="px-5 py-2">Variance</td>
                    <td className="px-5 py-2 hidden sm:table-cell">Materials</td>
                    <td className="px-5 py-2"></td>
                  </tr>
                </thead>
                <tbody>
                  {budget.map((b) => {
                    const variance = b.budgeted - b.actual;
                    const linkedMaterials = projectMaterials.filter((m) => m.budgetItemId === b.id);
                    const materialsCost = linkedMaterials.reduce((sum, m) => sum + (m.cost || 0), 0);
                    return (
                      <tr key={b.id} className="border-b border-stone-100 last:border-b-0">
                        <td className="px-5 py-2.5 f-body text-sm text-stone-800">{b.category}</td>
                        <td className="px-5 py-2.5 f-mono text-xs text-stone-600">{fmtMoney(b.budgeted)}</td>
                        <td className="px-5 py-2.5 f-mono text-xs text-stone-600">{fmtMoney(b.actual)}</td>
                        <td className={`px-5 py-2.5 f-mono text-xs ${variance < 0 ? "text-red-600" : "text-green-700"}`}>{variance < 0 ? "-" : "+"}{fmtMoney(Math.abs(variance))}</td>
                        <td className="px-5 py-2.5 f-mono text-xs text-stone-500 hidden sm:table-cell">
                          {linkedMaterials.length === 0 ? "—" : `${linkedMaterials.length} · ${fmtMoney(materialsCost)}`}
                        </td>
                        <td className="px-5 py-2.5">
                          {canEdit && (
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => setBudgetModal({ mode: "edit", item: b })} className="text-stone-400 hover:text-orange-600"><Pencil size={14} /></button>
                              <button onClick={() => setDeletingBudget(b)} className="text-stone-400 hover:text-red-600"><Trash2 size={14} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>
          </div>
        )}

        {tab === "Punch List" && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <button
                onClick={() => exportCsv(`${project.name}-punch-list.csv`,
                  [{ key: "item", label: "Item" }, { key: "location", label: "Location" }, { key: "trade", label: "Trade" }, { key: "status", label: "Status" }],
                  punch)}
                disabled={punch.length === 0}
                className="flex items-center gap-1.5 f-body text-sm border border-stone-300 text-stone-700 px-3 py-1.5 rounded-md hover:bg-stone-50 disabled:opacity-40"
              >
                <Download size={13} /> Export
              </button>
              {canEdit && (
                <button onClick={() => setPunchModal({ mode: "new" })} className="flex items-center gap-1.5 f-body text-sm bg-orange-600 text-white px-3 py-1.5 rounded-md hover:bg-orange-700">
                  <Plus size={13} /> Add Item
                </button>
              )}
            </div>
            <div className="bg-white border border-stone-200 rounded-md">
              {punch.length === 0 ? (
                <div className="p-8 text-center f-body text-sm text-stone-400">No punch list items yet — this project hasn't reached final walkthrough.</div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="f-mono text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
                      <td className="px-5 py-2">Item</td>
                      <td className="px-5 py-2 hidden sm:table-cell">Location</td>
                      <td className="px-5 py-2 hidden sm:table-cell">Trade</td>
                      <td className="px-5 py-2">Status</td>
                      <td className="px-5 py-2"></td>
                    </tr>
                  </thead>
                  <tbody>
                    {punch.map((p) => (
                      <tr key={p.id} className="border-b border-stone-100 last:border-b-0">
                        <td className="px-5 py-3 f-body text-sm text-stone-800">{p.item}</td>
                        <td className="px-5 py-3 f-body text-xs text-stone-500 hidden sm:table-cell">{p.location}</td>
                        <td className="px-5 py-3 f-mono text-xs text-stone-500 hidden sm:table-cell">{p.trade}</td>
                        <td className="px-5 py-3"><StatusBadge status={p.status} onClick={canEdit ? () => cyclePunchStatus(p) : undefined} /></td>
                        <td className="px-5 py-3">
                          {canEdit && (
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => setPunchModal({ mode: "edit", item: p })} className="text-stone-400 hover:text-orange-600"><Pencil size={14} /></button>
                              <button onClick={() => setDeletingPunch(p)} className="text-stone-400 hover:text-red-600"><Trash2 size={14} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "Documents" && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <button
                onClick={() => exportCsv(`${project.name}-documents.csv`,
                  [{ key: "name", label: "Document" }, { key: "category", label: "Category" }, { key: "date", label: "Date" }, { key: "status", label: "Status" }],
                  docs)}
                disabled={docs.length === 0}
                className="flex items-center gap-1.5 f-body text-sm border border-stone-300 text-stone-700 px-3 py-1.5 rounded-md hover:bg-stone-50 disabled:opacity-40"
              >
                <Download size={13} /> Export
              </button>
              {canEdit && (
                <button onClick={() => setDocModal({ mode: "new" })} className="flex items-center gap-1.5 f-body text-sm bg-orange-600 text-white px-3 py-1.5 rounded-md hover:bg-orange-700">
                  <Plus size={13} /> Add Document
                </button>
              )}
            </div>

            {canEdit && (
              dropLoading ? (
                <div className="border-2 border-dashed border-stone-300 rounded-md p-6 text-center flex flex-col items-center gap-2 f-body text-sm text-stone-500">
                  <Loader2 size={20} className="animate-spin text-orange-600" />
                  Uploading and reading document…
                </div>
              ) : (
                <div className="space-y-2">
                  <DropZone
                    onFile={handleDocumentDrop}
                    label="Drop a document here to add it and let AI suggest budget/team/material updates"
                    sublabel="PDF, DOCX, XLSX, or an image — the file is always saved here either way"
                    accept=".pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
                  />
                  {dropError && <div className="f-body text-sm text-red-600">{dropError}</div>}
                </div>
              )
            )}

            <div className="bg-white border border-stone-200 rounded-md overflow-x-auto">
              {docs.length === 0 ? (
                <div className="p-8 text-center f-body text-sm text-stone-400">No documents yet.</div>
              ) : (
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="f-mono text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
                    <td className="px-5 py-2">Document</td>
                    <td className="px-5 py-2 hidden sm:table-cell">Category</td>
                    <td className="px-5 py-2 hidden sm:table-cell">Date</td>
                    <td className="px-5 py-2">Status</td>
                    <td className="px-5 py-2"></td>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50">
                      <td className="px-5 py-3 f-body text-sm text-stone-800"><span className="flex items-center gap-2"><FileText size={14} className="text-stone-400 shrink-0" />{d.name}</span></td>
                      <td className="px-5 py-3 f-mono text-xs text-stone-500 hidden sm:table-cell">{d.category}</td>
                      <td className="px-5 py-3 f-mono text-xs text-stone-500 hidden sm:table-cell">{fmtDate(d.date)}</td>
                      <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {d.filePath && (
                            <button
                              onClick={async () => window.open(await getDocumentDownloadUrl(d.filePath), "_blank")}
                              className="text-stone-400 hover:text-orange-600"
                              title="Download"
                            >
                              <ExternalLink size={14} />
                            </button>
                          )}
                          {canEdit && (
                            <>
                              <button onClick={() => setDocModal({ mode: "edit", doc: d })} className="text-stone-400 hover:text-orange-600"><Pencil size={14} /></button>
                              <button onClick={() => setDeletingDoc(d)} className="text-stone-400 hover:text-red-600"><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>
          </div>
        )}

        {tab === "Materials" && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <button
                onClick={() => exportCsv(`${project.name}-materials.csv`,
                  [{ key: "room", label: "Room" }, { key: "item", label: "Item" }, { key: "manufacturer", label: "Manufacturer" }, { key: "color", label: "Color" }, { key: "details", label: "Details" }, { key: "phase", label: "Phase" }, { key: "budgetCategory", label: "Budget Category" }, { key: "cost", label: "Cost" }, { key: "status", label: "Status" }],
                  projectMaterials.map((m) => ({
                    ...m,
                    room: projectRooms.find((r) => r.id === m.roomId)?.name || "",
                    phase: phases.find((p) => p.id === m.phaseId)?.phase || "",
                    budgetCategory: budget.find((b) => b.id === m.budgetItemId)?.category || "",
                  })))}
                disabled={projectMaterials.length === 0}
                className="flex items-center gap-1.5 f-body text-sm border border-stone-300 text-stone-700 px-3 py-1.5 rounded-md hover:bg-stone-50 disabled:opacity-40"
              >
                <Download size={13} /> Export
              </button>
              {canEdit && (
                <button onClick={() => setRoomModal({ mode: "new" })} className="flex items-center gap-1.5 f-body text-sm bg-orange-600 text-white px-3 py-1.5 rounded-md hover:bg-orange-700">
                  <Plus size={13} /> Add Room
                </button>
              )}
            </div>
            {projectRooms.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-md p-8 text-center f-body text-sm text-stone-400">No rooms yet — add a room to start tracking materials.</div>
            ) : (
              projectRooms.map((room) => {
                const roomMaterials = materialsByRoom[room.id] || [];
                return (
                  <div key={room.id} className="bg-white border border-stone-200 rounded-md">
                    <div className="px-5 py-3 border-b border-stone-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-orange-600" />
                        <h3 className="f-display text-sm tracking-wide text-stone-800">{room.name}</h3>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-3">
                          <button onClick={() => setMaterialModal({ mode: "new", roomId: room.id })} className="flex items-center gap-1.5 f-mono text-[11px] uppercase text-stone-500 hover:text-orange-600">
                            <Plus size={13} /> Add Material
                          </button>
                          <button onClick={() => setRoomModal({ mode: "edit", room })} className="text-stone-400 hover:text-orange-600"><Pencil size={14} /></button>
                          <button onClick={() => setDeletingRoom(room)} className="text-stone-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                    {roomMaterials.length === 0 ? (
                      <div className="p-6 text-center f-body text-sm text-stone-400">No materials added for this room yet.</div>
                    ) : (
                      <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] table-fixed">
                        <thead>
                          <tr className="f-mono text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
                            <td className="px-5 py-2 w-[15%]">Item</td>
                            <td className="px-5 py-2 w-[13%]">Manufacturer</td>
                            <td className="px-5 py-2 w-[9%]">Color</td>
                            <td className="px-5 py-2 w-[28%] hidden sm:table-cell">Details</td>
                            <td className="px-5 py-2 w-[9%] hidden md:table-cell">Phase</td>
                            <td className="px-5 py-2 w-[9%] hidden md:table-cell">Cost</td>
                            <td className="px-5 py-2 w-[9%]">Status</td>
                            <td className="px-5 py-2 w-[8%]"></td>
                          </tr>
                        </thead>
                        <tbody>
                          {roomMaterials.map((m) => (
                            <tr key={m.id} className="border-b border-stone-100 last:border-b-0">
                              <td className="px-5 py-2.5 f-body text-sm text-stone-800">{m.item}</td>
                              <td className="px-5 py-2.5 f-body text-xs text-stone-600">{m.manufacturer}</td>
                              <td className="px-5 py-2.5 f-body text-xs text-stone-600">{m.color}</td>
                              <td className="px-5 py-2.5 f-body text-xs text-stone-500 hidden sm:table-cell">{m.details}</td>
                              <td className="px-5 py-2.5 f-mono text-xs text-stone-500 hidden md:table-cell">{phases.find((p) => p.id === m.phaseId)?.phase || "—"}</td>
                              <td className="px-5 py-2.5 f-mono text-xs text-stone-500 hidden md:table-cell">{m.cost != null ? fmtMoney(m.cost) : "—"}</td>
                              <td className="px-5 py-2.5"><StatusBadge status={m.status} /></td>
                              <td className="px-5 py-2.5">
                                {canEdit && (
                                  <div className="flex items-center gap-2 justify-end">
                                    <button onClick={() => setMaterialModal({ mode: "edit", roomId: room.id, material: m })} className="text-stone-400 hover:text-orange-600"><Pencil size={14} /></button>
                                    <button onClick={() => setDeletingMaterial(m)} className="text-stone-400 hover:text-red-600"><Trash2 size={14} /></button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "Team" && (
          <div className="space-y-4">
            {canEdit && (
              <div className="flex items-center gap-2 flex-wrap">
                <select value={assignId} onChange={(e) => setAssignId(e.target.value)} className="f-body text-sm border border-stone-300 rounded-md px-3 py-2">
                  <option value="">Assign existing team member…</option>
                  {unassigned.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.role}</option>)}
                </select>
                <button
                  disabled={!assignId}
                  onClick={async () => { await assignTeamMember(project.id, assignId); setAssignId(""); refresh(); }}
                  className="flex items-center gap-1.5 f-body text-sm bg-orange-600 text-white px-3 py-2 rounded-md hover:bg-orange-700 disabled:opacity-40"
                >
                  <Plus size={13} /> Assign
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {crew.length === 0 && <div className="f-body text-sm text-stone-400">No team assigned yet.</div>}
              {crew.map((t) => (
                <div key={t.id} className="bg-white border border-stone-200 rounded-md p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="f-display text-base text-stone-900">{t.name}</div>
                      <div className="f-body text-xs text-stone-500">{t.role} · {t.trade}</div>
                    </div>
                    {canEdit && (
                      <button onClick={async () => { await unassignTeamMember(project.id, t.id); refresh(); }} className="text-stone-400 hover:text-red-600" title="Remove from project">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 f-body text-xs text-stone-600"><Phone size={12} />{t.phone}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {editingProject && (
        <EntityModal
          title="Edit Project"
          fields={PROJECT_FIELDS}
          initialValues={project}
          onClose={() => setEditingProject(false)}
          onSubmit={async (values) => { await updateProject(project.id, values); await refresh(); setEditingProject(false); }}
        />
      )}

      {phaseModal && (
        <EntityModal
          title={phaseModal.mode === "edit" ? "Edit Phase" : "Add Phase"}
          fields={PHASE_FIELDS}
          initialValues={phaseModal.phase}
          onClose={() => setPhaseModal(null)}
          onSubmit={async (values) => {
            if (phaseModal.mode === "edit") {
              await updatePhase(phaseModal.phase.id, project.id, { ...values, sortOrder: phaseModal.phase.sortOrder });
            } else {
              const nextSortOrder = phases.reduce((max, p) => Math.max(max, p.sortOrder ?? 0), 0) + 1;
              await createPhase(project.id, { ...values, sortOrder: nextSortOrder });
            }
            await refresh();
            setPhaseModal(null);
          }}
        />
      )}
      {deletingPhase && (
        <ConfirmDialog
          title="Delete Phase"
          message={`Delete "${deletingPhase.phase}" from the schedule?`}
          onCancel={() => setDeletingPhase(null)}
          onConfirm={async () => { await deletePhase(deletingPhase.id); await refresh(); setDeletingPhase(null); }}
        />
      )}

      {budgetModal && (
        <EntityModal
          title={budgetModal.mode === "edit" ? "Edit Line Item" : "Add Line Item"}
          fields={BUDGET_FIELDS}
          initialValues={budgetModal.item}
          onClose={() => setBudgetModal(null)}
          onSubmit={async (values) => {
            if (budgetModal.mode === "edit") await updateBudgetItem(budgetModal.item.id, project.id, values);
            else await createBudgetItem(project.id, values);
            await refresh();
            setBudgetModal(null);
          }}
        />
      )}
      {deletingBudget && (
        <ConfirmDialog
          title="Delete Line Item"
          message={`Delete the "${deletingBudget.category}" budget line?`}
          onCancel={() => setDeletingBudget(null)}
          onConfirm={async () => { await deleteBudgetItem(deletingBudget.id); await refresh(); setDeletingBudget(null); }}
        />
      )}

      {punchModal && (
        <EntityModal
          title={punchModal.mode === "edit" ? "Edit Punch Item" : "Add Punch Item"}
          fields={PUNCH_FIELDS}
          initialValues={punchModal.item}
          onClose={() => setPunchModal(null)}
          onSubmit={async (values) => {
            if (punchModal.mode === "edit") await updatePunchItem(punchModal.item.id, project.id, values);
            else await createPunchItem(project.id, values);
            await refresh();
            setPunchModal(null);
          }}
        />
      )}
      {deletingPunch && (
        <ConfirmDialog
          title="Delete Punch Item"
          message={`Delete "${deletingPunch.item}"?`}
          onCancel={() => setDeletingPunch(null)}
          onConfirm={async () => { await deletePunchItem(deletingPunch.id); await refresh(); setDeletingPunch(null); }}
        />
      )}

      {docModal && (
        <EntityModal
          title={docModal.mode === "edit" ? "Edit Document" : "Add Document"}
          fields={DOCUMENT_FIELDS}
          initialValues={docModal.doc}
          onClose={() => setDocModal(null)}
          onSubmit={async (values) => {
            const { file, ...rest } = values;
            let filePath = docModal.doc?.filePath ?? null;
            if (file instanceof File) {
              filePath = await uploadDocumentFile(project.id, file);
            }
            const payload = { ...rest, filePath };
            if (docModal.mode === "edit") await updateDocument(docModal.doc.id, project.id, payload);
            else await createDocument(project.id, payload);
            await refresh();
            setDocModal(null);
          }}
        />
      )}
      {deletingDoc && (
        <ConfirmDialog
          title="Delete Document"
          message={`Delete "${deletingDoc.name}"?${deletingDoc.filePath ? " The uploaded file will be removed too." : ""}`}
          onCancel={() => setDeletingDoc(null)}
          onConfirm={async () => { await deleteDocument(deletingDoc.id, deletingDoc.filePath); await refresh(); setDeletingDoc(null); }}
        />
      )}

      {roomModal && (
        <EntityModal
          title={roomModal.mode === "edit" ? "Edit Room" : "Add Room"}
          fields={ROOM_FIELDS}
          initialValues={roomModal.room}
          onClose={() => setRoomModal(null)}
          onSubmit={async (values) => {
            if (roomModal.mode === "edit") await updateRoom(roomModal.room.id, values);
            else {
              const nextSortOrder = projectRooms.reduce((max, r) => Math.max(max, r.sortOrder ?? 0), 0) + 1;
              await createRoom(project.id, { ...values, sortOrder: nextSortOrder });
            }
            await refresh();
            setRoomModal(null);
          }}
        />
      )}
      {deletingRoom && (
        <ConfirmDialog
          title="Delete Room"
          message={`Delete "${deletingRoom.name}" and all of its materials? This can't be undone.`}
          onCancel={() => setDeletingRoom(null)}
          onConfirm={async () => { await deleteRoom(deletingRoom.id); await refresh(); setDeletingRoom(null); }}
        />
      )}

      {materialModal && (
        <EntityModal
          title={materialModal.mode === "edit" ? "Edit Material" : "Add Material"}
          fields={getMaterialFields(phases, budget)}
          initialValues={materialModal.material}
          onClose={() => setMaterialModal(null)}
          onSubmit={async (values) => {
            if (materialModal.mode === "edit") await updateMaterial(materialModal.material.id, project.id, materialModal.roomId, values);
            else await createMaterial(project.id, materialModal.roomId, values);
            await refresh();
            setMaterialModal(null);
          }}
        />
      )}
      {deletingMaterial && (
        <ConfirmDialog
          title="Delete Material"
          message={`Delete "${deletingMaterial.item}"?`}
          onCancel={() => setDeletingMaterial(null)}
          onConfirm={async () => { await deleteMaterial(deletingMaterial.id); await refresh(); setDeletingMaterial(null); }}
        />
      )}

      {pendingExtraction && (
        <ExtractionReview
          extraction={pendingExtraction}
          sourceFile={pendingSourceFile}
          projectId={project.id}
          existingBudget={budget}
          existingTeam={team}
          existingRooms={projectRooms}
          onClose={() => { setPendingExtraction(null); setPendingSourceFile(null); }}
          onDone={async () => { await refresh(); setPendingExtraction(null); setPendingSourceFile(null); }}
        />
      )}
    </div>
  );
}
