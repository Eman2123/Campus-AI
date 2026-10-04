import { apiFetch, ApiError } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type UploadedDocument = {
  id: string;
  filename: string;
  embedding_status: string;
  subject: string | null;
  drive_file_id: string | null;
  drive_folder_path: string | null;
  organize_status: string;
  created_at: string;
};

export async function listDocuments(token: string): Promise<UploadedDocument[]> {
  return apiFetch<UploadedDocument[]>("/api/documents", { token });
}

export async function deleteDocument(token: string, id: string): Promise<void> {
  await apiFetch<void>(`/api/documents/${id}`, { method: "DELETE", token });
}

/**
 * Multipart upload — bypasses lib/api.ts's always-JSON apiFetch, same
 * reason as lib/voice.ts. Runs the Day 17 embedding pipeline and Day 23
 * File Organizer classification in the background server-side; the
 * returned row's embedding_status/organize_status usually still say
 * "pending"/"processing" at this point — see the polling note on
 * DocumentUploader for how the UI catches up to "ready".
 */
export async function uploadDocument(token: string, file: File): Promise<UploadedDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    let message = `Upload failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") message = data.detail;
    } catch {
      // response body wasn't JSON — keep the generic message
    }
    throw new ApiError(message, res.status);
  }

  return (await res.json()) as UploadedDocument;
}
