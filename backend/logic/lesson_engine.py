import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from backend.logic.content_library import (
    BITCOIN_101_LESSONS,
    COURSE_LIBRARY,
    OPERATIONS_LAB_LESSONS,
    SECURITY_ESSENTIALS_LESSONS,
)

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "database" / "lessons.db"

CourseInfo = Dict[str, object]
Lesson = Dict[str, object]


LESSON_SETS: Dict[str, List[Lesson]] = {
    "bitcoin-101": BITCOIN_101_LESSONS,
    "security-essentials": SECURITY_ESSENTIALS_LESSONS,
    "operations-lab": OPERATIONS_LAB_LESSONS,
}

COURSE_TOPICS: Dict[str, Dict[str, List[str]]] = {
    key: {"title": value["title"], "topics": []} for key, value in COURSE_LIBRARY.items()
}


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS courses (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                summary TEXT NOT NULL
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS lessons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id TEXT NOT NULL,
                lesson_order INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                examples TEXT NOT NULL,
                glossary TEXT NOT NULL,
                takeaways TEXT NOT NULL,
                diagram TEXT NOT NULL,
                UNIQUE(course_id, lesson_order)
            );
            """
        )
        conn.commit()
    seed_data()


def _lesson_payload(course_id: str, lesson: Lesson, lesson_order: int) -> Tuple:
    paragraphs = lesson.get("paragraphs", [])
    examples = lesson.get("examples", [])
    glossary = lesson.get("glossary", {})
    takeaways = lesson.get("takeaways", [])
    diagram = lesson.get(
        "diagram",
        f"<div class='diagram'>Visualization of {lesson.get('title', 'Lesson')} with timelines and arrows.</div>",
    )
    return (
        course_id,
        lesson_order,
        lesson.get("title", f"Lesson {lesson_order}"),
        "\n\n".join(paragraphs),
        "\n".join(examples),
        "\n".join([f"{k}:{v}" for k, v in glossary.items()]),
        "\n".join(takeaways),
        diagram,
    )


def seed_data() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        for course_id, meta in COURSE_LIBRARY.items():
            conn.execute("DELETE FROM lessons WHERE course_id = ?", (course_id,))
            conn.execute(
                "INSERT OR REPLACE INTO courses (id, title, summary) VALUES (?, ?, ?)",
                (course_id, meta["title"], meta["summary"]),
            )
            lessons = LESSON_SETS.get(course_id, [])
            for idx, lesson in enumerate(lessons, start=1):
                conn.execute(
                    """
                    INSERT OR REPLACE INTO lessons (
                        course_id, lesson_order, title, content, examples, glossary, takeaways, diagram
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    _lesson_payload(course_id, lesson, idx),
                )
        conn.commit()


def list_courses() -> List[CourseInfo]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.execute("SELECT id, title, summary FROM courses ORDER BY title")
        return [dict(row) for row in cur.fetchall()]


def get_course(course_id: str) -> Optional[CourseInfo]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.execute("SELECT id, title, summary FROM courses WHERE id = ?", (course_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def list_lessons(course_id: str) -> List[Lesson]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.execute(
            "SELECT lesson_order, title FROM lessons WHERE course_id = ? ORDER BY lesson_order",
            (course_id,),
        )
        return [dict(row) for row in cur.fetchall()]


def get_lesson(course_id: str, lesson_order: int) -> Optional[Lesson]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.execute(
            """
            SELECT lesson_order, title, content, examples, glossary, takeaways, diagram
            FROM lessons WHERE course_id = ? AND lesson_order = ?
            """,
            (course_id, lesson_order),
        )
        row = cur.fetchone()
        if not row:
            return None
        lesson = dict(row)
        lesson["course_id"] = course_id
        return lesson


def next_prev(course_id: str, lesson_order: int) -> Tuple[Optional[int], Optional[int]]:
    lessons = list_lessons(course_id)
    orders = [l["lesson_order"] for l in lessons]
    if lesson_order not in orders:
        return None, None
    idx = orders.index(lesson_order)
    prev_order = orders[idx - 1] if idx > 0 else None
    next_order = orders[idx + 1] if idx + 1 < len(orders) else None
    return prev_order, next_order
