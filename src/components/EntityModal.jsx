import React, { useState } from "react";
import { X } from "lucide-react";

const inputClass = "w-full mt-1 f-body text-sm px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500";
const labelClass = "f-mono text-[11px] uppercase tracking-wide text-stone-500";

// Generic add/edit form modal driven by a field schema, so every entity
// (project, phase, budget item, punch item, document, team member) reuses
// the same modal shell instead of a bespoke component each.
export default function EntityModal({ title, fields, initialValues, onClose, onSubmit }) {
  const [values, setValues] = useState(() => {
    const v = {};
    fields.forEach((f) => {
      v[f.key] = initialValues?.[f.key] ?? (f.type === "number" ? 0 : f.type === "select" ? f.options[0] : "");
    });
    return v;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => {
    const val = e.target.type === "file" ? e.target.files[0] : e.target.value;
    setValues((v) => ({ ...v, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err.message || "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4">
      <div className="bg-white rounded-md w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <h2 className="f-display text-lg text-stone-900 tracking-wide">{title}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className={labelClass}>{f.label}</label>
              {f.type === "select" ? (
                <select value={values[f.key]} onChange={set(f.key)} className={inputClass} required={f.required}>
                  {f.options.map((opt) => <option key={opt}>{opt}</option>)}
                </select>
              ) : f.type === "file" ? (
                <input type="file" onChange={set(f.key)} className={inputClass} accept={f.accept} />
              ) : (
                <input
                  type={f.type || "text"}
                  required={f.required}
                  min={f.type === "number" ? 0 : undefined}
                  value={values[f.key]}
                  onChange={set(f.key)}
                  className={inputClass}
                  placeholder={f.placeholder}
                />
              )}
            </div>
          ))}
          {error && <div className="f-body text-sm text-red-600">{error}</div>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 f-body text-sm border border-stone-300 text-stone-700 px-3.5 py-2 rounded-md hover:bg-stone-50">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 f-body text-sm bg-orange-600 text-white px-3.5 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50">
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
