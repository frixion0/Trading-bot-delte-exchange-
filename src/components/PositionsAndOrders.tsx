import React, { useState } from 'react';
import { Position, Order, RealAccountBalance, DiagnosticLog } from '../types/trading';
import { 
  X, 
  ArrowLeftRight, 
  Trash2,
  Globe,
  RefreshCw,
  Terminal,
  Activity,
  Clock,
  Layers,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface PositionsAndOrdersProps {
  positions: Position[];
  orders: Order[];
  balance: RealAccountBalance;
  diagnosticLogs: DiagnosticLog[];
  isLoadingPositions: boolean;
  onRefreshPositions: () => void;
  onClosePosition: (position: Position) => void;
  onReversePosition: (position: Position) => void;
  onCancelOrder: (orderId: string, productId?: number) => void;
  onClearHistory: () => void;
}

export const PositionsAndOrders: React.FC<PositionsAndOrdersProps> = ({
  positions,
  orders,
  balance,
  diagnosticLogs,
  isLoadingPositions,
  onRefreshPositions,
  onClosePosition,
  onReversePosition,
  onCancelOrder,
  onClearHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history' | 'diagnostics'>('positions');

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const pastOrders = orders.filter((o) => o.status !== 'pending');

  return (
    <div className="bg-[#0b101c] border border-[#172238] rounded-xl flex flex-col h-full overflow-hidden select-none">
      {/* Tab Navigation Header */}
      <div className="p-2 border-b border-[#162035] flex items-center justify-between bg-[#080d17] overflow-x-auto shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'positions'
                ? 'bg-[#141d30] text-white border border-[#233352]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Margined Positions</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${
              positions.length > 0 ? 'bg-emerald-600 text-white font-bold' : 'text-slate-500'
            }`}>
              {positions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-[#141d30] text-white border border-[#233352]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Orders</span>
            {pendingOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-mono font-bold tabular-nums">
                {pendingOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-[#141d30] text-white border border-[#233352]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>Fills & Audit Log</span>
            <span className="text-slate-500 text-[10px] font-mono tabular-nums">
              ({pastOrders.length})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'bg-[#141d30] text-emerald-400 border border-[#233352]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Static Proxy & Latency</span>
          </button>
        </div>

        {/* Refresh & Quick Actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'positions' && (
            <button
              onClick={onRefreshPositions}
              disabled={isLoadingPositions}
              className="px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:text-white bg-[#121929] hover:bg-[#1a243b] border border-[#1e2a44] rounded-md flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingPositions ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden sm:inline">Sync Positions</span>
            </button>
          )}

          {activeTab === 'history' && pastOrders.length > 0 && (
            <button
              onClick={onClearHistory}
              className="px-2 py-1 text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
              title="Clear Execution Log"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Clear Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Panels */}
      <div className="flex-1 overflow-auto p-2">
        {/* ================= TAB 1: LIVE POSITIONS ================= */}
        {activeTab === 'positions' && (
          <div className="h-full">
            {positions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
                <Layers className="w-8 h-8 text-slate-600" />
                <p className="text-xs font-medium text-slate-400">
                  No active margined positions on Delta India
                </p>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Place a Buy or Sell order in the Order Desk. Positions will sync live via your Webshare static proxy.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#162035] text-[10px] uppercase text-slate-400 font-sans tracking-wider">
                      <th className="pb-2 pl-2">Contract</th>
                      <th className="pb-2">Side</th>
                      <th className="pb-2 text-right">Size (Lots)</th>
                      <th className="pb-2 text-right">Entry Price</th>
                      <th className="pb-2 text-right">Mark Price</th>
                      <th className="pb-2 text-right">Liq. Price</th>
                      <th className="pb-2 text-right">Margin</th>
                      <th className="pb-2 text-right">Unrealized PnL</th>
                      <th className="pb-2 pr-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#131b2c]">
                    {positions.map((pos) => {
                      const isProfit = pos.unrealizedPnl >= 0;
                      return (
                        <tr key={pos.id} className="hover:bg-[#101726] transition-colors">
                          <td className="py-2.5 pl-2 font-bold text-white flex items-center gap-1.5 font-sans">
                            <span>{pos.symbol}</span>
                            <span className="text-[10px] text-blue-400 bg-blue-950/40 px-1 rounded border border-blue-800/40 font-mono tabular-nums">
                              {pos.leverage}x
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-sans uppercase ${
                              pos.side === 'buy'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                            }`}>
                              {pos.side === 'buy' ? 'Long' : 'Short'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-semibold text-slate-200 tabular-nums">
                            {pos.lots} Lots
                            <span className="text-slate-500 text-[10px] block">
                              ({(pos.lots * pos.contractMultiplier).toFixed(2)} units)
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-slate-300 tabular-nums">
                            ${pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </td>
                          <td className="py-2.5 text-right text-white font-semibold tabular-nums">
                            ${pos.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </td>
                          <td className="py-2.5 text-right text-amber-400 tabular-nums">
                            {pos.liquidationPrice > 0 ? `$${pos.liquidationPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '—'}
                          </td>
                          <td className="py-2.5 text-right text-slate-300 tabular-nums">
                            ${pos.margin.toFixed(4)} USD
                          </td>
                          <td className={`py-2.5 text-right font-bold tabular-nums ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}${pos.unrealizedPnl.toFixed(4)}
                            <span className="text-[10px] block">
                              ({isProfit ? '+' : ''}{pos.pnlPercentage.toFixed(2)}%)
                            </span>
                          </td>
                          <td className="py-2.5 pr-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onReversePosition(pos)}
                                title="Reverse position (Market close and open opposite)"
                                className="px-2 py-1 text-[10px] font-sans font-semibold rounded bg-[#151c2d] hover:bg-[#202c46] text-amber-300 border border-[#2b3a5c] flex items-center gap-1 transition-colors"
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                <span>Flip</span>
                              </button>
                              <button
                                onClick={() => onClosePosition(pos)}
                                title="Market Close Position on Delta"
                                className="px-2 py-1 text-[10px] font-sans font-semibold rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 flex items-center gap-1 transition-colors"
                              >
                                <X className="w-3 h-3" />
                                <span>Close</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: OPEN ORDERS ================= */}
        {activeTab === 'orders' && (
          <div className="h-full">
            {pendingOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-1.5">
                <Clock className="w-8 h-8 text-slate-600" />
                <p className="text-xs font-medium text-slate-400">
                  No open limit orders pending execution
                </p>
                <p className="text-[11px] text-slate-500">
                  Limit orders waiting in the Delta order book will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#162035] text-[10px] uppercase text-slate-400 font-sans tracking-wider">
                      <th className="pb-2 pl-2">Contract</th>
                      <th className="pb-2">Side</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2 text-right">Size (Lots)</th>
                      <th className="pb-2 text-right">Limit Price</th>
                      <th className="pb-2 text-right">Time</th>
                      <th className="pb-2 pr-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#131b2c]">
                    {pendingOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#101726] transition-colors">
                        <td className="py-2 pl-2 font-bold text-white font-sans">
                          {ord.symbol}
                        </td>
                        <td className="py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-sans uppercase ${
                            ord.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {ord.side === 'buy' ? 'Buy' : 'Sell'}
                          </span>
                        </td>
                        <td className="py-2 text-slate-400 capitalize">
                          {ord.type}
                        </td>
                        <td className="py-2 text-right text-slate-200 tabular-nums">
                          {ord.lots}
                        </td>
                        <td className="py-2 text-right text-white font-semibold tabular-nums">
                          ${(ord.limitPrice || ord.price).toLocaleString()}
                        </td>
                        <td className="py-2 text-right text-slate-400 text-[11px] tabular-nums">
                          {new Date(ord.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          <button
                            onClick={() => onCancelOrder(ord.id, ord.productId)}
                            className="px-2 py-0.5 text-[10px] text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 rounded border border-rose-800/40 transition-colors"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: FILLS & EXECUTION HISTORY ================= */}
        {activeTab === 'history' && (
          <div className="h-full">
            {pastOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-1.5">
                <Activity className="w-8 h-8 text-slate-600" />
                <p className="text-xs font-medium text-slate-400">
                  No orders executed yet in this session
                </p>
                <p className="text-[11px] text-slate-500">
                  Real executed market orders and fills will be archived here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#162035] text-[10px] uppercase text-slate-400 font-sans tracking-wider">
                      <th className="pb-2 pl-2">Time</th>
                      <th className="pb-2">Contract</th>
                      <th className="pb-2">Side</th>
                      <th className="pb-2 text-right">Lots</th>
                      <th className="pb-2 text-right">Fill Price</th>
                      <th className="pb-2 text-right">Notional</th>
                      <th className="pb-2 pr-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#131b2c]">
                    {pastOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#101726] transition-colors">
                        <td className="py-2 pl-2 text-slate-400 text-[11px] tabular-nums">
                          {new Date(ord.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-2 font-bold text-white font-sans">
                          {ord.symbol}
                        </td>
                        <td className="py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-sans uppercase ${
                            ord.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {ord.side === 'buy' ? 'Buy' : 'Sell'}
                          </span>
                        </td>
                        <td className="py-2 text-right text-slate-200 tabular-nums">
                          {ord.lots}
                        </td>
                        <td className="py-2 text-right text-white font-semibold tabular-nums">
                          ${ord.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </td>
                        <td className="py-2 text-right text-slate-400 tabular-nums">
                          ${(ord.lots * ord.price).toFixed(2)}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            ord.status === 'filled'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : ord.status === 'cancelled'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-rose-950/60 text-rose-400'
                          }`}>
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: STATIC PROXY & LATENCY DIAGNOSTICS ================= */}
        {activeTab === 'diagnostics' && (
          <div className="p-3 space-y-3 font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className="p-3 bg-[#101626] border border-[#1b263f] rounded-lg space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-sans font-medium">
                  Trade Static Proxy (Orders Only)
                </span>
                <span className="text-sm font-bold text-emerald-400 block tabular-nums">
                  142.111.67.146:5611
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Trades via static IP · Data via Free Public CDN
                </span>
              </div>

              <div className="p-3 bg-[#101626] border border-[#1b263f] rounded-lg space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-sans font-medium">
                  Exchange Gateway
                </span>
                <span className="text-sm font-bold text-white block">
                  Delta India (INR)
                </span>
                <span className="text-[10px] text-slate-400 block">
                  cdn.india.deltaex.org
                </span>
              </div>

              <div className="p-3 bg-[#101626] border border-[#1b263f] rounded-lg space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-sans font-medium">
                  Order Security
                </span>
                <span className="text-sm font-bold text-blue-400 block">
                  HMAC-SHA256
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Key & Secret verified
                </span>
              </div>
            </div>

            {/* Diagnostic Logs Stream */}
            <div className="border border-[#18233a] rounded-lg bg-[#080d16] p-3 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-[11px] border-b border-[#151f33] pb-1.5 font-sans">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  Terminal Real-time Audit Trail
                </span>
                <span>Auto-refreshed</span>
              </div>

              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {diagnosticLogs.length === 0 ? (
                  <div className="text-slate-400 text-xs py-2">
                    No API events recorded yet. Connect API or execute an order to inspect raw network packets.
                  </div>
                ) : (
                  diagnosticLogs.slice(-10).reverse().map((log) => (
                    <div key={log.id} className="text-[11px] p-2 bg-[#0d1320] rounded border border-[#162136] space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${
                          log.status === 'success' ? 'text-emerald-400' : log.status === 'error' ? 'text-rose-400' : 'text-blue-400'
                        }`}>
                          [{log.type.toUpperCase()}] {log.title}
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-300 break-all text-[10px]">
                        {log.details}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
