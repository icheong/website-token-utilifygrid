// src/components/InteractiveCalculator.jsx
import React, { useState, useEffect } from 'react';
import { useCurrencyStore } from '../stores/useCurrencyStore';

function ensureHttps(url) {
  if (!url) return '#';
  // Extract URL from markdown format [text](url)
  const markdownMatch = url.match(/\[.*?\]\((.*?)\)/);
  if (markdownMatch) url = markdownMatch[1];
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

function formatTimeAgo(dateString) {
  if (!dateString) return 'unknown';
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTimeUTC(dateString) {
  if (!dateString) return '--:-- AM UTC';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true, 
    timeZone: 'UTC' 
  }) + ' UTC';
}

export default function InteractiveCalculator({ model, providerA, providerB, pricingA, pricingB, unit: unitProp }) {
  const { convert, format } = useCurrencyStore();
  const unit = unitProp || 'monthly';
  
  // 1. Initial State Definitions (matching Stitch compare.html slider ranges)
  const [inputVal, setInputVal] = useState(1024);
  const [outputVal, setOutputVal] = useState(512);
  const [volumeVal, setVolumeVal] = useState(1500000);

  const [costs, setCosts] = useState({
    singleA: 0, monthlyA: 0,
    singleB: 0, monthlyB: 0,
    difference: 0,
    winner: 'A',
    costsEqual: false,
    batchA: null, batchB: null,
  });

  // 2. Perform Cost Arithmetic
  useEffect(() => {
    const rateA = {
      input: (pricingA?.input_price_per_m || pricingA?.input_cost_per_1m || 0) / 1000000,
      output: (pricingA?.output_price_per_m || pricingA?.output_cost_per_1m || 0) / 1000000
    };

    const rateB = {
      input: (pricingB?.input_price_per_m || pricingB?.input_cost_per_1m || 0) / 1000000,
      output: (pricingB?.output_price_per_m || pricingB?.output_cost_per_1m || 0) / 1000000
    };

    // Cache-adjusted rates (assume 50% cache hit rate for estimation)
    const CACHE_HIT_RATE = 0.5;
    const cacheA = {
      input: pricingA?.cache_hit_discount_rate != null
        ? rateA.input * (1 - pricingA.cache_hit_discount_rate) * CACHE_HIT_RATE + rateA.input * (1 - CACHE_HIT_RATE)
        : rateA.input,
      writeCost: pricingA?.cache_write_cost_per_1m ? (pricingA.cache_write_cost_per_1m / 1000000) * CACHE_HIT_RATE : 0,
    };
    const cacheB = {
      input: pricingB?.cache_hit_discount_rate != null
        ? rateB.input * (1 - pricingB.cache_hit_discount_rate) * CACHE_HIT_RATE + rateB.input * (1 - CACHE_HIT_RATE)
        : rateB.input,
      writeCost: pricingB?.cache_write_cost_per_1m ? (pricingB.cache_write_cost_per_1m / 1000000) * CACHE_HIT_RATE : 0,
    };

    // Run core calculations (with cache adjustment)
    const singleA = ((inputVal * cacheA.input) + (outputVal * rateA.output)) + (inputVal * cacheA.writeCost);
    const monthlyA = singleA * volumeVal;

    const singleB = ((inputVal * cacheB.input) + (outputVal * rateB.output)) + (inputVal * cacheB.writeCost);
    const monthlyB = singleB * volumeVal;

    // Batch-adjusted monthly (if batch discount available)
    const batchA = pricingA?.batch_discount_rate ? monthlyA * (1 - pricingA.batch_discount_rate) : null;
    const batchB = pricingB?.batch_discount_rate ? monthlyB * (1 - pricingB.batch_discount_rate) : null;

    const difference = Math.abs(monthlyA - monthlyB);
    const maxCost = Math.max(monthlyA, monthlyB);
    const COST_EQUALITY_THRESHOLD = 0.01;
    const costsEqual = maxCost === 0 || (difference / maxCost) <= COST_EQUALITY_THRESHOLD;
    const winner = costsEqual ? 'tie' : (monthlyA < monthlyB ? 'A' : 'B');

    setCosts({ singleA, monthlyA, singleB, monthlyB, difference, winner, costsEqual, batchA, batchB });
  }, [inputVal, outputVal, volumeVal, pricingA, pricingB]);

  // 3. Format cost based on selected unit
  const formatCost = (single, monthly) => {
    const totalTokensPerReq = inputVal + outputVal;
    switch (unit) {
      case 'perRequest':
        return format(convert(single));
      case 'blended': {
        const blendedRatePer1M = (single / totalTokensPerReq) * 1000000;
        return format(convert(blendedRatePer1M));
      }
      case 'per1mRuns': {
        const costPer1M = single * 1000000;
        return format(convert(costPer1M));
      }
      case 'monthly':
      default:
        return format(convert(monthly));
    }
  };

  const getUnitLabel = () => {
    switch (unit) {
      case 'perRequest': return 'Per Request';
      case 'blended': return 'Per 1M Tokens';
      case 'per1mRuns': return 'Per 1M Runs';
      case 'monthly':
      default: return 'Monthly Spend';
    }
  };

  const getCostValue = (single, monthly) => {
    const totalTokensPerReq = inputVal + outputVal;
    switch (unit) {
      case 'perRequest':
        return single;
      case 'blended':
        return (single / totalTokensPerReq) * 1000000;
      case 'per1mRuns':
        return single * 1000000;
      case 'monthly':
      default:
        return monthly;
    }
  };

  const costA = getCostValue(costs.singleA, costs.monthlyA);
  const costB = getCostValue(costs.singleB, costs.monthlyB);
  const difference = Math.abs(costA - costB);
  const winner = costA < costB ? 'A' : 'B';

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row gap-4">
      
      {/* LEFT COLUMN: Control Panel (30%) - Matching providers page style */}
      <aside className="w-full md:w-72 shrink-0">
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex flex-col gap-5 max-h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar sticky top-24">
          <div className="flex flex-col gap-1 mb-1">
            <h2 className="font-headline-md text-[18px] text-primary">Usage Parameters</h2>
            <p className="font-label-mono text-label-mono text-on-surface-variant opacity-70 uppercase tracking-wider text-[10px]">Adjust calculation</p>
          </div>
          <div className="space-y-6">
            {/* Slider 1: Input Tokens */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-on-surface-variant">Input Tokens/Req</label>
                <span className="font-label-mono text-label-mono text-xs text-primary px-2 py-1 bg-primary-container-light rounded">
                  {inputVal.toLocaleString()} t
                </span>
              </div>
              <input 
                className="w-full h-1 bg-surface-container-high rounded-full appearance-none cursor-pointer slider-thumb" 
                max="8192" min="128" step="128" 
                type="range" value={inputVal}
                onChange={(e) => setInputVal(parseInt(e.target.value))} 
              />
            </div>
            
            {/* Slider 2: Output Tokens */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-on-surface-variant">Output Tokens/Req</label>
                <span className="font-label-mono text-label-mono text-xs text-primary px-2 py-1 bg-primary-container-light rounded">
                  {outputVal.toLocaleString()} t
                </span>
              </div>
              <input 
                className="w-full h-1 bg-surface-container-high rounded-full appearance-none cursor-pointer slider-thumb" 
                max="4096" min="64" step="64" 
                type="range" value={outputVal}
                onChange={(e) => setOutputVal(parseInt(e.target.value))} 
              />
            </div>
            
            {/* Slider 3: Monthly Volume */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-on-surface-variant">Monthly API Volume</label>
                <span className="font-label-mono text-label-mono text-xs text-primary px-2 py-1 bg-primary-container-light rounded">
                  {(volumeVal / 1000000).toFixed(1)}M req
                </span>
              </div>
              <input 
                className="w-full h-1 bg-surface-container-high rounded-full appearance-none cursor-pointer slider-thumb" 
                max="10000000" min="100000" step="100000" 
                type="range" value={volumeVal}
                onChange={(e) => setVolumeVal(parseInt(e.target.value))} 
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-outline-variant">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="text-xs">Compute Region</span>
              <span className="text-xs font-bold">Global (Any)</span>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT COLUMN: Comparison Cards (70%) - Matching providers page style */}
      <section className="flex-1 min-w-0 space-y-4">
        <div className="mb-4">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">{providerA?.name} vs {providerB?.name} Comparison</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-1 bg-surface-container-highest rounded text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Active Model
            </span>
            <span className="font-label-mono text-label-mono font-bold text-primary">
              {model?.name || 'Llama 3.3 70B'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Provider A */}
          <div className={`rounded-xl p-6 border relative overflow-hidden group ${
            winner === 'A' 
              ? 'border-emerald-400 bg-emerald-100/50 shadow-md shadow-emerald-200' 
              : winner === 'tie'
                ? 'border-sky-300 bg-sky-50/50'
                : 'border-outline-variant bg-white'
          }`}>
            {winner === 'A' && (
              <div className="absolute top-0 right-0 p-3">
                <span className="bg-success text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">check</span>
                  Cheapest
                </span>
              </div>
            )}
            {winner === 'tie' && (
              <div className="absolute top-0 right-0 p-3">
                <span className="bg-sky-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">drag_handle</span>
                  Same Price
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center font-bold text-on-surface-variant">
                {providerA?.name?.substring(0, 2).toUpperCase() || 'PA'}
              </div>
              <div>
                <h4 className="font-headline-md text-lg leading-tight">{providerA?.name || 'Provider A'}</h4>
                <p className="text-xs text-on-surface-variant font-label-mono">{model?.slug || 'model-slug'}</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-xs text-on-surface-variant mb-1 font-medium">{getUnitLabel()}</p>
                <p className="font-metric-display text-metric-display text-primary">
                  {formatCost(costs.singleA, costs.monthlyA)}
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${
                winner === 'A' 
                  ? 'bg-white/90 border-emerald-300' 
                  : 'bg-surface-container-low border-outline-variant/30'
              }`}>
                <p className="text-xs text-on-surface-variant mb-1 font-medium">Projected Monthly Spend</p>
                <p className="font-metric-display text-headline-md text-on-surface">
                  {format(convert(costs.monthlyA))}
                </p>
                {costs.batchA != null && (
                  <p className="text-xs text-success mt-1 font-medium">With batch: {format(convert(costs.batchA))}</p>
                )}
                <div className={`mt-2 h-1.5 w-full rounded-full overflow-hidden ${
                  winner === 'A' ? 'bg-emerald-300' : winner === 'tie' ? 'bg-sky-200' : 'bg-surface-container-high'
                }`}>
                  <div className={`h-full ${winner === 'A' ? 'bg-emerald-600' : winner === 'tie' ? 'bg-sky-500' : 'bg-on-surface-variant'}`} 
                       style={{width: winner === 'A' ? '60%' : winner === 'tie' ? '80%' : '100%'}}></div>
                </div>
              </div>
              {/* Provider-specific details */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-2 border-t border-outline-variant/20">
                {pricingA?.avg_ttft_ms != null && (
                  <div><span className="text-on-surface-variant">TTFT:</span> <span className="font-mono text-on-surface">{pricingA.avg_ttft_ms}ms</span></div>
                )}
                {(pricingA?.avg_throughput_tps || pricingA?.latency_tps) && (
                  <div><span className="text-on-surface-variant">Throughput:</span> <span className="font-mono text-on-surface">{pricingA?.avg_throughput_tps || pricingA?.latency_tps} TPS</span></div>
                )}
                {pricingA?.cache_hit_discount_rate != null && (
                  <div><span className="text-on-surface-variant">Cache hit:</span> <span className="font-mono text-on-surface">{(pricingA.cache_hit_discount_rate * 100).toFixed(0)}% off</span></div>
                )}
                {pricingA?.prompt_caching_type && (
                  <div><span className="text-on-surface-variant">Caching:</span> <span className="font-mono text-on-surface">{pricingA.prompt_caching_type}</span></div>
                )}
                {pricingA?.default_rpm_limit && (
                  <div><span className="text-on-surface-variant">RPM:</span> <span className="font-mono text-on-surface">{pricingA.default_rpm_limit.toLocaleString()}</span></div>
                )}
                {pricingA?.quantization_level && (
                  <div><span className="text-on-surface-variant">Quant:</span> <span className="font-mono text-on-surface uppercase">{pricingA.quantization_level}</span></div>
                )}
              </div>
            </div>
          </div>

          {/* Provider B */}
          <div className={`rounded-xl p-6 border relative overflow-hidden group ${
            winner === 'B' 
              ? 'border-emerald-400 bg-emerald-100/50 shadow-md shadow-emerald-200' 
              : winner === 'tie'
                ? 'border-sky-300 bg-sky-50/50'
                : 'border-outline-variant bg-white'
          }`}>
            {winner === 'B' && (
              <div className="absolute top-0 right-0 p-3">
                <span className="bg-success text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">check</span>
                  Cheapest
                </span>
              </div>
            )}
            {winner === 'tie' && (
              <div className="absolute top-0 right-0 p-3">
                <span className="bg-sky-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">drag_handle</span>
                  Same Price
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center font-bold text-on-surface-variant">
                {providerB?.name?.substring(0, 2).toUpperCase() || 'PB'}
              </div>
              <div>
                <h4 className="font-headline-md text-lg leading-tight">{providerB?.name || 'Provider B'}</h4>
                <p className="text-xs text-on-surface-variant font-label-mono">{model?.slug || 'model-slug'}</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-xs text-on-surface-variant mb-1 font-medium">{getUnitLabel()}</p>
                <p className="font-metric-display text-metric-display text-on-surface-variant">
                  {formatCost(costs.singleB, costs.monthlyB)}
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${
                winner === 'B' 
                  ? 'bg-white/90 border-emerald-300' 
                  : 'bg-surface-container-low border-outline-variant/30'
              }`}>
                <p className="text-xs text-on-surface-variant mb-1 font-medium">Projected Monthly Spend</p>
                <p className="font-metric-display text-headline-md text-on-surface">
                  {format(convert(costs.monthlyB))}
                </p>
                {costs.batchB != null && (
                  <p className="text-xs text-success mt-1 font-medium">With batch: {format(convert(costs.batchB))}</p>
                )}
                <div className={`mt-2 h-1.5 w-full rounded-full overflow-hidden ${
                  winner === 'B' ? 'bg-emerald-300' : winner === 'tie' ? 'bg-sky-200' : 'bg-surface-container-high'
                }`}>
                  <div className={`h-full ${winner === 'B' ? 'bg-emerald-600' : winner === 'tie' ? 'bg-sky-500' : 'bg-on-surface-variant'}`}
                       style={{width: winner === 'B' ? '60%' : winner === 'tie' ? '80%' : '100%'}}></div>
                </div>
              </div>
              {/* Provider-specific details */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-2 border-t border-outline-variant/20">
                {pricingB?.avg_ttft_ms != null && (
                  <div><span className="text-on-surface-variant">TTFT:</span> <span className="font-mono text-on-surface">{pricingB.avg_ttft_ms}ms</span></div>
                )}
                {(pricingB?.avg_throughput_tps || pricingB?.latency_tps) && (
                  <div><span className="text-on-surface-variant">Throughput:</span> <span className="font-mono text-on-surface">{pricingB?.avg_throughput_tps || pricingB?.latency_tps} TPS</span></div>
                )}
                {pricingB?.cache_hit_discount_rate != null && (
                  <div><span className="text-on-surface-variant">Cache hit:</span> <span className="font-mono text-on-surface">{(pricingB.cache_hit_discount_rate * 100).toFixed(0)}% off</span></div>
                )}
                {pricingB?.prompt_caching_type && (
                  <div><span className="text-on-surface-variant">Caching:</span> <span className="font-mono text-on-surface">{pricingB.prompt_caching_type}</span></div>
                )}
                {pricingB?.default_rpm_limit && (
                  <div><span className="text-on-surface-variant">RPM:</span> <span className="font-mono text-on-surface">{pricingB.default_rpm_limit.toLocaleString()}</span></div>
                )}
                {pricingB?.quantization_level && (
                  <div><span className="text-on-surface-variant">Quant:</span> <span className="font-mono text-on-surface uppercase">{pricingB.quantization_level}</span></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Savings Banner - Matching Stitch design */}
        <div className={`p-5 border rounded-xl flex items-center justify-between ${
          costs.costsEqual ? 'bg-sky-50/50 border-sky-100' : 'bg-emerald-50/50 border-emerald-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              costs.costsEqual ? 'bg-sky-100 text-sky-600' : 'bg-success/10 text-success'
            }`}>
              <span className="material-symbols-outlined text-[20px]">{costs.costsEqual ? 'balance' : 'savings'}</span>
            </div>
            <div>
              <p className={`font-bold leading-none ${costs.costsEqual ? 'text-sky-700' : 'text-emerald-700'}`}>
                {costs.costsEqual ? 'Same Price' : `Estimated Savings (${getUnitLabel()})`}
              </p>
              <p className={`text-sm mt-1 ${costs.costsEqual ? 'text-sky-600/80' : 'text-emerald-600/80'}`}>
                {costs.costsEqual
                  ? 'Both providers offer identical pricing for this model'
                  : 'Calculated against standard hyperscaler pricing (AWS Bedrock, Vertex AI)'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-metric-display text-2xl ${costs.costsEqual ? 'text-sky-600' : 'text-success'}`}>
              {costs.costsEqual ? '--' : format(convert(difference))}
            </p>
          </div>
        </div>

        {/* Source Info & Quick Action - Matching Stitch design */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 items-center gap-4 border-b border-outline-variant pb-8">
          <div>
            <p className="text-xs text-on-surface-variant italic mb-2">
              Sources: Provider API docs, last updated {formatTimeAgo(pricingA?.verified_at || pricingB?.verified_at)}. All prices normalized to 1k tokens.
            </p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant">
                <span className="material-symbols-outlined text-xs">verified</span>
                PRICE VERIFIED
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant">
                <span className="material-symbols-outlined text-xs">history</span>
                UPDATED {formatTimeUTC(pricingA?.verified_at || pricingB?.verified_at)}
              </span>
            </div>
          </div>
          <div className="flex justify-end">
            <a 
              href={ensureHttps(winner === 'A' ? providerA?.affiliate_url : winner === 'B' ? providerB?.affiliate_url : providerA?.affiliate_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary hover:bg-primary-container text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-primary/20"
            >
              {winner === 'A' ? providerA?.name : winner === 'B' ? providerB?.name : `${providerA?.name} Pricing`}
              <span className="material-symbols-outlined">open_in_new</span>
            </a>
          </div>
        </div>

      </section>

    </div>
  );
}