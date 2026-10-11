---
title: Delta India 24/7 Trading Terminal
emoji: ⚡
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Delta India 24/7 Futures Trading Terminal

A high-performance crypto perpetual futures trading terminal and algo execution engine designed for Delta Exchange India (`deltaex.org`).

## Features
- **Free Public CDN Market Data**: Real-time candles, L2 depth ladder, and trade prints flow directly from `cdn.india.deltaex.org` without consuming proxy bandwidth.
- **Dedicated Static IP Trade Egress**: Real orders, wallet balances, and positions are cryptographically signed with HMAC-SHA256 and tunnelled via your dedicated Webshare static IP (`142.111.67.146`) to satisfy Delta IP whitelisting.
- **Accurate Margin Math**: Real initial margin calculation matching Delta Exchange India specifications with order taker fee reserve buffers and live INR currency conversions.
- **24/7 Zero-Sleep Cloud Hosting**: Deploys seamlessly on Hugging Face Spaces (Docker SDK) and runs continuously 24/7/365 via UptimeRobot keep-alive monitoring.

---

## 24/7 Deployment Instructions (Hugging Face Spaces + UptimeRobot)

### 1. Create a Hugging Face Space
1. Go to [https://huggingface.co/new-space](https://huggingface.co/new-space).
2. Set **Space Name** to `delta-trading-terminal`.
3. Set **License** to `Apache-2.0` (or Open Source).
4. Select **Space SDK**: **Docker** (Blank).
5. Select **Space Hardware**: **CPU basic · 2 vCPU · 16GB RAM · FREE**.
6. Set Visibility to **Private** (recommended for trading).

### 2. Upload or Push Repository Code
```bash
git remote add space https://huggingface.co/spaces/<YOUR_HF_USERNAME>/delta-trading-terminal
git push space main
```
Or upload via the **Files** tab on your Space:
- `Dockerfile`
- `server.mjs`
- `package.json`
- `src/` directory
- `index.html`
- `vite.config.ts`

### 3. Add Environment Secrets
In your Hugging Face Space: **Settings → Variables and secrets → New secret**:
- `DELTA_API_KEY`: Your Delta India API Key
- `DELTA_API_SECRET`: Your Delta India API Secret
- `WEBSHARE_PROXY`: `http://wlnmhhnk:hnjz0r0n59ap@142.111.67.146:5611`

### 4. Setup UptimeRobot (Free 24/7 Keep-Alive)
Hugging Face Spaces sleep after 48 hours of inactivity on the free tier. UptimeRobot prevents sleep by pinging the app every 5 minutes:
1. Go to [https://uptimerobot.com](https://uptimerobot.com) and create a free account.
2. Click **+ Add New Monitor**.
3. Choose **Monitor Type**: **HTTP(s)**.
4. Set **Friendly Name**: `Delta Terminal 24/7 Keepalive`.
5. Enter **URL (or IP)**: `https://<YOUR_HF_USERNAME>-delta-trading-terminal.hf.space/ping`
6. Set **Monitoring Interval**: **Every 5 minutes**.
7. Click **Create Monitor**.

Your terminal is now running 24 hours a day, 7 days a week, 365 days a year for free!
