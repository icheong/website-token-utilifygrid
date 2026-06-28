import React, { useState, useEffect } from 'react';
import { fetchPricing } from '../utils/supabase';

export default function TrendingMatchups() {
  const [matchups, setMatchups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPricing().then(pricing => {
      const modelMap = {};
      pricing.forEach(item => {
        const slug = item.models?.slug;
        if (!slug) return;
        if (!modelMap[slug]) {
          modelMap[slug] = { model: slug, modelName: item.models.name, providers: [] };
        }
        if (item.providers) {
          modelMap[slug].providers.push({ slug: item.providers.slug, name: item.providers.name });
        }
      });

      const combos = [];
      Object.values(modelMap).forEach(entry => {
        const { model, modelName, providers } = entry;
        for (let i = 0; i < providers.length; i++) {
          for (let j = i + 1; j < providers.length; j++) {
            combos.push({
              model,
              modelName,
              providerA: providers[i].slug,
              providerAName: providers[i].name,
              providerB: providers[j].slug,
              providerBName: providers[j].name,
              label: `${modelName}: ${providers[i].name} vs ${providers[j].name}`,
              href: `/vs/${model}/${[providers[i].slug, providers[j].slug].sort().join('-vs-')}`,
            });
          }
        }
      });

      setMatchups(combos.slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mt-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs text-on-surface-variant animate-pulse">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (matchups.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 max-w-3xl mx-auto overflow-hidden">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
        {matchups.map((m, i) => (
          <a
            key={i}
            href={m.href}
            className="shrink-0 px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs text-on-surface-variant hover:border-primary-container hover:text-primary transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[12px] text-outline">arrow_forward</span>
            {m.label}
          </a>
        ))}
      </div>
    </div>
  );
}
