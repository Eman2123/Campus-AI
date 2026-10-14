/**
 * Date shown on /terms and /privacy, and the version stored with a person's
 * sign-up consent. Keep in step with backend/app/core/legal.py (TERMS_VERSION).
 */
export const LEGAL_UPDATED = "2026-10-14";

/**
 * Country or state whose law governs the Terms, e.g. "Pakistan". Set it on the
 * frontend host as NEXT_PUBLIC_GOVERNING_LAW once you have decided with a
 * lawyer; empty means the section is not shown.
 */
export const GOVERNING_LAW = process.env.NEXT_PUBLIC_GOVERNING_LAW?.trim() || "";
