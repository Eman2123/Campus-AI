/**
 * Site-wide constants used by metadata, sitemap, robots, the Open Graph
 * image and the legal pages. Everything deploy-specific comes from env vars
 * so no real address or domain is baked into the code. The owner's email
 * is deliberately NOT here: visitors reach us through the /contact form, and
 * the address stays on the backend (CONTACT_EMAIL).
 */
export const SITE_NAME = "Campus AI";

export const SITE_DESCRIPTION =
  "Upload your notes, ask in plain English or by voice, and get homework help, quizzes, flashcards and a backward study plan, grounded in your own material.";

/** Public origin of the frontend, e.g. https://campus-ai.vercel.app (no trailing slash). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

/** Who runs the service, named in the privacy policy as the party responsible for your data. */
export const OPERATOR_NAME = process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim() || "the Campus AI team";

/** Pages that should appear in the sitemap (public, indexable). */
export const PUBLIC_PATHS = ["/", "/signup", "/signin", "/docs", "/privacy", "/terms", "/licenses", "/contact"] as const;
