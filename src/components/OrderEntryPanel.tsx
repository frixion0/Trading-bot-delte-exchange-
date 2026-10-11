import React, { useState, useMemo, useEffect } from 'react';
import { 
  CryptoContract, 
  OrderSide, 
  OrderType, 
  MarginMode, 
  DeltaAccountConfig, 
  RealAccountBalance 
} from '../types/trading';
import { 
  Sliders, 
  Zap, 
  AlertCircle, 
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';

interface OrderEntryPanelProps {
  contract: CryptoContract;
  balance: RealAccountBalance;
  accountConfig: DeltaAccountConfig;
  onPlaceOrder: (orderParams: {
    side: OrderSide;
    type: OrderType;
    lots: number;
    price: number;
    limitPrice?: number;
    leverage: number;
    marginMode: MarginMode;
    takeProfit?: number;
    stopLoss?: number;
  }) => Promise<{ success: boolean; message: string }>;
  isSubmitting: boolean;
}

export const OrderEntryPanel: React.FC<OrderEntryPanelProps> = ({
  contract,
  balance,
  accountConfig,
  onPlaceOrder,
  isSubmitting,
}) => {
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [marginMode, setMarginMode] = useState<MarginMode>('isolated');
  const [lots, setLots] = useState<number>(1);
  const [leverage, setLeverage] = useState<number>(100);
  const [limitPrice, setLimitPrice] = useState<string>(String(contract.markPrice));
  const [enableTpSl, setEnableTpSl] = useState<boolean>(false);
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [customMultiplier, setCustomMultiplier] = useState<number>(contract.contractMultiplier);
  const [showLotSettings, setShowLotSettings] = useState<boolean>(false);
  const [showMarginExplainer, setShowMarginExplainer] = useState<boolean>(false);
  const [lastActionResult, setLastActionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync state when contract changes
  useEffect(() => {
    setCustomMultiplier(contract.contractMultiplier);
    setLimitPrice(String(contract.markPrice));
    if (contract.maxLeverage < leverage) {
      setLeverage(contract.maxLeverage);
    }
    setLastActionResult(null);
  }, [contract.symbol, contract.contractMultiplier, contract.markPrice]);

  const effectivePrice = orderType === 'market' 
    ? contract.markPrice 
    : (parseFloat(limitPrice) || contract.markPrice);

  // Dynamic live INR rate from Delta balance or default ~₹87.5/USD
  const inrRate = useMemo(() => {
    if (balance.netEquityUsd > 0 && balance.netEquityInr > 0) {
      return balance.netEquityInr / balance.netEquityUsd;
    }
    return 87.5;
  }, [balance.netEquityUsd, balance.netEquityInr]);

  // Single lot notional value
  const singleLotNotionalUsd = customMultiplier * effectivePrice;
  const singleLotNotionalInr = singleLotNotionalUsd * inrRate;

  // Total Notional Value ($ USD) = lots * multiplier * effectivePrice
  const notionalValueUsd = useMemo(() => {
    return lots * customMultiplier * effectivePrice;
  }, [lots, customMultiplier, effectivePrice]);

  const notionalValueInr = notionalValueUsd * inrRate;

  // Base Initial Margin ($ USD) = notional / leverage
  const initialMarginUsd = useMemo(() => {
    if (leverage <= 0) return notionalValueUsd;
    return notionalValueUsd / leverage;
  }, [notionalValueUsd, leverage]);

  const initialMarginInr = initialMarginUsd * inrRate;

  // Delta Taker Fee Buffer (Entry + Exit fee reserved by Delta Exchange: ~0.05% x 2 = 0.10%)
  const feeReserveUsd = useMemo(() => {
    return notionalValueUsd * 0.001;
  }, [notionalValueUsd]);

  const feeReserveInr = feeReserveUsd * inrRate;

  // Total Required Order Margin = Initial Margin + Fee Buffer
  const totalRequiredMarginUsd = initialMarginUsd + feeReserveUsd;
  const totalRequiredMarginInr = totalRequiredMarginUsd * inrRate;

  // Estimated Liquidation Price Calculation
  const estimatedLiqPrice = useMemo(() => {
    const totalAssetAmount = lots * customMultiplier;
    if (totalAssetAmount <= 0) return 0;
    const maintenanceFactor = 0.90;
    if (side === 'buy') {
      const dropAllowed = (initialMarginUsd / totalAssetAmount) * maintenanceFactor;
      return Math.max(0, +(effectivePrice - dropAllowed).toFixed(contract.markPrice < 2 ? 4 : 2));
    } else {
      const riseAllowed = (initialMarginUsd / totalAssetAmount) * maintenanceFactor;
      return +(effectivePrice + riseAllowed).toFixed(contract.markPrice < 2 ? 4 : 2);
    }
  }, [side, effectivePrice, initialMarginUsd, lots, customMultiplier, contract.markPrice]);

  // Quick Lot Presets
  const quickLots = [1, 2, 5, 10, 25, 50, 100];

  // Quick Margin % Sizing against available balance
  const handlePercentSizing = (percent: number) => {
    const usableBal = balance.availableBalanceUsd > 0 ? balance.availableBalanceUsd : 10;
    const targetMargin = (usableBal * percent) / 100;
    const targetNotional = targetMargin * leverage;
    if (singleLotNotionalUsd <= 0) return;
    const calculatedLots = Math.max(1, Math.floor(targetNotional / singleLotNotionalUsd));
    setLots(calculatedLots);
  };

  const handleStepLots = (delta: number) => {
    setLots((prev) => Math.max(1, prev + delta));
  };

  const handleSubmit = async () => {
    if (lots <= 0 || isSubmitting) return;
    setLastActionResult(null);
    const tp = enableTpSl && takeProfitPrice ? parseFloat(takeProfitPrice) : undefined;
    const sl = enableTpSl && stopLossPrice ? parseFloat(stopLossPrice) : undefined;
    const lPrice = orderType === 'limit' ? parseFloat(limitPrice) : undefined;

    const res = await onPlaceOrder({
      side,
      type: orderType,
      lots,
      price: effectivePrice,
      limitPrice: lPrice,
      leverage,
      marginMode,
      takeProfit: tp,
      stopLoss: sl,
    });

    setLastActionResult(res);
  };

  // Distinct leverage presets deduplicated
  const leveragePresets = useMemo(() => {
    const defaultList = [1, 10, 25, 50, 75, contract.maxLeverage];
    return Array.from(new Set(defaultList.filter((l) => l <= contract.maxLeverage))).sort((a, b) => a - b);
  }, [contract.maxLeverage]);

  return (
    <div className="bg-[#0b101c] border border-[#172238] rounded-xl flex flex-col h-full overflow-hidden select-none">
      {/* Panel Top Header */}
      <div className="p-3 border-b border-[#162035] flex items-center justify-between bg-[#080d17]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider font-sans">
            Delta Order Desk
          </span>
          <span className="text-[10px] text-emerald-400 font-mono font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
            DIRECT REST API
          </span>
        </div>

        {/* Margin Mode Selector */}
        <div className="flex items-center gap-1 bg-[#121929] p-0.5 rounded-md border border-[#1e2a44]">
          <button
            onClick={() => setMarginMode('isolated')}
            className={`px-2.5 py-0.5 text-[10px] font-semibold rounded transition-colors ${
              marginMode === 'isolated'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Isolated
          </button>
          <button
            onClick={() => setMarginMode('cross')}
            className={`px-2.5 py-0.5 text-[10px] font-semibold rounded transition-colors ${
              marginMode === 'cross'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cross
          </button>
        </div>
      </div>

      <div className="p-3.5 space-y-3 overflow-y-auto flex-1">
        {/* Side Selector (Buy / Long vs Sell / Short) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#101726] rounded-lg border border-[#1b263f]">
          <button
            onClick={() => setSide('buy')}
            className={`py-2 px-3 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              side === 'buy'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Buy / Long</span>
          </button>
          <button
            onClick={() => setSide('sell')}
            className={`py-2 px-3 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              side === 'sell'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Sell / Short</span>
          </button>
        </div>

        {/* Order Type Selector (Market vs Limit) */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOrderType('market')}
              className={`font-semibold pb-1 border-b-2 transition-colors ${
                orderType === 'market'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Market
            </button>
            <button
              onClick={() => setOrderType('limit')}
              className={`font-semibold pb-1 border-b-2 transition-colors ${
                orderType === 'limit'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Limit
            </button>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <span>Avail:</span>
            <span className="font-semibold text-slate-200 tabular-nums">
              ${balance.availableBalanceUsd.toFixed(2)} (~₹{balance.availableBalanceInr.toFixed(0)})
            </span>
          </div>
        </div>

        {/* Limit Price Input if Limit Order */}
        {orderType === 'limit' && (
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Limit Price (USD)</span>
              <button
                onClick={() => setLimitPrice(String(contract.markPrice))}
                className="text-blue-400 hover:underline text-[10px]"
              >
                Use Mark Price (${contract.markPrice})
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="w-full bg-[#121929] border border-[#1e2a44] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500 tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                USD
              </span>
            </div>
          </div>
        )}

        {/* ================= LOT ADJUSTMENT SECTION ================= */}
        <div className="space-y-2 pt-2 border-t border-[#172238]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              Lot Sizing
              <button
                onClick={() => setShowLotSettings(!showLotSettings)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                title="Adjust Underlying Contract Multiplier"
              >
                <Sliders className="w-3 h-3" />
              </button>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono tabular-nums">
              1 Lot = {customMultiplier} {contract.baseAsset} (~${singleLotNotionalUsd.toFixed(2)} / ₹{singleLotNotionalInr.toFixed(0)})
            </span>
          </div>

          {showLotSettings && (
            <div className="p-2.5 bg-[#121928] rounded-lg border border-[#1e2b44] text-xs space-y-1.5">
              <span className="text-[10px] text-slate-400 block">
                Contract Multiplier ({contract.baseAsset} amount per lot):
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  value={customMultiplier}
                  onChange={(e) => setCustomMultiplier(Math.max(0.0001, parseFloat(e.target.value) || 1))}
                  className="w-full bg-[#172136] border border-[#233352] rounded px-2 py-1 text-xs font-mono text-white tabular-nums"
                />
                <button
                  onClick={() => setCustomMultiplier(contract.contractMultiplier)}
                  className="px-2 py-1 bg-[#202d47] hover:bg-[#283857] text-[10px] text-slate-300 rounded whitespace-nowrap"
                >
                  Reset ({contract.contractMultiplier})
                </button>
              </div>
            </div>
          )}

          {/* Stepper Input: [-] [Lots] [+] */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleStepLots(-1)}
              className="w-9 h-8 rounded-lg bg-[#121929] hover:bg-[#1a243b] border border-[#1e2a44] text-slate-300 hover:text-white flex items-center justify-center font-bold text-base transition-colors"
            >
              -
            </button>
            <div className="relative flex-1">
              <input
                type="number"
                min="1"
                step="1"
                value={lots}
                onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-[#121929] border border-[#1e2a44] rounded-lg px-3 py-1.5 text-xs font-mono font-semibold text-white text-center focus:outline-none focus:border-blue-500 tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                LOTS
              </span>
            </div>
            <button
              onClick={() => handleStepLots(1)}
              className="w-9 h-8 rounded-lg bg-[#121929] hover:bg-[#1a243b] border border-[#1e2a44] text-slate-300 hover:text-white flex items-center justify-center font-bold text-base transition-colors"
            >
              +
            </button>
          </div>

          {/* Quick Lot Chips */}
          <div className="grid grid-cols-7 gap-1 pt-0.5">
            {quickLots.map((q) => (
              <button
                key={`quick-lot-${q}`}
                onClick={() => setLots(q)}
                className={`py-1 text-[10px] font-mono rounded-md border transition-colors tabular-nums ${
                  lots === q
                    ? 'bg-blue-600 border-blue-500 text-white font-bold'
                    : 'bg-[#121929] border-[#1e2a44] text-slate-400 hover:text-slate-200 hover:bg-[#182238]'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Available Margin % Sizing Presets */}
          <div className="flex items-center gap-1 pt-0.5">
            {[10, 25, 50, 75, 100].map((pct) => (
              <button
                key={`pct-btn-${pct}`}
                onClick={() => handlePercentSizing(pct)}
                className="flex-1 py-1 text-[10px] font-mono rounded bg-[#101726] hover:bg-[#172238] border border-[#1b273f] text-slate-400 hover:text-white transition-colors tabular-nums"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* ================= LEVERAGE SLIDER ================= */}
        <div className="space-y-1.5 pt-2 border-t border-[#172238]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-300 uppercase tracking-wider">
              Leverage Setting
            </span>
            <span className="font-mono font-bold text-xs text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/40 tabular-nums">
              {leverage}x
            </span>
          </div>

          <input
            type="range"
            min="1"
            max={contract.maxLeverage}
            value={leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value))}
            className="w-full accent-blue-500 bg-[#121929] cursor-pointer"
          />

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            {leveragePresets.map((lev) => (
              <button
                key={`lev-chip-${lev}`}
                onClick={() => setLeverage(lev)}
                className={`hover:text-blue-400 transition-colors tabular-nums ${
                  leverage === lev ? 'text-blue-400 font-bold' : ''
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>

        {/* ================= TP / SL BRACKET ================= */}
        <div className="pt-2 border-t border-[#172238]">
          <button
            type="button"
            onClick={() => setEnableTpSl(!enableTpSl)}
            className="flex items-center justify-between w-full text-[11px] text-slate-400 hover:text-slate-200"
          >
            <span className="font-semibold uppercase tracking-wider">
              Take Profit / Stop Loss Bracket
            </span>
            <span className="text-xs">{enableTpSl ? '▲' : '▼'}</span>
          </button>

          {enableTpSl && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-[10px] text-emerald-400 block mb-0.5 font-medium">
                  Take Profit (USD)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder={side === 'buy' ? 'Target high' : 'Target low'}
                  value={takeProfitPrice}
                  onChange={(e) => setTakeProfitPrice(e.target.value)}
                  className="w-full bg-[#121929] border border-[#1e2a44] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 tabular-nums"
                />
              </div>
              <div>
                <label className="text-[10px] text-rose-400 block mb-0.5 font-medium">
                  Stop Loss (USD)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder={side === 'buy' ? 'Protect low' : 'Protect high'}
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(e.target.value)}
                  className="w-full bg-[#121929] border border-[#1e2a44] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-rose-500 tabular-nums"
                />
              </div>
            </div>
          )}
        </div>

        {/* ================= ACCURATE DELTA MARGIN & RISK BREAKDOWN ================= */}
        <div className="p-3 bg-[#101626] rounded-lg border border-[#1b263f] space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-400 font-sans">
            <span>Position Size:</span>
            <span className="font-mono text-white font-semibold tabular-nums">
              {(lots * customMultiplier).toFixed(4)} {contract.baseAsset} ({lots} Lots)
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400 font-sans">
            <span>Notional Value:</span>
            <span className="font-mono text-slate-200 tabular-nums">
              ${notionalValueUsd.toFixed(4)} (~₹{notionalValueInr.toFixed(2)})
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400 font-sans">
            <span className="flex items-center gap-1">
              <span>Initial Margin:</span>
              <button 
                type="button" 
                onClick={() => setShowMarginExplainer(!showMarginExplainer)}
                className="text-slate-500 hover:text-slate-300"
                title="View Delta margin formula"
              >
                <Info className="w-3 h-3" />
              </button>
            </span>
            <span className="font-mono text-blue-400 font-bold tabular-nums">
              ${initialMarginUsd.toFixed(4)} (~₹{initialMarginInr.toFixed(2)})
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400 font-sans text-[11px]">
            <span>Est. Fee Reserve (0.10%):</span>
            <span className="font-mono text-slate-300 tabular-nums">
              ${feeReserveUsd.toFixed(4)} (~₹{feeReserveInr.toFixed(2)})
            </span>
          </div>

          {/* Highlighted Total Required Order Margin */}
          <div className="flex items-center justify-between text-white font-sans pt-1 border-t border-[#18233b] font-medium">
            <span className="text-emerald-300 font-semibold">Total Margin Required:</span>
            <span className="font-mono text-emerald-400 font-bold tabular-nums">
              ${totalRequiredMarginUsd.toFixed(4)} USD (~₹{totalRequiredMarginInr.toFixed(2)} INR)
            </span>
          </div>

          {showMarginExplainer && (
            <div className="p-2 bg-[#0d1320] rounded border border-[#1a2640] text-[10px] text-slate-400 font-sans space-y-1">
              <div className="font-semibold text-slate-200">Delta India Official Formula:</div>
              <div>• Notional = {lots} lots × {customMultiplier} × ${effectivePrice} = ${notionalValueUsd.toFixed(2)}</div>
              <div>• Initial Margin = Notional ÷ {leverage}x = ${initialMarginUsd.toFixed(4)} (~₹{initialMarginInr.toFixed(2)})</div>
              <div>• Taker Fee Reserve = 2 × 0.05% × Notional = ${feeReserveUsd.toFixed(4)}</div>
              <div>• 1 USD ≈ ₹{inrRate.toFixed(2)} INR (Delta Exchange rate)</div>
            </div>
          )}

          <div className="flex items-center justify-between text-slate-400 font-sans pt-0.5">
            <span>Est. Liq Price:</span>
            <span className="font-mono text-amber-400 font-semibold tabular-nums">
              ${estimatedLiqPrice} USD
            </span>
          </div>
        </div>

        {/* Last Action Notification Banner */}
        {lastActionResult && (
          <div className={`p-2.5 rounded-lg text-xs font-mono border ${
            lastActionResult.success 
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' 
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}>
          <div className="flex items-center gap-1.5 font-bold">
            {lastActionResult.success ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            )}
            <span>{lastActionResult.success ? 'Order Executed on Delta India' : 'Order Execution Failed'}</span>
          </div>
          <p className="mt-1 text-[11px] line-clamp-3 text-slate-300">
            {lastActionResult.message}
          </p>
        </div>
      )}

      {/* Primary Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${
          side === 'buy'
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
        }`}
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Routing via Static IP...</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            <span>
              {side === 'buy' ? 'Buy / Long' : 'Sell / Short'} {lots} Lot{lots > 1 ? 's' : ''} (₹{totalRequiredMarginInr.toFixed(2)} Margin · ${totalRequiredMarginUsd.toFixed(3)})
            </span>
          </>
        )}
      </button>
    </div>
  </div>
  );
};
