"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { type AuthUser, clearToken, fetchCurrentUser, getToken } from "@/lib/auth";

type AuthGuardResult = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signOut: () => void;
};

/**
 * Shared by every authenticated dashboard page (Day 27's /dashboard,
 * Day 32's /dashboard/calendar): redirects to /signin with no token or
 * one that's expired/invalid, otherwise resolves the current user.
 * Pulled out once two pages needed the exact same logic rather than
 * copy-pasting it a second time.
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

  function signOut() {
    clearToken();
    router.replace("/signin");
  }

  return { user, token, loading, signOut };
}
