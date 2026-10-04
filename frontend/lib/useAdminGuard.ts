"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthGuard } from "@/lib/useAuthGuard";

/**
 * Same as useAuthGuard, plus redirects to /dashboard if the resolved
 * user isn't an admin. Kept separate rather than a flag on
 * useAuthGuard — most pages don't care about role at all, and the
 * redirect target differs: someone with no token goes to /signin, but
 * someone signed in and simply not an admin goes to /dashboard, not
 * back through sign in.
 */
export function useAdminGuard() {
  const router = useRouter();
  const guard = useAuthGuard();

  useEffect(() => {
    if (!guard.loading && guard.user && guard.user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [guard.loading, guard.user, router]);

  return guard;
}
