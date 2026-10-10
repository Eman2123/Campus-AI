import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone

from dateutil import parser as dateutil_parser
from sqlalchemy import select

from app.agents.state import AgentState
from app.agents.supervisor import get_last_user_text
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.llm import chat_completion
from app.models.document import Document
from app.models.schedule import Schedule

logger = logging.getLogger("campus_ai.agents.planner")

PLANNER_EXTRACTION_PROMPT = (
    "A student is asking you to help them plan for an exam, assignment, or "
    "other deadline. Extract the deadline from their message and respond "
    "with ONLY a JSON object, nothing else — no markdown fences, no prose.\n\n"
    'If a specific date (or something resolvable to one, like "next Friday" '
    'or "in two weeks") is present, respond with exactly this shape:\n'
    '{"title": "<short name for the deadline, e.g. \'Chemistry Final\'>", '
    '"topic": "<what they need to study/work on>", '
    '"due_date": "<YYYY-MM-DD>"}\n\n'
    "If no date is stated or implied anywhere in the message, respond with "
    'exactly: {"error": "no_date_found"}'
)

MAX_STUDY_SESSIONS = 4

CLARIFY_NO_DATE_REPLY = (
    "I can build a backward study plan, but I need a deadline to work "
    "from — try something like \"help me plan for my Chemistry final on "
    "November 14\" or \"I have a history essay due next Friday\"."
)


def _parse_llm_extraction(raw: str) -> dict | None:
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        data = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        return None
    if data.get("error") == "no_date_found":
        return None
    try:
        due_date = datetime.strptime(data["due_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except (KeyError, ValueError):
        return None
    title = str(data.get("title") or data.get("topic") or "Upcoming deadline")[:255]
    topic = str(data.get("topic") or title)
    return {"title": title, "topic": topic, "due_date": due_date}


def _extract_deadline_heuristic(text: str) -> dict | None:
    """Zero-dependency-on-LLM fallback used when AIML_API_KEY isn't set.
    Fuzzy-parses the first recognizable date in the message; whatever text
    isn't part of that date becomes a rough guess at the topic. Like the
    embeddings fallback (Day 17), quality here is best-effort, not exact —
    real extraction needs a real key."""
    try:
        due_date, unparsed_tokens = dateutil_parser.parse(
            text, fuzzy_with_tokens=True, default=datetime.now(timezone.utc)
        )
    except (ValueError, OverflowError):
        return None

    if due_date.tzinfo is None:
        due_date = due_date.replace(tzinfo=timezone.utc)

    topic = " ".join(token.strip() for token in unparsed_tokens if token.strip()).strip()
    topic = topic or "your upcoming deadline"
    return {"title": topic[:255], "topic": topic, "due_date": due_date}


async def extract_deadline(text: str) -> dict | None:
    if settings.AIML_API_KEY:
        try:
            raw = await asyncio.to_thread(
                chat_completion,
                messages=[
                    {"role": "system", "content": PLANNER_EXTRACTION_PROMPT},
                    {"role": "user", "content": text},
                ],
                temperature=0,
            )
            parsed = _parse_llm_extraction(raw)
            if parsed is not None:
                return parsed
            # LLM explicitly found no date, or returned something unparsable
            # — don't silently fall back to the fuzzy heuristic here, since
            # that could invent a plan the student never actually asked for.
            return None
        except Exception as exc:
            logger.warning("planner LLM extraction failed, falling back to heuristic: %s", exc)

    return _extract_deadline_heuristic(text)


def build_study_sessions(topic: str, due_date: datetime, now: datetime) -> list[dict]:
    """Backward-plans review sessions strictly between `now` and `due_date`,
    evenly spaced, capped at MAX_STUDY_SESSIONS. Returns [] when there isn't
    at least a full day of runway to schedule anything into."""
    days_until = (due_date.date() - now.date()).days
    if days_until <= 1:
        return []

    num_sessions = min(MAX_STUDY_SESSIONS, max(1, days_until // 2))
    interval = days_until / (num_sessions + 1)

    sessions = []
    for i in range(1, num_sessions + 1):
        session_date = now + timedelta(days=round(interval * i))
        sessions.append(
            {"date": session_date, "task": f"Study session {i}/{num_sessions}: {topic}"}
        )
    return sessions


async def save_plan(user_id: str, title: str, topic: str, due_date: datetime, sessions: list[dict]) -> None:
    async with AsyncSessionLocal() as db:
        db.add(Schedule(user_id=user_id, title=title, due_date=due_date, source="deadline"))
        for session in sessions:
            db.add(
                Schedule(
                    user_id=user_id,
                    title=session["task"],
                    due_date=session["date"],
                    source="study_session",
                )
            )
        await db.commit()


async def find_related_documents(user_id: str, title: str, topic: str) -> list[str]:
    """Day 24: wires the File Organizer connector's subject tags (Day 23)
    into the Planner Agent. If the student already has tagged documents
    for a subject mentioned in this deadline (e.g. planning for "my
    Chemistry final" and they've uploaded something tagged "Chemistry"),
    surface that so the reply can point them at the Document agent
    instead of studying from nothing."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Document.subject)
            .where(
                Document.user_id == user_id,
                Document.embedding_status == "ready",
                Document.subject.is_not(None),
                Document.subject != "General",
            )
            .distinct()
        )
        subjects = [row[0] for row in result.all()]

    haystack = f"{title} {topic}".lower()
    return [subject for subject in subjects if subject.lower() in haystack]


def _format_reply(
    title: str,
    due_date: datetime,
    sessions: list[dict],
    saved: bool,
    related_subjects: list[str],
) -> str:
    lines = [f"Got it — I've noted **{title}** due {due_date.strftime('%A, %B %-d, %Y')}."]

    if sessions:
        lines.append("\nHere's a backward study plan leading up to it:")
        for session in sessions:
            lines.append(f"- {session['date'].strftime('%a %b %-d')}: {session['task']}")
    elif due_date.date() < datetime.now(timezone.utc).date():
        lines.append("That date's already passed, so I haven't scheduled any study sessions for it.")
    else:
        lines.append("That's coming up too soon to space out separate study sessions — I'd focus on reviewing now.")

    if related_subjects:
        subject_list = " and ".join(related_subjects)
        lines.append(
            f"\nYou've already got documents tagged {subject_list} — ask me to explain or quiz you on "
            "those and I'll pull straight from them instead of starting from scratch."
        )

    if saved:
        lines.append(
            "\nI've added these to your schedule — download them anytime as a calendar file "
            "(GET /api/schedule/export.ics) to drop into your own calendar app, and you'll get an "
            "email reminder as the deadline gets close plus a daily digest in the meantime."
        )
    else:
        lines.append("\n(Couldn't save this to your schedule just now, but the plan above still stands.)")

    return "\n".join(lines)


async def planner_node(state: AgentState) -> dict:
    user_text = get_last_user_text(state)
    user_id = state.get("user_id")

    extraction = await extract_deadline(user_text)
    if extraction is None:
        return {"messages": [{"role": "assistant", "content": CLARIFY_NO_DATE_REPLY}], "agent_used": "planner"}

    title, topic, due_date = extraction["title"], extraction["topic"], extraction["due_date"]
    sessions = build_study_sessions(topic, due_date, datetime.now(timezone.utc))

    saved = False
    if user_id:
        try:
            await save_plan(user_id, title, topic, due_date, sessions)
            saved = True
        except Exception as exc:
            logger.exception("planner: failed to save schedule for user=%s: %s", user_id, exc)

    related_subjects: list[str] = []
    if user_id:
        try:
            related_subjects = await find_related_documents(user_id, title, topic)
        except Exception as exc:
            logger.exception("planner: failed to look up related documents for user=%s: %s", user_id, exc)

    reply = _format_reply(title, due_date, sessions, saved, related_subjects)
    return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "planner"}
