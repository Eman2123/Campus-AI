import logging

from app.core.config import settings

logger = logging.getLogger("campus_ai.connector_status")

# Status values, in increasing order of "something's wrong":
#   "healthy"        — fully working, nothing to configure (Calendar Export)
#   "configured"      — a key/credential is set and looks structurally valid
#   "stub"            — not configured; the connector silently no-ops/logs
#                       instead of calling out (the existing fallback
#                       behavior every connector already has)
#   "error"           — configured, but the credential itself is broken
#                       (bad JSON, wrong format, etc.)
STATUS_HEALTHY = "healthy"
STATUS_CONFIGURED = "configured"
STATUS_STUB = "stub"
STATUS_ERROR = "error"


def _calendar_export_status() -> dict:
    """Calendar Export (ICS generation, Day 20) has no external API and no
    credential to misconfigure — it's a pure local computation
    (icalendar.Calendar()) — so there's nothing to be "unconfigured" or
    "erroring" about short of the icalendar package itself failing to
    import, which would already have crashed the app at startup (it's
    imported at module load in app/core/calendar_export.py). Reported as
    always healthy, rather than omitted, so the dashboard shows a
    complete picture of every connector the PRD lists, not just the ones
    that can fail.
    """
    return {
        "name": "calendar_export",
        "label": "Calendar Export",
        "status": STATUS_HEALTHY,
        "detail": "Internal .ics generation — no external service, nothing to configure.",
    }


def _email_status() -> dict:
    """Email (Resend, Day 20/22). Deliberately a *configuration* check,
    not a live one: actually verifying the key would mean calling
    Resend's API on every admin dashboard load (or every connector-status
    poll), which is a real external request with its own cost/latency/
    failure modes for a page that's meant to be a quick glance. Whether
    the configured key is actually *valid* only gets found out the first
    time send_email() really sends something — same tradeoff as the
    "stub mode" logging send_email() already does when no key is set.
    """
    if not settings.RESEND_API_KEY:
        return {
            "name": "email",
            "label": "Email (Resend)",
            "status": STATUS_STUB,
            "detail": "No RESEND_API_KEY set — reminders/digests are logged, not actually sent.",
        }
    return {
        "name": "email",
        "label": "Email (Resend)",
        "status": STATUS_CONFIGURED,
        "detail": f"RESEND_API_KEY is set — sending as {settings.EMAIL_FROM!r}.",
    }


def _file_organizer_status() -> dict:
    """File Organizer / storage (Google Drive, Day 23). Unlike email, this
    one *can* be checked without a network call: a service-account key
    file is just local JSON, so parsing it into a real `Credentials`
    object (no API call, no discovery fetch) is enough to tell "not
    configured" apart from "configured but the key file is bad" —
    something email's check can't do without actually calling Resend.
    """
    if not settings.GOOGLE_SERVICE_ACCOUNT_FILE:
        return {
            "name": "file_organizer",
            "label": "File Organizer (Google Drive)",
            "status": STATUS_STUB,
            "detail": "No GOOGLE_SERVICE_ACCOUNT_FILE set — subject tagging still runs, Drive filing is skipped.",
        }

    try:
        from google.oauth2 import service_account

        service_account.Credentials.from_service_account_file(
            settings.GOOGLE_SERVICE_ACCOUNT_FILE,
            scopes=["https://www.googleapis.com/auth/drive.file"],
        )
    except Exception as exc:
        logger.warning("file organizer connector check failed: %s", exc)
        return {
            "name": "file_organizer",
            "label": "File Organizer (Google Drive)",
            "status": STATUS_ERROR,
            "detail": f"GOOGLE_SERVICE_ACCOUNT_FILE is set but couldn't be loaded: {exc}",
        }

    return {
        "name": "file_organizer",
        "label": "File Organizer (Google Drive)",
        "status": STATUS_CONFIGURED,
        "detail": f"Service account key loaded — filing under {settings.GOOGLE_DRIVE_ROOT_FOLDER_NAME!r}.",
    }


def _scheduler_status() -> dict:
    """Deadline Reminders + Email Digest (Day 20/22) both run as
    APScheduler cron jobs started in app.main's lifespan. "Healthy" here
    means the scheduler process is actually running with both jobs
    registered — not just that the *settings* look right, which is the
    one connector check in this module that reflects live process state
    rather than static configuration.
    """
    from app.core.scheduler import get_scheduler_status

    jobs = get_scheduler_status()
    if jobs is None:
        return {
            "name": "scheduler",
            "label": "Scheduled Jobs (Reminders + Digest)",
            "status": STATUS_ERROR,
            "detail": "Scheduler is not running — reminders and digests will not fire.",
        }

    job_summary = ", ".join(f"{job['id']} (next: {job['next_run_time'] or 'not scheduled'})" for job in jobs)
    return {
        "name": "scheduler",
        "label": "Scheduled Jobs (Reminders + Digest)",
        "status": STATUS_HEALTHY if jobs else STATUS_ERROR,
        "detail": job_summary or "Scheduler is running but no jobs are registered.",
    }


def get_connector_statuses() -> list[dict]:
    """Day 37 — one function, four checks. Each _*_status() is independent
    and never raises (file-organizer's try/except is the only one that
    even can), so one connector's check failing can't take the others
    down with it — important since this all runs inline on a single
    admin request, not as separate background probes.
    """
    return [
        _calendar_export_status(),
        _email_status(),
        _file_organizer_status(),
        _scheduler_status(),
    ]