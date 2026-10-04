import logging

from app.core.config import settings
from app.core.llm import chat_completion

logger = logging.getLogger("campus_ai.subject_classifier")

SUBJECT_SYSTEM_PROMPT = (
    "Classify this student's uploaded file into a single short academic "
    "subject (2-3 words max, Title Case — e.g. \"Organic Chemistry\", "
    "\"US History\", \"Linear Algebra\"). Respond with ONLY the subject "
    "name, nothing else. If you genuinely can't tell from the filename "
    "and excerpt, respond with \"General\"."
)

# Zero-dependency-on-LLM fallback used when AIML_API_KEY isn't set. Like
# the Day 17 embeddings fallback and the Day 19 date-extraction fallback,
# this is deliberately best-effort — a fixed keyword list will always be
# coarser than an LLM read of the actual content.
SUBJECT_KEYWORDS: dict[str, list[str]] = {
    "Chemistry": ["chemistry", "chem ", "molecule", "reaction", "chemical"],
    "Biology": ["biology", "cell ", "photosynthesis", "genetics", "organism"],
    "Physics": ["physics", "mechanics", "thermodynamics", "quantum", "kinematics"],
    "Mathematics": ["math", "calculus", "algebra", "geometry", "statistics"],
    "History": ["history", "revolution", "empire", "century", "war "],
    "Computer Science": ["computer science", "algorithm", "programming", "data structure", "software"],
    "Literature": ["literature", "novel", "poem", "poetry", "shakespeare"],
    "Economics": ["economics", "microeconomics", "macroeconomics", "supply and demand", "gdp"],
}

MAX_LABEL_LENGTH = 60


def classify_subject_heuristic(filename: str, excerpt: str) -> str:
    haystack = f"{filename} {excerpt}".lower()
    for subject, keywords in SUBJECT_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return subject
    return "General"


def classify_subject(filename: str, excerpt: str) -> str:
    """Picks a short subject/tag for a document — the classification step
    of the File Organizer connector. Blocking (calls chat_completion
    synchronously); callers running in an async context should wrap this
    in asyncio.to_thread, same as the other LLM-calling agent nodes."""
    if settings.AIML_API_KEY:
        try:
            raw = chat_completion(
                messages=[
                    {"role": "system", "content": SUBJECT_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Filename: {filename}\n\nExcerpt:\n{excerpt}"},
                ],
                temperature=0,
            )
            label = raw.strip().strip('"').strip()
            if label and len(label) <= MAX_LABEL_LENGTH:
                return label
            logger.warning("subject classification returned an unusable label, falling back: %r", raw)
        except Exception as exc:
            logger.warning("subject classification LLM call failed, falling back to heuristic: %s", exc)

    return classify_subject_heuristic(filename, excerpt)
