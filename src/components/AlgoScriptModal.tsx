import React, { useState } from 'react';
import { CryptoContract, DeltaAccountConfig } from '../types/trading';
import { X, Copy, Check, Terminal, ExternalLink, ShieldCheck, Key, Zap } from 'lucide-react';

interface AlgoScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: CryptoContract;
  accountConfig: DeltaAccountConfig;
  defaultLots: number;
}

export const AlgoScriptModal: React.FC<AlgoScriptModalProps> = ({
  isOpen,
  onClose,
  contract,
  accountConfig,
  defaultLots,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'rest_api' | 'webhook'>('rest_api');

  if (!isOpen) return null;

  const apiKey = accountConfig.apiKey || 'sIsdKALMbgyoZqKNRuSperaR5W50kP';
  const apiSecret = accountConfig.apiSecret || 'V3HcdoBJ7B6hAOQWaFMT10fyJKzIwqVmdKW7Cc4NuYFtBhTOcmI4SFLfr2HZ';
  const proxyUrl = accountConfig.proxyUrl || 'http://wlnmhhnk:hnjz0r0n59ap@142.111.67.146:5611';
  const baseUrl = accountConfig.environment === 'global' ? 'https://api.delta.exchange' : 'https://cdn.india.deltaex.org';
  const webhookUrl = accountConfig.webhookUrl || 'https://cdn.india.deltaex.org/v2/webhook_alert/30dd3d74343ec3dfc4b85fa59f05dac2';
  const strategyId = accountConfig.strategyId || 'DELTA_SMA_BOT';

  // 1. Official Delta REST API Script (Executes via Webshare Proxy with HMAC-SHA256)
  const pythonRestScript = `import os
import time
import hmac
import hashlib
import json
import threading
import requests
import pandas as pd
from flask import Flask, jsonify

app = Flask(__name__)

# ================= Delta Exchange Credentials & Proxy =================
API_KEY = os.environ.get("DELTA_API_KEY", "${apiKey}")
API_SECRET = os.environ.get("DELTA_API_SECRET", "${apiSecret}")
BASE_URL = os.environ.get("DELTA_BASE_URL", "${baseUrl}")
PROXIES = {
    "http": "${proxyUrl}",
    "https": "${proxyUrl}"
}

SYMBOL = "${contract.symbol}"
RESOLUTION = "5m"
TRADE_QTY = ${defaultLots}  # Number of lots (1 lot = ${contract.contractMultiplier} ${contract.baseAsset})

last_processed_candle_time = None
current_position = "FLAT"  # "LONG", "SHORT", "FLAT"


def generate_delta_signature(secret, method, timestamp, path, query="", payload=""):
    """
    Delta Exchange official HMAC-SHA256 signature algorithm.
    Formula: METHOD + TIMESTAMP + PATH + QUERY + BODY
    """
    message = method + timestamp + path + query + payload
    return hmac.new(
        secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def place_order(side, size):
    """
    Places real order on Delta Exchange through Webshare static proxy.
    """
    path = "/v2/orders"
    timestamp = str(int(time.time()))
    method = "POST"
    
    payload_obj = {
        "product_symbol": SYMBOL,
        "size": int(size),
        "side": side,
        "order_type": "market_order"
    }
    payload_str = json.dumps(payload_obj)
    signature = generate_delta_signature(API_SECRET, method, timestamp, path, "", payload_str)
    
    headers = {
        "Content-Type": "application/json",
        "api-key": API_KEY,
        "timestamp": timestamp,
        "signature": signature,
        "User-Agent": "DeltaFlow-Bot/1.0"
    }
    
    try:
        resp = requests.post(
            f"{BASE_URL}{path}",
            headers=headers,
            data=payload_str,
            proxies=PROXIES,
            timeout=10
        )
        print(f"[ORDER EXEC] {side.upper()} {size} lots -> Status: {resp.status_code}")
        print(resp.text)
        return resp.json()
    except Exception as e:
        print(f"[ORDER ERROR] {e}")
        return None


def fetch_candles():
    """
    Fetches real-time candles from Delta CDN.
    """
    url = f"{BASE_URL}/v2/history/candles?resolution={RESOLUTION}&symbol={SYMBOL}"
    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        if data.get("result"):
            df = pd.DataFrame(data["result"], columns=["time", "open", "high", "low", "close", "volume"])
            df["time"] = pd.to_datetime(df["time"], unit="s")
            df["close"] = pd.to_numeric(df["close"])
            return df
    except Exception as e:
        print(f"[DATA ERROR] {e}")
    return None


def run_strategy():
    """
    SMA 9 / 21 Crossover Strategy Loop.
    """
    global last_processed_candle_time, current_position
    print(f"🚀 DeltaFlow Bot Running for {SYMBOL} ({TRADE_QTY} lots)...")

    while True:
        try:
            df = fetch_candles()
            if df is not None and len(df) >= 22:
                latest_candle = df.iloc[-1]
                candle_time = latest_candle["time"]

                if candle_time != last_processed_candle_time:
                    df["sma9"] = df["close"].rolling(window=9).mean()
                    df["sma21"] = df["close"].rolling(window=21).mean()

                    prev_sma9 = df["sma9"].iloc[-2]
                    prev_sma21 = df["sma21"].iloc[-2]
                    curr_sma9 = df["sma9"].iloc[-1]
                    curr_sma21 = df["sma21"].iloc[-1]

                    # Golden Cross: SMA 9 crosses above SMA 21 -> BUY
                    if prev_sma9 <= prev_sma21 and curr_sma9 > curr_sma21:
                        print("📈 SIGNAL: Golden Cross (BUY)")
                        if current_position == "SHORT":
                            place_order("buy", TRADE_QTY * 2)
                        elif current_position == "FLAT":
                            place_order("buy", TRADE_QTY)
                        current_position = "LONG"

                    # Death Cross: SMA 9 crosses below SMA 21 -> SELL
                    elif prev_sma9 >= prev_sma21 and curr_sma9 < curr_sma21:
                        print("📉 SIGNAL: Death Cross (SELL)")
                        if current_position == "LONG":
                            place_order("sell", TRADE_QTY * 2)
                        elif current_position == "FLAT":
                            place_order("sell", TRADE_QTY)
                        current_position = "SHORT"

                    last_processed_candle_time = candle_time
        except Exception as e:
            print(f"[LOOP ERROR] {e}")

        time.sleep(15)


# Keep-alive web service for Render Free Tier
@app.route("/")
@app.route("/health")
def health():
    return jsonify({
        "status": "online",
        "symbol": SYMBOL,
        "position": current_position,
        "static_ip": "142.111.67.146"
    })


if __name__ == "__main__":
    t = threading.Thread(target=run_strategy, daemon=True)
    t.start()
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonRestScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0b101c] border border-[#1b263f] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#162035] flex items-center justify-between bg-[#080d17]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight font-sans">
                24/7 Algo Trading Bot Generator
              </h2>
              <p className="text-[11px] text-slate-400">
                Deployable on Render free tier with static Webshare proxy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#141d30] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Script Code Viewer */}
        <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-3 bg-[#080d16]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 font-mono">
              bot.py ({contract.symbol} · {defaultLots} Lots · Static IP Egress)
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#141d30] hover:bg-[#1c2944] text-white border border-[#202d48] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Script!' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="flex-1 overflow-auto bg-[#05080e] p-3.5 rounded-xl border border-[#162035] text-[11px] font-mono text-slate-300 leading-relaxed selection:bg-blue-600/40">
            <code>{pythonRestScript}</code>
          </pre>

          {/* Deployment Quick Guide */}
          <div className="p-3 bg-[#0f1524] rounded-xl border border-[#1a253d] text-xs space-y-1">
            <span className="font-bold text-white block">
              3-Step Render Setup:
            </span>
            <p className="text-[11px] text-slate-300">
              1. Create a free Web Service on Render from your GitHub repo.
            </p>
            <p className="text-[11px] text-slate-300">
              2. Set Build Command: <code className="text-blue-400 font-mono">pip install flask requests pandas</code> · Start Command: <code className="text-blue-400 font-mono">python bot.py</code>
            </p>
            <p className="text-[11px] text-slate-300">
              3. Ping your Render URL via UptimeRobot every 5 mins to keep it running 24/7 for free.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#162035] bg-[#080d17] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
