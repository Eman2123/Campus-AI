# Launch legal checklist

Where each item of the "how not to get sued when launching an app" list lives in Campus AI.
Item 15 (payments and subscriptions) is skipped on purpose: the app takes no payments.

> This is a practical starting point written to match what the code does today. It is **not legal
> advice**. Have a lawyer review the policies before a public launch, and update them whenever a
> provider or feature changes.

| # | Item | Status | Where |
|---|------|--------|-------|
| 1 | Privacy policy | Done | `/privacy` (`frontend/app/privacy/page.tsx`), linked from the footer and sign-up |
| 2 | Terms and conditions | Done | `/terms`, linked from the footer and sign-up; sign-up shows "By creating an account you agree..." |
| 3 | GDPR compliance | Done in text and product | Controller named, legal bases, rights, complaint route, transfers (`/privacy`); self-service export and delete in Settings |
| 4 | Cookie consent | Not required today | No advertising or tracking cookies; analytics are cookie-free; the notice (`components/site/CookieNotice.tsx`) is informational. **If you add any non-essential cookie or tracker, add a real opt-in banner first.** |
| 5 | Legal basis | Done | "Why we may use your data (legal basis)" in `/privacy` |
| 6 | Marketing consent | Done | Only service emails are sent (reset, reminders, digest; each switchable in Settings and labelled "you're getting this because..."). The policy promises separate consent before any marketing mail. |
| 7 | Data deletion | Done | Settings: delete a document, clear conversations, delete account (also removes Drive copies and checkpoints) |
| 8 | Data retention | Done in text | Retention list in `/privacy`. Add an automatic purge for old service statistics (`agent_call_logs`) and update the wording to "90 days" when you ship it. |
| 9 | Data processing agreements | **You must act** | `DATA_PROCESSORS.md`: accept/sign each provider's DPA and tick the table |
| 10 | Third-party disclosure | Done | "Who helps us run it", "Sharing your data", "Where your data is processed" in `/privacy` |
| 11 | Data security | Done in text | "How we protect your data" in `/privacy` (bcrypt, HTTPS, per-account access, rate limits, expiring reset links) |
| 12 | Data breach procedure | Done | `BREACH_RESPONSE.md` (internal runbook) and the public promise in `/privacy` |
| 13 | Intellectual property | Done | "Ownership and licences" in `/terms` |
| 14 | Open-source licences | Done | `/licenses` page, `THIRD_PARTY_LICENSES.md`, regenerate with `python scripts/generate_licenses.py` |
| 15 | Payments and subscriptions | Skipped | n/a |

## Before you launch

1. Set `NEXT_PUBLIC_CONTACT_EMAIL` and `NEXT_PUBLIC_OPERATOR_NAME` on the frontend host so the policy names who is responsible and how to reach them.
2. Work through `DATA_PROCESSORS.md` (sign or accept each DPA).
3. **LangSmith:** if `LANGCHAIN_TRACING_V2` is on in production, chat text is sent to LangSmith. The policy already says so, and LangSmith must be in your processor list with a DPA. If you do not want that, turn tracing off.
4. **Google Drive filing is on by default** (`drive_upload` in `backend/app/schemas/preferences.py`). Copying a user's files to a separate Google Drive is something people should choose. Consider defaulting it to off.
5. Have the policies reviewed locally (consumer-protection and data-protection rules differ by country; Pakistan, the EU and the UK all have their own).
6. Re-run `python scripts/generate_licenses.py` after dependency changes and check the "Review these" list. Today it flags certifi (MPL-2.0), orjson (MPL-2.0 OR Apache-2.0/MIT), and psycopg / psycopg-pool (LGPL-3.0). Using them unmodified as installed packages is fine; do not patch or vendor them.
