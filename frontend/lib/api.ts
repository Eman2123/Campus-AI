export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export const TOKEN_STORAGE_KEY = "campus-ai:token";

/**
 * An authenticated request that comes back 401 means the stored token is
 * expired or revoked: drop it and send the person to sign in, instead of
 * leaving every screen showing a confusing error. Only called when a token
 * was actually sent, so a wrong password on /signin (also 401) is untouched.
 */
export function handleSessionExpired(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // storage unavailable; nothing to clear
  }
  if (!window.location.pathname.startsWith("/signin")) {
    window.location.assign("/signin?expired=1");
  }
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiFetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

/**
 * Thin wrapper around fetch for talking to the backend (see ../../backend).
 * Prefixes NEXT_PUBLIC_API_BASE_URL, JSON-encodes the body, attaches a
 * bearer token when given, and turns FastAPI's `{"detail": "..."}` error
 * shape into a catchable ApiError with that message.
 *
 * A request that never reaches the server (offline, backend down, CORS)
 * becomes an ApiError with status 0, so callers have one error type to handle.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  if (res.status === 401 && token) handleSessionExpired();

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data?.detail) && typeof data.detail[0]?.msg === "string") {
        // FastAPI validation errors arrive as a list of {loc, msg, type}.
        message = data.detail[0].msg;
      }
    } catch {
      // response body wasn't JSON — keep the generic message
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * The message to show a person for a failed auth request. Anything the
 * backend said on purpose (wrong password, email taken, link expired…) is
 * passed through; rate limiting and network failures get friendlier text.
 */
export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return "Too many attempts. Please wait a minute and try again.";
    if (err.status >= 500) return "Something went wrong on our side. Please try again in a moment.";
    return err.message;
  }
  return "Something went wrong. Please try again.";
}
