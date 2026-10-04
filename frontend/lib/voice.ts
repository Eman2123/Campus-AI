import { ApiError } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type VoiceChatResponse = {
  transcript: string;
  intent: string;
  agent_used: string;
  reply: string;
};

/**
 * POST /api/voice/chat needs multipart/form-data (an audio file field
 * plus a session_id field), not JSON — so this bypasses lib/api.ts's
 * apiFetch (which always JSON-encodes) and builds the request directly.
 * Same backend endpoint the Day 6 Voice Agent code drives: AssemblyAI
 * transcribes the audio, then the transcript goes through the exact
 * same Supervisor-routed graph as typed chat (see api/routes/voice.py —
 * "Voice Agent's only job is voice-in -> text").
 *
 * Surfaces the backend's real error cases as ApiError messages rather
 * than a generic failure: no ASSEMBLYAI_API_KEY configured (503), or
 * audio with no detectable speech (422).
 */
export async function sendVoiceMessage(token: string, sessionId: string, audio: Blob): Promise<VoiceChatResponse> {
  const formData = new FormData();
  const extension = audio.type.includes("ogg") ? "ogg" : audio.type.includes("mp4") ? "mp4" : "webm";
  formData.append("audio", audio, `voice-message.${extension}`);
  formData.append("session_id", sessionId);

  const res = await fetch(`${API_BASE_URL}/api/voice/chat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    let message = `Voice request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") message = data.detail;
    } catch {
      // response body wasn't JSON — keep the generic message
    }
    throw new ApiError(message, res.status);
  }

  return (await res.json()) as VoiceChatResponse;
}
