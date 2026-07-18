import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import DropZone from "./DropZone";
import EntityModal from "./EntityModal";
import ExtractionReview from "./ExtractionReview";
import { extractDocument } from "../lib/extraction";
import { PROJECT_FIELDS } from "../lib/fieldSchemas";
import { createProject, uploadDocumentFile, createDocument } from "../lib/api";

// Three steps, only the first two of which are mandatory:
//   drop  -> pick a document (or skip straight to the form)
//   form  -> the normal New Project form, pre-filled from extraction if any
//   review -> only shown if the document had budget/team/material data too
export default function NewProjectFlow({ onClose, onCreated }) {
  const [step, setStep] = useState("drop");
  const [extraction, setExtraction] = useState(null);
  const [sourceFile, setSourceFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdProjectId, setCreatedProjectId] = useState(null);

  const handleFile = async (file) => {
    setError("");
    setLoading(true);
    try {
      const result = await extractDocument(file);
      setExtraction(result);
      setSourceFile(file);
      setStep("form");
    } catch (err) {
      setError(err.message || "Couldn't read that document");
    } finally {
      setLoading(false);
    }
  };

  const skipToForm = () => {
    setExtraction(null);
    setSourceFile(null);
    setStep("form");
  };

  const handleCreateProject = async (values) => {
    const project = await createProject(values);
    setCreatedProjectId(project.id);

    if (sourceFile) {
      const filePath = await uploadDocumentFile(project.id, sourceFile);
      await createDocument(project.id, {
        name: sourceFile.name,
        category: "Estimate",
        date: new Date().toISOString().slice(0, 10),
        status: "Current",
        filePath,
      });
    }

    const hasMore = extraction && (extraction.budgetItems?.length || extraction.teamMembers?.length || extraction.materials?.length);
    if (hasMore) {
      setStep("review");
    } else {
      onCreated(project.id);
    }
  };

  if (step === "drop") {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4">
        <div className="bg-white rounded-md w-full max-w-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
            <h2 className="f-display text-lg text-stone-900 tracking-wide">New Project</h2>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
          </div>
          <div className="p-5 space-y-4">
            {loading ? (
              <div className="py-10 flex flex-col items-center gap-2 f-body text-sm text-stone-500">
                <Loader2 size={22} className="animate-spin text-orange-600" />
                Reading document…
              </div>
            ) : (
              <>
                <DropZone
                  onFile={handleFile}
                  label="Drop a budget estimate, proposal, or cost sheet here"
                  sublabel="PDF, DOCX, XLSX, or an image — we'll pre-fill the project from it"
                  accept=".pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
                />
                {error && <div className="f-body text-sm text-red-600">{error}</div>}
                <button onClick={skipToForm} className="w-full text-center f-body text-sm text-stone-500 hover:text-stone-700 underline underline-offset-2">
                  Skip — I'll enter the details manually
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === "form") {
    return (
      <EntityModal
        title="New Project"
        fields={PROJECT_FIELDS}
        initialValues={extraction?.project}
        onClose={onClose}
        onSubmit={handleCreateProject}
      />
    );
  }

  if (step === "review") {
    return (
      <ExtractionReview
        extraction={extraction}
        projectId={createdProjectId}
        onClose={() => onCreated(createdProjectId)}
        onDone={() => onCreated(createdProjectId)}
      />
    );
  }

  return null;
}
