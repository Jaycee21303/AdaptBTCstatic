from typing import Dict, List

from flask import session


def _ensure_state() -> None:
    session.setdefault("lesson_progress", {})
    session.setdefault("course_state", {})


def mark_complete(username: str, course_id: str, lesson_order: int, time_spent: int = 0) -> None:
    """Track lesson completion within the current browser session."""

    _ensure_state()
    course_progress = session["lesson_progress"].setdefault(course_id, [])
    if lesson_order not in course_progress:
        course_progress.append(lesson_order)
        course_progress.sort()
    session["course_state"][course_id] = lesson_order
    session.modified = True


def record_last(username: str, course_id: str, lesson_order: int) -> None:
    """Remember the most recent lesson for the current session."""

    _ensure_state()
    session["course_state"][course_id] = lesson_order
    session.modified = True


def get_last(username: str, course_id: str) -> int:
    _ensure_state()
    return session["course_state"].get(course_id, 1)


def completed(username: str, course_id: str) -> List[int]:
    _ensure_state()
    return session["lesson_progress"].get(course_id, [])


def stats(username: str) -> Dict[str, Dict[str, object]]:
    _ensure_state()
    summary: Dict[str, Dict[str, object]] = {}
    for course_id, lessons in session["lesson_progress"].items():
        summary[course_id] = {
            "lessons_completed": len(lessons),
            "last_lesson": session["course_state"].get(course_id, 1),
        }
    for course_id, last in session["course_state"].items():
        summary.setdefault(course_id, {"lessons_completed": 0}).update({"last_lesson": last})
    return summary

