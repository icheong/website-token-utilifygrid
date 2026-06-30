import React, { useState, useEffect } from 'react';
import { fetchPricing } from '../utils/supabase';

export default function ModelBenchmark() {
  const [models, setModels] = useState([]);
  const [selected, setSelected] = useState([]);
  const [sortKey, setSortKey] = useState('input');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPricing()
      .then(data => {
        const seen = {};
        data.filter(p => p.models && p.providers).forEach(p => {
          const key = `${p.models.slug}|${p.providers.slug}`;
          if (!seen[key]) {
            seen[key] = {
              name: p.models.name,
              provider: p.providers.name,
              input: p.input_price_per_m,
              output: p.output_price_per_m,
              contextWindow: p.models.context_window || 0,
              tps: p.latency_tps || 0,
            };
          }
        });
        setModels(Object.values(seen).sort((a, b) => a.input - b.input));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggle = (m) => {
    setSelected(prev => {
      const exists = prev.find(s => s.name === m.name && s.provider === m.provider);
      if (exists) return prev.filter(s => !(s.name === m.name && s.provider === m.provider));
      if (prev.length >= 6) return prev;
      return [...prev, m];
    });
  };

  const sorted = [...models].sort((a, b) => {
    if (sortKey === 'input') return a.input - b.input;
    if (sortKey === 'output') return a.output - b.output;
    if (sortKey === 'tps') return (b.tps || 0) - (a.tps || 0);
    if (sortKey === 'context') return (b.contextWindow || 0) - (a.contextWindow || 0);
    return 0;
  });

  const filteredModels = sorted.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[18px] text-primary">speed</span>
          <h3 className="font-headline-md text-sm font-bold text-on-surface">Model Benchmark</h3>
          <span className="ml-auto text-[10px] text-on-surface-variant">{selected.length}/6 selected</span>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {['input', 'output', 'tps', 'context'].map(key => (
            <button key={key} onClick={() => setSortKey(key)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${
                sortKey === key ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}>
              {key === 'input' ? 'Input Price' : key === 'output' ? 'Output Price' : key === 'tps' ? 'Speed (TPS)' : 'Context Window'}
            </button>
          ))}
        </div>

        <div className="mb-3 relative">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">search</span>
          <input
            type="text"
            placeholder="Search models or providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-outline-variant rounded-lg pl-8 pr-3 py-1.5 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
          />
        </div>

        {loading ? (
          <div className="text-sm text-on-surface-variant animate-pulse">Loading models...</div>
        ) : (
          <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
            {filteredModels.slice(0, 40).map((m, i) => {
              const isSelected = selected.some(s => s.name === m.name && s.provider === m.provider);
              return (
                <button key={`${m.name}-${m.provider}-${i}`} onClick={() => toggle(m)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all text-xs ${
                    isSelected ? 'bg-primary/10 border border-primary/20 text-primary' : 'hover:bg-surface-container border border-transparent text-on-surface-variant'
                  }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-outline-variant'}`}>
                      {isSelected && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                    </div>
                    <span className="truncate font-medium">{m.name}</span>
                    <span className="text-[10px] text-on-surface-variant shrink-0">via {m.provider}</span>
                  </div>
                  <span className="font-label-mono text-[10px] shrink-0 ml-2">
                    ${m.input.toFixed(2)} in · ${m.output.toFixed(2)} out
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[18px] text-primary">bar_chart</span>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="text-left py-2 px-2 text-on-surface-variant font-medium">Model</th>
                  <th className="text-right py-2 px-2 text-on-surface-variant font-medium">Input/1M</th>
                  <th className="text-right py-2 px-2 text-on-surface-variant font-medium">Output/1M</th>
                  <th className="text-right py-2 px-2 text-on-surface-variant font-medium">TPS</th>
                  <th className="text-right py-2 px-2 text-on-surface-variant font-medium">Context</th>
                </tr>
              </thead>
              <tbody>
                {selected.map((m, i) => {
                  const maxInput = Math.max(...selected.map(s => s.input));
                  const minInput = Math.min(...selected.filter(s => s.input > 0).map(s => s.input));
                  const inputColor = m.input === minInput ? 'text-green-600' : m.input === maxInput ? 'text-red-500' : 'text-on-surface';
                  return (
                    <tr key={`${m.name}-${m.provider}`} className="border-b border-outline-variant/50">
                      <td className="py-2 px-2">
                        <div className="font-medium text-on-surface">{m.name}</div>
                        <div className="text-[10px] text-on-surface-variant">via {m.provider}</div>
                      </td>
                      <td className={`py-2 px-2 text-right font-label-mono ${inputColor}`}>${m.input.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-label-mono text-on-surface">${m.output.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-label-mono text-on-surface">{m.tps > 0 ? m.tps : '—'}</td>
                      <td className="py-2 px-2 text-right font-label-mono text-on-surface">{m.contextWindow > 0 ? `${(m.contextWindow / 1000).toFixed(0)}k` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
