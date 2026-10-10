import io
import logging

from app.core.config import settings

logger = logging.getLogger("campus_ai.google_drive")

_service = None
_service_checked = False


def _get_service():
    """Lazily builds (and caches) the Drive v3 service client from the
    configured service-account key file. Returns None — the universal
    "not configured" signal used throughout this module — when no key
    file is set, so callers degrade to the stub path instead of crashing.
    """
    global _service, _service_checked
    if _service_checked:
        return _service
    _service_checked = True

    if not settings.GOOGLE_SERVICE_ACCOUNT_FILE:
        return None

    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        credentials = service_account.Credentials.from_service_account_file(
            settings.GOOGLE_SERVICE_ACCOUNT_FILE,
            scopes=["https://www.googleapis.com/auth/drive.file"],
        )
        _service = build("drive", "v3", credentials=credentials, cache_discovery=False)
    except Exception as exc:
        logger.exception("failed to initialize Google Drive service: %s", exc)
        _service = None

    return _service


def _find_or_create_folder(service, name: str, parent_id: str | None) -> str:
    escaped_name = name.replace("'", "\\'")
    query = f"name = '{escaped_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    if parent_id:
        query += f" and '{parent_id}' in parents"

    results = service.files().list(q=query, spaces="drive", fields="files(id, name)").execute()
    files = results.get("files", [])
    if files:
        return files[0]["id"]

    metadata = {"name": name, "mimeType": "application/vnd.google-apps.folder"}
    if parent_id:
        metadata["parents"] = [parent_id]
    folder = service.files().create(body=metadata, fields="id").execute()
    return folder["id"]


def organize_file_in_drive(user_id: str, subject: str, filename: str, content: bytes) -> dict | None:
    """Uploads `content` into <root>/<user_id>/<subject>/<filename> inside
    the single service account's Drive that Campus AI owns — never the
    student's own Drive. That sidesteps the exact per-user OAuth
    verification problem that ruled out Google Calendar/Gmail for the
    other connectors (see the PRD's Day 20 note): nothing here ever asks
    a student to grant Drive access, so there's no consent screen to get
    reviewed.

    Returns None (the stub path) when GOOGLE_SERVICE_ACCOUNT_FILE isn't
    set, so file organizing degrades gracefully — the subject tag from
    subject_classifier.py is still saved even without a Drive connection.
    """
    service = _get_service()
    if service is None:
        logger.info(
            "[stub \u2014 no GOOGLE_SERVICE_ACCOUNT_FILE set] would file %s under %s/%s/%s",
            filename,
            settings.GOOGLE_DRIVE_ROOT_FOLDER_NAME,
            user_id,
            subject,
        )
        return None

    from googleapiclient.http import MediaIoBaseUpload

    root_id = _find_or_create_folder(service, settings.GOOGLE_DRIVE_ROOT_FOLDER_NAME, None)
    user_folder_id = _find_or_create_folder(service, user_id, root_id)
    subject_folder_id = _find_or_create_folder(service, subject, user_folder_id)

    media = MediaIoBaseUpload(io.BytesIO(content), mimetype="application/octet-stream", resumable=False)
    file_metadata = {"name": filename, "parents": [subject_folder_id]}
    uploaded = service.files().create(body=file_metadata, media_body=media, fields="id").execute()

    folder_path = f"{settings.GOOGLE_DRIVE_ROOT_FOLDER_NAME}/{user_id}/{subject}"
    return {"drive_file_id": uploaded["id"], "drive_folder_path": folder_path}


def delete_file_from_drive(drive_file_id: str) -> None:
    """Day 25 (found during end-to-end testing): deleting a Document
    without also deleting its filed Drive copy left an orphaned file
    behind with no reference to it anywhere once the DB row (which held
    drive_file_id) was gone. Called from the document delete route
    whenever a document has one.

    Best-effort like the rest of this module — logs and returns quietly
    on failure rather than blocking the document deletion the caller is
    in the middle of; a stray Drive file is a much smaller problem than
    failing to let a student delete their own document."""
    service = _get_service()
    if service is None:
        logger.info("[stub \u2014 no GOOGLE_SERVICE_ACCOUNT_FILE set] would delete drive file %s", drive_file_id)
        return

    try:
        service.files().delete(fileId=drive_file_id).execute()
    except Exception as exc:
        logger.exception("failed to delete drive file %s: %s", drive_file_id, exc)
