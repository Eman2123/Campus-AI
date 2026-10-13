"""Things that only matter once the app is deployed: provider-style database
URLs, production safety checks, and migrations on startup."""
import logging

import pytest

from app.core.config import Settings, normalize_database_url


@pytest.mark.parametrize(
    "raw, expected",
    [
        # What Neon's dashboard hands out
        (
            "postgresql://u:p@ep-x.neon.tech/db?sslmode=require&channel_binding=require",
            "postgresql+asyncpg://u:p@ep-x.neon.tech/db?ssl=require",
        ),
        ("postgres://u:p@host/db", "postgresql+asyncpg://u:p@host/db"),
        # Already correct: unchanged
        (
            "postgresql+asyncpg://u:p@host/db?ssl=require",
            "postgresql+asyncpg://u:p@host/db?ssl=require",
        ),
    ],
)
def test_database_url_is_normalised(raw, expected):
    assert normalize_database_url(raw) == expected


def _settings(**overrides):
    base = dict(DATABASE_URL="postgresql://u:p@h/db", JWT_SECRET_KEY="x" * 40, _env_file=None)
    base.update(overrides)
    return Settings(**base)


def test_settings_normalise_the_database_url():
    assert _settings().DATABASE_URL.startswith("postgresql+asyncpg://")


@pytest.mark.parametrize("secret", ["", "changeme", "short-secret"])
def test_production_rejects_weak_jwt_secret(secret):
    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        _settings(ENV="production", JWT_SECRET_KEY=secret)


def test_production_accepts_a_strong_secret_and_development_stays_lenient():
    assert _settings(ENV="production").ENV == "production"
    assert _settings(ENV="development", JWT_SECRET_KEY="dev").JWT_SECRET_KEY == "dev"


def test_run_migrations_is_a_noop_on_an_up_to_date_database():
    from app.main import run_migrations

    run_migrations()  # must not raise (DB is already at head in tests)


def test_sql_statements_are_not_logged_by_default():
    from app.core.logging_config import setup_logging

    setup_logging()
    assert logging.getLogger("sqlalchemy.engine").level >= logging.WARNING
