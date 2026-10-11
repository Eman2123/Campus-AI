"use client";

import { useDashboard } from "./DashboardContext";

/** One-document delete with a confirm step. Errors surface in the dashboard's error banner. */
export function DocDeleteButton({ id, filename }: { id: string; filename: string }) {
  const { removeDocument } = useDashboard();
  return (
    <button
      type="button"
      aria-label={`Delete ${filename}`}
      title="Delete document"
      onClick={(e) => {
        e.stopPropagation();
        if (window.confirm(`Delete "${filename}"? This cannot be undone.`)) void removeDocument(id);
      }}
      className="pixel-focus shrink-0 border-2 border-brand-black bg-brand-white px-1.5 text-xs font-bold hover:bg-accent-coral"
    >
      ✕
    </button>
  );
}
