import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { execSync } from 'child_process';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 7860;

app.use(express.json());

// Serve static frontend build
app.use(express.static(path.join(__dirname, 'dist')));

// =========================================================================
// UPTIMEROBOT 24/7 KEEP-ALIVE HEALTH CHECKS
// =========================================================================
app.get(['/ping', '/healthz'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'DeltaFlow 24/7 Cloud Trading Terminal',
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    proxy_target_ip: '142.111.67.146',
  });
});

// Helper for generating official Delta Exchange HMAC-SHA256 signature
function generateDeltaSignature(secret, method, timestamp, reqPath, query = '', payload = '') {
  const message = method + timestamp + reqPath + query + payload;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

// =========================================================================
// STATIC IP PROXY APIS FOR TRADING (PROTECTED BY IP WHITELIST 142.111.67.146)
// =========================================================================

// Check Egress Static IP
app.post('/api/proxy/check-ip', (req, res) => {
  try {
    const proxyUrl = req.body?.proxyUrl || process.env.WEBSHARE_PROXY || 'http://wlnmhhnk:hnjz0r0n59ap@142.111.67.146:5611';
    const output = execSync(`curl -s --proxy "${proxyUrl}" https://api.ipify.org?format=json`).toString();
    res.json(JSON.parse(output));
  } catch (err) {
    res.status(502).json({ error: err?.message || 'Failed to check egress IP' });
  }
});

// Execute REST Order via Static IP
app.post('/api/delta/order', (req, res) => {
  try {
    const { apiKey, apiSecret, proxyUrl, environment, symbol, side, lots, orderType } = req.body;
    const finalApiKey = apiKey || process.env.DELTA_API_KEY;
    const finalApiSecret = apiSecret || process.env.DELTA_API_SECRET;
    const finalProxy = proxyUrl || process.env.WEBSHARE_PROXY || 'http://wlnmhhnk:hnjz0r0n59ap@142.111.67.146:5611';
    const baseUrl = environment === 'global' ? 'https://api.delta.exchange' : 'https://cdn.india.deltaex.org';

    const orderPath = '/v2/orders';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'POST';

    const payloadObj = {
      product_symbol: symbol,
      size: Number(lots),
      side: side === 'buy' ? 'buy' : 'sell',
      order_type: orderType === 'limit' ? 'limit_order' : 'market_order',
    };

    const payloadStr = JSON.stringify(payloadObj);
    const signature = generateDeltaSignature(finalApiSecret, method, timestamp, orderPath, '', payloadStr);

    const cmd = `curl -s -i --proxy "${finalProxy}" "${baseUrl}${orderPath}" \
      -X POST \
      -H "Content-Type: application/json" \
      -H "api-key: ${finalApiKey}" \
      -H "timestamp: ${timestamp}" \
      -H "signature: ${signature}" \
      -H "User-Agent: DeltaFlow-Terminal/1.0" \
      -d '${payloadStr.replace(/'/g, "'\\''")}'`;

    const output = execSync(cmd).toString();
    const parts = output.split('\r\n\r\n');
    const headerPart = parts[0] || '';
    const bodyPart = parts[parts.length - 1] || output;

    let statusCode = 200;
    const statusMatch = headerPart.match(/HTTP\/\S+\s+(\d+)/);
    if (statusMatch) statusCode = parseInt(statusMatch[1], 10);

    let parsedBody;
    try {
      parsedBody = JSON.parse(bodyPart);
    } catch {
      parsedBody = { raw: bodyPart };
    }

    res.json({
      status: statusCode,
      success: statusCode >= 200 && statusCode < 300,
      body: parsedBody,
      rawResponse: bodyPart,
    });
  } catch (err) {
    res.status(502).json({ error: err?.message || 'Proxy execution failed' });
  }
});

// Cancel Order via Static IP
app.post('/api/delta/cancel-order', (req, res) => {
  try {
    const { apiKey, apiSecret, proxyUrl, environment, orderId, productId } = req.body;
    const finalApiKey = apiKey || process.env.DELTA_API_KEY;
    const finalApiSecret = apiSecret || process.env.DELTA_API_SECRET;
    const finalProxy = proxyUrl || process.env.WEBSHARE_PROXY || 'http://wlnmhhnk:hnjz0r0n59ap@142.111.67.146:5611';
    const baseUrl = environment === 'global' ? 'https://api.delta.exchange' : 'https://cdn.india.deltaex.org';

    const reqPath = '/v2/orders';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'DELETE';

    const payloadObj = { id: orderId, product_id: productId };
    const payloadStr = JSON.stringify(payloadObj);
    const signature = generateDeltaSignature(finalApiSecret, method, timestamp, reqPath, '', payloadStr);

    const cmd = `curl -s -i --proxy "${finalProxy}" "${baseUrl}${reqPath}" \
      -X DELETE \
      -H "Content-Type: application/json" \
      -H "api-key: ${finalApiKey}" \
      -H "timestamp: ${timestamp}" \
      -H "signature: ${signature}" \
      -H "User-Agent: DeltaFlow-Terminal/1.0" \
      -d '${payloadStr.replace(/'/g, "'\\''")}'`;

    const output = execSync(cmd).toString();
    res.json({ success: true, output });
  } catch (err) {
    res.status(502).json({ error: err?.message || 'Cancel failed' });
  }
});

// Fetch Wallet Balance via Static IP
app.post('/api/delta/wallet', (req, res) => {
  try {
    const { apiKey, apiSecret, proxyUrl, environment } = req.body;
    const finalApiKey = apiKey || process.env.DELTA_API_KEY;
    const finalApiSecret = apiSecret || process.env.DELTA_API_SECRET;
    const finalProxy = proxyUrl || process.env.WEBSHARE_PROXY || 'http://wlnmhhnk:hnjz0r0n59ap@142.111.67.146:5611';
    const baseUrl = environment === 'global' ? 'https://api.delta.exchange' : 'https://cdn.india.deltaex.org';

    const reqPath = '/v2/wallet/balances';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateDeltaSignature(finalApiSecret, 'GET', timestamp, reqPath, '', '');

    const cmd = `curl -s -i --proxy "${finalProxy}" "${baseUrl}${reqPath}" \
      -H "api-key: ${finalApiKey}" \
      -H "timestamp: ${timestamp}" \
      -H "signature: ${signature}" \
      -H "User-Agent: DeltaFlow-Terminal/1.0"`;

    const output = execSync(cmd).toString();
    const parts = output.split('\r\n\r\n');
    const bodyPart = parts[parts.length - 1] || output;

    try {
      res.json(JSON.parse(bodyPart));
    } catch {
      res.json({ success: false, raw: bodyPart });
    }
  } catch (err) {
    res.status(502).json({ error: err?.message || 'Wallet fetch failed' });
  }
});

// Fetch Margined Positions via Static IP
app.post('/api/delta/positions', (req, res) => {
  try {
    const { apiKey, apiSecret, proxyUrl, environment } = req.body;
    const finalApiKey = apiKey || process.env.DELTA_API_KEY;
    const finalApiSecret = apiSecret || process.env.DELTA_API_SECRET;
    const finalProxy = proxyUrl || process.env.WEBSHARE_PROXY || 'http://wlnmhhnk:hnjz0r0n59ap@142.111.67.146:5611';
    const baseUrl = environment === 'global' ? 'https://api.delta.exchange' : 'https://cdn.india.deltaex.org';

    const reqPath = '/v2/positions/margined';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateDeltaSignature(finalApiSecret, 'GET', timestamp, reqPath, '', '');

    const cmd = `curl -s -i --proxy "${finalProxy}" "${baseUrl}${reqPath}" \
      -H "api-key: ${finalApiKey}" \
      -H "timestamp: ${timestamp}" \
      -H "signature: ${signature}" \
      -H "User-Agent: DeltaFlow-Terminal/1.0"`;

    const output = execSync(cmd).toString();
    const parts = output.split('\r\n\r\n');
    const bodyPart = parts[parts.length - 1] || output;

    try {
      res.json(JSON.parse(bodyPart));
    } catch {
      res.json({ success: false, raw: bodyPart });
    }
  } catch (err) {
    res.status(502).json({ error: err?.message || 'Positions fetch failed' });
  }
});

// Fallback to index.html for SPA client-side routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DeltaFlow 24/7 Production Server listening on http://0.0.0.0:${PORT}`);
  console.log(`📡 Keep-Alive Endpoint ready at http://0.0.0.0:${PORT}/ping`);
});
