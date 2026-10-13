import logging
import os
import sys

from app.core.config import settings


def setup_logging() -> None:
    level = logging.DEBUG if settings.ENV == "development" else logging.INFO

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    # Avoid duplicate handlers if setup_logging() runs more than once
    # (e.g. under --reload, or if tests import app.main multiple times).
    if not any(isinstance(h, logging.StreamHandler) for h in root_logger.handlers):
        root_logger.addHandler(handler)

    # Quiet down noisy third-party loggers at DEBUG level.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    # SQLAlchemy logs every statement (with bound parameters such as user ids)
    # at INFO once the root logger is INFO. Keep that out of normal logs;
    # SQL_ECHO=1 opts back in when debugging.
    if os.getenv("SQL_ECHO") != "1":
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
