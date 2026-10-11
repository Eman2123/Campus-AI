"""Pure unit tests for the planner's subject matching: no database, no LLM."""
import pytest

from app.agents.planner import subject_matches


@pytest.mark.parametrize(
    "subject, text, expected",
    [
        ("Chemistry", "chemistry final", True),
        ("Organic Chemistry", "chemistry final", True),  # the tag is longer than what the student typed
        ("Organic Chemistry", "organic chemistry midterm", True),
        ("Data Structures", "my structures exam", True),
        ("Physics", "chemistry final", False),
        ("Art of War", "chemistry final", False),  # short words ("of", "art") never decide it
        ("Chem", "chemistry final", False),  # whole words only, not substrings
        ("", "chemistry final", False),
    ],
)
def test_subject_matches(subject, text, expected):
    assert subject_matches(subject, text) is expected
