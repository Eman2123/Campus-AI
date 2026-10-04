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
