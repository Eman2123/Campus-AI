import { apiFetch } from "@/lib/api";

const TOKEN_STORAGE_KEY = "campus-ai:token";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

type TokenResponse = {
  access_token: string;
  token_type: string;
};

/**
 * Token lives in localStorage, not an httpOnly cookie — the simplest
 * option that works for a client-rendered SPA-style app talking to a
 * separate API origin, at the cost of being readable by any script on
 * the page (XSS risk). Revisiting this for an httpOnly-cookie-based flow
 * would be a reasonable Phase 6 hardening task once there's a reason to
 * take on that complexity (a Next.js route handler acting as a proxy).
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function signUp(email: string, password: string): Promise<string> {
  const { access_token } = await apiFetch<TokenResponse>("/api/auth/signup", {
    method: "POST",
    body: { email, password },
  });
  setToken(access_token);
  return access_token;
}

export async function signIn(email: string, password: string): Promise<string> {
  const { access_token } = await apiFetch<TokenResponse>("/api/auth/signin", {
    method: "POST",
    body: { email, password },
  });
  setToken(access_token);
  return access_token;
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/me", { token });
}
