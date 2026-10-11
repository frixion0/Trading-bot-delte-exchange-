import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Server, 
  Zap, 
  ShieldCheck, 
  Activity, 
  Clock, 
  Cpu, 
  ArrowRight,
  Terminal,
  CheckCircle2,
  FileCode
} from 'lucide-react';
import { DeltaAccountConfig } from '../types/trading';

interface Hosting247ModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountConfig: DeltaAccountConfig;
}

export const Hosting247Modal: React.FC<Hosting247ModalProps> = ({
  isOpen,
  onClose,
  accountConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'steps' | 'dockerfile' | 'uptimerobot' | 'env'>('steps');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const dockerfileSnippet = `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7860
RUN adduser -D -u 1000 appuser

COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs

USER appuser
EXPOSE 7860
CMD ["node", "server.mjs"]`;

  const huggingFaceReadmeSnippet = `---
title: Delta India 24/7 Terminal
emoji: ⚡
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Delta India 24/7 Trading Terminal
Real-time futures trading interface running 24/7 on Hugging Face Spaces.
Kept alive via UptimeRobot pinging \`/ping\`.`;

  const serverSnippet = `// server.mjs - Hugging Face Spaces production server
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 7860;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Uptime Keep-Alive Endpoint for UptimeRobot
app.get(['/ping', '/healthz'], (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() });
});

// Proxy routes for static IP trade execution
// ... (serves frontend dist for any other route)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`24/7 Server running on port \${PORT}\`);
});`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0b101c] border border-[#1b263f] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Modal Header */}
        <div className="p-4 border-b border-[#162035] flex items-center justify-between bg-[#080d17]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-950/50">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight font-sans">
                  Run 24/7 on Hugging Face Spaces + UptimeRobot
                </h2>
                <span className="text-[10px] font-mono font-bold bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 px-2 py-0.5 rounded-full">
                  100% FREE FOREVER
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Permanent cloud deployment guide with zero-sleep keep-alive & static IP tunnel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#141d30] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#162035] bg-[#090e19]">
          <button
            onClick={() => setActiveTab('steps')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'steps'
                ? 'border-blue-500 text-white bg-[#101726]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Step-by-Step Guide</span>
          </button>
          <button
            onClick={() => setActiveTab('uptimerobot')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'uptimerobot'
                ? 'border-emerald-500 text-white bg-[#101726]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>UptimeRobot Keep-Alive</span>
          </button>
          <button
            onClick={() => setActiveTab('dockerfile')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'dockerfile'
                ? 'border-amber-500 text-white bg-[#101726]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            <span>Dockerfile & Code</span>
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'env'
                ? 'border-indigo-500 text-white bg-[#101726]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Secrets & Static IP</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-[#080d16]">
          {activeTab === 'steps' && (
            <div className="space-y-4">
              {/* Architecture Highlight Box */}
              <div className="p-3.5 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 rounded-xl border border-blue-900/40 text-xs">
                <span className="font-bold text-white text-sm block mb-1">
                  How 24/7 Hosting Works:
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Hugging Face Spaces offers free 2 vCPU / 16GB Docker containers. Free spaces usually go to sleep after 48h of inactivity. By setting up a free HTTP ping on <strong>UptimeRobot</strong> every 5 minutes pointing to <code className="text-cyan-300 font-mono">/ping</code>, your space <strong>never enters sleep mode</strong> and runs 24/7/365 uninterrupted. All trades route through your whitelisted Webshare static IP (142.111.67.146).
                </p>
              </div>

              {/* Step Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Step 1 */}
                <div className="p-3.5 bg-[#0f1627] rounded-xl border border-[#1b2742] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-950/50 px-2 py-0.5 rounded border border-amber-900/40">
                      Step 1
                    </span>
                    <a 
                      href="https://huggingface.co/new-space" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Open HF Spaces <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <h3 className="text-xs font-bold text-white font-sans">
                    Create Space on Hugging Face
                  </h3>
                  <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                    <li>Space Name: <strong className="text-white">delta-trading-terminal</strong></li>
                    <li>Space SDK: Select <strong className="text-cyan-300 font-mono">Docker</strong> (Blank)</li>
                    <li>Hardware: <strong className="text-emerald-400">Free · CPU basic (2 vCPU · 16 GB)</strong></li>
                    <li>Visibility: <strong className="text-amber-300">Private</strong> (Recommended for trading)</li>
                  </ul>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 bg-[#0f1627] rounded-xl border border-[#1b2742] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider bg-blue-950/50 px-2 py-0.5 rounded border border-blue-900/40">
                      Step 2
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Git or Web Upload</span>
                  </div>
                  <h3 className="text-xs font-bold text-white font-sans">
                    Upload App Code to Space
                  </h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Clone the HF repo and push files, or use the "Files" tab in your Space to upload <code className="text-cyan-300 font-mono">Dockerfile</code>, <code className="text-cyan-300 font-mono">server.mjs</code>, <code className="text-cyan-300 font-mono">package.json</code>, and the <code className="text-cyan-300 font-mono">src/</code> directory.
                  </p>
                  <div className="p-2 bg-[#090e1a] rounded font-mono text-[10px] text-slate-400 flex items-center justify-between">
                    <code>git push https://huggingface.co/spaces/YOUR_USER/delta-trading-terminal main</code>
                    <button 
                      onClick={() => copyToClipboard('git push https://huggingface.co/spaces/YOUR_USER/delta-trading-terminal main', 'git-push')}
                      className="text-blue-400 hover:text-white shrink-0 ml-2"
                    >
                      {copiedKey === 'git-push' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 bg-[#0f1627] rounded-xl border border-[#1b2742] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-900/40">
                      Step 3
                    </span>
                    <span className="text-[11px] text-slate-400">Settings → Variables</span>
                  </div>
                  <h3 className="text-xs font-bold text-white font-sans">
                    Add Delta Credentials & Static Proxy
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    In your Space Settings, add the following Repository Secrets:
                  </p>
                  <div className="text-[10px] font-mono space-y-1 bg-[#090e1a] p-2 rounded text-slate-300">
                    <div>• <span className="text-amber-400">DELTA_API_KEY</span>: {accountConfig.apiKey.slice(0, 8)}...</div>
                    <div>• <span className="text-amber-400">DELTA_API_SECRET</span>: {accountConfig.apiSecret.slice(0, 8)}...</div>
                    <div>• <span className="text-emerald-400">WEBSHARE_PROXY</span>: http://...142.111.67.146...</div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-3.5 bg-[#0f1627] rounded-xl border border-[#1b2742] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900/40">
                      Step 4 (Crucial)
                    </span>
                    <a 
                      href="https://uptimerobot.com" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      UptimeRobot <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <h3 className="text-xs font-bold text-white font-sans">
                    Configure UptimeRobot (24/7 Keep-Alive)
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Add a new HTTP monitor pointing to your space's <code className="text-emerald-300 font-mono">/ping</code> endpoint every 5 minutes. This prevents Hugging Face from sleeping!
                  </p>
                  <div className="p-2 bg-[#090e1a] rounded font-mono text-[10px] text-emerald-300">
                    https://YOUR_USER-delta-trading-terminal.hf.space/ping
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'uptimerobot' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0f1627] rounded-xl border border-[#1b2742] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    UptimeRobot Configuration Details
                  </h3>
                  <a 
                    href="https://uptimerobot.com" 
                    target="_blank" 
                    rel="noreferrer"
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-sm"
                  >
                    Open UptimeRobot <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  UptimeRobot is 100% free and allows you to monitor up to 50 URLs. When configured with a 5-minute interval, it sends a lightweight HTTP request to your Hugging Face Space. This resets Hugging Face's 48-hour idle timer on every request, keeping your container running <strong>forever</strong>.
                </p>

                <div className="p-3 bg-[#080d16] rounded-lg border border-[#172238] space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between py-1 border-b border-[#141d30]">
                    <span className="text-slate-400">Monitor Type:</span>
                    <span className="text-white font-bold">HTTP(s)</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#141d30]">
                    <span className="text-slate-400">Friendly Name:</span>
                    <span className="text-white">Delta Terminal 24/7 Keepalive</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#141d30]">
                    <span className="text-slate-400">URL or IP:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-cyan-300">https://[your-username]-[space-name].hf.space/ping</span>
                      <button 
                        onClick={() => copyToClipboard('https://YOUR_USER-delta-trading-terminal.hf.space/ping', 'ping-url')}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedKey === 'ping-url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#141d30]">
                    <span className="text-slate-400">Monitoring Interval:</span>
                    <span className="text-emerald-400 font-bold">Every 5 minutes</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">Expected Response:</span>
                    <span className="text-white">HTTP 200 OK</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-xs text-emerald-300 space-y-1">
                  <span className="font-bold block">✓ Verified Response Format:</span>
                  <p className="font-mono text-[11px] text-slate-300">
                    The endpoint returns: <code className="text-emerald-400">{`{"status": "ok", "uptime": 3600.5, "time": "2026-..."}`}</code>
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dockerfile' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 font-mono">
                    Dockerfile (Hugging Face Spaces Port 7860 & Non-root UID 1000)
                  </span>
                  <button
                    onClick={() => copyToClipboard(dockerfileSnippet, 'dockerfile')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#141d30] hover:bg-[#1a253c] text-white text-xs font-medium border border-[#1e2a44]"
                  >
                    {copiedKey === 'dockerfile' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'dockerfile' ? 'Copied Dockerfile!' : 'Copy Dockerfile'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#05080e] rounded-xl border border-[#162035] text-[11px] font-mono text-slate-300 overflow-x-auto">
                  <code>{dockerfileSnippet}</code>
                </pre>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 font-mono">
                    README.md (Hugging Face Space Frontmatter Header)
                  </span>
                  <button
                    onClick={() => copyToClipboard(huggingFaceReadmeSnippet, 'readme')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#141d30] hover:bg-[#1a253c] text-white text-xs font-medium border border-[#1e2a44]"
                  >
                    {copiedKey === 'readme' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'readme' ? 'Copied README!' : 'Copy README'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#05080e] rounded-xl border border-[#162035] text-[11px] font-mono text-slate-300 overflow-x-auto">
                  <code>{huggingFaceReadmeSnippet}</code>
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-3.5">
              <div className="p-3.5 bg-[#0f1627] rounded-xl border border-[#1b2742] space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Hugging Face Space Environment Variables & Secrets
                </h3>
                <p className="text-xs text-slate-300">
                  Configure these in Hugging Face: <strong>Space → Settings → Variables and secrets → New secret</strong>
                </p>

                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2.5 bg-[#080d16] rounded-lg border border-[#172238] flex items-center justify-between">
                    <div>
                      <span className="text-amber-400 font-bold">DELTA_API_KEY</span>
                      <span className="text-slate-400 block text-[11px] font-sans">Your Delta Exchange API key</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(accountConfig.apiKey, 'secret-key')}
                      className="px-2 py-1 bg-[#141d30] rounded text-slate-300 hover:text-white"
                    >
                      {copiedKey === 'secret-key' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="p-2.5 bg-[#080d16] rounded-lg border border-[#172238] flex items-center justify-between">
                    <div>
                      <span className="text-amber-400 font-bold">DELTA_API_SECRET</span>
                      <span className="text-slate-400 block text-[11px] font-sans">Your Delta Exchange API secret</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(accountConfig.apiSecret, 'secret-sec')}
                      className="px-2 py-1 bg-[#141d30] rounded text-slate-300 hover:text-white"
                    >
                      {copiedKey === 'secret-sec' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="p-2.5 bg-[#080d16] rounded-lg border border-[#172238] flex items-center justify-between">
                    <div>
                      <span className="text-emerald-400 font-bold">WEBSHARE_PROXY</span>
                      <span className="text-slate-400 block text-[11px] font-sans">Static proxy to whitelist (IP: 142.111.67.146)</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(accountConfig.proxyUrl, 'secret-proxy')}
                      className="px-2 py-1 bg-[#141d30] rounded text-slate-300 hover:text-white"
                    >
                      {copiedKey === 'secret-proxy' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-blue-300">
                <span className="font-bold block mb-1">Delta IP Whitelisting Reminder:</span>
                <p className="text-slate-300 text-[11px]">
                  Ensure <code className="text-emerald-300 font-mono font-bold">142.111.67.146</code> is added to the IP Whitelist on your Delta Exchange India API Key settings. All orders routed via the static proxy will match this IP.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-[#162035] bg-[#080d17] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pre-configured files already created in repo: Dockerfile, server.mjs, DEPLOY_24_7_GUIDE.md</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
