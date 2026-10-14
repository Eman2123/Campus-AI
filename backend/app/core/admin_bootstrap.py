from app.core.config import settings
from app.models.user import User


def apply_admin_bootstrap(user: User) -> bool:
    """The only way a user becomes an admin: their email is listed in
    ADMIN_EMAILS *and* they signed in with Google, which has verified that
    they own the address. There's deliberately no self-service "become
    admin" endpoint, and password signup/signin never promote: a password
    account proves nothing about who owns the email, so otherwise anyone
    could register an ADMIN_EMAILS address before its owner does.

    Called from the Google sign-in route only. It runs on every Google
    sign-in, so adding an email to ADMIN_EMAILS later still promotes an
    existing account the next time that person signs in with Google.

    Returns True if this call actually changed the role.
    """
    admin_emails = {email.lower() for email in settings.ADMIN_EMAILS}
    if user.email.lower() in admin_emails and user.role != "admin":
        user.role = "admin"
        return True
    return False
