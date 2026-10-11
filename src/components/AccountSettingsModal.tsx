import React, { useState } from 'react';
import { DeltaAccountConfig, RealAccountBalance } from '../types/trading';
import { 
  X, 
  Key, 
  Globe, 
  AlertCircle, 
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Info
} from 'lucide-react';
import { fetchRealDeltaWallet } from '../services/marketData';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DeltaAccountConfig;
  onSaveConfig: (config: DeltaAccountConfig) => void;
  onSyncWallet: () => Promise<void>;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onSyncWallet,
}) => {
  const [apiKey, setApiKey] = useState(config.apiKey || 'sIsdKALMbgyoZqKNRuSperaR5W50kP');
  const [apiSecret, setApiSecret] = useState(config.apiSecret || 'V3HcdoBJ7B6hAOQWaFMT10fyJKzIwqVmdKW7Cc4NuYFtBhTOcmI4SFLfr2HZ');
  const [proxyUrl, setProxyUrl] = useState(config.proxyUrl || 'http://wlnmhhnk:hnjz0r0n59ap@142.111.67.146:5611');
  const [environment, setEnvironment] = useState<'india' | 'global'>(config.environment || 'india');

  const [testResult, setTestResult] = useState<{
    loading: boolean;
    data?: RealAccountBalance | null;
    error?: string;
  }>({ loading: false });

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
      proxyUrl: proxyUrl.trim(),
      environment,
      mode: 'api_key',
      isConnected: true,
    });
    onClose();
  };

  const handleTestConnection = async () => {
    setTestResult({ loading: true, error: undefined, data: null });
    try {
      const wallet = await fetchRealDeltaWallet({
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        proxyUrl: proxyUrl.trim(),
        environment,
      });

      if (wallet) {
        setTestResult({ loading: false, data: wallet });
        await onSyncWallet();
      } else {
        setTestResult({ 
          loading: false, 
          error: 'Connection timed out or failed. Verify your Webshare proxy is online and your IP (142.111.67.146) is whitelisted on Delta.' 
        });
      }
    } catch (err: any) {
      setTestResult({ loading: false, error: err?.message || 'Connection failed' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0b101c] border border-[#1b263f] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#162035] flex items-center justify-between bg-[#080d17]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight font-sans">
                Delta Live REST API & Static Proxy Gateway
              </h2>
              <p className="text-[11px] text-slate-400">
                Direct Signed API · Static Egress Tunnel (142.111.67.146)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#141d30] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Exchange Platform */}
          <div className="flex items-center justify-between p-2.5 bg-[#101726] rounded-xl border border-[#1b263f]">
            <span className="text-xs font-semibold text-slate-200">
              Exchange Platform
            </span>
            <div className="flex items-center gap-1 bg-[#141d30] p-0.5 rounded-lg text-xs font-mono border border-[#1e2a44]">
              <button
                type="button"
                onClick={() => setEnvironment('india')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  environment === 'india'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Delta India (.org)
              </button>
              <button
                type="button"
                onClick={() => setEnvironment('global')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  environment === 'global'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Delta Global (.exchange)
              </button>
            </div>
          </div>

          {/* Delta API Key */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">
              Delta API Key
            </label>
            <input
              type="text"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sIsdKALMbgyoZqKNRuSperaR5W50kP"
              className="w-full bg-[#101726] border border-[#1b263f] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Delta API Secret */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">
              Delta API Secret
            </label>
            <input
              type="password"
              required
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="V3HcdoBJ7B6hAOQWaFMT10fyJKzIwqVmdKW7Cc4NuYFtBhTOcmI4SFLfr2HZ"
              className="w-full bg-[#101726] border border-[#1b263f] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Webshare Static Proxy URL */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Webshare Static Proxy Tunnel
              </label>
              <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                IP: 142.111.67.146
              </span>
            </div>
            <input
              type="text"
              required
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="http://user:pass@142.111.67.146:5611"
              className="w-full bg-[#101726] border border-[#1b263f] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-slate-400">
              Orders and private balances route through this proxy to meet Delta India IP whitelisting. Market data flows free & fast directly.
            </p>
          </div>

          {/* Test Ping Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testResult.loading}
              className="w-full py-2.5 bg-[#141d30] hover:bg-[#1a253d] disabled:opacity-50 text-xs font-semibold text-slate-200 border border-[#202d48] rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {testResult.loading ? (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>Test Connection & Sync Real Balance</span>
            </button>

            {testResult.data && (
              <div className="mt-2.5 p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Delta India Connected
                  </span>
                  <span>User ID: {testResult.data.userId}</span>
                </div>
                <div className="text-[11px] text-slate-200">
                  Total Equity: <strong className="text-white">${testResult.data.netEquityUsd} USD</strong> (~₹{testResult.data.netEquityInr} INR)
                </div>
                <div className="text-[10px] text-slate-400">
                  Available Margin: ${testResult.data.availableBalanceUsd} USD (₹{testResult.data.availableBalanceInr} INR)
                </div>
              </div>
            )}

            {testResult.error && (
              <div className="mt-2.5 p-3 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl text-xs font-mono flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{testResult.error}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#162035]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
            >
              Save Credentials
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
