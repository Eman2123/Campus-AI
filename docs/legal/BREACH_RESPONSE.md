# Data breach response procedure

For any suspected or confirmed incident where personal data may have been lost, stolen, altered or seen by someone who should not have seen it (leaked database or `.env`, stolen admin account, misconfigured storage, a provider telling us they were breached, an account takeover bug).

> A starting runbook, not legal advice. Fill in the contacts and have it reviewed.

## Roles

| Role | Person | Contact |
|------|--------|---------|
| Incident lead | _name_ | _phone / email_ |
| Technical responder | _name_ | _phone / email_ |
| Communications | _name_ | _phone / email_ |

## 1. Detect and report (immediately)
- Anyone who suspects an incident tells the incident lead straight away. Do not wait to be sure.
- Note the time you found out. Legal clocks start from when we become **aware**.

## 2. Contain (first hours)
- Rotate exposed secrets: `JWT_SECRET_KEY` (this signs everyone out), database password, `AIML_API_KEY`, `RESEND_API_KEY`, `ASSEMBLYAI_API_KEY`, Google credentials, any other key that was exposed.
- Bump `token_version` for affected users (or all users) to revoke their sessions, once that column exists.
- Disable affected accounts from the admin pages; take the affected route or feature offline if needed.
- Preserve evidence: copy logs and note what you changed. Do not delete anything that is needed to understand what happened.

## 3. Assess (within 24 hours)
Write down: what happened, when, how, which systems, **which data** (emails, hashed passwords, conversations, documents, schedule), **how many people**, whether the data was encrypted or hashed, and whether it was actually accessed or only exposed. Decide the risk to people (low / risk / high risk).

## 4. Notify
- **Supervisory authority:** if GDPR applies and the breach is likely to risk people's rights, notify the authority **within 72 hours of becoming aware**. If you cannot give everything yet, notify in phases. Check the rules in each country where users live.
- **Users:** if the risk is **high**, tell the affected people without undue delay, in plain language: what happened, what data, what we have done, what they should do (change password, watch for phishing), and who to contact.
- **Providers:** if the breach comes from or affects a processor, follow their process and our DPA.
- If no notification is required, still record why.

## 5. Recover and learn
- Fix the root cause; verify the fix. Restore from clean backups if needed.
- Hold a short blameless review within a week: timeline, cause, what worked, what to change.
- Keep a **breach log** (date found, facts, effects, actions, decision on notification) even for incidents that were not reported.

## Quick checklist
- [ ] Time of awareness noted
- [ ] Secrets rotated, sessions revoked
- [ ] Scope and data types written down
- [ ] Authority notified (or reason recorded) within 72 h
- [ ] Users notified if high risk
- [ ] Root cause fixed, review held, log updated
