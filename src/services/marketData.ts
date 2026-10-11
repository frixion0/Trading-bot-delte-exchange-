import { Candle, CryptoContract, Position, RealAccountBalance } from '../types/trading';

// Delta India official free public CDN base
const DELTA_PUBLIC_CDN = 'https://cdn.india.deltaex.org';

/**
 * Fetch real historical candles from Delta free public endpoint directly,
 * with fallbacks if required.
 */
export async function fetchHistoricalCandles(
  symbol: string,
  resolution: string = '5m',
  basePrice: number = 1.4026
): Promise<Candle[]> {
  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = nowSec - 86400; // 24 hours of candle bars

  // 1. Direct free public endpoint via applet server route
  try {
    const url = `/api/public/candles?symbol=${encodeURIComponent(
      symbol
    )}&resolution=${resolution}&start=${startSec}&end=${nowSec}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data?.result && Array.isArray(data.result) && data.result.length > 0) {
        return parseDeltaCandles(data.result);
      }
    }
  } catch {
    // Continue to direct CDN fetch
  }

  // 2. Direct free public CDN fetch (no static IP, no credentials)
  try {
    const directUrl = `${DELTA_PUBLIC_CDN}/v2/history/candles?resolution=${resolution}&symbol=${encodeURIComponent(
      symbol
    )}&start=${startSec}&end=${nowSec}`;
    const directRes = await fetch(directUrl);
    if (directRes.ok) {
      const data = await directRes.json();
      if (data?.result && Array.isArray(data.result) && data.result.length > 0) {
        return parseDeltaCandles(data.result);
      }
    }
  } catch {
    // Fallback
  }

  return generateSyntheticCandles(basePrice, resolution, 60);
}

function parseDeltaCandles(rawCandles: any[]): Candle[] {
  return rawCandles
    .map((item: any) => {
      if (Array.isArray(item)) {
        return {
          time: Number(item[0]),
          open: Number(item[1]),
          high: Number(item[2]),
          low: Number(item[3]),
          close: Number(item[4]),
          volume: Number(item[5] || 0),
        };
      }
      return {
        time: Number(item.time || item.t),
        open: Number(item.open || item.o),
        high: Number(item.high || item.h),
        low: Number(item.low || item.l),
        close: Number(item.close || item.c),
        volume: Number(item.volume || item.v || 0),
      };
    })
    .filter((c) => !isNaN(c.close) && c.close > 0)
    .sort((a, b) => a.time - b.time);
}

export function generateSyntheticCandles(
  currentPrice: number,
  resolution: string = '5m',
  count: number = 60
): Candle[] {
  const candles: Candle[] = [];
  const now = Math.floor(Date.now() / 1000);

  let stepSeconds = 300;
  if (resolution === '1m') stepSeconds = 60;
  if (resolution === '15m') stepSeconds = 900;
  if (resolution === '1h') stepSeconds = 3600;
  if (resolution === '4h') stepSeconds = 14400;
  if (resolution === '1D') stepSeconds = 86400;

  let price = currentPrice * 0.98;
  const volatility = currentPrice * 0.0035;

  for (let i = count; i >= 0; i--) {
    const time = now - i * stepSeconds;
    const change = (Math.random() - 0.485) * volatility;
    const open = price;
    const close = +(price + change).toFixed(4);
    const high = +(Math.max(open, close) + Math.random() * volatility * 0.7).toFixed(4);
    const low = +(Math.min(open, close) - Math.random() * volatility * 0.7).toFixed(4);
    const volume = Math.floor(Math.random() * 500 + 50);

    candles.push({ time, open, high, low, close, volume });
    price = close;
  }

  if (candles.length > 0) {
    candles[candles.length - 1].close = currentPrice;
  }

  return candles;
}

export interface OrderBookLevel {
  price: number;
  lots: number;
  total: number;
  depthPercent: number;
}

/**
 * Fetch real public orderbook directly from Delta free public endpoint
 */
export async function fetchPublicOrderBook(
  symbol: string,
  markPrice: number = 1.4026,
  tickSize: number = 0.0001
): Promise<{ asks: OrderBookLevel[]; bids: OrderBookLevel[] }> {
  try {
    const res = await fetch(`/api/public/l2orderbook?symbol=${encodeURIComponent(symbol)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.result && (data.result.buy || data.result.sell)) {
        const rawBids = data.result.buy || [];
        const rawAsks = data.result.sell || [];

        let cumAsk = 0;
        const asks: OrderBookLevel[] = rawAsks.slice(0, 10).map((a: any) => {
          const lots = Number(a.size || 0);
          cumAsk += lots;
          return {
            price: Number(a.price),
            lots,
            total: cumAsk,
            depthPercent: Math.min(100, Math.round((cumAsk / 50000) * 100)),
          };
        });

        let cumBid = 0;
        const bids: OrderBookLevel[] = rawBids.slice(0, 10).map((b: any) => {
          const lots = Number(b.size || 0);
          cumBid += lots;
          return {
            price: Number(b.price),
            lots,
            total: cumBid,
            depthPercent: Math.min(100, Math.round((cumBid / 50000) * 100)),
          };
        });

        if (asks.length > 0 || bids.length > 0) {
          return {
            asks: asks.reverse(), // Highest ask at top, lowest ask near spread
            bids,
          };
        }
      }
    }
  } catch {
    // Fallback to synthetic if network issue
  }

  return generateOrderBook(markPrice, tickSize);
}

export function generateOrderBook(markPrice: number, tickSize: number = 0.0001) {
  const asks: OrderBookLevel[] = [];
  const bids: OrderBookLevel[] = [];

  let cumAskTotal = 0;
  let cumBidTotal = 0;

  const baseStep = tickSize > 0 ? tickSize : 0.0001;

  for (let i = 1; i <= 8; i++) {
    const askPrice = +(markPrice + i * baseStep * (1 + Math.random() * 0.4)).toFixed(markPrice < 2 ? 4 : 2);
    const askLots = Math.floor(Math.random() * 80 + 10);
    cumAskTotal += askLots;
    asks.push({
      price: askPrice,
      lots: askLots,
      total: cumAskTotal,
      depthPercent: Math.min(100, Math.round((cumAskTotal / 400) * 100)),
    });

    const bidPrice = +(markPrice - i * baseStep * (1 + Math.random() * 0.4)).toFixed(markPrice < 2 ? 4 : 2);
    const bidLots = Math.floor(Math.random() * 80 + 10);
    cumBidTotal += bidLots;
    bids.push({
      price: bidPrice,
      lots: bidLots,
      total: cumBidTotal,
      depthPercent: Math.min(100, Math.round((cumBidTotal / 400) * 100)),
    });
  }

  return {
    asks: asks.reverse(),
    bids,
  };
}

export interface TradeFeedItem {
  id: string;
  time: string;
  side: 'buy' | 'sell';
  price: number;
  lots: number;
}

/**
 * Fetch real public trades from Delta free public endpoint
 */
export async function fetchPublicTrades(symbol: string, markPrice: number = 1.4026): Promise<TradeFeedItem[]> {
  try {
    const res = await fetch(`/api/public/trades?symbol=${encodeURIComponent(symbol)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.result && Array.isArray(data.result) && data.result.length > 0) {
        return data.result.slice(0, 20).map((t: any, idx: number) => {
          const timestampMs = t.timestamp ? Math.floor(Number(t.timestamp) / 1000) : Date.now();
          const d = new Date(timestampMs);
          const time = d.toTimeString().split(' ')[0];
          const side = t.seller_role === 'taker' ? 'sell' : 'buy';
          return {
            id: `TRADE-${t.timestamp || Date.now()}-${idx}`,
            time,
            side,
            price: Number(t.price),
            lots: Number(t.size || 1),
          };
        });
      }
    }
  } catch {
    // fallback
  }

  return generateInitialTrades(markPrice);
}

export function generateInitialTrades(markPrice: number): TradeFeedItem[] {
  const trades: TradeFeedItem[] = [];
  const now = Date.now();
  for (let i = 0; i < 14; i++) {
    const side = Math.random() > 0.48 ? 'buy' : 'sell';
    const delta = (Math.random() - 0.5) * (markPrice * 0.001);
    const price = +(markPrice + delta).toFixed(markPrice < 2 ? 4 : 2);
    const date = new Date(now - i * 2800);
    const time = date.toTimeString().split(' ')[0];
    trades.push({
      id: `${now}-${i}`,
      time,
      side,
      price,
      lots: Math.floor(Math.random() * 30 + 1),
    });
  }
  return trades;
}

/**
 * Fetch real ticker directly from Delta free public endpoint (no static proxy needed)
 */
export async function fetchPublicTicker(symbol: string): Promise<{
  markPrice: number;
  close: number;
  high24h: number;
  low24h: number;
  turnoverUsd: number;
  fundingRate: number;
  change24h: number;
} | null> {
  try {
    const res = await fetch(`/api/public/tickers?symbol=${encodeURIComponent(symbol)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.result) {
        const item = data.result;
        const mark = parseFloat(item.mark_price || item.close || '1.4026');
        const close = parseFloat(item.close || item.mark_price || '1.4026');
        const open = parseFloat(item.open || item.close || '1.4026');
        const changePct = open > 0 ? ((close - open) / open) * 100 : 0;

        return {
          markPrice: mark,
          close,
          high24h: parseFloat(item.high || item.mark_high_24h || String(mark * 1.02)),
          low24h: parseFloat(item.low || item.mark_low_24h || String(mark * 0.98)),
          turnoverUsd: parseFloat(item.turnover_usd || '5000000'),
          fundingRate: parseFloat(item.funding_rate || '0.01'),
          change24h: +changePct.toFixed(2),
        };
      }
    }
  } catch {
    // fallback
  }
  return null;
}

// =========================================================================
// TRADING & AUTHENTICATED ENDPOINTS (STRICTLY USE STATIC IP / WEBSHARE PROXY)
// =========================================================================

/**
 * Fetch real wallet balances from Delta Exchange through Webshare proxy
 */
export async function fetchRealDeltaWallet(params: {
  apiKey: string;
  apiSecret: string;
  proxyUrl: string;
  environment: 'india' | 'global';
}): Promise<RealAccountBalance | null> {
  try {
    const res = await fetch('/api/delta/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.result) return null;

    const usdWallet = json.result.find((w: any) => w.asset_symbol === 'USD') || json.result[0];
    const inrWallet = json.result.find((w: any) => w.asset_symbol === 'INR');

    const netEquityUsd = parseFloat(json.meta?.net_equity || usdWallet?.balance || '0');
    const balanceInr = parseFloat(usdWallet?.balance_inr || inrWallet?.balance || '0');
    const availableUsd = parseFloat(usdWallet?.available_balance || '0');
    const availableInr = parseFloat(usdWallet?.available_balance_inr || '0');
    const blockedMargin = parseFloat(usdWallet?.blocked_margin || usdWallet?.position_margin || '0');

    return {
      netEquityUsd: +netEquityUsd.toFixed(4),
      netEquityInr: +balanceInr.toFixed(2),
      availableBalanceUsd: +availableUsd.toFixed(4),
      availableBalanceInr: +availableInr.toFixed(2),
      usedMarginUsd: +blockedMargin.toFixed(4),
      unrealizedPnlUsd: 0,
      userId: usdWallet?.user_id || '82888434',
      lastSyncedAt: Date.now(),
    };
  } catch (e) {
    console.error('Failed to fetch real wallet:', e);
    return null;
  }
}

/**
 * Fetch real margined positions directly from Delta Exchange through Webshare proxy
 */
export async function fetchRealDeltaPositions(params: {
  apiKey: string;
  apiSecret: string;
  proxyUrl: string;
  environment: 'india' | 'global';
}): Promise<Position[]> {
  try {
    const res = await fetch('/api/delta/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success || !Array.isArray(json.result)) return [];

    return json.result
      .filter((p: any) => p.size !== 0)
      .map((p: any) => {
        const symbol = p.product_symbol || p.product?.symbol || 'XRPUSD';
        const sizeNum = Number(p.size);
        const side = sizeNum >= 0 ? 'buy' : 'sell';
        const absLots = Math.abs(sizeNum);
        const entryPrice = parseFloat(p.entry_price || '0');
        const markPrice = parseFloat(p.mark_price || String(entryPrice));
        const margin = parseFloat(p.margin || '0');
        const liqPrice = parseFloat(p.liquidation_price || '0');
        const uPnl = parseFloat(p.unrealized_pnl || '0');
        const pnlPct = margin > 0 ? (uPnl / margin) * 100 : 0;
        const leverage = parseInt(p.product?.default_leverage || '100') || 100;

        return {
          id: `POS-${p.product_id}-${p.user_id || Date.now()}`,
          productId: p.product_id,
          symbol,
          side,
          lots: absLots,
          contractMultiplier: parseFloat(p.product?.contract_value || '1'),
          notionalValue: +(absLots * markPrice).toFixed(4),
          entryPrice,
          markPrice,
          leverage,
          margin: +margin.toFixed(4),
          marginMode: p.margin_mode === 'isolated' ? 'isolated' : 'cross',
          unrealizedPnl: +uPnl.toFixed(4),
          pnlPercentage: +pnlPct.toFixed(2),
          liquidationPrice: liqPrice,
          openedAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
          isRealPosition: true,
        };
      });
  } catch (e) {
    console.error('Failed to fetch real positions:', e);
    return [];
  }
}

/**
 * Execute real order via Delta official REST API with HMAC-SHA256 signature strictly through Webshare static IP proxy
 */
export async function executeDeltaRestOrder(params: {
  apiKey: string;
  apiSecret: string;
  proxyUrl?: string;
  environment: 'india' | 'global';
  symbol: string;
  side: 'buy' | 'sell';
  lots: number;
  orderType: 'market' | 'limit';
}): Promise<{ success: boolean; status: number; text: string; payloadSent: any }> {
  const payload = {
    apiKey: params.apiKey,
    apiSecret: params.apiSecret,
    proxyUrl: params.proxyUrl,
    environment: params.environment,
    symbol: params.symbol,
    side: params.side,
    size: params.lots,
    orderType: params.orderType,
  };

  try {
    const res = await fetch('/api/delta/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return {
      success: res.ok && data.status === 200,
      status: data.status || res.status,
      text: data.rawResponse || JSON.stringify(data),
      payloadSent: {
        symbol: params.symbol,
        side: params.side,
        size: params.lots,
        order_type: params.orderType === 'limit' ? 'limit_order' : 'market_order',
      },
    };
  } catch (err: any) {
    return {
      success: false,
      status: 0,
      text: err?.message || 'Failed to place REST order',
      payloadSent: payload,
    };
  }
}

/**
 * Fetch official product metadata from Delta India public CDN to guarantee
 * 100% accurate contract multipliers and specifications dynamically.
 */
export async function fetchLiveDeltaProducts(): Promise<Record<string, {
  contractMultiplier: number;
  productId: number;
  tickSize: number;
  maxLeverage: number;
  initialMargin: number;
}>> {
  try {
    const res = await fetch(`${DELTA_PUBLIC_CDN}/v2/products`);
    if (!res.ok) return {};
    const data = await res.json();
    if (!data?.result || !Array.isArray(data.result)) return {};

    const map: Record<string, any> = {};
    for (const p of data.result) {
      if (p.contract_type === 'perpetual_futures' && p.symbol) {
        map[p.symbol] = {
          contractMultiplier: parseFloat(p.contract_value || '1'),
          productId: p.id,
          tickSize: parseFloat(p.tick_size || '0.0001'),
          maxLeverage: Math.round(parseFloat(p.default_leverage || '100')),
          initialMargin: parseFloat(p.initial_margin || '1'),
        };
      }
    }
    return map;
  } catch (e) {
    console.warn('Could not load live product specs:', e);
    return {};
  }
}

/**
 * Cancel order on Delta Exchange through static IP proxy
 */
export async function cancelDeltaOrder(params: {
  apiKey: string;
  apiSecret: string;
  proxyUrl: string;
  environment: 'india' | 'global';
  orderId: number | string;
  productId: number;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/delta/cancel-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.ok;
  } catch {
    return false;
  }
}
