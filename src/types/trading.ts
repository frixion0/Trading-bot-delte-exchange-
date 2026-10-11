export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';
export type MarginMode = 'cross' | 'isolated';
export type ExecutionMode = 'api_key';

export interface CryptoContract {
  symbol: string;
  name: string;
  category: 'Major' | 'Layer 1' | 'DeFi' | 'Meme' | 'AI' | 'Custom';
  baseAsset: string;
  quoteAsset: string;
  productId?: number;
  markPrice: number;
  lastPrice: number;
  high24h: number;
  low24h: number;
  change24h: number; // percentage
  volume24h: number; // in USD
  contractMultiplier: number; // exact Delta India contract value, e.g. 1 lot = 1 XRP, or 0.001 BTC
  tickSize: number;
  minLots: number;
  maxLots: number;
  maxLeverage: number;
  fundingRate: number; // e.g. 0.01%
}

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  id: string;
  productId?: number;
  symbol: string;
  side: OrderSide;
  lots: number;
  contractMultiplier: number;
  notionalValue: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  margin: number;
  marginMode: MarginMode;
  unrealizedPnl: number;
  pnlPercentage: number;
  liquidationPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: number;
  isRealPosition?: boolean;
}

export interface Order {
  id: string;
  symbol: string;
  productId?: number;
  side: OrderSide;
  type: OrderType;
  lots: number;
  price: number;
  limitPrice?: number;
  leverage: number;
  margin: number;
  status: 'filled' | 'pending' | 'cancelled' | 'rejected';
  executionMode: ExecutionMode;
  createdAt: number;
  filledAt?: number;
  apiResponse?: {
    status: number;
    text: string;
    payloadSent: any;
  };
}

export interface DeltaAccountConfig {
  apiKey: string;
  apiSecret: string;
  proxyUrl: string;
  environment: 'india' | 'global';
  mode: ExecutionMode;
  isConnected: boolean;
}

export interface RealAccountBalance {
  netEquityUsd: number;
  netEquityInr: number;
  availableBalanceUsd: number;
  availableBalanceInr: number;
  usedMarginUsd: number;
  unrealizedPnlUsd: number;
  userId: string | number;
  lastSyncedAt: number;
}

export type AccountBalance = RealAccountBalance;

export interface DiagnosticLog {
  id: string;
  timestamp: number;
  type: 'order' | 'wallet' | 'positions' | 'proxy';
  status: 'success' | 'error' | 'info';
  title: string;
  details: string;
  raw?: any;
}
