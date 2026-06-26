import React, { useState, useEffect } from 'react';
import { fetchPricing } from '../utils/supabase';

export default function ModelRegistry() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    fetchPricing().then(pricing => {
      const modelMap = {};
      pricing.forEach(item => {
        const m = item.models;
        if (!m) return;
        if (!modelMap[m.slug]) {
          modelMap[m.slug] = {
            ...m,
            providers: [],
            minPrice: Infinity,
            maxPrice: 0,
          };
        }
        if (item.providers) {
          modelMap[m.slug].providers.push({
            slug: item.providers.slug,
            name: item.providers.name,
          });
        }
        const avgPrice = ((item.input_price_per_m || 0) + (item.output_price_per_m || 0)) / 2;
        if (avgPrice < modelMap[m.slug].minPrice) modelMap[m.slug].minPrice = avgPrice;
        if (avgPrice > modelMap[m.slug].maxPrice) modelMap[m.slug].maxPrice = avgPrice;
      });

      const list = Object.values(modelMap).map(m => ({
        ...m,
        minPrice: m.minPrice === Infinity ? 0 : m.minPrice,
      }));
      setModels(list);
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  const sorted = [...models].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'context') return b.context_window - a.context_window;
    if (sortBy === 'price') return a.minPrice - b.minPrice;
    return 0;
  });

  const modelIcons = ['neurology', 'hub', 'bolt', 'token', 'shield', 'smart_toy'];
  const modelColors = [
    'bg-primary-container-light text-primary',
    'bg-secondary-container/20 text-secondary',
    'bg-tertiary-fixed text-tertiary',
    'bg-surface-container-high text-on-surface-variant',
    'bg-success/10 text-success',
    'bg-warning/10 text-warning',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <span className="font-body-md text-body-md">Loading models from Supabase...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <span className="material-symbols-outlined text-error text-4xl mb-2">error</span>
          <p className="font-body-md text-body-md text-on-surface-variant">Failed to load models: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div class="flex-1 min-w-0">
      <div class="flex justify-between items-end mb-6">
        <div>
          <h1 class="font-headline-lg text-headline-lg text-on-surface">Model Registry</h1>
          <p class="text-on-surface-variant font-body-md mt-1">{models.length} active model variants indexed.</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-label-mono text-label-mono text-on-surface-variant">Sort by:</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            class="bg-surface border-outline-variant rounded-lg font-label-mono text-label-mono py-1 pr-8 text-primary cursor-pointer"
          >
            <option value="name">Name</option>
            <option value="context">Context Window</option>
            <option value="price">Pricing (Low to High)</option>
          </select>
        </div>
      </div>

      <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full border-collapse">
          <thead>
            <tr class="text-left border-b border-outline-variant">
              <th class="pb-4 font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider pl-2">Model Identity</th>
              <th class="pb-4 font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">Context</th>
              <th class="pb-4 font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">Providers</th>
              <th class="pb-4 font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider text-right pr-2">Cost / 1M Tokens</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-container">
            {sorted.map((model, idx) => (
              <tr key={model.id} class="group hover:bg-surface-container-lowest transition-colors cursor-pointer">
                <td class="py-5 pl-2">
                  <div class="flex items-center gap-3">
                    <div class={`w-10 h-10 rounded-lg flex items-center justify-center ${modelColors[idx % modelColors.length]}`}>
                      <span class="material-symbols-outlined">{modelIcons[idx % modelIcons.length]}</span>
                    </div>
                    <div>
                      <div class="font-headline-md text-[15px] font-bold text-on-surface">{model.name}</div>
                      <div class="font-body-md text-[12px] text-on-surface-variant">{model.category || 'LLM'}</div>
                    </div>
                  </div>
                </td>
                <td class="py-5">
                  <span class="font-metric-display text-[16px] text-on-surface">{model.context_window?.toLocaleString()} t</span>
                </td>
                <td class="py-5">
                  <div class="flex flex-wrap gap-1.5">
                    {model.providers.map(p => (
                      <a 
                        key={p.slug}
                        href={`/vs/${model.slug}/${p.slug}-${model.providers[0]?.slug === p.slug && model.providers[1] ? model.providers[1].slug : model.providers[0]?.slug || 'unknown'}`}
                        class="px-2 py-0.5 rounded-full bg-secondary-container/20 text-on-secondary-container font-label-mono text-[10px] uppercase border border-secondary-container/30 hover:bg-secondary-container/40 transition-colors"
                      >
                        {p.name}
                      </a>
                    ))}
                  </div>
                </td>
                <td class="py-5 text-right pr-2">
                  <span class="font-metric-display text-[16px] text-primary">
                    {model.minPrice > 0 ? `$${model.minPrice.toFixed(2)} - $${model.maxPrice.toFixed(2)}` : 'N/A'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && !loading && (
        <div class="mt-8 text-center py-12">
          <span class="material-symbols-outlined text-on-surface-variant text-4xl mb-2">inventory_2</span>
          <p class="font-body-md text-body-md text-on-surface-variant">No models found in Supabase.</p>
        </div>
      )}
    </div>
  );
}
