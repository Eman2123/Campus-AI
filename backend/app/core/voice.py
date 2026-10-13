import re

import assemblyai as aai

from app.core.config import settings


def get_transcriber() -> aai.Transcriber:
    aai.settings.api_key = settings.ASSEMBLYAI_API_KEY
    # Default polling is every 3 s, which adds up to 3 s of dead time per clip.
    aai.settings.polling_interval = 0.5
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
            params={"output_format": "mp3_22050_32"},
            json={"text": clean_for_speech(text), "model_id": settings.ELEVENLABS_MODEL_ID},
        )
        res.raise_for_status()
        return res.content


# Emoji, pictographs, variation selectors and joiners: a voice would either skip
# them with an odd pause or read out their long names.
_EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\u2190-\u21FF\uFE0F\u200D\u20E3]+"
)
_MD = re.compile(r"```[\s\S]*?```|`([^`]*)`|!?\[([^\]]*)\]\([^)]*\)|^#{1,6}\s+|(\*\*|__|~~)|^\s*[-*+]\s+", re.M)


def clean_for_speech(text: str, limit: int = 1500) -> str:
    text = _EMOJI.sub("", text)
    text = _MD.sub(lambda m: m.group(1) or m.group(2) or "", text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > limit:
        cut = text[:limit]
        end = max(cut.rfind(". "), cut.rfind("? "), cut.rfind("! "))
        text = cut[: end + 1] if end > limit // 2 else cut
    return text
