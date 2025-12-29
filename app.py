import os
import smtplib
import time
from email.message import EmailMessage

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, send_from_directory
from learning_portal.portal_routes import portal

load_dotenv()

app = Flask(
    __name__, template_folder="templates", static_folder="assets", static_url_path="/assets"
)
app.secret_key = os.getenv("SECRET_KEY", "dev_secret_key")

# Register Learning Portal blueprint
app.register_blueprint(portal)


# Simple in-memory caches to reduce upstream API calls
_btc_history_cache = {}
_btc_snapshot_cache = {"data": None, "timestamp": 0}
_exchange_price_cache = {"data": None, "timestamp": 0}
_CACHE_TTL_SECONDS = 300
_EXCHANGE_CACHE_TTL_SECONDS = 60


# ------------------------------
# MAIN SITE ROUTES
# ------------------------------

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/tools")
def tools():
    return render_template("tools.html")


@app.route("/consulting")
def consulting():
    return render_template("consulting.html")


@app.route("/donate")
def donate():
    return render_template("donate.html")


@app.route("/donation")
def donation():
    return render_template("donation.html")


@app.route("/learning")
def learning():
    return render_template("learning.html")


# ------------------------------
# TOOL ROUTES
# ------------------------------

@app.route("/tools/live-feed")
def live_feed():
    return render_template("tools/live-feed.html")


@app.route("/tools/dca")
def dca():
    return render_template("tools/dca.html")


@app.route("/tools/btc-price-map")
def btc_price_map():
    return render_template("tools/btc-price-map.html")


@app.route("/tools/signal-engine")
def signal_engine():
    return render_template("tools/signal-engine.html")


@app.route("/tools/exchange-compare")
def exchange_compare():
    return render_template("tools/exchange-compare.html")


# Static assets for DCA Tool
@app.route("/tools/dca/assets/<path:filename>")
def dca_asset(filename):
    return send_from_directory(os.path.join("tools", "dca"), filename)


# ------------------------------
# ERROR HANDLERS
# ------------------------------

@app.errorhandler(404)
def page_not_found(e):
    return render_template("errors/404.html"), 404


@app.errorhandler(500)
def server_error(e):
    return render_template("errors/500.html"), 500


# ------------------------------
# API ROUTES
# ------------------------------


def _send_consulting_email(payload: dict) -> None:
    """Send consulting request details to support@adaptbtc.com via SMTP."""

    support_email = "support@adaptbtc.com"
    from_email = os.getenv("CONSULTING_FROM_EMAIL", support_email)
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USERNAME") or os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() != "false"

    if not smtp_host:
        raise RuntimeError(
            "Email delivery is not configured on the server. "
            "Please contact support@adaptbtc.com directly."
        )

    msg = EmailMessage()
    msg["Subject"] = "New AdaptBTC consulting request"
    msg["From"] = from_email
    msg["To"] = support_email
    if payload.get("email"):
        msg["Reply-To"] = payload["email"]

    details = payload.get("details") or "(no additional details provided)"

    msg.set_content(
        "\n".join(
            [
                "A new consulting request was submitted via adaptbtc.com.",
                "",
                f"Name: {payload.get('name', 'N/A')}",
                f"Email: {payload.get('email', 'N/A')}",
                f"Engagement: {payload.get('engagement', 'N/A')}",
                f"Team size: {payload.get('team_size', 'N/A')}",
                "",
                "Notes:",
                details,
            ]
        )
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as smtp:
        if use_tls:
            smtp.starttls()
        if smtp_user and smtp_password:
            smtp.login(smtp_user, smtp_password)
        smtp.send_message(msg)


@app.post("/api/consulting/request")
def submit_consulting_request():
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    engagement = (data.get("engagement") or "").strip()
    team_size = (data.get("team_size") or "").strip()
    details = (data.get("details") or "").strip()

    if not name or not email or not engagement or not team_size:
        return jsonify({"error": "Please complete all required fields."}), 400

    if "@" not in email:
        return jsonify({"error": "Enter a valid email address."}), 400

    try:
        _send_consulting_email(
            {
                "name": name,
                "email": email,
                "engagement": engagement,
                "team_size": team_size,
                "details": details,
            }
        )
    except Exception as exc:  # noqa: BLE001
        return (
            jsonify({"error": f"Unable to send request: {exc}"}),
            500,
        )

    return jsonify({"ok": True})


# ------------------------------
# BTC PRICE API PROXY
# ------------------------------


def _cache_is_valid(cache_entry: dict, ttl: int = _CACHE_TTL_SECONDS) -> bool:
    return time.time() - cache_entry.get("timestamp", 0) < ttl


def _fetch_btc_history(days: str):
    cache_key = str(days)
    cached = _btc_history_cache.get(cache_key)
    if cached and _cache_is_valid(cached):
        return cached["data"]

    url = f"https://api.coingecko.com/api/v3/coins/bitcoin/market_chart"
    params = {"vs_currency": "usd", "days": days, "interval": "daily"}
    response = requests.get(url, params=params, timeout=15)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict) or "prices" not in payload:
        raise RuntimeError("Invalid BTC history response")

    _btc_history_cache[cache_key] = {"data": payload["prices"], "timestamp": time.time()}
    return payload["prices"]


def _fetch_btc_snapshot():
    if _cache_is_valid(_btc_snapshot_cache):
        return _btc_snapshot_cache["data"]

    url = "https://api.coingecko.com/api/v3/coins/bitcoin"
    params = {
        "localization": "false",
        "tickers": "false",
        "market_data": "true",
        "community_data": "false",
        "developer_data": "false",
        "sparkline": "false",
    }
    response = requests.get(url, params=params, timeout=15)
    response.raise_for_status()
    payload = response.json()
    _btc_snapshot_cache["data"] = payload
    _btc_snapshot_cache["timestamp"] = time.time()
    return payload


@app.get("/api/btc/history")
def btc_history():
    days = request.args.get("days", "max")
    try:
        history = _fetch_btc_history(days)
        return jsonify({"prices": history})
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Unable to load BTC history: {exc}"}), 502


@app.get("/api/btc/snapshot")
def btc_snapshot():
    try:
        snapshot = _fetch_btc_snapshot()
        return jsonify(snapshot)
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Unable to load BTC snapshot: {exc}"}), 502


def _fetch_exchange_prices():
    if _cache_is_valid(_exchange_price_cache, _EXCHANGE_CACHE_TTL_SECONDS):
        return _exchange_price_cache["data"]

    exchanges = []
    errors = []

    try:
        response = requests.get(
            "https://api.coinbase.com/v2/prices/BTC-USD/spot", timeout=10
        )
        response.raise_for_status()
        payload = response.json()
        amount = payload.get("data", {}).get("amount")
        if amount:
            exchanges.append(
                {
                    "exchange": "Coinbase",
                    "price": float(amount),
                    "source": "Coinbase spot price",
                }
            )
    except Exception as exc:  # noqa: BLE001
        errors.append(f"Coinbase: {exc}")

    try:
        response = requests.get(
            "https://api.binance.com/api/v3/ticker/price", params={"symbol": "BTCUSDT"}, timeout=10
        )
        response.raise_for_status()
        payload = response.json()
        if "price" in payload:
            exchanges.append(
                {
                    "exchange": "Binance",
                    "price": float(payload["price"]),
                    "source": "Binance BTC/USDT ticker",
                }
            )
    except Exception as exc:  # noqa: BLE001
        errors.append(f"Binance: {exc}")

    try:
        response = requests.get(
            "https://api.kraken.com/0/public/Ticker", params={"pair": "XBTUSD"}, timeout=10
        )
        response.raise_for_status()
        payload = response.json().get("result", {})
        kraken_pair = next(iter(payload.values()), {})
        last_trade = kraken_pair.get("c", [None])[0]
        if last_trade:
            exchanges.append(
                {
                    "exchange": "Kraken",
                    "price": float(last_trade),
                    "source": "Kraken XBT/USD ticker",
                }
            )
    except Exception as exc:  # noqa: BLE001
        errors.append(f"Kraken: {exc}")

    if not exchanges:
        raise RuntimeError("No exchange prices available")

    low_price = min(item["price"] for item in exchanges)
    high_price = max(item["price"] for item in exchanges)
    mid_price = (low_price + high_price) / 2 if high_price and low_price else 0
    spread_bps = ((high_price - low_price) / mid_price * 10000) if mid_price else 0

    payload = {
        "exchanges": exchanges,
        "errors": errors,
        "spread": {
            "low": low_price,
            "high": high_price,
            "basis_points": round(spread_bps, 2),
            "percent": round((high_price - low_price) / low_price * 100, 4),
        },
        "timestamp": time.time(),
    }

    _exchange_price_cache["data"] = payload
    _exchange_price_cache["timestamp"] = time.time()
    return payload


@app.get("/api/exchange-prices")
def exchange_prices():
    try:
        prices = _fetch_exchange_prices()
        return jsonify(prices)
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Unable to load exchange prices: {exc}"}), 502


# ------------------------------
# MAIN ENTRY
# ------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
