import io
from datetime import datetime
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = Path(__file__).resolve().parent.parent
BRAND_COLOR = (0, 102, 204)
TEXT_COLOR = (30, 30, 30)


FONT_PATH = str(Path(__file__).resolve().parent / ".." / ".." / "static" / "css" / "OpenSans-Regular.ttf")


def _load_font(size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(FONT_PATH, size)
    except Exception:
        return ImageFont.load_default()


def generate_certificate(username: str, course_name: str, verification_url: str) -> bytes:
    width, height = 1200, 800
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)

    title_font = _load_font(48)
    subtitle_font = _load_font(28)
    body_font = _load_font(22)

    draw.rectangle([(50, 50), (width - 50, height - 50)], outline=BRAND_COLOR, width=6)
    draw.text((width / 2 - 150, 80), "AdaptBTC Certificate", fill=BRAND_COLOR, font=title_font)

    draw.text((150, 200), f"Awarded to: {username}", fill=TEXT_COLOR, font=subtitle_font)
    draw.text((150, 260), f"Course: {course_name}", fill=TEXT_COLOR, font=subtitle_font)
    draw.text((150, 320), f"Date: {datetime.utcnow().strftime('%Y-%m-%d')}", fill=TEXT_COLOR, font=subtitle_font)
    draw.text(
        (150, 380),
        "Congratulations on completing this AdaptBTC learning track. Share this certificate with your network.",
        fill=TEXT_COLOR,
        font=body_font,
    )

    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(verification_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_size = 220
    qr_img = qr_img.resize((qr_size, qr_size))
    image.paste(qr_img, (width - qr_size - 120, height - qr_size - 160))

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer.read()

