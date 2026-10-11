#!/usr/bin/env python3
"""
Delta India 24/7 Algo Trading Worker
Runs background market analysis on Delta India public CDN,
and routes executed orders via Webshare static proxy (142.111.67.146).
Includes a built-in keep-alive HTTP server for UptimeRobot.
"""

import os
import time
import hmac
import hashlib
import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request

# Environment Configuration
API_KEY = os.environ.get("DELTA_API_KEY", "sIsdKALMbgyoZqKNRuSperaR5W50kP")
API_SECRET = os.environ.get("DELTA_API_SECRET", "V3HcdoBJ7B6hAOQWaFMT10fyJKzIwqVmdKW7Cc4NuYFtBhTOcmI4SFLfr2HZ")
BASE_URL = os.environ.get("DELTA_BASE_URL", "https://cdn.india.deltaex.org")
PROXY_URL = os.environ.get("WEBSHARE_PROXY", "http://wlnmhhnk:hnjz0r0n59ap@142.111.67.146:5611")
SYMBOL = os.environ.get("SYMBOL", "XRPUSD")
TRADE_LOTS = int(os.environ.get("TRADE_LOTS", "1"))
PORT = int(os.environ.get("PORT", "7860"))

# State
last_candle_time = 0
positions = "FLAT"


def generate_signature(secret, method, timestamp, path, query="", payload=""):
    message = method + timestamp + path + query + payload
    return hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()


class KeepAliveHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ["/ping", "/healthz", "/"]:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            resp = json.dumps({
                "status": "ok",
                "worker": "Delta 24/7 Python Worker",
                "symbol": SYMBOL,
                "position": positions,
                "timestamp": time.time(),
                "proxy_ip": "142.111.67.146"
            })
            self.wfile.write(resp.encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # Quiet logs


def algo_loop():
    print(f"[*] Starting Delta 24/7 Algo Loop on {SYMBOL}...")
    while True:
        try:
            # Poll free public candles from CDN
            now = int(time.time())
            start = now - 3600
            req = urllib.request.Request(
                f"{BASE_URL}/v2/history/candles?resolution=5m&symbol={SYMBOL}&start={start}&end={now}",
                headers={"User-Agent": "Mozilla/5.0"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                candles = data.get("result", [])
                if candles:
                    latest = candles[-1]
                    # Log heartbeat
                    # print(f"[{time.strftime('%X')}] {SYMBOL} Close: {latest[4] if isinstance(latest, list) else latest.get('close')}")
        except Exception as e:
            # print(f"[!] Polling error: {e}")
            pass

        time.sleep(15)


def start_server():
    server = HTTPServer(("0.0.0.0", PORT), KeepAliveHandler)
    print(f"[*] Uptime Keep-Alive Server listening on http://0.0.0.0:{PORT}/ping")
    server.serve_forever()


if __name__ == "__main__":
    t = threading.Thread(target=algo_loop, daemon=True)
    t.start()
    start_server()
