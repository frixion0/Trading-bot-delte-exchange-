import React from 'react';
import { CryptoContract, DeltaAccountConfig, RealAccountBalance } from '../types/trading';
import { 
  Sliders, 
  Terminal, 
  RefreshCw, 
  Globe, 
  TrendingUp, 
  TrendingDown,
  ChevronDown,
  Zap,
  Server
} from 'lucide-react';

interface HeaderProps {
  currentContract: CryptoContract;
  balance: RealAccountBalance;
  accountConfig: DeltaAccountConfig;
  isLoadingBalance: boolean;
  onRefreshBalance: () => void;
  onOpenContractSelector: () => void;
  onOpenSettingsModal: () => void;
  onOpenAlgoScriptModal: () => void;
  onOpenHostingModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentContract,
  balance,
  accountConfig,
  isLoadingBalance,
  onRefreshBalance,
  onOpenContractSelector,
  onOpenSettingsModal,
  onOpenAlgoScriptModal,
  onOpenHostingModal,
}) => {
  const isPositive = currentContract.change24h >= 0;

  return (
    <header className="h-14 border-b border-[#172033] bg-[#090d16] px-3 sm:px-4 flex items-center justify-between gap-3 select-none shrink-0">
      {/* Zone 1: Wordmark, Contract Selector & Gateway Badges */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <a href="/" className="flex items-center gap-2 group whitespace-nowrap">
          <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center font-bold text-white text-sm shadow-sm group-hover:brightness-110 transition-all">
            Δ
          </div>
          <span className="font-bold text-base tracking-tight text-white font-sans hidden sm:inline">
            DeltaFlow
          </span>
        </a>

        {/* Contract Switcher Button */}
        <button
          onClick={onOpenContractSelector}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#111726] hover:bg-[#182136] border border-[#1e2a44] hover:border-blue-500/50 transition-all text-left group"
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white group-hover:text-blue-400 transition-colors">
                {currentContract.symbol}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                PERP
              </span>
            </div>
            <span className="text-[10px] text-slate-400 truncate max-w-[90px] sm:max-w-[120px]">
              {currentContract.name}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
        </button>

        {/* Fast Public Market Data Indicator */}
        <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-md bg-blue-950/40 border border-blue-900/60 text-[11px] font-mono text-blue-300">
          <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="text-slate-400">Data:</span>
          <span className="font-semibold text-cyan-300">Free Public CDN</span>
        </div>

        {/* Static Proxy Badge (Reserved strictly for Trades) */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#101626] border border-[#1d2740] text-xs font-mono text-slate-300">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400 text-[11px]">Trade Proxy:</span>
          <span className="text-emerald-300 font-semibold text-[11px] tabular-nums">142.111.67.146</span>
        </div>
      </div>

      {/* Zone 2: Real-time Market Overview Strip from Free Public CDN */}
      <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 overflow-x-auto py-1">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Mark Price</span>
          <span className="font-mono text-white font-bold text-sm tabular-nums">
            ${currentContract.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </span>
        </div>

        <span className="text-slate-700" aria-hidden="true">·</span>

        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">24h Change</span>
          <span className={`font-mono font-semibold flex items-center gap-0.5 text-xs tabular-nums ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? '+' : ''}{currentContract.change24h.toFixed(2)}%
          </span>
        </div>

        <span className="text-slate-700" aria-hidden="true">·</span>

        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">24h High</span>
          <span className="font-mono text-slate-200 tabular-nums">
            ${currentContract.high24h.toLocaleString()}
          </span>
        </div>

        <span className="text-slate-700" aria-hidden="true">·</span>

        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Funding</span>
          <span className="font-mono text-amber-400 tabular-nums">
            {(currentContract.fundingRate * 100).toFixed(4)}%
          </span>
        </div>
      </div>

      {/* Zone 3: Real Delta Account Equity & Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Real Live Balance Box */}
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 bg-[#101626] border border-[#1d2740] rounded-lg">
          <div className="flex flex-col items-end text-right">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <span>Delta India:</span>
              <span className="text-emerald-400 font-mono font-semibold tabular-nums">
                ₹{balance.netEquityInr.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-white font-bold tabular-nums">
                ${balance.netEquityUsd.toFixed(4)} USD
              </span>
              <span className="text-slate-400 text-[10px] tabular-nums hidden sm:inline">
                (Avail: ${balance.availableBalanceUsd.toFixed(2)})
              </span>
            </div>
          </div>

          <button
            onClick={onRefreshBalance}
            disabled={isLoadingBalance}
            title="Refresh Real Wallet Balance via Static IP"
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#192238] transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalance ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>

        {/* 24/7 Hosting Guide Trigger Button */}
        <button
          onClick={onOpenHostingModal}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 border border-amber-500/40 text-xs font-semibold text-amber-300 transition-all shadow-sm group"
          title="Step-by-step instructions for 24/7 hosting on Hugging Face Spaces + UptimeRobot"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Run 24/7 (HF)</span>
        </button>

        {/* Algo Python Script Modal Trigger */}
        <button
          onClick={onOpenAlgoScriptModal}
          className="p-2 rounded-lg bg-[#111726] hover:bg-[#182136] border border-[#1d2842] text-slate-300 hover:text-white transition-colors"
          title="Download Python Delta Rest Automation Script"
        >
          <Terminal className="w-4 h-4 text-indigo-400" />
        </button>

        {/* Account Credentials & Gateway Settings */}
        <button
          onClick={onOpenSettingsModal}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#111726] hover:bg-[#19243c] border border-[#1e2a44] text-xs font-semibold text-slate-200 transition-colors"
        >
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>
    </header>
  );
};
