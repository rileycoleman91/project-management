import React, { useState } from "react";

export default function ConfirmDialog({ title, message, confirmLabel = "Delete", onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message || "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4">
      <div className="bg-white rounded-md w-full max-w-sm p-5">
        <h2 className="f-display text-lg text-stone-900 tracking-wide">{title}</h2>
        <p className="f-body text-sm text-stone-600 mt-2">{message}</p>
        {error && <div className="f-body text-sm text-red-600 mt-2">{error}</div>}
        <div className="flex gap-2 pt-4">
          <button onClick={onCancel} className="flex-1 f-body text-sm border border-stone-300 text-stone-700 px-3.5 py-2 rounded-md hover:bg-stone-50">Cancel</button>
          <button onClick={handleConfirm} disabled={busy} className="flex-1 f-body text-sm bg-red-600 text-white px-3.5 py-2 rounded-md hover:bg-red-700 disabled:opacity-50">
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
