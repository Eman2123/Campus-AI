from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.admin_bootstrap import apply_admin_bootstrap
from app.core.database import get_db
from app.core.rate_limit import RateLimitByIP
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import Token, UserCreate, UserLogin, UserOut

router = APIRouter()


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

    user = User(email=payload.email, password_hash=hash_password(payload.password))
    apply_admin_bootstrap(user)  # Day 34 — promotes if payload.email is in ADMIN_EMAILS
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(subject=str(user.id), extra_claims={"role": user.role})
    return Token(access_token=token)


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

    token = create_access_token(subject=str(user.id), extra_claims={"role": user.role})
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user