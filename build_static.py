from pathlib import Path
import shutil

from flask import render_template

from app import app
from backend.logic.lesson_engine import list_courses, list_lessons

OUTPUT_DIR = Path("docs")

PAGE_PATHS = [
    "/",
    "/tools",
    "/tools/live-feed",
    "/tools/dca",
    "/tools/btc-price-map",
    "/tools/signal-engine",
    "/tools/exchange-compare",
    "/consulting",
    "/donate",
    "/donation",
    "/learning",
    "/portal/dashboard",
    "/portal/courses",
]


def clean_output() -> None:
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def copy_static_assets() -> None:
    for folder in ["assets", "tools"]:
        src = Path(folder)
        dst = OUTPUT_DIR / folder
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst)


def target_path(route: str) -> Path:
    # Normalize route paths into docs/<path>/index.html
    safe_route = route.lstrip("/")
    target = OUTPUT_DIR / safe_route
    if not target.suffix:
        target = target / "index.html"
    return target


def capture_route(client, route: str) -> None:
    response = client.get(route)
    if response.status_code >= 400:
        print(f"Skipping {route}: {response.status_code}")
        return
    dest = target_path(route)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(response.data)
    print(f"✔ wrote {dest}")


def write_404_page() -> None:
    """Render the 404 error page for GitHub Pages fallback routing."""

    # Render the template directly instead of through the test client so we can
    # emit a 404.html file even though the response would carry a 404 status.
    with app.app_context():
        with app.test_request_context():
            html = render_template("errors/404.html")

    dest = OUTPUT_DIR / "404.html"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(html)
    print(f"✔ wrote {dest}")


def build_portal_routes(client) -> None:
    for course in list_courses():
        course_id = course.get("id")
        if not course_id:
            continue
        PAGE_PATHS.extend(
            [
                f"/portal/courses/{course_id}",
                f"/portal/courses/{course_id}/quiz",
            ]
        )
        for lesson in list_lessons(course_id):
            PAGE_PATHS.append(
                f"/portal/courses/{course_id}/lesson/{lesson.get('lesson_order', 1)}"
            )


if __name__ == "__main__":
    clean_output()
    copy_static_assets()

    with app.test_client() as client:
        build_portal_routes(client)
        for route in PAGE_PATHS:
            capture_route(client, route)

    write_404_page()

    print("Static site build complete. Upload contents of 'docs' to GitHub Pages.")
