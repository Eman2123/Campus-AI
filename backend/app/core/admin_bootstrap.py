from app.core.config import settings
from app.models.user import User


def apply_admin_bootstrap(user: User) -> bool:
    """Day 34 — the only way a user becomes an admin: their email is
    listed in ADMIN_EMAILS. There's deliberately no self-service
    "become admin" endpoint or signup flag — promotion is entirely
    config-driven, so gaining admin access means someone with deploy
    access decided it, not a request the user made.

    Only called from the Google sign-in path (app/api/routes/auth.py),
    where Google has verified the email address. It is deliberately NOT
    called for password signup/signin: those accept any typed address
    without proving ownership, so honouring ADMIN_EMAILS there would let
    anyone register an admin's address first and become admin. Admins
    therefore sign in with Google; an existing account is promoted the
    next time its owner signs in that way.

    Returns True if this call actually changed the role, so callers
    know whether there's anything new to commit.
    """
    admin_emails = {email.lower() for email in settings.ADMIN_EMAILS}
    if user.email.lower() in admin_emails and user.role != "admin":
        user.role = "admin"
        return True
    return False
