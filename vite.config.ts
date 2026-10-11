import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'delta-proxy-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            // =========================================================================
            // FREE PUBLIC ENDPOINTS (NO PROXY, NO STATIC IP REQUIRED - FAST & DIRECT)
            // =========================================================================

            // 1. Historical Candles (Free Public CDN)
            if (req.url?.startsWith('/api/public/candles')) {
              try {
                const urlObj = new URL(req.url, 'http://localhost');
                const symbol = urlObj.searchParams.get('symbol') || 'XRPUSD';
                const resolution = urlObj.searchParams.get('resolution') || '5m';
                const nowSec = Math.floor(Date.now() / 1000);
                const defaultStart = nowSec - 86400; // 24 hours
                const start = urlObj.searchParams.get('start') || defaultStart.toString();
                const end = urlObj.searchParams.get('end') || nowSec.toString();

                const cdnUrl = `https://cdn.india.deltaex.org/v2/history/candles?resolution=${encodeURIComponent(
                  resolution
                )}&symbol=${encodeURIComponent(symbol)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

                const response = await fetch(cdnUrl, {
                  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                });

                if (response.ok) {
                  const data = await response.json();
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                  return;
                }

                // Fallback to Delta Global CDN
                const fallbackUrl = `https://cdn.delta.exchange/v2/history/candles?resolution=${encodeURIComponent(
                  resolution
                )}&symbol=${encodeURIComponent(symbol)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
                const fallbackResp = await fetch(fallbackUrl, {
                  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                });
                const fallbackData = await fallbackResp.json();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(fallbackData));
              } catch (err: any) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err?.message || 'Failed to fetch free public candles' }));
              }
              return;
            }

            // 2. Tickers & Prices (Free Public CDN)
            if (req.url?.startsWith('/api/public/tickers')) {
              try {
                const urlObj = new URL(req.url, 'http://localhost');
                const symbol = urlObj.searchParams.get('symbol');
                const targetUrl = symbol
                  ? `https://cdn.india.deltaex.org/v2/tickers/${encodeURIComponent(symbol)}`
                  : `https://cdn.india.deltaex.org/v2/tickers`;

                const response = await fetch(targetUrl, {
                  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                });
                const data = await response.json();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              } catch (err: any) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err?.message || 'Failed to fetch public tickers' }));
              }
              return;
            }

            // 3. L2 Order Book (Free Public CDN)
            if (req.url?.startsWith('/api/public/l2orderbook')) {
              try {
                const urlObj = new URL(req.url, 'http://localhost');
                const symbol = urlObj.searchParams.get('symbol') || 'XRPUSD';
                const targetUrl = `https://cdn.india.deltaex.org/v2/l2orderbook/${encodeURIComponent(symbol)}`;

                const response = await fetch(targetUrl, {
                  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                });
                const data = await response.json();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              } catch (err: any) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err?.message || 'Failed to fetch public orderbook' }));
              }
              return;
            }

            // 4. Public Recent Trades (Free Public CDN)
            if (req.url?.startsWith('/api/public/trades')) {
              try {
                const urlObj = new URL(req.url, 'http://localhost');
                const symbol = urlObj.searchParams.get('symbol') || 'XRPUSD';
                const targetUrl = `https://cdn.india.deltaex.org/v2/trades/${encodeURIComponent(symbol)}`;

                const response = await fetch(targetUrl, {
                  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                });
                const data = await response.json();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              } catch (err: any) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err?.message || 'Failed to fetch public trades' }));
              }
              return;
            }

            // =========================================================================
            // TRADING & AUTHENTICATED ORDERS ONLY (USES STATIC IP / WEBSHARE PROXY)
            // =========================================================================

            // =========================================================================
            // UPTIME KEEPALIVE ENDPOINT (FOR UPTIMEROBOT 24/7 MONITORING)
            // =========================================================================
            if (req.url === '/ping' || req.url === '/healthz') {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  status: 'ok',
                  server: 'DeltaFlow 24/7 Cloud Host',
                  uptime: process.uptime(),
                  time: new Date().toISOString(),
                })
              );
              return;
            }

            // Real Order Placement (ALWAYS uses Static IP proxy for IP Whitelist compliance)
            if (req.url === '/api/delta/order' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', (chunk) => {
                bodyStr += chunk;
              });
              req.on('end', async () => {
                try {
                  const { apiKey, apiSecret, environment, symbol, side, size, orderType, proxyUrl } =
                    JSON.parse(bodyStr);
                  if (!apiKey || !apiSecret) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Missing apiKey or apiSecret' }));
                    return;
                  }

                  const baseUrl =
                    environment === 'india' ? 'https://cdn.india.deltaex.org' : 'https://api.delta.exchange';
                  const path = '/v2/orders';
                  const timestamp = Math.floor(Date.now() / 1000).toString();
                  const method = 'POST';
                  const query = '';

                  // Product ID lookup (XRPUSD = 14969, BTCUSD = 27, ETHUSD = 3136)
                  const upperSym = (symbol || '').toUpperCase();
                  const payloadObj: any = {
                    size: Number(size),
                    side: side,
                    order_type: orderType === 'limit' ? 'limit_order' : 'market_order',
                  };

                  if (upperSym.includes('XRP')) {
                    payloadObj.product_id = 14969;
                  } else if (upperSym.includes('BTC')) {
                    payloadObj.product_id = 27;
                  } else if (upperSym.includes('ETH')) {
                    payloadObj.product_id = 3136;
                  } else {
                    payloadObj.product_symbol = symbol;
                  }

                  const payloadJson = JSON.stringify(payloadObj);

                  // Delta Signature formula: METHOD + TIMESTAMP + PATH + QUERY + BODY
                  const signatureData = method + timestamp + path + query + payloadJson;
                  const signature = crypto.createHmac('sha256', apiSecret).update(signatureData).digest('hex');

                  if (proxyUrl) {
                    // Execute strictly through Webshare static IP proxy
                    const curlCmd = `curl -s -i --proxy "${proxyUrl}" "${baseUrl}${path}" \
                      -H "Content-Type: application/json" \
                      -H "api-key: ${apiKey}" \
                      -H "timestamp: ${timestamp}" \
                      -H "signature: ${signature}" \
                      -H "User-Agent: DeltaFlow-Terminal/1.0" \
                      -d '${payloadJson.replace(/'/g, "'\\''")}'`;

                    const output = execSync(curlCmd).toString();
                    const parts = output.split('\r\n\r\n');
                    const bodyPart = parts[parts.length - 1] || output;

                    res.setHeader('Content-Type', 'application/json');
                    try {
                      const parsed = JSON.parse(bodyPart);
                      res.statusCode = parsed.success ? 200 : 400;
                      res.end(
                        JSON.stringify({
                          status: res.statusCode,
                          rawResponse: bodyPart,
                        })
                      );
                    } catch {
                      res.statusCode = 200;
                      res.end(JSON.stringify({ status: 200, rawResponse: bodyPart }));
                    }
                  } else {
                    const response = await fetch(baseUrl + path, {
                      method,
                      headers: {
                        'Content-Type': 'application/json',
                        'api-key': apiKey,
                        'timestamp': timestamp,
                        'signature': signature,
                        'User-Agent': 'DeltaFlow-Terminal/1.0',
                      },
                      body: payloadJson,
                    });

                    const resText = await response.text();
                    res.statusCode = response.status;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(
                      JSON.stringify({
                        status: response.status,
                        statusText: response.statusText,
                        rawResponse: resText,
                      })
                    );
                  }
                } catch (err: any) {
                  res.statusCode = 502;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err?.message || 'Failed to dispatch order' }));
                }
              });
              return;
            }

            // Real Wallet Balances (Uses Static IP proxy for authenticated private endpoint)
            if (req.url === '/api/delta/wallet' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', (chunk) => {
                bodyStr += chunk;
              });
              req.on('end', () => {
                try {
                  const { apiKey, apiSecret, proxyUrl, environment } = JSON.parse(bodyStr);
                  const baseUrl =
                    environment === 'global' ? 'https://api.delta.exchange' : 'https://cdn.india.deltaex.org';
                  const path = '/v2/wallet/balances';
                  const timestamp = Math.floor(Date.now() / 1000).toString();
                  const sigData = 'GET' + timestamp + path + '';
                  const signature = crypto.createHmac('sha256', apiSecret).update(sigData).digest('hex');

                  let cmd = proxyUrl
                    ? `curl -s --proxy "${proxyUrl}" "${baseUrl}${path}" \
                      -H "api-key: ${apiKey}" \
                      -H "signature: ${signature}" \
                      -H "timestamp: ${timestamp}" \
                      -H "User-Agent: DeltaFlow-Terminal/1.0"`
                    : `curl -s "${baseUrl}${path}" \
                      -H "api-key: ${apiKey}" \
                      -H "signature: ${signature}" \
                      -H "timestamp: ${timestamp}" \
                      -H "User-Agent: DeltaFlow-Terminal/1.0"`;

                  const raw = execSync(cmd).toString();
                  res.setHeader('Content-Type', 'application/json');
                  res.end(raw);
                } catch (err: any) {
                  res.statusCode = 502;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err?.message || 'Failed to fetch wallet' }));
                }
              });
              return;
            }

            // Real Margined Positions (Uses Static IP proxy for authenticated private endpoint)
            if (req.url === '/api/delta/positions' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', (chunk) => {
                bodyStr += chunk;
              });
              req.on('end', () => {
                try {
                  const { apiKey, apiSecret, proxyUrl, environment } = JSON.parse(bodyStr);
                  const baseUrl =
                    environment === 'global' ? 'https://api.delta.exchange' : 'https://cdn.india.deltaex.org';
                  const path = '/v2/positions/margined';
                  const timestamp = Math.floor(Date.now() / 1000).toString();
                  const sigData = 'GET' + timestamp + path + '';
                  const signature = crypto.createHmac('sha256', apiSecret).update(sigData).digest('hex');

                  let cmd = proxyUrl
                    ? `curl -s --proxy "${proxyUrl}" "${baseUrl}${path}" \
                      -H "api-key: ${apiKey}" \
                      -H "signature: ${signature}" \
                      -H "timestamp: ${timestamp}" \
                      -H "User-Agent: DeltaFlow-Terminal/1.0"`
                    : `curl -s "${baseUrl}${path}" \
                      -H "api-key: ${apiKey}" \
                      -H "signature: ${signature}" \
                      -H "timestamp: ${timestamp}" \
                      -H "User-Agent: DeltaFlow-Terminal/1.0"`;

                  const raw = execSync(cmd).toString();
                  res.setHeader('Content-Type', 'application/json');
                  res.end(raw);
                } catch (err: any) {
                  res.statusCode = 502;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err?.message || 'Failed to fetch positions' }));
                }
              });
              return;
            }

            // Cancel Order (Uses Static IP proxy for authenticated trade mutation)
            if (req.url === '/api/delta/cancel-order' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', (chunk) => {
                bodyStr += chunk;
              });
              req.on('end', () => {
                try {
                  const { apiKey, apiSecret, proxyUrl, environment, orderId, productId } = JSON.parse(bodyStr);
                  const baseUrl =
                    environment === 'global' ? 'https://api.delta.exchange' : 'https://cdn.india.deltaex.org';
                  const path = '/v2/orders';
                  const timestamp = Math.floor(Date.now() / 1000).toString();
                  const payloadObj = { id: orderId, product_id: productId };
                  const payloadStr = JSON.stringify(payloadObj);
                  const sigData = 'DELETE' + timestamp + path + '' + payloadStr;
                  const signature = crypto.createHmac('sha256', apiSecret).update(sigData).digest('hex');

                  let cmd = proxyUrl
                    ? `curl -s -X DELETE --proxy "${proxyUrl}" "${baseUrl}${path}" \
                      -H "Content-Type: application/json" \
                      -H "api-key: ${apiKey}" \
                      -H "signature: ${signature}" \
                      -H "timestamp: ${timestamp}" \
                      -H "User-Agent: DeltaFlow-Terminal/1.0" \
                      -d '${payloadStr}'`
                    : `curl -s -X DELETE "${baseUrl}${path}" \
                      -H "Content-Type: application/json" \
                      -H "api-key: ${apiKey}" \
                      -H "signature: ${signature}" \
                      -H "timestamp: ${timestamp}" \
                      -H "User-Agent: DeltaFlow-Terminal/1.0" \
                      -d '${payloadStr}'`;

                  const raw = execSync(cmd).toString();
                  res.setHeader('Content-Type', 'application/json');
                  res.end(raw);
                } catch (err: any) {
                  res.statusCode = 502;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err?.message || 'Failed to cancel order' }));
                }
              });
              return;
            }

            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
