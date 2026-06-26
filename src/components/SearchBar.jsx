import React, { useState, useRef, useEffect } from 'react';
import { fetchPricing } from '../utils/supabase';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [comparisons, setComparisons] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

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
            });
          }
        }
      });

      setComparisons(combos);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (query.length > 0) {
      const q = query.toLowerCase();
      const filtered = comparisons.filter(c =>
        c.label.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q) ||
        c.modelName.toLowerCase().includes(q)
      );
      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setSuggestions(comparisons.slice(0, 5));
      setIsOpen(false);
    }
  }, [query, comparisons]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function navigateTo(model, providerA, providerB) {
    const sorted = [providerA, providerB].sort();
    window.location.href = `/vs/${model}/${sorted[0]}-vs-${sorted[1]}`;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (suggestions.length > 0) {
      const first = suggestions[0];
      navigateTo(first.model, first.providerA, first.providerB);
    }
  }

  return (
    <div ref={wrapperRef} className="max-w-2xl mx-auto relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-primary-container to-secondary-container rounded-xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
      <form onSubmit={handleSubmit} className="relative bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center shadow-sm">
        <span className="mono-font text-primary mr-3 select-none">$</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
          placeholder={loading ? "Loading models..." : "Search models and providers..."}
          disabled={loading}
          className="flex-grow bg-transparent outline-none mono-font text-on-surface-variant placeholder:text-on-surface-variant/50 disabled:opacity-50"
        />
        <kbd className="hidden md:flex items-center gap-1 font-label-mono text-[10px] px-2 py-1 bg-surface-container rounded border border-outline-variant text-outline">
          <span className="material-symbols-outlined text-[12px]">keyboard_command_key</span>K
        </kbd>
      </form>
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => navigateTo(s.model, s.providerA, s.providerB)}
              className="w-full text-left px-4 py-3 hover:bg-surface-container-low transition-colors flex items-center gap-3 border-b border-outline-variant/30 last:border-0"
            >
              <span className="material-symbols-outlined text-primary text-[18px]">arrow_forward</span>
              <div>
                <span className="font-body-md text-body-md text-on-surface block">{s.label}</span>
                <span className="font-label-mono text-[10px] text-on-surface-variant">vs/{s.model}/{s.providerA}-vs-{s.providerB}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
