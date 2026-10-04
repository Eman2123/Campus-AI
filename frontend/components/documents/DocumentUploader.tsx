"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { ApiError } from "@/lib/api";
import { deleteDocument, listDocuments, uploadDocument, type UploadedDocument } from "@/lib/documents";

type DocumentUploaderProps = {
  token: string;
};

const IN_PROGRESS_STATUSES = new Set(["pending", "processing"]);

function hasInProgressWork(docs: UploadedDocument[]): boolean {
  return docs.some(
    (doc) => IN_PROGRESS_STATUSES.has(doc.embedding_status) || IN_PROGRESS_STATUSES.has(doc.organize_status),
  );
}

export function DocumentUploader({ token }: DocumentUploaderProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh(): Promise<UploadedDocument[]> {
    try {
      const docs = await listDocuments(token);
      setDocuments(docs);
      return docs;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load your documents.");
      return [];
    }
  }

  useEffect(() => {
    refresh().then((docs) => startPollingIfNeeded(docs));
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function startPollingIfNeeded(docs: UploadedDocument[]) {
    if (pollRef.current || !hasInProgressWork(docs)) return;

    // Embedding (Day 17) and File Organizer classification (Day 23) run
    // as background tasks — outside of tests (where TestClient runs
    // them synchronously before the response returns), that happens
    // *after* the upload response comes back. So the UI polls until
    // embedding_status/organize_status leave "pending"/"processing"
    // instead of assuming a freshly-uploaded document is already done.
    pollRef.current = setInterval(async () => {
      const latest = await refresh();
      if (!hasInProgressWork(latest) && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 2000);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      await uploadDocument(token, file);
      const docs = await refresh();
      startPollingIfNeeded(docs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDocument(token, id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete that document.");
    }
  }

  return (
    <div className="border-t border-paper/10 p-4">
      <div className="flex items-center justify-between">
        <p className="font-sans text-xs text-muted-onDark">Your documents</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-sm border border-paper/20 px-3 py-1.5 font-sans text-xs text-paper transition-colors hover:border-paper/40 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFileChange} />
      </div>

      {error && <p className="mt-2 font-sans text-xs text-note-coral">{error}</p>}

      <ul className="mt-3 space-y-2">
        {documents.map((doc) => {
          const isProcessing = IN_PROGRESS_STATUSES.has(doc.embedding_status);
          return (
            <li key={doc.id} className="flex items-center justify-between gap-2 font-sans text-xs">
              <div className="min-w-0">
                <p className="truncate text-paper">{doc.filename}</p>
                <p className="mt-0.5 text-muted-onDark">
                  {doc.subject ?? "Uncategorized"} — {isProcessing ? "processing…" : "ready"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(doc.id)}
                className="shrink-0 text-muted-onDark transition-colors hover:text-note-coral"
                aria-label={`Delete ${doc.filename}`}
              >
                Remove
              </button>
            </li>
          );
        })}
        {documents.length === 0 && <li className="font-sans text-xs text-muted-onDark">No documents uploaded yet.</li>}
      </ul>
    </div>
  );
}
