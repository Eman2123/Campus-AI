from app.core.config import settings
from app.models.user import User


def apply_admin_bootstrap(user: User) -> bool:
    """Day 34 — the only way a user becomes an admin: their email is
    listed in ADMIN_EMAILS. There's deliberately no self-service
    "become admin" endpoint or signup flag — promotion is entirely
    config-driven, so gaining admin access means someone with deploy
    access decided it, not a request the user made.

    Checked at both signup and signin (see app/api/routes/auth.py), not
    just signup, so adding an email to ADMIN_EMAILS after someone
    already has an account still promotes them next time they sign in —
    no manual DB update needed to bootstrap the first admin.

    Returns True if this call actually changed the role, so callers
    know whether there's anything new to commit.
    """
    admin_emails = {email.lower() for email in settings.ADMIN_EMAILS}
    if user.email.lower() in admin_emails and user.role != "admin":
        user.role = "admin"
        return True
    return False
