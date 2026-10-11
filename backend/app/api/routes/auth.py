import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.admin_bootstrap import apply_admin_bootstrap
from app.core.config import settings
from app.core.database import get_db
from app.core.email import send_email
from app.core.google_auth import GoogleAuthError, verify_google_id_token
from app.core.rate_limit import RateLimitByIP
from app.core.security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    GoogleAuthRequest,
    MessageOut,
    ResetPasswordRequest,
    Token,
    UserCreate,
    UserLogin,
    UserOut,
)

logger = logging.getLogger("campus_ai.auth")

router = APIRouter()


def _issue_token(user: User, remember_me: bool = False) -> Token:
    """One place that mints the JWT, so every sign-in path (password, Google)
    carries the same claims. `remember_me` only stretches the lifetime."""
    expires_delta = timedelta(days=settings.REMEMBER_ME_EXPIRE_DAYS) if remember_me else None
    token = create_access_token(
        subject=str(user.id), extra_claims={"role": user.role}, expires_delta=expires_delta
    )
    return Token(access_token=token)


@router.post(
    "/signup",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    # Day 38 — by IP, not by user: there's no account yet to key on, and
    # this is exactly the endpoint a credential-stuffing/account-creation
    # script would hammer. 5/min is generous for a real human filling in
    # a form, tight for a script retrying emails.
    dependencies=[Depends(RateLimitByIP(times=5, seconds=60))],
)
async def signup(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
    )
    apply_admin_bootstrap(user)  # Day 34 — promotes if payload.email is in ADMIN_EMAILS
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return _issue_token(user)


@router.post(
    "/signin",
    response_model=Token,
    # Day 38 — the classic brute-force target. 10/min by IP, looser than
    # signup because a legitimate user mistyping a password a few times
    # shouldn't get locked out, but still bounded.
    dependencies=[Depends(RateLimitByIP(times=10, seconds=60))],
)
async def signin(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    # Day 35 — a disabled account can't sign in at all, not just have its
    # existing token rejected. Distinct message from the invalid-
    # credentials case above: the password was correct, so there's no
    # enumeration risk in saying so — this account genuinely exists and
    # is disabled, which is useful for the person to know.
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been disabled")

    # Day 34 — re-checked on every sign in, not just signup, so adding an
    # email to ADMIN_EMAILS after the account already exists still takes
    # effect without a manual DB update.
    if apply_admin_bootstrap(user):
        await db.commit()

    return _issue_token(user, remember_me=payload.remember_me)


@router.post(
    "/forgot-password",
    response_model=MessageOut,
    # Same shape of risk as signup: an unauthenticated endpoint that sends
    # email, so it must not be usable to spam someone's inbox.
    dependencies=[Depends(RateLimitByIP(times=5, seconds=60))],
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Emails a single-use reset link — and answers the same way whether or
    not the address has an account, so this endpoint can't be used to find
    out who is registered. The email is sent as a background task, after
    the response, so response time doesn't give the answer away either."""
    generic = MessageOut(message="If that email has an account, a reset link is on its way.")

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        return generic

    # Only the newest link should work: retire any earlier unused ones.
    now = datetime.now(timezone.utc)
    await db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )

    token = generate_reset_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_reset_token(token),
            expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES),
        )
    )
    await db.commit()

    link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
    greeting = f"Hi {user.name}," if user.name else "Hi,"
    background_tasks.add_task(
        _send_reset_email, user.email, f"{greeting}\n\nUse this link to choose a new Campus AI password:\n{link}\n\n"
        f"It works once and expires in {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutes. "
        "If you didn't ask for this, you can ignore this email — your password hasn't changed.\n",
    )
    return generic


def _send_reset_email(to: str, body: str) -> None:
    # Runs after the response is sent, so a failure here can't be reported
    # to the caller — log it instead of letting it vanish.
    try:
        send_email(to, "Reset your Campus AI password", body)
    except Exception:  # noqa: BLE001 — any provider/network failure
        logger.exception("Could not send password-reset email to %s", to)


@router.post(
    "/reset-password",
    response_model=MessageOut,
    dependencies=[Depends(RateLimitByIP(times=10, seconds=60))],
)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="This reset link is invalid or has expired. Please request a new one.",
    )
    now = datetime.now(timezone.utc)

    # FOR UPDATE: two simultaneous requests with the same link must not
    # both succeed — the second waits, then sees used_at set and fails.
    result = await db.execute(
        select(PasswordResetToken)
        .where(
            PasswordResetToken.token_hash == hash_reset_token(payload.token),
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .with_for_update()
    )
    reset = result.scalar_one_or_none()
    if reset is None:
        raise invalid

    user = (await db.execute(select(User).where(User.id == reset.user_id))).scalar_one_or_none()
    if user is None or not user.is_active:
        raise invalid

    user.password_hash = hash_password(payload.password)
    # Retire this link and any other still-open ones for the account.
    await db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
    await db.commit()
    return MessageOut(message="Password updated. You can sign in now.")


@router.post(
    "/google",
    response_model=Token,
    dependencies=[Depends(RateLimitByIP(times=10, seconds=60))],
)
async def google_sign_in(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """Signs in (or creates) the account for a verified Google identity."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not set up on this server.",
        )

    try:
        profile = await verify_google_id_token(payload.credential)
    except GoogleAuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    result = await db.execute(select(User).where(func.lower(User.email) == profile.email.lower()))
    user = result.scalar_one_or_none()

    if user is None:
        # No password to speak of: store the hash of a random secret nobody
        # holds. (Someone can still choose a real password later through
        # "Forgot password", which proves they own the inbox.)
        user = User(
            email=profile.email,
            name=(profile.name or "").strip()[:100] or None,
            password_hash=hash_password(secrets.token_urlsafe(32)),
        )
        db.add(user)
    elif not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been disabled")

    apply_admin_bootstrap(user)
    await db.commit()
    await db.refresh(user)

    return _issue_token(user)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
