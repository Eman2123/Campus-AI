import asyncio
import os
import tempfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.api.routes.agent import _persist_turn, _run_graph
from app.core.chat_history import ensure_session_available
from app.core.config import settings
from app.core.rate_limit import RateLimitByUser
from app.core.voice import synthesize_speech, transcribe_audio
from app.models.user import User

router = APIRouter()

# Day 38 — unlike documents.py's upload path (storage.py's
# validate_upload), nothing here ever capped how much audio a client
# could send. A raw WAV at common voice-memo settings runs well under
# this for anything that's actually a few minutes of speech; 25 MB is
# generous for that while still bounding worst-case memory/disk use
# per request (the whole file is read into memory with .read() below
# before ever touching disk).
MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


class VoiceChatResponse(BaseModel):
    transcript: str
    intent: str
    agent_used: str
    reply: str


@router.post(
    "/voice/chat",
    response_model=VoiceChatResponse,
    # Day 38 — by user, same shape as /chat. Voice turns are heavier
    # (transcription + the same graph run), so a slightly tighter budget
    # than text chat is reasonable.
    dependencies=[Depends(RateLimitByUser(times=10, seconds=60))],
)
async def voice_chat(
    audio: UploadFile = File(...),
    session_id: str = Form("dev-session"),
    current_user: User = Depends(get_current_user),
):
    if not settings.ASSEMBLYAI_API_KEY:
        raise HTTPException(status_code=503, detail="ASSEMBLYAI_API_KEY not configured")

    await ensure_session_available(current_user.id, session_id)

    suffix = os.path.splitext(audio.filename or "")[1] or ".wav"
    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file too large ({len(audio_bytes)} bytes). Max is {MAX_AUDIO_SIZE_BYTES} bytes.",
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        transcript_text = await asyncio.to_thread(transcribe_audio, tmp_path)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}")
    finally:
        os.unlink(tmp_path)

    if not transcript_text.strip():
        raise HTTPException(status_code=422, detail="Could not detect any speech in the audio")

    # Same graph as text chat — Voice Agent's only job is voice-in -> text,
    # per the architecture diagram (Voice Agent -> Supervisor). Routed
    # through the shared _run_graph (not a second direct ainvoke() call,
    # which is what this used to do) so voice chat gets the exact same
    # ainvoke() handling *and* Day 36's usage logging for free, instead
    # of needing its own separate copy of either.
    result = await _run_graph(transcript_text, session_id, str(current_user.id))

    reply = result["messages"][-1].content
    agent_used = result["agent_used"]

    # Day 31: same persistence helper /chat and /chat/stream use — voice
    # turns get saved with the transcript as the "user" message, so
    # history/sidebar reads see exactly what was said, not that it came
    # in as audio.
    await _persist_turn(current_user.id, session_id, transcript_text, reply, agent_used)

    return VoiceChatResponse(
        transcript=transcript_text,
        intent=result["intent"],
        agent_used=agent_used,
        reply=reply,
    )

class TranscribeResponse(BaseModel):
    transcript: str


@router.post(
    "/voice/transcribe",
    response_model=TranscribeResponse,
    dependencies=[Depends(RateLimitByUser(times=10, seconds=60))],
)
async def voice_transcribe(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Dictation: audio in, text out. Nothing is sent to the agents or saved."""
    if not settings.ASSEMBLYAI_API_KEY:
        raise HTTPException(status_code=503, detail="ASSEMBLYAI_API_KEY not configured")

    suffix = os.path.splitext(audio.filename or "")[1] or ".wav"
    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Audio file too large.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    try:
        transcript_text = await asyncio.to_thread(transcribe_audio, tmp_path)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}")
    finally:
        os.unlink(tmp_path)

    if not transcript_text.strip():
        raise HTTPException(status_code=422, detail="Could not detect any speech in the audio")
    return TranscribeResponse(transcript=transcript_text)


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


@router.post(
    "/voice/speak",
    dependencies=[Depends(RateLimitByUser(times=20, seconds=60))],
)
async def voice_speak(body: SpeakRequest, current_user: User = Depends(get_current_user)):
    """Read a reply aloud with ElevenLabs. Returns audio/mpeg."""
    if not settings.ELEVENLABS_API_KEY:
        raise HTTPException(status_code=503, detail="ELEVENLABS_API_KEY not configured")
    try:
        audio = await synthesize_speech(body.text)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Text-to-speech failed: {exc}")
    return Response(content=audio, media_type="audio/mpeg")
