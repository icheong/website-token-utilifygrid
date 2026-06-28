import React, { useState, useEffect } from 'react';
import { fetchPricing } from '../utils/supabase';
import { useCurrencyStore } from '../stores/useCurrencyStore';

export default function CostArchitect() {
  const [models, setModels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [dailyRequests, setDailyRequests] = useState(1000);
  const [avgInputTokens, setAvgInputTokens] = useState(500);
  const [avgOutputTokens, setAvgOutputTokens] = useState(200);
  const [loading, setLoading] = useState(true);
  const { convert, format } = useCurrencyStore();

  useEffect(() => {
    fetchPricing()
      .then(data => {
        const modelMap = {};
        data.filter(p => p.models && p.providers).forEach(p => {
          const key = `${p.models.slug}|${p.providers.slug}`;
          if (!modelMap[key]) {
            modelMap[key] = {
              id: p.models.id,
              slug: p.models.slug,
              name: p.models.name,
              provider: p.providers.name,
              providerSlug: p.providers.slug,
              input: p.input_price_per_m,
              output: p.output_price_per_m,
              contextWindow: p.models.context_window,
              tps: p.latency_tps || 0,
            };
          }
        });
        setModels(Object.values(modelMap).sort((a, b) => a.input - b.input));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleModel = (model) => {
    setSelectedModels(prev => {
      const exists = prev.find(m => `${m.slug}|${m.providerSlug}` === `${model.slug}|${model.providerSlug}`);
      if (exists) return prev.filter(m => `${m.slug}|${m.providerSlug}` !== `${model.slug}|${m.providerSlug}`);
      if (prev.length >= 4) return prev;
      return [...prev, model];
    });
  };

  const estimateCost = (model) => {
    const inputCost = (avgInputTokens / 1_000_000) * model.input * dailyRequests * 30;
    const outputCost = (avgOutputTokens / 1_000_000) * model.output * dailyRequests * 30;
    return { inputCost, outputCost, total: inputCost + outputCost };
  };

  const tokenEstimate = prompt ? Math.ceil(prompt.length / 4) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Prompt Input */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[18px] text-primary">edit_note</span>
          <h3 className="font-headline-md text-sm font-bold text-on-surface">Test Prompt</h3>
          {tokenEstimate > 0 && (
            <span className="ml-auto text-[10px] font-label-mono px-2 py-0.5 bg-primary/10 text-primary rounded-full">
              ~{tokenEstimate} tokens
            </span>
          )}
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a test prompt to estimate costs..."
          className="w-full h-28 bg-surface border border-outline-variant rounded-lg p-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 resize-none focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Usage Parameters */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-[18px] text-primary">tune</span>
          <h3 className="font-headline-md text-sm font-bold text-on-surface">Usage Profile</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider block mb-1.5">Daily Requests</label>
            <input
              type="number"
              value={dailyRequests}
              onChange={(e) => setDailyRequests(parseInt(e.target.value) || 0)}
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider block mb-1.5">Avg Input Tokens</label>
            <input
              type="number"
              value={avgInputTokens}
              onChange={(e) => setAvgInputTokens(parseInt(e.target.value) || 0)}
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider block mb-1.5">Avg Output Tokens</label>
            <input
              type="number"
              value={avgOutputTokens}
              onChange={(e) => setAvgOutputTokens(parseInt(e.target.value) || 0)}
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Model Selection */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[18px] text-primary">model_training</span>
          <h3 className="font-headline-md text-sm font-bold text-on-surface">Select Models to Compare</h3>
          <span className="ml-auto text-[10px] text-on-surface-variant">{selectedModels.length}/4 selected</span>
        </div>
        {loading ? (
          <div className="text-sm text-on-surface-variant animate-pulse">Loading models...</div>
        ) : (
          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
            {models.slice(0, 50).map((m, i) => {
              const isSelected = selectedModels.some(sm => sm.slug === m.slug && sm.providerSlug === m.providerSlug);
              return (
                <button
                  key={`${m.slug}-${m.providerSlug}-${i}`}
                  onClick={() => toggleModel(m)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all text-xs ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/20 text-primary'
                      : 'hover:bg-surface-container border border-transparent text-on-surface-variant'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-primary border-primary' : 'border-outline-variant'
                    }`}>
                      {isSelected && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                    </div>
                    <span className="truncate font-medium">{m.name}</span>
                    <span className="text-[10px] text-on-surface-variant shrink-0">via {m.provider}</span>
                  </div>
                  <span className="font-label-mono text-[10px] shrink-0 ml-2">
                    ${m.input.toFixed(2)}/in · ${m.output.toFixed(2)}/out
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cost Estimates */}
      {selectedModels.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[18px] text-primary">payments</span>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">Monthly Cost Estimate</h3>
          </div>
          <div className="space-y-3">
            {selectedModels.map((m, i) => {
              const cost = estimateCost(m);
              const maxCost = Math.max(...selectedModels.map(sm => estimateCost(sm).total));
              const barWidth = maxCost > 0 ? (cost.total / maxCost) * 100 : 0;
              return (
                <div key={`${m.slug}-${m.providerSlug}`} className="p-3 bg-surface rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-on-surface">{m.name}</span>
                      <span className="text-[10px] text-on-surface-variant ml-2">via {m.provider}</span>
                    </div>
                    <span className="font-headline-md text-sm font-bold text-primary">{format(convert(cost.total))}/mo</span>
                  </div>
                  <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${barWidth}%` }}></div>
                  </div>
                  <div className="flex justify-between mt-1.5 text-[10px] text-on-surface-variant font-label-mono">
                    <span>Input: {format(convert(cost.inputCost))}</span>
                    <span>Output: {format(convert(cost.outputCost))}</span>
                    <span>{m.tps > 0 ? `${m.tps} TPS` : 'N/A'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
