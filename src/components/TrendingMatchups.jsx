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
      <div className="mt-8 flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
        <div className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-body-md text-on-surface-variant animate-pulse">
          Loading matchups...
        </div>
      </div>
    );
  }

  if (matchups.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
      {matchups.map((m, i) => (
        <a
          key={i}
          href={m.href}
          className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-body-md text-on-surface-variant hover:border-primary-container hover:text-primary transition-all cursor-pointer flex items-center gap-2"
        >
          <span className="font-label-mono text-[10px] text-outline">PROMPT</span>
          {m.label}
        </a>
      ))}
    </div>
  );
}
