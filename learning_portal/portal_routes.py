from io import BytesIO
from typing import List
from uuid import uuid4

from flask import Blueprint, flash, redirect, render_template, request, send_file, session, url_for

from backend.logic.certificate_generator import generate_certificate
from backend.logic.lesson_engine import get_course, get_lesson, list_courses, list_lessons, next_prev
from backend.logic.progress_tracker import completed, get_last, mark_complete, record_last, stats
from backend.logic.quiz_grader import PASSING_SCORE, get_attempts, get_questions, grade, save_attempt

portal = Blueprint(
    "portal",
    __name__,
    template_folder="templates",
    static_folder="static",
    url_prefix="/portal",
)


def _visitor_name() -> str:
    if "learner_alias" not in session:
        session["learner_alias"] = f"Open Learner {uuid4().hex[:6]}"
    return session.get("learner_alias", "Open Learner")


@portal.route("/login", methods=["GET", "POST"])
def login():
    flash("Open access — no login required. Jump straight into the lessons.", "info")
    return redirect(url_for("portal.dashboard"))


@portal.route("/register", methods=["GET", "POST"])
def register():
    flash("Accounts are disabled. The portal is free and open to everyone.", "info")
    return redirect(url_for("portal.dashboard"))


@portal.route("/logout")
def logout():
    flash("No login needed — keep learning!", "info")
    return redirect(url_for("portal.dashboard"))


@portal.route("/dashboard")
def dashboard():
    username = _visitor_name()
    course_summary = stats(username)
    courses = list_courses()
    lesson_totals = {course["id"]: len(list_lessons(course["id"])) for course in courses}
    return render_template(
        "portal-dashboard.html",
        username=username,
        courses=courses,
        course_summary=course_summary,
        lesson_totals=lesson_totals,
    )


@portal.route("/courses")
def courses():
    return render_template("portal-course.html", courses=list_courses())


@portal.route("/courses/<course_id>")
def course_detail(course_id):
    course = get_course(course_id)
    if not course:
        flash("Course not found.", "warning")
        return redirect(url_for("portal.courses"))
    lesson_list = list_lessons(course_id)
    user = _visitor_name()
    last = get_last(user, course_id)
    return render_template(
        "portal-lesson.html",
        course=course,
        lessons=lesson_list,
        current_lesson=get_lesson(course_id, last),
        completed_lessons=completed(user, course_id),
        prev_next=next_prev(course_id, last),
    )


@portal.route("/courses/<course_id>/lesson/<int:order>")
def lesson(course_id, order):
    course = get_course(course_id)
    lesson_data = get_lesson(course_id, order)
    if not course or not lesson_data:
        flash("Lesson not available.", "warning")
        return redirect(url_for("portal.courses"))
    record_last(_visitor_name(), course_id, order)
    return render_template(
        "portal-lesson.html",
        course=course,
        lessons=list_lessons(course_id),
        current_lesson=lesson_data,
        completed_lessons=completed(_visitor_name(), course_id),
        prev_next=next_prev(course_id, order),
    )


@portal.route("/courses/<course_id>/lesson/<int:order>/complete", methods=["POST"])
def complete_lesson(course_id, order):
    mark_complete(_visitor_name(), course_id, order, time_spent=120)
    flash("Lesson marked complete!", "success")
    return redirect(url_for("portal.lesson", course_id=course_id, order=order))


@portal.route("/courses/<course_id>/quiz")
def quiz(course_id):
    course = get_course(course_id)
    if not course:
        flash("Course not found.", "warning")
        return redirect(url_for("portal.courses"))
    questions = get_questions(course_id)
    return render_template("portal-quiz.html", course=course, questions=questions)


@portal.route("/courses/<course_id>/quiz", methods=["POST"])
def submit_quiz(course_id):
    answers: List[int] = []
    questions = get_questions(course_id)
    for idx, _ in enumerate(questions):
        answers.append(int(request.form.get(f"q{idx}", -1)))
    correct, total, score, graded = grade(course_id, answers)
    save_attempt(_visitor_name(), course_id, correct, total, graded)
    passed = score >= PASSING_SCORE
    if passed:
        flash("Great work! You passed the quiz.", "success")
    else:
        flash("You did not reach the passing score. Review the lessons and try again.", "warning")
    return render_template(
        "portal-results.html",
        course=get_course(course_id),
        graded=graded,
        correct=correct,
        total=total,
        score=score,
        passed=passed,
    )


@portal.route("/certificate/<course_id>")
def certificate(course_id):
    course = get_course(course_id)
    if not course:
        flash("Course not found.", "warning")
        return redirect(url_for("portal.dashboard"))
    verification_url = url_for("portal.dashboard", _external=True)
    png_bytes = generate_certificate(_visitor_name(), course["title"], verification_url)
    return send_file(
        BytesIO(png_bytes),
        mimetype="image/png",
        as_attachment=True,
        download_name=f"{course_id}-certificate.png",
    )


@portal.route("/progress")
def progress():
    username = _visitor_name()
    course_data = stats(username)
    for course in list_courses():
        course_data.setdefault(course["id"], {"lessons_completed": 0, "last_lesson": 1})
    attempts = {cid: get_attempts(username, cid) for cid in course_data.keys()}
    return render_template(
        "portal-certificate.html",
        username=username,
        course_data=course_data,
        attempts=attempts,
    )

