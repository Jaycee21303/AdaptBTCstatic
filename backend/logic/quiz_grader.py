from datetime import datetime
from typing import Dict, List, Tuple

from backend.logic.content_library import (
    BITCOIN_101_QUIZ,
    OPERATIONS_LAB_QUIZ,
    SECURITY_ESSENTIALS_QUIZ,
)

Question = Dict[str, object]
QUIZZES: Dict[str, List[Question]] = {}

QUIZ_BANK: Dict[str, List[Question]] = {
    "bitcoin-101": BITCOIN_101_QUIZ,
    "security-essentials": SECURITY_ESSENTIALS_QUIZ,
    "operations-lab": OPERATIONS_LAB_QUIZ,
}

PASSING_SCORE = 0.8


def build_questions() -> None:
    if QUIZZES:
        return
    for course, questions in QUIZ_BANK.items():
        QUIZZES[course] = questions


def get_questions(course_id: str) -> List[Question]:
    build_questions()
    return QUIZZES.get(course_id, [])


def grade(course_id: str, submitted: List[int]) -> Tuple[int, int, float, List[Dict[str, object]]]:
    build_questions()
    questions = QUIZZES.get(course_id, [])
    correct = 0
    graded: List[Dict[str, object]] = []
    for idx, q in enumerate(questions):
        user_answer = submitted[idx] if idx < len(submitted) else -1
        is_correct = user_answer == q["answer"]
        if is_correct:
            correct += 1
        graded.append(
            {
                "prompt": q["prompt"],
                "options": q["options"],
                "user_answer": user_answer,
                "correct_answer": q["answer"],
                "is_correct": is_correct,
                "explanation": q["explanation"],
            }
        )
    total = len(questions)
    score = correct / total if total else 0
    return correct, total, score, graded


def save_attempt(username: str, course_id: str, correct: int, total: int, graded: List[Dict[str, object]]) -> None:
    from flask import session

    session.setdefault("quiz_attempts", {})
    attempts = session["quiz_attempts"].setdefault(course_id, [])
    attempts.insert(
        0,
        {
            "score": correct / total if total else 0,
            "total": total,
            "correct": correct,
            "taken_at": datetime.utcnow().isoformat() + "Z",
        },
    )
    session["quiz_attempts"][course_id] = attempts[:5]
    session.modified = True


def get_attempts(username: str, course_id: str) -> List[Dict[str, object]]:
    from flask import session

    return session.get("quiz_attempts", {}).get(course_id, [])
