import React, { useState } from 'react';
import { CryptoContract } from '../types/trading';
import { OrderBookLevel, TradeFeedItem } from '../services/marketData';

interface OrderBookProps {
  contract: CryptoContract;
  orderBook: { asks: OrderBookLevel[]; bids: OrderBookLevel[] };
  recentTrades: TradeFeedItem[];
  onSelectPrice?: (price: number) => void;
}

export const OrderBook: React.FC<OrderBookProps> = ({
  contract,
  orderBook,
  recentTrades,
  onSelectPrice,
}) => {
  const [activeTab, setActiveTab] = useState<'book' | 'trades'>('book');

  // Spread calculation
  const bestAsk = orderBook.asks[orderBook.asks.length - 1]?.price || contract.markPrice;
  const bestBid = orderBook.bids[0]?.price || contract.markPrice;
  const spread = Math.max(0, +(bestAsk - bestBid).toFixed(4));
  const spreadPct = +((spread / contract.markPrice) * 100).toFixed(3);

  return (
    <div className="bg-[#0b101c] border border-[#172238] rounded-xl flex flex-col h-full overflow-hidden select-none">
      {/* Header Tabs */}
      <div className="p-2 border-b border-[#162035] flex items-center justify-between bg-[#080d17] shrink-0">
        <div className="flex items-center gap-1 bg-[#101726] p-0.5 rounded-md border border-[#1b263f]">
          <button
            onClick={() => setActiveTab('book')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
              activeTab === 'book'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Order Book
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
              activeTab === 'trades'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Recent Trades
          </button>
        </div>

        <span className="text-[10px] text-slate-400 font-mono">
          Lots Depth
        </span>
      </div>

      {activeTab === 'book' ? (
        <div className="flex-1 flex flex-col p-2 text-xs font-mono overflow-hidden">
          {/* Column Headers */}
          <div className="grid grid-cols-3 text-[10px] text-slate-400 pb-1.5 border-b border-[#162035] px-1 font-sans uppercase">
            <span>Price (USD)</span>
            <span className="text-right">Size (Lots)</span>
            <span className="text-right">Total</span>
          </div>

          {/* Asks (Sell Orders - Red) */}
          <div className="flex-1 flex flex-col justify-end space-y-0.5 py-1 overflow-hidden">
            {orderBook.asks.slice(-6).map((ask, idx) => (
              <div
                key={`ask-${ask.price}-${idx}`}
                onClick={() => onSelectPrice && onSelectPrice(ask.price)}
                className="grid grid-cols-3 text-[11px] relative cursor-pointer hover:bg-rose-950/20 py-0.5 px-1 rounded transition-colors group"
              >
                {/* Visual Depth Bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-rose-900/15 group-hover:bg-rose-900/25 pointer-events-none rounded-r"
                  style={{ width: `${ask.depthPercent}%` }}
                />
                <span className="text-rose-400 font-semibold relative z-10 tabular-nums">
                  {ask.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
                <span className="text-right text-slate-300 relative z-10 tabular-nums">
                  {ask.lots}
                </span>
                <span className="text-right text-slate-400 relative z-10 tabular-nums">
                  {ask.total}
                </span>
              </div>
            ))}
          </div>

          {/* Middle Spread & Current Mark Price Strip */}
          <div className="py-1.5 px-2 my-1 bg-[#101726] rounded border border-[#1b263f] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white tabular-nums">
                ${contract.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
              <span className={`text-[10px] ${contract.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {contract.change24h >= 0 ? '▲' : '▼'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Spread: <span className="text-slate-300 tabular-nums">${spread}</span> ({spreadPct}%)
            </div>
          </div>

          {/* Bids (Buy Orders - Green) */}
          <div className="flex-1 space-y-0.5 py-1 overflow-hidden">
            {orderBook.bids.slice(0, 6).map((bid, idx) => (
              <div
                key={`bid-${bid.price}-${idx}`}
                onClick={() => onSelectPrice && onSelectPrice(bid.price)}
                className="grid grid-cols-3 text-[11px] relative cursor-pointer hover:bg-emerald-950/20 py-0.5 px-1 rounded transition-colors group"
              >
                {/* Visual Depth Bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-emerald-900/15 group-hover:bg-emerald-900/25 pointer-events-none rounded-r"
                  style={{ width: `${bid.depthPercent}%` }}
                />
                <span className="text-emerald-400 font-semibold relative z-10 tabular-nums">
                  {bid.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
                <span className="text-right text-slate-300 relative z-10 tabular-nums">
                  {bid.lots}
                </span>
                <span className="text-right text-slate-400 relative z-10 tabular-nums">
                  {bid.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Recent Trades Stream */
        <div className="flex-1 p-2 text-xs font-mono overflow-y-auto space-y-1">
          <div className="grid grid-cols-3 text-[10px] text-slate-400 pb-1.5 border-b border-[#162035] px-1 font-sans uppercase">
            <span>Price (USD)</span>
            <span className="text-right">Size (Lots)</span>
            <span className="text-right">Time</span>
          </div>

          {recentTrades.map((trade, idx) => (
            <div
              key={`trade-${trade.id}-${idx}`}
              className="grid grid-cols-3 text-[11px] py-1 px-1 rounded hover:bg-[#101726]"
            >
              <span
                className={`font-semibold tabular-nums ${
                  trade.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
              <span className="text-right text-slate-300 tabular-nums">
                {trade.lots}
              </span>
              <span className="text-right text-slate-400 text-[10px] tabular-nums">
                {trade.time}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
