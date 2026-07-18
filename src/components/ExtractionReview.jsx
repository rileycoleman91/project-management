import React, { useState, useMemo, useEffect } from "react";
import { X, AlertTriangle, FileText, Download } from "lucide-react";
import {
  createBudgetItem, updateBudgetItem,
  createTeamMember, assignTeamMember,
  createRoom, createMaterial,
} from "../lib/api";
import { fmtMoney } from "../lib/format";

const norm = (s) => (s || "").trim().toLowerCase();
const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "gif"];

const fieldInput = "w-full f-body text-sm border border-stone-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500";
const fieldLabel = "f-mono text-[10px] uppercase text-stone-400";

// Shows what the AI proposes adding, side by side with the source document,
// and lets the user edit every field directly before anything is written.
// For an existing project, a proposed budget category that collides with one
// already there gets flagged with a per-item Overwrite / Add-as-new-line
// choice; everything else is a plain checklist. Pass empty arrays for
// existingBudget/existingTeam/existingRooms when there's nothing to conflict
// with yet (a brand-new project). sourceFile is optional — when present its
// original form is shown alongside the extracted fields for comparison.
export default function ExtractionReview({
  extraction, sourceFile, projectId, existingBudget = [], existingTeam = [], existingRooms = [],
  onClose, onDone,
}) {
  const budgetItems = extraction?.budgetItems || [];
  const teamMembers = extraction?.teamMembers || [];
  const materials = extraction?.materials || [];

  const [budgetChoices, setBudgetChoices] = useState(() =>
    budgetItems.map((item) => {
      const conflict = existingBudget.find((b) => norm(b.category) === norm(item.category));
      return { item: { ...item }, conflict, action: conflict ? null : "add", included: true };
    })
  );
  const [teamChoices, setTeamChoices] = useState(() =>
    teamMembers.map((item) => {
      const alreadyExists = existingTeam.some((t) => norm(t.name) === norm(item.name));
      return { item: { ...item }, alreadyExists, included: !alreadyExists };
    })
  );
  const [materialChoices, setMaterialChoices] = useState(() =>
    materials.map((item) => ({ item: { ...item }, included: true }))
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateBudget = (i, patch) => setBudgetChoices((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const updateBudgetField = (i, field, value) => setBudgetChoices((cs) => cs.map((c, idx) => (idx === i ? { ...c, item: { ...c.item, [field]: value } } : c)));
  const updateTeam = (i, patch) => setTeamChoices((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const updateTeamField = (i, field, value) => setTeamChoices((cs) => cs.map((c, idx) => (idx === i ? { ...c, item: { ...c.item, [field]: value } } : c)));
  const updateMaterial = (i, patch) => setMaterialChoices((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const updateMaterialField = (i, field, value) => setMaterialChoices((cs) => cs.map((c, idx) => (idx === i ? { ...c, item: { ...c.item, [field]: value } } : c)));

  const unresolvedConflicts = budgetChoices.filter((c) => c.conflict && c.included && !c.action).length;
  const totalSelected = [...budgetChoices, ...teamChoices, ...materialChoices].filter((c) => c.included).length;

  const sourceUrl = useMemo(() => (sourceFile ? URL.createObjectURL(sourceFile) : null), [sourceFile]);
  useEffect(() => () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl); }, [sourceUrl]);
  const ext = sourceFile ? sourceFile.name.toLowerCase().split(".").pop() : "";
  const isPdf = ext === "pdf";
  const isImage = IMAGE_EXTS.includes(ext);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      for (const choice of budgetChoices) {
        if (!choice.included) continue;
        if (choice.conflict && choice.action === "overwrite") {
          await updateBudgetItem(choice.conflict.id, projectId, {
            category: choice.item.category,
            budgeted: choice.item.budgeted,
            actual: choice.item.actual ?? choice.conflict.actual,
          });
        } else {
          await createBudgetItem(projectId, { category: choice.item.category, budgeted: choice.item.budgeted, actual: choice.item.actual ?? 0 });
        }
      }

      for (const choice of teamChoices) {
        if (!choice.included) continue;
        const created = await createTeamMember({
          name: choice.item.name,
          role: choice.item.role || (choice.item.type === "Staff" ? "Staff" : "Subcontractor"),
          type: choice.item.type === "Staff" ? "Staff" : "Subcontractor",
          trade: choice.item.trade || "",
          phone: choice.item.phone || "",
        });
        await assignTeamMember(projectId, created.id);
      }

      const roomCache = {};
      for (const choice of materialChoices) {
        if (!choice.included) continue;
        const roomName = choice.item.room || "General";
        let room = existingRooms.find((r) => norm(r.name) === norm(roomName)) || roomCache[norm(roomName)];
        if (!room) {
          room = await createRoom(projectId, { name: roomName });
          roomCache[norm(roomName)] = room;
        }
        await createMaterial(projectId, room.id, {
          item: choice.item.item,
          manufacturer: choice.item.manufacturer || "",
          color: choice.item.color || "",
          details: choice.item.details || "",
          status: "Selected",
        });
      }

      onDone();
    } catch (err) {
      setError(err.message || "Something went wrong saving these");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4">
      <div className="bg-white rounded-md w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 shrink-0">
          <div>
            <h2 className="f-display text-lg text-stone-900 tracking-wide">Review Extracted Details</h2>
            <p className="f-body text-xs text-stone-500 mt-0.5">Compare against the source, edit anything that's wrong or missing, then uncheck what shouldn't be added.</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {sourceFile && (
            <div className="lg:w-2/5 border-b lg:border-b-0 lg:border-r border-stone-200 flex flex-col min-h-0 bg-stone-50">
              <div className="px-4 py-2 f-mono text-[11px] uppercase tracking-wide text-stone-400 border-b border-stone-200 shrink-0 truncate">
                Source: {sourceFile.name}
              </div>
              <div className="flex-1 overflow-auto min-h-[220px] lg:min-h-0">
                {isPdf && <iframe src={sourceUrl} title="Source document" className="w-full h-full min-h-[400px]" />}
                {isImage && <img src={sourceUrl} alt="Source document" className="w-full h-auto" />}
                {!isPdf && !isImage && (
                  <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <FileText size={28} className="text-stone-300" />
                    <p className="f-body text-xs text-stone-500">Preview isn't available for this file type. Open the original to compare against it directly.</p>
                    <a href={sourceUrl} download={sourceFile.name} className="flex items-center gap-1.5 f-body text-xs text-orange-600 hover:text-orange-700 underline underline-offset-2">
                      <Download size={12} /> Download {sourceFile.name}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5 space-y-6 min-h-0">
            {extraction?.notes && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-md p-3">
                <AlertTriangle size={14} className="text-blue-600 mt-0.5 shrink-0" />
                <p className="f-body text-xs text-blue-800">{extraction.notes}</p>
              </div>
            )}

            {budgetChoices.length > 0 && (
              <section>
                <h3 className="f-mono text-[11px] uppercase tracking-wide text-stone-400 mb-2">Budget Line Items</h3>
                <div className="space-y-2">
                  {budgetChoices.map((choice, i) => (
                    <div key={i} className={`border rounded-md p-3 ${choice.conflict ? "border-amber-300 bg-amber-50" : "border-stone-200"}`}>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" checked={choice.included} onChange={(e) => updateBudget(i, { included: e.target.checked })} className="mt-6" />
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
                          <div>
                            <label className={fieldLabel}>Category</label>
                            <input className={fieldInput} value={choice.item.category || ""} onChange={(e) => updateBudgetField(i, "category", e.target.value)} />
                          </div>
                          <div>
                            <label className={fieldLabel}>Budgeted</label>
                            <input type="number" className={fieldInput} value={choice.item.budgeted ?? ""} onChange={(e) => updateBudgetField(i, "budgeted", e.target.value === "" ? "" : Number(e.target.value))} />
                          </div>
                        </div>
                      </div>
                      {choice.conflict && (
                        <div className="mt-2 ml-7 flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1 f-mono text-[11px] text-amber-700"><AlertTriangle size={12} /> Already exists ({fmtMoney(choice.conflict.budgeted)})</span>
                          <button type="button" onClick={() => updateBudget(i, { action: "overwrite" })} className={`f-mono text-[11px] px-2 py-0.5 rounded border ${choice.action === "overwrite" ? "bg-stone-900 text-white border-stone-900" : "border-stone-300 text-stone-600 hover:bg-white"}`}>Overwrite</button>
                          <button type="button" onClick={() => updateBudget(i, { action: "add" })} className={`f-mono text-[11px] px-2 py-0.5 rounded border ${choice.action === "add" ? "bg-stone-900 text-white border-stone-900" : "border-stone-300 text-stone-600 hover:bg-white"}`}>Add as new line</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {teamChoices.length > 0 && (
              <section>
                <h3 className="f-mono text-[11px] uppercase tracking-wide text-stone-400 mb-2">Team / Subcontractors</h3>
                <div className="space-y-2">
                  {teamChoices.map((choice, i) => (
                    <div key={i} className="border border-stone-200 rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <input type="checkbox" checked={choice.included} onChange={(e) => updateTeam(i, { included: e.target.checked })} className="mt-6" />
                        <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                          <div>
                            <label className={fieldLabel}>Name</label>
                            <input className={fieldInput} value={choice.item.name || ""} onChange={(e) => updateTeamField(i, "name", e.target.value)} />
                          </div>
                          <div>
                            <label className={fieldLabel}>Trade</label>
                            <input className={fieldInput} value={choice.item.trade || ""} onChange={(e) => updateTeamField(i, "trade", e.target.value)} />
                          </div>
                        </div>
                      </div>
                      {choice.alreadyExists && (
                        <div className="ml-7 mt-1.5 f-mono text-[10px] text-amber-600 uppercase">already on team</div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {materialChoices.length > 0 && (
              <section>
                <h3 className="f-mono text-[11px] uppercase tracking-wide text-stone-400 mb-2">Materials</h3>
                <div className="space-y-2">
                  {materialChoices.map((choice, i) => (
                    <div key={i} className="border border-stone-200 rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <input type="checkbox" checked={choice.included} onChange={(e) => updateMaterial(i, { included: e.target.checked })} className="mt-6" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div>
                              <label className={fieldLabel}>Item</label>
                              <input className={fieldInput} value={choice.item.item || ""} onChange={(e) => updateMaterialField(i, "item", e.target.value)} />
                            </div>
                            <div>
                              <label className={fieldLabel}>Room</label>
                              <input className={fieldInput} value={choice.item.room || ""} onChange={(e) => updateMaterialField(i, "room", e.target.value)} />
                            </div>
                            <div>
                              <label className={fieldLabel}>Manufacturer</label>
                              <input className={fieldInput} value={choice.item.manufacturer || ""} onChange={(e) => updateMaterialField(i, "manufacturer", e.target.value)} />
                            </div>
                          </div>
                          <div>
                            <label className={fieldLabel}>Details</label>
                            <textarea rows={2} className={fieldInput} value={choice.item.details || ""} onChange={(e) => updateMaterialField(i, "details", e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {budgetChoices.length === 0 && teamChoices.length === 0 && materialChoices.length === 0 && (
              <div className="f-body text-sm text-stone-400 text-center py-4">Nothing else to add from this document.</div>
            )}

            {error && <div className="f-body text-sm text-red-600">{error}</div>}
            {unresolvedConflicts > 0 && (
              <div className="f-body text-sm text-amber-700">Resolve the {unresolvedConflicts} flagged conflict{unresolvedConflicts > 1 ? "s" : ""} above before continuing.</div>
            )}
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-stone-200 shrink-0">
          <button onClick={onClose} className="flex-1 f-body text-sm border border-stone-300 text-stone-700 px-3.5 py-2 rounded-md hover:bg-stone-50">Skip</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || unresolvedConflicts > 0 || totalSelected === 0}
            className="flex-1 f-body text-sm bg-orange-600 text-white px-3.5 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
          >
            {submitting ? "Saving…" : `Add Selected (${totalSelected})`}
          </button>
        </div>
      </div>
    </div>
  );
}
