import React, { useState, useEffect } from 'react';
import { fetchPricing } from '../utils/supabase';
import { useCurrencyStore } from '../stores/useCurrencyStore';

function getContextStatus(utilization) {
  if (utilization > 100) return { level: 'critical', label: 'Exceeds Limit', color: 'text-red-600', bg: 'bg-red-500', border: 'border-red-500/30', icon: 'error' };
  if (utilization > 90) return { level: 'danger', label: 'Near Limit', color: 'text-red-500', bg: 'bg-red-500', border: 'border-red-500/30', icon: 'warning' };
  if (utilization > 75) return { level: 'warning', label: 'Degraded', color: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-500/30', icon: 'warning' };
  if (utilization > 50) return { level: 'caution', label: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-500', border: 'border-yellow-500/30', icon: 'info' };
  return { level: 'safe', label: 'Optimal', color: 'text-green-600', bg: 'bg-green-500', border: 'border-green-500/30', icon: 'check_circle' };
}

function getPerformanceNote(utilization) {
  if (utilization > 100) return 'Request will fail — exceeds maximum context length.';
  if (utilization > 90) return 'High risk of truncation. Consider shorter inputs or a model with a larger context window.';
  if (utilization > 75) return 'Performance degradation likely. Attention quality decreases as context fills up ("lost in the middle" effect).';
  if (utilization > 50) return 'Moderate utilization. Model should perform well but monitor for long-context tasks.';
  return 'Optimal range. Full attention quality across the context window.';
}

export default function CostArchitect({ prompt }) {
  const [models, setModels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [dailyRequests, setDailyRequests] = useState(1000);
  const [avgInputTokens, setAvgInputTokens] = useState(500);
  const [avgOutputTokens, setAvgOutputTokens] = useState(200);
  const [loading, setLoading] = useState(true);
  const { convert, format } = useCurrencyStore();

  const promptTokens = prompt ? Math.ceil(prompt.length / 4) : 0;
  const effectiveInputTokens = promptTokens > 0 ? promptTokens : avgInputTokens;

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
    const inputCost = (effectiveInputTokens / 1_000_000) * model.input * dailyRequests * 30;
    const outputCost = (avgOutputTokens / 1_000_000) * model.output * dailyRequests * 30;
    return { inputCost, outputCost, total: inputCost + outputCost };
  };

  const hasWarnings = selectedModels.some(m => {
    if (!m.contextWindow) return false;
    const utilization = (effectiveInputTokens / m.contextWindow) * 100;
    return utilization > 50;
  });

  return (
    <div className="flex flex-col gap-6">
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
        {promptTokens > 0 && (
          <div className="mt-3 p-2 bg-primary/5 border border-primary/10 rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] text-primary">edit_note</span>
            <span className="text-[10px] text-on-surface-variant">
              Using <span className="font-medium text-primary">{promptTokens.toLocaleString()}</span> tokens from your prompt (estimated) instead of Avg Input Tokens
            </span>
          </div>
        )}
      </div>

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
              const utilization = m.contextWindow ? (effectiveInputTokens / m.contextWindow) * 100 : null;
              const status = utilization !== null ? getContextStatus(utilization) : null;
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
                    {isSelected && status && m.contextWindow && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${status.bg}/10 ${status.color} border ${status.border}`}>
                        {utilization.toFixed(0)}%
                      </span>
                    )}
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

      {selectedModels.length > 0 && (
        <>
          {hasWarnings && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[18px] text-orange-500">monitoring</span>
                <h3 className="font-headline-md text-sm font-bold text-on-surface">Context Window Analysis</h3>
                <span className="text-[10px] text-on-surface-variant ml-auto">Input: {effectiveInputTokens.toLocaleString()} tokens</span>
              </div>
              <div className="space-y-3">
                {selectedModels.map((m) => {
                  if (!m.contextWindow) return null;
                  const utilization = (effectiveInputTokens / m.contextWindow) * 100;
                  const status = getContextStatus(utilization);
                  const remaining = m.contextWindow - effectiveInputTokens;
                  return (
                    <div key={`${m.slug}-${m.providerSlug}`} className={`p-3 rounded-lg border ${status.border} bg-surface`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-[14px] ${status.color}`}>{status.icon}</span>
                          <span className="text-xs font-medium text-on-surface">{m.name}</span>
                          <span className="text-[10px] text-on-surface-variant">via {m.provider}</span>
                        </div>
                        <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
                      </div>
                      <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden mb-2">
                        <div className={`h-full ${status.bg} rounded-full transition-all`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-on-surface-variant">
                        <span>{effectiveInputTokens.toLocaleString()} / {m.contextWindow.toLocaleString()} tokens ({utilization.toFixed(1)}%)</span>
                        <span>{remaining > 0 ? `${remaining.toLocaleString()} remaining` : 'Exceeds limit'}</span>
                      </div>
                      <p className={`text-[10px] mt-1.5 ${status.color}`}>{getPerformanceNote(utilization)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                const utilization = m.contextWindow ? (effectiveInputTokens / m.contextWindow) * 100 : null;
                const status = utilization !== null ? getContextStatus(utilization) : null;
                return (
                  <div key={`${m.slug}-${m.providerSlug}`} className="p-3 bg-surface rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-on-surface">{m.name}</span>
                        <span className="text-[10px] text-on-surface-variant">via {m.provider}</span>
                        {status && m.contextWindow && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${status.bg}/10 ${status.color} border ${status.border}`}>
                            {status.label}
                          </span>
                        )}
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
        </>
      )}
    </div>
  );
}
