"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { type AuthUser, clearToken, fetchCurrentUser, getToken } from "@/lib/auth";

type AuthGuardResult = {
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  token: string | null;
  loading: boolean;
  /** Asks "Sign out?" first; does nothing if the person cancels. Use for every Sign out button. */
  signOut: () => void;
  /** Signs out immediately with no prompt — only for flows where the session is already over (e.g. after the account is deleted). */
  forceSignOut: () => void;
};

export const SIGN_OUT_CONFIRM_MESSAGE = "Sign out of Campus AI on this device?";

/**
 * Shared by every signed-in page: redirects to /signin when there is no
 * token or the one stored is expired/invalid, otherwise resolves the
 * current user.
 */
export function useAuthGuard(): AuthGuardResult {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = getToken();
    if (!storedToken) {
      router.replace("/signin");
      return;
    }

    fetchCurrentUser(storedToken)
      .then((fetchedUser) => {
        setUser(fetchedUser);
        setTokenState(storedToken);
      })
      .catch(() => {
        clearToken();
        router.replace("/signin");
      })
      .finally(() => setLoading(false));
  }, [router]);

  function forceSignOut() {
    clearToken();
    router.replace("/signin");
  }

  // Takes no parameters on purpose: it's passed straight to `onClick`, which
  // would otherwise hand the click event in as an argument.
  function signOut() {
    if (!window.confirm(SIGN_OUT_CONFIRM_MESSAGE)) return;
    forceSignOut();
  }

  return { user, setUser, token, loading, signOut, forceSignOut };
}

/**
 * For the sign-in / sign-up pages: someone who is already signed in has no
 * business seeing them, so send them on to the dashboard. Only a token
 * that the backend still accepts counts (a stale one is cleared).
 */
export function useRedirectIfSignedIn(): void {
  const router = useRouter();

  useEffect(() => {
    const storedToken = getToken();
    if (!storedToken) return;

    let cancelled = false;
    fetchCurrentUser(storedToken)
      .then(() => {
        if (!cancelled) router.replace("/dashboard/home");
      })
      .catch(() => clearToken());
    return () => {
      cancelled = true;
    };
  }, [router]);
}
