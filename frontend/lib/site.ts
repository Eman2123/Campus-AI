/**
 * Site-wide constants used by metadata, sitemap, robots, the Open Graph
 * image and the legal pages. Everything deploy-specific comes from env vars
 * so no real address or domain is baked into the code.
 */
export const SITE_NAME = "Campus AI";

export const SITE_DESCRIPTION =
  "Upload your notes, ask in plain English or by voice, and get homework help, quizzes, flashcards and a backward study plan, grounded in your own material.";

/** Public origin of the frontend, e.g. https://campus-ai.vercel.app (no trailing slash). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

/** Real contact address shown in the footer and legal pages. Empty means "not shown". */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "";

/** Pages that should appear in the sitemap (public, indexable). */
export const PUBLIC_PATHS = ["/", "/signup", "/signin", "/docs", "/privacy", "/terms"] as const;
