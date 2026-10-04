from datetime import datetime, timezone

from icalendar import Calendar, Event

from app.models.schedule import Schedule


def build_ics(schedules: list[Schedule]) -> bytes:
    """Builds a downloadable .ics file from a student's schedule rows —
    the internal, no-OAuth Calendar Export connector decided on in the PRD
    (Google Calendar's OAuth verification requirements weren't realistic
    inside the 40-day window).

    Each row (a "deadline" or one of the Planner Agent's generated
    "study_session" rows) becomes an all-day VEVENT — due dates are
    day-granularity by construction (see app/agents/planner.py), so
    all-day events sidestep timezone-conversion questions entirely rather
    than picking an arbitrary time of day.
    """
    cal = Calendar()
    cal.add("prodid", "-//Campus AI//Study Planner//EN")
    cal.add("version", "2.0")

    now = datetime.now(timezone.utc)
    for schedule in schedules:
        event = Event()
        event.add("uid", f"{schedule.id}@campus-ai")
        event.add("summary", schedule.title)
        event.add("dtstart", schedule.due_date.date())
        event.add("dtstamp", now)
        event.add("categories", [schedule.source])
        cal.add_component(event)

    return cal.to_ical()
