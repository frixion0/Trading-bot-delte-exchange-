# ⚡ Permanent 24/7 Deployment Guide: Hugging Face Spaces + UptimeRobot

This guide outlines how to run your **DeltaFlow Trading Terminal** and background bots **24 hours a day, 7 days a week, 365 days a year for 100% free**, with:
- Zero sleep interruptions
- Continuous public CDN market data streaming
- IP-whitelisted static proxy execution (`142.111.67.146`)
- Real-time balance and position tracking

---

## Architecture Diagram

```
                     +---------------------------------------+
                     |         UptimeRobot (Free)            |
                     |  Pings /ping endpoint every 5 minutes |
                     +-------------------+-------------------+
                                         |
                                         v (Keeps Space Awake 24/7)
                     +---------------------------------------+
                     |    Hugging Face Spaces (Free Tier)    |
                     |   2 vCPU · 16 GB RAM · Docker SDK     |
                     |   Port: 7860                          |
                     |                                       |
                     |   Frontend: React Trading Terminal    |
                     |   Backend: Express Proxy Gateway      |
                     +-------+-----------------------+-------+
                             |                       |
            (Public Data)    |                       | (Trades & Wallet)
                             v                       v
               +---------------------------+   +---------------------------+
               |  Delta Free Public CDN    |   |  Webshare Static Proxy    |
               |  cdn.india.deltaex.org    |   |  IP: 142.111.67.146       |
               +---------------------------+   +-------------+-------------+
                                                             |
                                                             v (Whitelisted IP)
                                               +---------------------------+
                                               |  Delta Exchange India API |
                                               |  /v2/orders, /v2/wallet   |
                                               +---------------------------+
```

---

## Phase 1: Hugging Face Spaces Setup

### Step 1: Create a Free Hugging Face Account
1. Open [https://huggingface.co/join](https://huggingface.co/join).
2. Sign up with your email (no credit card required).

### Step 2: Create a New Space
1. Go to [https://huggingface.co/new-space](https://huggingface.co/new-space).
2. Enter Space Name: `delta-trading-terminal`.
3. License: `Apache-2.0` (or Open Source).
4. Select Space SDK: **Docker** (Blank).
5. Hardware: Select **CPU basic · 2 vCPU · 16 GB RAM · Free**.
6. Visibility: **Private** (recommended so only you can access your trading terminal).
7. Click **Create Space**.

### Step 3: Deploy the Code
You can push using Git or upload files directly:

#### Option A: Using Git
```bash
git remote add space https://huggingface.co/spaces/<YOUR_HF_USERNAME>/delta-trading-terminal
git push space main
```

#### Option B: Using the Web UI
1. In your newly created Space, click the **Files** tab.
2. Click **Add file** -> **Upload files**.
3. Upload:
   - `Dockerfile`
   - `server.mjs`
   - `package.json`
   - `vite.config.ts`
   - `index.html`
   - `tsconfig.json`
   - `src/` (folder containing all app components and services)
4. Commit changes. Hugging Face will automatically trigger `docker build` and start your app on port `7860`.

### Step 4: Add Space Environment Secrets
1. In your Space, click **Settings**.
2. Scroll to **Variables and secrets**.
3. Click **New secret** and add:
   - Name: `DELTA_API_KEY` | Value: Your Delta India API key
   - Name: `DELTA_API_SECRET` | Value: Your Delta India API secret
   - Name: `WEBSHARE_PROXY` | Value: `http://wlnmhhnk:hnjz0r0n59ap@142.111.67.146:5611`

---

## Phase 2: UptimeRobot 24/7 Keep-Alive Setup

Hugging Face Spaces automatically go to sleep after 48 hours of inactivity on the free tier. Setting up UptimeRobot to ping your Space every 5 minutes ensures it **never sleeps**.

### Step 1: Create a Free UptimeRobot Account
1. Open [https://uptimerobot.com](https://uptimerobot.com) and sign up for free (supports 50 free monitors).

### Step 2: Add HTTP Monitor
1. On your UptimeRobot Dashboard, click **+ Add New Monitor**.
2. Configure the monitor as follows:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Delta Terminal 24/7 Keepalive`
   - **URL (or IP)**:
     ```
     https://<YOUR_HF_USERNAME>-delta-trading-terminal.hf.space/ping
     ```
   - **Monitoring Interval**: `5 minutes` (Standard free tier)
   - **Monitor Timeout**: `30 seconds`
3. Click **Create Monitor**.

### Step 3: Verify Keep-Alive
1. UptimeRobot will immediately send a test request.
2. The `/ping` endpoint responds with HTTP `200 OK`:
   ```json
   {
     "status": "ok",
     "app": "DeltaFlow 24/7 Cloud Trading Terminal",
     "uptime_seconds": 120,
     "timestamp": "2026-10-11T...",
     "proxy_target_ip": "142.111.67.146"
   }
   ```
3. Status on UptimeRobot will show green **Up (100%)**.

---

## Phase 3: Whitelisting Your Static Proxy IP on Delta

1. Log in to [https://india.delta.exchange](https://india.delta.exchange).
2. Go to **Settings → API Keys**.
3. In your API Key settings, locate **IP Whitelist**.
4. Add:
   ```
   142.111.67.146
   ```
5. Save settings.
All order placement, order cancellation, and wallet calls from your 24/7 Hugging Face Space will egress through this static IP, preventing any unauthorized IP errors.

---

## Summary of URLs and Endpoints

| Resource | URL |
| :--- | :--- |
| **Web Terminal UI** | `https://<YOUR_HF_USERNAME>-delta-trading-terminal.hf.space` |
| **Uptime Keepalive** | `https://<YOUR_HF_USERNAME>-delta-trading-terminal.hf.space/ping` |
| **Health Check** | `https://<YOUR_HF_USERNAME>-delta-trading-terminal.hf.space/healthz` |
| **Free Public CDN Data** | Direct to `https://cdn.india.deltaex.org` |
| **Static Egress Proxy** | `142.111.67.146` via Webshare tunnel |
