# Data processors (sub-processors)

Every service that handles users' personal data for us. For each one you need a **data processing agreement (DPA)** (many providers include one in their standard terms; you accept it in the dashboard or by signing), and the privacy policy must list them (it does: `/privacy`, "Who helps us run it").

> Fill in the last two columns yourself; this file cannot do that for you. Provider terms change: always read the current DPA on the provider's own site.

| Provider | What it receives | Used when | Region / transfer notes | DPA accepted? | Date / link |
|----------|------------------|-----------|-------------------------|---------------|-------------|
| AIML API | Questions, relevant note excerpts, text to embed | Every chat, document upload | _check_ | ☐ | |
| AssemblyAI | Voice recordings | Only when a user uses the microphone | _check_ | ☐ | |
| ElevenLabs | Text of a reply | Only for Read aloud / Talk | _check_ | ☐ | |
| Resend | Email address, email content | Resets, reminders, digest, contact-form messages | _check_ | ☐ | |
| Google (sign-in) | Email, name (from Google to us) | Only if the user signs in with Google | _check_ | ☐ | |
| Google Drive | Uploaded files | Only while Drive filing is on and configured | _check_ | ☐ | |
| Neon (or other Postgres host) | All stored data (accounts, chats, documents' text and vectors, schedule) | Always | _check_ | ☐ | |
| Backend host (Render / FastAPI Cloud / other) | Everything the API handles, uploaded files on disk, server logs | Always | _check_ | ☐ | |
| Frontend host (Vercel) | Page requests, cookie-free page-view analytics | Always | _check_ | ☐ | |
| LangSmith (LangChain) | Text of AI requests and replies | **Only if `LANGCHAIN_TRACING_V2` is on**; turn it off if you do not want this | _check_ | ☐ | |

## Rules of thumb
- No DPA, no production traffic: do not send real users' data to a provider you have not accepted a DPA with.
- Keep this table in step with the code: adding a provider means a row here **and** a line in `/privacy`.
- For providers outside the user's country, note the transfer mechanism (for example standard contractual clauses) in the "Region" column.
