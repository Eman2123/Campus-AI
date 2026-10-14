import { apiFetch, TOKEN_STORAGE_KEY } from "@/lib/api";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
};

type TokenResponse = {
  access_token: string;
  token_type: string;
};

type MessageResponse = {
  message: string;
};

/**
 * Where the token lives depends on "Remember me": ticked → localStorage
 * (survives closing the browser, matches the backend's longer-lived
 * token); unticked → sessionStorage (gone when the tab closes). Reads
 * check both, and writing to one clears the other so there is only ever
 * one copy.
 *
 * Both are readable by any script on the page (XSS risk); an httpOnly
 * cookie behind a Next.js route-handler proxy would be the hardening step
 * if that ever becomes a concern.
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      window.localStorage.getItem(TOKEN_STORAGE_KEY) ??
      window.sessionStorage.getItem(TOKEN_STORAGE_KEY)
    );
  } catch {
    return null; // storage blocked (private mode, strict settings)
  }
}

export function setToken(token: string, remember = true): void {
  const keep = remember ? window.localStorage : window.sessionStorage;
  const drop = remember ? window.sessionStorage : window.localStorage;
  drop.removeItem(TOKEN_STORAGE_KEY);
  keep.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // nothing to clear if storage is unavailable
  }
}

export async function signUp(name: string, email: string, password: string, acceptTerms = false): Promise<string> {
  const { access_token } = await apiFetch<TokenResponse>("/api/auth/signup", {
    method: "POST",
    body: { name: name.trim() || null, email, password, accept_terms: acceptTerms },
  });
  // A brand-new account is a deliberate choice to use this device: keep them signed in.
  setToken(access_token, true);
  return access_token;
}

export async function signIn(email: string, password: string, remember: boolean): Promise<string> {
  const { access_token } = await apiFetch<TokenResponse>("/api/auth/signin", {
    method: "POST",
    body: { email, password, remember_me: remember },
  });
  setToken(access_token, remember);
  return access_token;
}

export async function signInWithGoogle(credential: string, acceptTerms = false): Promise<string> {
  const { access_token } = await apiFetch<TokenResponse>("/api/auth/google", {
    method: "POST",
    body: { credential, accept_terms: acceptTerms },
  });
  setToken(access_token, true);
  return access_token;
}

/** Always resolves with the same neutral message, whether or not the email has an account. */
export async function requestPasswordReset(email: string): Promise<string> {
  const { message } = await apiFetch<MessageResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
  return message;
}

export async function resetPassword(token: string, password: string): Promise<string> {
  const { message } = await apiFetch<MessageResponse>("/api/auth/reset-password", {
    method: "POST",
    body: { token, password },
  });
  return message;
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/me", { token });
}

const REMEMBER_KEY = "campus-ai:remember-default";

/** Settings -> "Keep me signed in": the default state of the sign-in checkbox on this device. */
export function getRememberDefault(): boolean {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setRememberDefault(value: boolean): void {
  try {
    window.localStorage.setItem(REMEMBER_KEY, value ? "1" : "0");
  } catch {
    // storage blocked: the choice just won't persist
  }
}
