import assemblyai as aai

from app.core.config import settings


def get_transcriber() -> aai.Transcriber:
    aai.settings.api_key = settings.ASSEMBLYAI_API_KEY
    return aai.Transcriber()


def transcribe_audio(file_path: str) -> str:
    """Raises RuntimeError on transcription failure — caller decides how to surface it."""
    transcriber = get_transcriber()
    transcript = transcriber.transcribe(file_path)

    if transcript.status == aai.TranscriptStatus.error:
        raise RuntimeError(transcript.error)

    return transcript.text or ""


async def synthesize_speech(text: str) -> bytes:
    """ElevenLabs text-to-speech. Returns MP3 bytes; raises httpx errors on failure."""
    import httpx

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVENLABS_VOICE_ID}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            url,
            headers={"xi-api-key": settings.ELEVENLABS_API_KEY, "Accept": "audio/mpeg"},
            json={"text": text, "model_id": settings.ELEVENLABS_MODEL_ID},
        )
        res.raise_for_status()
        return res.content
