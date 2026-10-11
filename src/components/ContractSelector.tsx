import React, { useState } from 'react';
import { CryptoContract } from '../types/trading';
import { Search, Plus, X, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { createCustomContract } from '../data/contracts';

interface ContractSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: CryptoContract[];
  currentContract: CryptoContract;
  onSelectContract: (contract: CryptoContract) => void;
  onAddCustomContract: (contract: CryptoContract) => void;
}

export const ContractSelector: React.FC<ContractSelectorProps> = ({
  isOpen,
  onClose,
  contracts,
  currentContract,
  onSelectContract,
  onAddCustomContract,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customSymbol, setCustomSymbol] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  if (!isOpen) return null;

  const categories = ['All', 'Major', 'Layer 1', 'Meme', 'AI', 'DeFi', 'Custom'];

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      c.symbol.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.baseAsset.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSymbol.trim()) return;
    const price = parseFloat(customPrice) || 10.0;
    const newContract = createCustomContract(customSymbol, price);
    onAddCustomContract(newContract);
    onSelectContract(newContract);
    setCustomSymbol('');
    setCustomPrice('');
    setIsAddingCustom(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0f1422] border border-[#222c44] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#1b2236] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Select Crypto Futures Contract
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Trade perpetual futures with custom lot sizes or add any token pair
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1a2236] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Categories */}
        <div className="p-4 border-b border-[#1b2236] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search symbol (e.g. BTC, ETH, SOL, DOGE, PEPE)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#151c2d] border border-[#232f4a] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              autoFocus
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#151c2d] text-slate-400 hover:text-slate-200 hover:bg-[#1b233a]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Contract List */}
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {filteredContracts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-3">
              <p className="text-sm">No contract found matching &quot;{search}&quot;</p>
              <button
                onClick={() => {
                  setCustomSymbol(search.toUpperCase());
                  setIsAddingCustom(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add &quot;{search.toUpperCase() || 'CUSTOM'}&quot; Contract
              </button>
            </div>
          ) : (
            filteredContracts.map((c, idx) => {
              const isSelected = c.symbol === currentContract.symbol;
              const isPos = c.change24h >= 0;
              return (
                <div
                  key={`${c.symbol}-${idx}`}
                  onClick={() => {
                    onSelectContract(c);
                    onClose();
                  }}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-950/40 border border-blue-600/50'
                      : 'hover:bg-[#151c2d] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1a2338] flex items-center justify-center font-mono font-bold text-xs text-blue-400 border border-[#263452]">
                      {c.baseAsset.slice(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-mono">
                          {c.symbol}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                          {c.category}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>1 Lot = {c.contractMultiplier} {c.baseAsset}</span>
                        <span>·</span>
                        <span>Max {c.maxLeverage}x</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold text-white">
                      ${c.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </div>
                    <div className={`text-xs font-mono flex items-center justify-end gap-1 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isPos ? '+' : ''}{c.change24h.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Custom Contract Creator Section */}
        <div className="p-3 border-t border-[#1b2236] bg-[#0c101a]">
          {!isAddingCustom ? (
            <button
              onClick={() => setIsAddingCustom(true)}
              className="w-full py-2 px-3 border border-dashed border-[#2b3857] hover:border-blue-500 rounded-lg text-xs text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Allow any other crypto future: Add Custom Perpetual Symbol</span>
            </button>
          ) : (
            <form onSubmit={handleCreateCustom} className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Define Any Crypto Future
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                    Symbol (e.g. SUIUSD, TIAUSD)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="BTCUSDT, WIFUSD..."
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value)}
                    className="w-full bg-[#151c2d] border border-[#232f4a] rounded-lg px-3 py-1.5 text-xs text-white uppercase font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                    Reference Price ($ USD)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 15.50"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full bg-[#151c2d] border border-[#232f4a] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
              >
                Create and Select Contract
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
