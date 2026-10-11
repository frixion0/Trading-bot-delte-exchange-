import React, { useState, useMemo, useRef } from 'react';
import { Candle, CryptoContract } from '../types/trading';
import { BarChart2, TrendingUp, Eye, EyeOff } from 'lucide-react';

interface TradingChartProps {
  contract: CryptoContract;
  candles: Candle[];
  resolution: string;
  onChangeResolution: (res: string) => void;
  isLoadingCandles: boolean;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  contract,
  candles,
  resolution,
  onChangeResolution,
  isLoadingCandles,
}) => {
  const [chartType, setChartType] = useState<'candles' | 'line'>('candles');
  const [showSma9, setShowSma9] = useState<boolean>(true);
  const [showSma21, setShowSma21] = useState<boolean>(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const resolutions = ['1m', '5m', '15m', '1h', '4h', '1D'];

  // Calculate SMA 9 & SMA 21
  const { sma9, sma21 } = useMemo(() => {
    const s9: (number | null)[] = [];
    const s21: (number | null)[] = [];

    for (let i = 0; i < candles.length; i++) {
      if (i >= 8) {
        let sum9 = 0;
        for (let j = 0; j < 9; j++) sum9 += candles[i - j].close;
        s9.push(+(sum9 / 9).toFixed(4));
      } else {
        s9.push(null);
      }

      if (i >= 20) {
        let sum21 = 0;
        for (let j = 0; j < 21; j++) sum21 += candles[i - j].close;
        s21.push(+(sum21 / 21).toFixed(4));
      } else {
        s21.push(null);
      }
    }

    return { sma9: s9, sma21: s21 };
  }, [candles]);

  // Determine min & max prices for scale
  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (!candles || candles.length === 0) {
      return { minPrice: 0, maxPrice: 100, maxVolume: 100 };
    }
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    candles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    const padding = (max - min) * 0.08 || 1;
    return {
      minPrice: Math.max(0, min - padding),
      maxPrice: max + padding,
      maxVolume: maxVol || 1,
    };
  }, [candles]);

  // Coordinate projection math
  const chartHeight = 360;
  const chartWidth = 720;
  const candleWidthRatio = 0.65;

  const getX = (index: number) => {
    if (candles.length <= 1) return chartWidth / 2;
    return (index / (candles.length - 1)) * (chartWidth - 50) + 25;
  };

  const getY = (price: number) => {
    if (maxPrice === minPrice) return chartHeight / 2;
    return chartHeight - 60 - ((price - minPrice) / (maxPrice - minPrice)) * (chartHeight - 90);
  };

  const getVolY = (vol: number) => {
    const maxBarH = 50;
    return chartHeight - 15 - (vol / maxVolume) * maxBarH;
  };

  const candleSpacing = candles.length > 1 ? (chartWidth - 50) / (candles.length - 1) : 10;
  const barWidth = Math.max(2, Math.min(12, candleSpacing * candleWidthRatio));

  // Build path for Area / Line
  const linePoints = useMemo(() => {
    return candles.map((c, i) => `${getX(i)},${getY(c.close)}`).join(' ');
  }, [candles, minPrice, maxPrice]);

  const activeCandle = hoverIndex !== null && candles[hoverIndex]
    ? candles[hoverIndex]
    : candles[candles.length - 1];

  const activeSma9 = hoverIndex !== null ? sma9[hoverIndex] : sma9[sma9.length - 1];
  const activeSma21 = hoverIndex !== null ? sma21[hoverIndex] : sma21[sma21.length - 1];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || candles.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * chartWidth;
    
    // Find closest candle index
    let closestIndex = 0;
    let closestDist = Infinity;
    candles.forEach((_, idx) => {
      const cx = getX(idx);
      const dist = Math.abs(cx - svgX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = idx;
      }
    });
    setHoverIndex(closestIndex);
  };

  return (
    <div className="bg-[#0f1422] border border-[#1d2539] rounded-xl flex flex-col h-full overflow-hidden select-none">
      {/* Chart Top Toolbar */}
      <div className="p-3 border-b border-[#1b2236] flex flex-wrap items-center justify-between gap-3 bg-[#0b0e17]">
        {/* Timeframe Selectors */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 uppercase">
            Interval:
          </span>
          <div className="flex items-center gap-1 bg-[#151c2d] p-0.5 rounded border border-[#222d46]">
            {resolutions.map((res) => (
              <button
                key={res}
                onClick={() => onChangeResolution(res)}
                className={`px-2 py-0.5 text-xs font-mono font-medium rounded transition-colors ${
                  resolution === res
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {res}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode & Indicator Toggles */}
        <div className="flex items-center gap-3 text-xs">
          {/* Chart Style Toggle */}
          <div className="flex items-center gap-1 bg-[#151c2d] p-0.5 rounded border border-[#222d46]">
            <button
              onClick={() => setChartType('candles')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                chartType === 'candles' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Candles
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                chartType === 'line' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Area
            </button>
          </div>

          {/* Indicator Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSma9(!showSma9)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                showSma9 
                  ? 'bg-amber-950/40 text-amber-300 border-amber-800/60' 
                  : 'bg-[#151c2d] text-slate-500 border-transparent'
              }`}
            >
              {showSma9 ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>SMA 9</span>
            </button>

            <button
              onClick={() => setShowSma21(!showSma21)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                showSma21 
                  ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/60' 
                  : 'bg-[#151c2d] text-slate-500 border-transparent'
              }`}
            >
              {showSma21 ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>SMA 21</span>
            </button>
          </div>
        </div>
      </div>

      {/* Crosshair / Active Candle Legend */}
      <div className="px-4 py-2 border-b border-[#171e30] bg-[#0c101a] text-xs font-mono flex flex-wrap items-center gap-4 text-slate-400">
        {activeCandle ? (
          <>
            <span className="text-slate-200">
              {new Date(activeCandle.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-slate-600">|</span>
            <div>
              <span className="text-slate-500 mr-1">O:</span>
              <span className="text-slate-200">${activeCandle.open}</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">H:</span>
              <span className="text-slate-200">${activeCandle.high}</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">L:</span>
              <span className="text-slate-200">${activeCandle.low}</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">C:</span>
              <span className={activeCandle.close >= activeCandle.open ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                ${activeCandle.close}
              </span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">Vol:</span>
              <span className="text-slate-300">{activeCandle.volume}</span>
            </div>

            {showSma9 && activeSma9 && (
              <span className="text-amber-400">
                SMA(9): ${activeSma9}
              </span>
            )}
            {showSma21 && activeSma21 && (
              <span className="text-cyan-400">
                SMA(21): ${activeSma21}
              </span>
            )}
          </>
        ) : (
          <span>Loading candlestick feed...</span>
        )}
      </div>

      {/* SVG Canvas Area */}
      <div 
        ref={containerRef} 
        className="flex-1 relative bg-[#090c13] min-h-[300px] flex items-center justify-center overflow-hidden"
      >
        {isLoadingCandles ? (
          <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Streaming {contract.symbol} historical candles...</span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-full cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverIndex(null)}
            preserveAspectRatio="none"
          >
            {/* Horizontal Grid lines */}
            {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
              const y = chartHeight * ratio;
              const priceVal = maxPrice - ratio * (maxPrice - minPrice);
              return (
                <g key={ratio}>
                  <line
                    x1="0"
                    y1={y}
                    x2={chartWidth}
                    y2={y}
                    stroke="#161e30"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={chartWidth - 5}
                    y={y - 4}
                    fill="#475569"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    ${priceVal.toFixed(contract.markPrice < 1 ? 4 : 2)}
                  </text>
                </g>
              );
            })}

            {/* Volume Separator */}
            <line
              x1="0"
              y1={chartHeight - 65}
              x2={chartWidth}
              y2={chartHeight - 65}
              stroke="#182236"
              strokeWidth="1"
            />

            {/* Volume Bars */}
            {candles.map((c, i) => {
              const x = getX(i);
              const y = getVolY(c.volume);
              const isGreen = c.close >= c.open;
              return (
                <rect
                  key={`vol-${i}`}
                  x={x - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={chartHeight - 15 - y}
                  fill={isGreen ? '#059669' : '#e11d48'}
                  opacity={0.35}
                />
              );
            })}

            {/* Line / Area Mode */}
            {chartType === 'line' && (
              <>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <polygon
                  points={`${getX(0)},${chartHeight - 65} ${linePoints} ${getX(candles.length - 1)},${chartHeight - 65}`}
                  fill="url(#areaGradient)"
                />
                <polyline
                  points={linePoints}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />
              </>
            )}

            {/* Candlestick Bars */}
            {chartType === 'candles' &&
              candles.map((c, i) => {
                const x = getX(i);
                const isGreen = c.close >= c.open;
                const top = getY(Math.max(c.open, c.close));
                const bottom = getY(Math.min(c.open, c.close));
                const height = Math.max(1, bottom - top);
                const highY = getY(c.high);
                const lowY = getY(c.low);
                const color = isGreen ? '#10b981' : '#f43f5e';

                return (
                  <g key={`candle-${i}`}>
                    {/* Wick */}
                    <line
                      x1={x}
                      y1={highY}
                      x2={x}
                      y2={lowY}
                      stroke={color}
                      strokeWidth="1.2"
                    />
                    {/* Body */}
                    <rect
                      x={x - barWidth / 2}
                      y={top}
                      width={barWidth}
                      height={height}
                      fill={color}
                      rx={0.5}
                    />
                  </g>
                );
              })}

            {/* SMA 9 Line (Amber) */}
            {showSma9 && (
              <polyline
                points={candles
                  .map((_, i) => (sma9[i] !== null ? `${getX(i)},${getY(sma9[i]!)}` : null))
                  .filter(Boolean)
                  .join(' ')}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeOpacity="0.9"
              />
            )}

            {/* SMA 21 Line (Cyan) */}
            {showSma21 && (
              <polyline
                points={candles
                  .map((_, i) => (sma21[i] !== null ? `${getX(i)},${getY(sma21[i]!)}` : null))
                  .filter(Boolean)
                  .join(' ')}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeOpacity="0.9"
              />
            )}

            {/* Current Price Dashed Line */}
            {candles.length > 0 && (
              <g>
                <line
                  x1="0"
                  y1={getY(contract.markPrice)}
                  x2={chartWidth}
                  y2={getY(contract.markPrice)}
                  stroke="#3b82f6"
                  strokeDasharray="4 2"
                  strokeWidth="1.2"
                />
                <rect
                  x={chartWidth - 62}
                  y={getY(contract.markPrice) - 8}
                  width="60"
                  height="16"
                  fill="#1d4ed8"
                  rx="2"
                />
                <text
                  x={chartWidth - 32}
                  y={getY(contract.markPrice) + 4}
                  fill="#ffffff"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  ${contract.markPrice.toFixed(contract.markPrice < 1 ? 4 : 2)}
                </text>
              </g>
            )}

            {/* Hover Crosshair */}
            {hoverIndex !== null && candles[hoverIndex] && (
              <g>
                <line
                  x1={getX(hoverIndex)}
                  y1="0"
                  x2={getX(hoverIndex)}
                  y2={chartHeight - 15}
                  stroke="#64748b"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1={getY(candles[hoverIndex].close)}
                  x2={chartWidth}
                  y2={getY(candles[hoverIndex].close)}
                  stroke="#64748b"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
              </g>
            )}
          </svg>
        )}
      </div>
    </div>
  );
};
