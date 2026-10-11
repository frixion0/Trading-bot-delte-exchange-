/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  CryptoContract, 
  Candle, 
  Position, 
  Order, 
  OrderSide, 
  OrderType, 
  MarginMode, 
  DeltaAccountConfig, 
  RealAccountBalance,
  DiagnosticLog
} from './types/trading';
import { INITIAL_CONTRACTS } from './data/contracts';
import { 
  fetchHistoricalCandles, 
  fetchPublicOrderBook,
  fetchPublicTrades,
  fetchPublicTicker,
  fetchLiveDeltaProducts,
  fetchRealDeltaWallet, 
  fetchRealDeltaPositions, 
  executeDeltaRestOrder, 
  cancelDeltaOrder,
  OrderBookLevel, 
  TradeFeedItem 
} from './services/marketData';
import { Header } from './components/Header';
import { TradingChart } from './components/TradingChart';
import { OrderBook } from './components/OrderBook';
import { PositionsAndOrders } from './components/PositionsAndOrders';
import { OrderEntryPanel } from './components/OrderEntryPanel';
import { ContractSelector } from './components/ContractSelector';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { AlgoScriptModal } from './components/AlgoScriptModal';
import { Hosting247Modal } from './components/Hosting247Modal';

export default function App() {
  // 1. Contracts & Active Contract (Default: XRPUSD)
  const [contracts, setContracts] = useState<CryptoContract[]>(() => {
    const saved = localStorage.getItem('deltaflow_contracts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_CONTRACTS;
  });

  const [currentContract, setCurrentContract] = useState<CryptoContract>(() => {
    return contracts.find((c) => c.symbol === 'XRPUSD') || contracts[0];
  });

  // 2. Real Delta Account Configuration (Preloaded with user credentials & Webshare proxy)
  const [accountConfig, setAccountConfig] = useState<DeltaAccountConfig>(() => {
    const saved = localStorage.getItem('deltaflow_account_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.apiKey) return parsed;
      } catch {}
    }
    return {
      apiKey: 'sIsdKALMbgyoZqKNRuSperaR5W50kP',
      apiSecret: 'V3HcdoBJ7B6hAOQWaFMT10fyJKzIwqVmdKW7Cc4NuYFtBhTOcmI4SFLfr2HZ',
      proxyUrl: 'http://wlnmhhnk:hnjz0r0n59ap@142.111.67.146:5611',
      environment: 'india',
      mode: 'api_key',
      isConnected: true,
    };
  });

  // 3. Real Live Wallet Balance & Margined Positions
  const [balance, setBalance] = useState<RealAccountBalance>(() => {
    const saved = localStorage.getItem('deltaflow_live_balance');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      netEquityUsd: 0.1254,
      netEquityInr: 10.97,
      availableBalanceUsd: 0.1254,
      availableBalanceInr: 10.97,
      usedMarginUsd: 0.0,
      unrealizedPnlUsd: 0.0,
      userId: '82888434',
      lastSyncedAt: Date.now(),
    };
  });

  const [positions, setPositions] = useState<Position[]>(() => {
    const saved = localStorage.getItem('deltaflow_live_positions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('deltaflow_live_orders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  // 4. Market Data States (Fed exclusively via Delta India Free Public CDN)
  const [candles, setCandles] = useState<Candle[]>([]);
  const [resolution, setResolution] = useState<string>('5m');
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(true);
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }>({
    bids: [],
    asks: [],
  });
  const [recentTrades, setRecentTrades] = useState<TradeFeedItem[]>([]);

  // 5. Diagnostics & Audit Trail Logs
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);

  // 6. UI Modals
  const [isContractSelectorOpen, setIsContractSelectorOpen] = useState(false);
  const [isAccountSettingsModalOpen, setIsAccountSettingsModalOpen] = useState(false);
  const [isAlgoScriptModalOpen, setIsAlgoScriptModalOpen] = useState(false);
  const [isHostingModalOpen, setIsHostingModalOpen] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Diagnostic Logger helper
  const addLog = useCallback(
    (type: DiagnosticLog['type'], status: DiagnosticLog['status'], title: string, details: string, raw?: any) => {
      const entry: DiagnosticLog = {
        id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        type,
        status,
        title,
        details,
        raw,
      };
      setLogs((prev) => [entry, ...prev.slice(0, 150)]);
    },
    []
  );

  // Sync products specifications dynamically from Delta India public CDN on startup
  useEffect(() => {
    async function syncProductSpecs() {
      try {
        const productSpecs = await fetchLiveDeltaProducts();
        if (productSpecs && Object.keys(productSpecs).length > 0) {
          setContracts((prev) =>
            prev.map((c) => {
              const spec = productSpecs[c.symbol];
              if (spec) {
                return {
                  ...c,
                  contractMultiplier: spec.contractMultiplier,
                  productId: spec.productId,
                  tickSize: spec.tickSize,
                  maxLeverage: spec.maxLeverage,
                };
              }
              return c;
            })
          );
        }
      } catch (err) {
        console.warn('Could not sync dynamic product specs:', err);
      }
    }
    syncProductSpecs();
  }, []);

  // Sync Real Wallet Balance via Webshare Static Proxy
  const syncWallet = useCallback(async () => {
    if (!accountConfig.apiKey || !accountConfig.apiSecret) return;
    setIsLoadingBalance(true);
    try {
      const realWallet = await fetchRealDeltaWallet({
        apiKey: accountConfig.apiKey,
        apiSecret: accountConfig.apiSecret,
        proxyUrl: accountConfig.proxyUrl,
        environment: accountConfig.environment,
      });

      if (realWallet) {
        setBalance(realWallet);
        localStorage.setItem('deltaflow_live_balance', JSON.stringify(realWallet));
        addLog(
          'wallet',
          'success',
          'Real Wallet Synced',
          `Delta India Net Equity: ₹${realWallet.netEquityInr.toFixed(2)} ($${realWallet.netEquityUsd.toFixed(4)} USD) | Available: $${realWallet.availableBalanceUsd.toFixed(4)}`
        );
      } else {
        addLog('wallet', 'info', 'Wallet Polled', 'Delta India balance active');
      }
    } catch (err: any) {
      addLog('wallet', 'error', 'Wallet Sync Failed', err?.message || 'Proxy error');
    } finally {
      setIsLoadingBalance(false);
    }
  }, [accountConfig, addLog]);

  // Sync Real Margined Positions via Webshare Static Proxy
  const syncPositions = useCallback(async () => {
    if (!accountConfig.apiKey || !accountConfig.apiSecret) return;
    try {
      const livePositions = await fetchRealDeltaPositions({
        apiKey: accountConfig.apiKey,
        apiSecret: accountConfig.apiSecret,
        proxyUrl: accountConfig.proxyUrl,
        environment: accountConfig.environment,
      });

      setPositions(livePositions);
      localStorage.setItem('deltaflow_live_positions', JSON.stringify(livePositions));
      if (livePositions.length > 0) {
        addLog('positions', 'success', 'Positions Refreshed', `Active margined positions: ${livePositions.length}`);
      }
    } catch (err: any) {
      addLog('positions', 'error', 'Positions Sync Failed', err?.message || 'Proxy error');
    }
  }, [accountConfig, addLog]);

  // 1. Initial Load: Fetch Market Data via Free Public CDN
  useEffect(() => {
    let isMounted = true;
    setIsLoadingCandles(true);

    async function loadData() {
      try {
        const [cList, book, trades, ticker] = await Promise.all([
          fetchHistoricalCandles(currentContract.symbol, resolution, currentContract.markPrice),
          fetchPublicOrderBook(currentContract.symbol),
          fetchPublicTrades(currentContract.symbol),
          fetchPublicTicker(currentContract.symbol),
        ]);

        if (!isMounted) return;

        if (cList.length > 0) setCandles(cList);
        setOrderBook(book);
        if (trades.length > 0) setRecentTrades(trades);

        if (ticker) {
          setCurrentContract((prev) => ({
            ...prev,
            markPrice: ticker.markPrice || prev.markPrice,
            lastPrice: ticker.lastPrice || prev.lastPrice,
            high24h: ticker.high24h || prev.high24h,
            low24h: ticker.low24h || prev.low24h,
            change24h: ticker.change24h !== undefined ? ticker.change24h : prev.change24h,
            volume24h: ticker.volume24h || prev.volume24h,
          }));
        }
      } catch (e) {
        console.error('Error loading initial market data:', e);
      } finally {
        if (isMounted) setIsLoadingCandles(false);
      }
    }

    loadData();
    syncWallet();
    syncPositions();

    return () => {
      isMounted = false;
    };
  }, [currentContract.symbol, resolution, syncWallet, syncPositions]);

  // 2. High-Frequency Polling: Free Public CDN for Tickers, Depth & Recent Trades (Every 2s)
  useEffect(() => {
    const fastInterval = setInterval(async () => {
      try {
        const [book, trades, ticker] = await Promise.all([
          fetchPublicOrderBook(currentContract.symbol),
          fetchPublicTrades(currentContract.symbol),
          fetchPublicTicker(currentContract.symbol),
        ]);

        setOrderBook(book);
        if (trades.length > 0) setRecentTrades(trades);

        if (ticker && ticker.markPrice > 0) {
          setCurrentContract((prev) => ({
            ...prev,
            markPrice: ticker.markPrice,
            lastPrice: ticker.lastPrice,
            high24h: ticker.high24h,
            low24h: ticker.low24h,
            change24h: ticker.change24h,
            volume24h: ticker.volume24h,
          }));
        }
      } catch {
        // Silent fail on transient public CDN hiccup
      }
    }, 2000);

    return () => clearInterval(fastInterval);
  }, [currentContract.symbol]);

  // 3. Periodic Candles Polling: Free Public CDN (Every 10s)
  useEffect(() => {
    const candleInterval = setInterval(async () => {
      try {
        const cList = await fetchHistoricalCandles(currentContract.symbol, resolution, currentContract.markPrice);
        if (cList.length > 0) {
          setCandles(cList);
        }
      } catch {}
    }, 10000);

    return () => clearInterval(candleInterval);
  }, [currentContract.symbol, resolution, currentContract.markPrice]);

  // 4. Authenticated Account Polling: Wallet & Positions via Static Proxy (Every 30s)
  useEffect(() => {
    const accountInterval = setInterval(() => {
      syncWallet();
      syncPositions();
    }, 30000);

    return () => clearInterval(accountInterval);
  }, [syncWallet, syncPositions]);

  // Persist State to LocalStorage
  useEffect(() => {
    localStorage.setItem('deltaflow_account_config', JSON.stringify(accountConfig));
  }, [accountConfig]);

  useEffect(() => {
    localStorage.setItem('deltaflow_contracts', JSON.stringify(contracts));
  }, [contracts]);

  useEffect(() => {
    localStorage.setItem('deltaflow_live_orders', JSON.stringify(orders));
  }, [orders]);

  // Handle Placing Live Real Order (Direct Delta REST API via Static IP Proxy)
  const handlePlaceOrder = async (orderParams: {
    side: OrderSide;
    type: OrderType;
    lots: number;
    price: number;
    limitPrice?: number;
    leverage: number;
    marginMode: MarginMode;
    takeProfit?: number;
    stopLoss?: number;
  }): Promise<{ success: boolean; message: string }> => {
    setIsSubmittingOrder(true);
    const orderId = `ORD-${Date.now()}`;

    try {
      addLog(
        'order',
        'info',
        `Routing ${orderParams.side.toUpperCase()} Order (${orderParams.lots} lots)`,
        `Via Static IP 142.111.67.146 -> Delta India /v2/orders`
      );

      const notional = orderParams.lots * currentContract.contractMultiplier * orderParams.price;
      const initialMargin = notional / orderParams.leverage;
      const feeReserve = notional * 0.001;
      const totalMargin = initialMargin + feeReserve;

      const res = await executeDeltaRestOrder({
        apiKey: accountConfig.apiKey,
        apiSecret: accountConfig.apiSecret,
        proxyUrl: accountConfig.proxyUrl,
        environment: accountConfig.environment,
        symbol: currentContract.symbol,
        side: orderParams.side,
        lots: orderParams.lots,
        orderType: orderParams.type,
      });

      const newOrder: Order = {
        id: orderId,
        symbol: currentContract.symbol,
        side: orderParams.side,
        type: orderParams.type,
        lots: orderParams.lots,
        price: orderParams.price,
        limitPrice: orderParams.limitPrice,
        leverage: orderParams.leverage,
        margin: totalMargin,
        status: res.success ? 'filled' : 'rejected',
        executionMode: 'api_key',
        createdAt: Date.now(),
        filledAt: res.success ? Date.now() : undefined,
        apiResponse: {
          status: res.status,
          text: res.text,
          payloadSent: res.payloadSent,
        },
      };

      setOrders((prev) => [newOrder, ...prev]);
      addLog('order', res.success ? 'success' : 'error', `Delta Exchange Response (${res.status})`, res.text);

      // Immediate wallet & positions refresh to reflect fill
      await syncWallet();
      await syncPositions();

      return {
        success: res.success,
        message: res.success
          ? `Order submitted successfully on Delta India: ${res.text}`
          : `Order execution error: ${res.text}`,
      };
    } catch (err: any) {
      addLog('order', 'error', 'Order Dispatch Failed', err?.message || 'Network exception');
      return {
        success: false,
        message: `Execution failed: ${err?.message || 'Network error'}`,
      };
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Handle Cancelling an Active Order
  const handleCancelOrder = async (orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    if (currentContract.productId) {
      addLog('order', 'info', `Cancelling Order ${orderId}`, `Via Static IP`);
      await cancelDeltaOrder({
        apiKey: accountConfig.apiKey,
        apiSecret: accountConfig.apiSecret,
        proxyUrl: accountConfig.proxyUrl,
        environment: accountConfig.environment,
        orderId,
        productId: currentContract.productId,
      });
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' as const } : o))
    );
    addLog('order', 'info', `Order ${orderId} Cancelled`, 'Status updated');
  };

  // Close active position via market reverse order
  const handleClosePosition = async (posId: string) => {
    const pos = positions.find((p) => p.id === posId);
    if (!pos) return;

    const closeSide: OrderSide = pos.side === 'buy' ? 'sell' : 'buy';
    addLog('positions', 'info', `Closing Position ${pos.symbol}`, `Placing opposite ${closeSide.toUpperCase()} market order`);

    await handlePlaceOrder({
      side: closeSide,
      type: 'market',
      lots: pos.lots,
      price: currentContract.markPrice,
      leverage: pos.leverage,
      marginMode: pos.marginMode,
    });

    setPositions((prev) => prev.filter((p) => p.id !== posId));
  };

  // Reverse position
  const handleReversePosition = async (posId: string) => {
    const pos = positions.find((p) => p.id === posId);
    if (!pos) return;

    const reverseSide: OrderSide = pos.side === 'buy' ? 'sell' : 'buy';
    const doubleLots = pos.lots * 2;
    addLog('positions', 'info', `Reversing Position ${pos.symbol}`, `Placing ${reverseSide.toUpperCase()} for ${doubleLots} lots`);

    await handlePlaceOrder({
      side: reverseSide,
      type: 'market',
      lots: doubleLots,
      price: currentContract.markPrice,
      leverage: pos.leverage,
      marginMode: pos.marginMode,
    });
  };

  // Custom Contract Addition
  const handleAddCustomContract = (newContract: CryptoContract) => {
    setContracts((prev) => [newContract, ...prev]);
    setCurrentContract(newContract);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b14] text-slate-100 font-sans overflow-hidden select-none">
      {/* Universal Top Navigation Header */}
      <Header
        currentContract={currentContract}
        balance={balance}
        accountConfig={accountConfig}
        isLoadingBalance={isLoadingBalance}
        onRefreshBalance={syncWallet}
        onOpenContractSelector={() => setIsContractSelectorOpen(true)}
        onOpenSettingsModal={() => setIsAccountSettingsModalOpen(true)}
        onOpenAlgoScriptModal={() => setIsAlgoScriptModalOpen(true)}
        onOpenHostingModal={() => setIsHostingModalOpen(true)}
      />

      {/* Main Terminal Grid Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 p-2 overflow-hidden bg-[#070b14]">
        {/* Left Column: Real-time Public Chart & Diagnostic Audit Tabs (8 Cols) */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col gap-2 min-h-0 h-full overflow-hidden">
          {/* Chart Viewport */}
          <div className="h-[440px] xl:h-[480px]">
            <TradingChart
              contract={currentContract}
              candles={candles}
              resolution={resolution}
              onChangeResolution={setResolution}
              isLoadingCandles={isLoadingCandles}
            />
          </div>

          {/* Margined Positions, Real Orders, Logs & Gateway Diagnostic View */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <PositionsAndOrders
              positions={positions}
              orders={orders}
              logs={logs}
              onCancelOrder={handleCancelOrder}
              onClosePosition={handleClosePosition}
              onReversePosition={handleReversePosition}
              onClearLogs={() => setLogs([])}
            />
          </div>
        </div>

        {/* Right Column: Order Entry Desk & Public Orderbook (4 Cols) */}
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-2 min-h-0 h-full overflow-y-auto lg:overflow-hidden">
          {/* Order Placement Desk */}
          <OrderEntryPanel
            contract={currentContract}
            balance={balance}
            accountConfig={accountConfig}
            isSubmitting={isSubmittingOrder}
            onPlaceOrder={handlePlaceOrder}
          />

          {/* Depth Ladder & Live Trades Print from Free Public CDN */}
          <div className="h-[380px] flex-1">
            <OrderBook
              contract={currentContract}
              orderBook={orderBook}
              recentTrades={recentTrades}
            />
          </div>
        </div>
      </main>

      {/* Contract Search & Selector Modal */}
      <ContractSelector
        isOpen={isContractSelectorOpen}
        onClose={() => setIsContractSelectorOpen(false)}
        contracts={contracts}
        currentContract={currentContract}
        onSelectContract={(contract) => {
          setCurrentContract(contract);
          setIsContractSelectorOpen(false);
        }}
        onAddCustomContract={handleAddCustomContract}
      />

      {/* Delta Credentials & Static Proxy Gateway Modal */}
      <AccountSettingsModal
        isOpen={isAccountSettingsModalOpen}
        onClose={() => setIsAccountSettingsModalOpen(false)}
        config={accountConfig}
        onSaveConfig={(updatedConfig) => setAccountConfig(updatedConfig)}
        onSyncWallet={syncWallet}
      />

      {/* Algo Automation Script Modal */}
      <AlgoScriptModal
        isOpen={isAlgoScriptModalOpen}
        onClose={() => setIsAlgoScriptModalOpen(false)}
        contract={currentContract}
        accountConfig={accountConfig}
        defaultLots={1}
      />

      {/* 24/7 Hosting on Hugging Face Spaces + UptimeRobot Modal */}
      <Hosting247Modal
        isOpen={isHostingModalOpen}
        onClose={() => setIsHostingModalOpen(false)}
        accountConfig={accountConfig}
      />
    </div>
  );
}
