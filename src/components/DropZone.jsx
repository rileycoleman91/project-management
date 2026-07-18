import React, { useState, useRef } from "react";
import { UploadCloud } from "lucide-react";

// Plain drag-and-drop / click-to-browse file picker. Just hands the chosen
// file to the caller — upload/extraction orchestration lives one level up,
// since the two places this is used (new project vs. an existing project's
// Documents tab) need different sequencing.
export default function DropZone({ onFile, label, sublabel, accept, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed border-stone-200" : dragOver ? "border-orange-500 bg-orange-50 cursor-pointer" : "border-stone-300 hover:border-orange-400 cursor-pointer"
      }`}
    >
      <UploadCloud size={22} className="mx-auto text-stone-400 mb-2" />
      <div className="f-body text-sm text-stone-600">{label}</div>
      {sublabel && <div className="f-mono text-[11px] text-stone-400 mt-1">{sublabel}</div>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
