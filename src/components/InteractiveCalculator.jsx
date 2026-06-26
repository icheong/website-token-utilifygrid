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

export default function InteractiveCalculator({ model, providerA, providerB, pricingA, pricingB }) {
  const { convert, format } = useCurrencyStore();
  
  // 1. Initial State Definitions (matching Stitch compare.html slider ranges)
  const [inputVal, setInputVal] = useState(1024);
  const [outputVal, setOutputVal] = useState(512);
  const [volumeVal, setVolumeVal] = useState(1500000);

  const [costs, setCosts] = useState({
    singleA: 0, monthlyA: 0,
    singleB: 0, monthlyB: 0,
    difference: 0,
    winner: 'A'
  });

  // 2. Perform Cost Arithmetic
  useEffect(() => {
    const rateA = {
      input: (pricingA?.input_price_per_m || 0) / 1000000,
      output: (pricingA?.output_price_per_m || 0) / 1000000
    };

    const rateB = {
      input: (pricingB?.input_price_per_m || 0) / 1000000,
      output: (pricingB?.output_price_per_m || 0) / 1000000
    };

    // Run core calculations
    const singleA = (inputVal * rateA.input) + (outputVal * rateA.output);
    const monthlyA = singleA * volumeVal;

    const singleB = (inputVal * rateB.input) + (outputVal * rateB.output);
    const monthlyB = singleB * volumeVal;

    const difference = Math.abs(monthlyA - monthlyB);
    const winner = monthlyA < monthlyB ? 'A' : 'B';

    setCosts({ singleA, monthlyA, singleB, monthlyB, difference, winner });
  }, [inputVal, outputVal, volumeVal]);

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
          {/* Provider A (Winner) */}
          <div className={`rounded-xl p-6 border relative overflow-hidden group ${
            costs.winner === 'A' 
              ? 'border-emerald-200 bg-emerald-50/10' 
              : 'border-outline-variant bg-white'
          }`}>
            {costs.winner === 'A' && (
              <div className="absolute top-0 right-0 p-3">
                <span className="bg-success text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest shadow-sm">
                  Cheapest
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
                <p className="text-xs text-on-surface-variant mb-1 font-medium">Cost per Request</p>
                <p className="font-metric-display text-metric-display text-primary">
                  {format(convert(costs.singleA))}
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${
                costs.winner === 'A' 
                  ? 'bg-white/60 border-emerald-100/50' 
                  : 'bg-surface-container-low border-outline-variant/30'
              }`}>
                <p className="text-xs text-on-surface-variant mb-1 font-medium">Projected Monthly Spend</p>
                <p className="font-metric-display text-headline-md text-on-surface">
                  {format(convert(costs.monthlyA))}
                </p>
                <div className={`mt-2 h-1 w-full rounded-full overflow-hidden ${
                  costs.winner === 'A' ? 'bg-emerald-100' : 'bg-surface-container-high'
                }`}>
                  <div className={`h-full ${costs.winner === 'A' ? 'bg-success' : 'bg-on-surface-variant'}`} 
                       style={{width: costs.winner === 'A' ? '60%' : '100%'}}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Provider B */}
          <div className={`rounded-xl p-6 border relative overflow-hidden group ${
            costs.winner === 'B' 
              ? 'border-emerald-200 bg-emerald-50/10' 
              : 'border-outline-variant bg-white'
          }`}>
            {costs.winner === 'B' && (
              <div className="absolute top-0 right-0 p-3">
                <span className="bg-success text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest shadow-sm">
                  Cheapest
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
                <p className="text-xs text-on-surface-variant mb-1 font-medium">Cost per Request</p>
                <p className="font-metric-display text-metric-display text-on-surface-variant">
                  {format(convert(costs.singleB))}
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${
                costs.winner === 'B' 
                  ? 'bg-white/60 border-emerald-100/50' 
                  : 'bg-surface-container-low border-outline-variant/30'
              }`}>
                <p className="text-xs text-on-surface-variant mb-1 font-medium">Projected Monthly Spend</p>
                <p className="font-metric-display text-headline-md text-on-surface">
                  {format(convert(costs.monthlyB))}
                </p>
                <div className={`mt-2 h-1 w-full rounded-full overflow-hidden ${
                  costs.winner === 'B' ? 'bg-emerald-100' : 'bg-surface-container-high'
                }`}>
                  <div className={`h-full ${costs.winner === 'B' ? 'bg-success' : 'bg-on-surface-variant'}`}
                       style={{width: costs.winner === 'B' ? '60%' : '100%'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Banner - Matching Stitch design */}
        <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success">
              <span className="material-symbols-outlined text-[20px]">savings</span>
            </div>
            <div>
              <p className="font-bold text-emerald-700 leading-none">Estimated Monthly Savings</p>
              <p className="text-sm text-emerald-600/80 mt-1">
                Calculated against standard hyperscaler pricing (AWS Bedrock, Vertex AI)
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-metric-display text-2xl text-success">
              {format(convert(costs.difference))}
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
              href={ensureHttps(costs.winner === 'A' ? providerA?.affiliate_url : providerB?.affiliate_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary hover:bg-primary-container text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-primary/20"
            >
              {costs.winner === 'A' ? providerA?.name : providerB?.name} Pricing
              <span className="material-symbols-outlined">open_in_new</span>
            </a>
          </div>
        </div>

      </section>

    </div>
  );
}