// src/components/ProvidersPage.jsx
import React, { useState, useEffect } from 'react';
import { fetchPricing, fetchProviders } from '../utils/supabase';
import { useCurrencyStore } from '../stores/useCurrencyStore';

function CollapsibleSection({ title, icon, activeCount = 0, activeLabels = [], defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-outline-variant/30 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 py-2 -my-0.5 cursor-pointer select-none group"
      >
        <span className="material-symbols-outlined text-[18px] text-secondary">{icon}</span>
        <h3 className="font-label-mono text-label-mono text-on-surface font-bold uppercase tracking-tight text-xs flex-1 text-left">{title}</h3>
        {activeCount > 0 && !open && (
          <span className="bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">{activeCount}</span>
        )}
        <span className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      {!open && activeLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 pb-2 pl-7">
          {activeLabels.slice(0, 3).map((label, i) => (
            <span key={i} className="bg-primary-container-light/30 text-primary text-[10px] font-medium px-1.5 py-0.5 rounded-full">{label}</span>
          ))}
          {activeLabels.length > 3 && (
            <span className="text-on-surface-variant text-[10px]">+{activeLabels.length - 3} more</span>
          )}
        </div>
      )}
      {open && (
        <div className="pb-3">
          {children}
        </div>
      )}
    </section>
  );
}

export default function ProvidersPage() {
  const { convert, format } = useCurrencyStore();
  const [models, setModels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  
  // Filter states
  const [selectedProviders, setSelectedProviders] = useState([]);
  const [contextFilters, setContextFilters] = useState([]);
  const [modelClassFilters, setModelClassFilters] = useState([]);
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [featureFilters, setFeatureFilters] = useState([]);
  const [pricingRange, setPricingRange] = useState({ min: '', max: '' });
  const [minTps, setMinTps] = useState('');
  const [dailyLimitFilter, setDailyLimitFilter] = useState([]);
  const [multiProviderOnly, setMultiProviderOnly] = useState(true);
  const [expandedModel, setExpandedModel] = useState(null);

  // Comparison selection states
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedProvidersForCompare, setSelectedProvidersForCompare] = useState([]);

  // Store raw pricing data for filtering
  const [pricingData, setPricingData] = useState([]);

  useEffect(() => {
    Promise.all([fetchPricing(), fetchProviders()])
      .then(([pricing, providersData]) => {
        setProviders(providersData);
        setPricingData(pricing);
        
        const modelMap = {};
        pricing.forEach(item => {
          const m = item.models;
          if (!m) return;
          if (!modelMap[m.slug]) {
            modelMap[m.slug] = {
              ...m,
              providers: [],
              pricingRecords: [],
              minPrice: Infinity,
              maxPrice: 0,
              hasPromptCaching: false,
              hasReasoningPricing: false,
              maxTps: 0,
              hasUnlimited: false,
              hasLimited: false,
            };
          }
          if (item.providers) {
            modelMap[m.slug].providers.push({
              slug: item.providers.slug,
              name: item.providers.name,
              id: item.providers.id,
            });
          }
          // Store pricing record for filtering
          modelMap[m.slug].pricingRecords.push({
            input_price_per_m: item.input_price_per_m,
            output_price_per_m: item.output_price_per_m,
            prompt_caching: item.prompt_caching,
            reasoning_price_per_m: item.reasoning_price_per_m,
            latency_tps: item.latency_tps,
            daily_limit: item.daily_limit,
          });
          
          // Track features
          if (item.prompt_caching) modelMap[m.slug].hasPromptCaching = true;
          if (item.reasoning_price_per_m && item.reasoning_price_per_m > 0) modelMap[m.slug].hasReasoningPricing = true;
          if (item.latency_tps > modelMap[m.slug].maxTps) modelMap[m.slug].maxTps = item.latency_tps;
          if (item.daily_limit === 'Unlimited' || !item.daily_limit) modelMap[m.slug].hasUnlimited = true;
          if (item.daily_limit && item.daily_limit !== 'Unlimited') modelMap[m.slug].hasLimited = true;
          
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
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Get unique categories from models
  const categories = [...new Set(models.map(m => m.category).filter(Boolean))];

  const toggleProvider = (providerId) => {
    setSelectedProviders(prev => 
      prev.includes(providerId)
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
    );
  };

  const toggleContextFilter = (value) => {
    setContextFilters(prev => 
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const toggleModelClassFilter = (value) => {
    setModelClassFilters(prev => 
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const toggleCategoryFilter = (value) => {
    setCategoryFilters(prev => 
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const toggleFeatureFilter = (value) => {
    setFeatureFilters(prev => 
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const toggleDailyLimitFilter = (value) => {
    setDailyLimitFilter(prev => 
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const resetAllFilters = () => {
    setSelectedProviders([]);
    setContextFilters([]);
    setModelClassFilters([]);
    setCategoryFilters([]);
    setFeatureFilters([]);
    setPricingRange({ min: '', max: '' });
    setMinTps('');
    setDailyLimitFilter([]);
  };

  // Comparison selection functions
  const selectModelForCompare = (model) => {
    if (selectedModel?.id === model.id) {
      setSelectedModel(null);
      setSelectedProvidersForCompare([]);
    } else {
      setSelectedModel(model);
      setSelectedProvidersForCompare([]);
    }
  };

  const toggleProviderForCompare = (provider) => {
    setSelectedProvidersForCompare(prev => {
      const exists = prev.find(p => p.id === provider.id);
      if (exists) {
        return prev.filter(p => p.id !== provider.id);
      }
      if (prev.length >= 2) {
        return [prev[1], provider];
      }
      return [...prev, provider];
    });
  };

  const clearSelection = (type) => {
    if (type === 'model') setSelectedModel(null);
    if (type === 'provider1') setSelectedProvidersForCompare(prev => prev.slice(1));
    if (type === 'provider2') setSelectedProvidersForCompare(prev => prev.slice(0, 1));
    if (type === 'all') {
      setSelectedModel(null);
      setSelectedProvidersForCompare([]);
    }
  };

  const canCompare = selectedModel && selectedProvidersForCompare.length === 2;

  const getCompareUrl = () => {
    if (!canCompare) return '#';
    const slugs = [selectedProvidersForCompare[0].slug, selectedProvidersForCompare[1].slug].sort();
    return `/vs/${selectedModel.slug}/${slugs[0]}-vs-${slugs[1]}`;
  };

  // Calculate network stats from pricing data
  const networkStats = React.useMemo(() => {
    if (models.length === 0) return { avgTps: 0, loadPercent: 0, status: 'Optimal' };
    
    const totalTps = models.reduce((sum, m) => sum + (m.maxPrice > 0 ? 100 : 50), 0);
    const avgTps = Math.round(totalTps / models.length);
    const loadPercent = Math.min(Math.round((models.length / 10) * 100), 100);
    
    let status = 'Optimal';
    if (loadPercent > 75) status = 'High';
    else if (loadPercent > 50) status = 'Moderate';
    
    return { avgTps, loadPercent, status };
  }, [models]);

  // Filter models based on all criteria
  const filteredModels = models.filter(model => {
    // Multi-provider filter (default on)
    if (multiProviderOnly && model.providers.length < 2) {
      return false;
    }

    // Provider filter
    if (selectedProviders.length > 0) {
      if (!model.providers.some(p => selectedProviders.includes(p.id))) {
        return false;
      }
    }
    
    // Context window filter
    if (contextFilters.length > 0) {
      const matchesContext = contextFilters.some(filter => {
        if (filter === '8k') return model.context_window <= 8000;
        if (filter === '32k') return model.context_window > 8000 && model.context_window <= 32000;
        if (filter === '128k') return model.context_window > 32000 && model.context_window <= 128000;
        if (filter === '128k+') return model.context_window > 128000;
        return true;
      });
      if (!matchesContext) return false;
    }
    
    // Model class filter
    if (modelClassFilters.length > 0) {
      const matchesClass = modelClassFilters.some(filter => {
        if (filter === 'compact') return model.context_window <= 8192;
        if (filter === 'midsize') return model.context_window >= 70000 && model.context_window <= 141000;
        if (filter === 'expert') return model.context_window >= 400000 || model.category === 'MoE';
        return true;
      });
      if (!matchesClass) return false;
    }

    // Category filter
    if (categoryFilters.length > 0) {
      if (!categoryFilters.includes(model.category || 'LLM')) {
        return false;
      }
    }

    // Feature filter
    if (featureFilters.length > 0) {
      const matchesFeature = featureFilters.every(filter => {
        if (filter === 'prompt_caching') return model.hasPromptCaching;
        if (filter === 'reasoning') return model.hasReasoningPricing;
        return true;
      });
      if (!matchesFeature) return false;
    }

    // Pricing range filter
    if (pricingRange.min !== '' || pricingRange.max !== '') {
      const min = pricingRange.min !== '' ? parseFloat(pricingRange.min) : 0;
      const max = pricingRange.max !== '' ? parseFloat(pricingRange.max) : Infinity;
      if (model.minPrice < min || model.minPrice > max) {
        return false;
      }
    }

    // Minimum TPS filter
    if (minTps !== '') {
      if (model.maxTps < parseFloat(minTps)) {
        return false;
      }
    }

    // Daily limit filter
    if (dailyLimitFilter.length > 0) {
      const matchesLimit = dailyLimitFilter.some(filter => {
        if (filter === 'unlimited') return model.hasUnlimited;
        if (filter === 'limited') return model.hasLimited;
        return true;
      });
      if (!matchesLimit) return false;
    }
    
    return true;
  });

  const sorted = [...filteredModels].sort((a, b) => {
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
          <span className="font-body-md text-body-md">Loading models...</span>
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

  const hasActiveFilters = !multiProviderOnly || selectedProviders.length > 0 || contextFilters.length > 0 || modelClassFilters.length > 0 || 
    categoryFilters.length > 0 || featureFilters.length > 0 || pricingRange.min !== '' || pricingRange.max !== '' || 
    minTps !== '' || dailyLimitFilter.length > 0;

  return (
    <div className="flex flex-col md:flex-row gap-4 px-4 md:px-8 py-8 max-w-[1440px] mx-auto">
      {/* Left Column: Technical Filters (25%) */}
      <aside className="w-full md:w-72 shrink-0 flex flex-col gap-3">
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex flex-col gap-5 max-h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-1 mb-1">
            <h2 className="font-headline-md text-[18px] text-primary">Technical Filters</h2>
            <p className="font-label-mono text-label-mono text-on-surface-variant opacity-70 uppercase tracking-wider text-[10px]">Refine search criteria</p>
          </div>

          {/* Multi-provider toggle */}
          <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/15 rounded-lg">
            <span className="font-body-sm text-body-sm text-on-surface font-medium">Multi-provider only</span>
            <button
              onClick={() => setMultiProviderOnly(!multiProviderOnly)}
              className={`relative w-10 h-[22px] rounded-full transition-colors ${multiProviderOnly ? 'bg-primary' : 'bg-outline-variant'}`}
              role="switch"
              aria-checked={multiProviderOnly}
            >
              <span className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform ${multiProviderOnly ? 'translate-x-[18px]' : ''}`}></span>
            </button>
          </div>
          
          {/* Context Window Filter */}
          <CollapsibleSection title="Context Window" icon="data_object" activeCount={contextFilters.length} activeLabels={contextFilters.map(f => ({ '8k': '≤8K', '32k': '8K-32K', '128k': '32K-128K', '128k+': '128K+' }[f] || f))} defaultOpen={false}>
            <div className="flex flex-col gap-2">
              {[
                { value: '8k', label: '≤8K tokens' },
                { value: '32k', label: '8K - 32K tokens' },
                { value: '128k', label: '32K - 128K tokens' },
                { value: '128k+', label: '128K+ tokens' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    className="w-4 h-4 rounded border-outline text-primary focus:ring-primary" 
                    type="checkbox"
                    checked={contextFilters.includes(opt.value)}
                    onChange={() => toggleContextFilter(opt.value)}
                  />
                  <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-primary transition-colors">{opt.label}</span>
                </label>
              ))}
            </div>
          </CollapsibleSection>

          {/* Model Class Filter */}
          <CollapsibleSection title="Model Class" icon="layers" activeCount={modelClassFilters.length} activeLabels={modelClassFilters.map(f => ({ compact: 'Compact', midsize: 'Mid-size', expert: 'Expert' }[f] || f))} defaultOpen={false}>
            <div className="flex flex-col gap-2">
              {[
                { value: 'compact', label: 'Compact (1B - 8B)' },
                { value: 'midsize', label: 'Mid-size (70B - 141B)' },
                { value: 'expert', label: 'Expert (MoE / 400B+)' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    className="w-4 h-4 rounded border-outline text-primary focus:ring-primary" 
                    type="checkbox"
                    checked={modelClassFilters.includes(opt.value)}
                    onChange={() => toggleModelClassFilter(opt.value)}
                  />
                  <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-primary transition-colors">{opt.label}</span>
                </label>
              ))}
            </div>
          </CollapsibleSection>

          {/* Category Filter */}
          {categories.length > 0 && (
            <CollapsibleSection title="Category" icon="category" activeCount={categoryFilters.length} activeLabels={categoryFilters} defaultOpen={false}>
              <div className="flex flex-col gap-2">
                {categories.map(cat => (
                  <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      className="w-4 h-4 rounded border-outline text-primary focus:ring-primary" 
                      type="checkbox"
                      checked={categoryFilters.includes(cat)}
                      onChange={() => toggleCategoryFilter(cat)}
                    />
                    <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-primary transition-colors">{cat}</span>
                  </label>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Pricing Range Filter */}
          <CollapsibleSection title="Pricing Range" icon="paid" activeCount={(pricingRange.min || pricingRange.max) ? 1 : 0} activeLabels={(pricingRange.min || pricingRange.max) ? [`${pricingRange.min || '0'} - ${pricingRange.max || '∞'}`] : []} defaultOpen={false}>
            <div className="flex gap-2 items-center">
              <input 
                type="number"
                placeholder="Min"
                value={pricingRange.min}
                onChange={(e) => setPricingRange(prev => ({ ...prev, min: e.target.value }))}
                className="w-1/2 px-2 py-1.5 text-sm border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-on-surface-variant text-sm">-</span>
              <input 
                type="number"
                placeholder="Max"
                value={pricingRange.max}
                onChange={(e) => setPricingRange(prev => ({ ...prev, max: e.target.value }))}
                className="w-1/2 px-2 py-1.5 text-sm border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <p className="text-xs text-on-surface-variant mt-1">Price per 1M tokens (input)</p>
          </CollapsibleSection>

          {/* Throughput Filter */}
          <CollapsibleSection title="Min Throughput" icon="speed" activeCount={minTps ? 1 : 0} activeLabels={minTps ? [`≥${minTps} TPS`] : []} defaultOpen={false}>
            <input 
              type="number"
              placeholder="Min TPS"
              value={minTps}
              onChange={(e) => setMinTps(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-xs text-on-surface-variant mt-1">Tokens per second</p>
          </CollapsibleSection>

          {/* Features Filter */}
          <CollapsibleSection title="Features" icon="star" activeCount={featureFilters.length} activeLabels={featureFilters.map(f => ({ prompt_caching: 'Caching', reasoning: 'Reasoning' }[f] || f))} defaultOpen={false}>
            <div className="flex flex-col gap-2">
              {[
                { value: 'prompt_caching', label: 'Prompt Caching' },
                { value: 'reasoning', label: 'Reasoning Pricing' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    className="w-4 h-4 rounded border-outline text-primary focus:ring-primary" 
                    type="checkbox"
                    checked={featureFilters.includes(opt.value)}
                    onChange={() => toggleFeatureFilter(opt.value)}
                  />
                  <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-primary transition-colors">{opt.label}</span>
                </label>
              ))}
            </div>
          </CollapsibleSection>

          {/* Daily Limit Filter */}
          <CollapsibleSection title="Daily Limit" icon="timer" activeCount={dailyLimitFilter.length} activeLabels={dailyLimitFilter.map(f => ({ unlimited: 'Unlimited', limited: 'Limited' }[f] || f))} defaultOpen={false}>
            <div className="flex flex-col gap-2">
              {[
                { value: 'unlimited', label: 'Unlimited' },
                { value: 'limited', label: 'Limited' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    className="w-4 h-4 rounded border-outline text-primary focus:ring-primary" 
                    type="checkbox"
                    checked={dailyLimitFilter.includes(opt.value)}
                    onChange={() => toggleDailyLimitFilter(opt.value)}
                  />
                  <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-primary transition-colors">{opt.label}</span>
                </label>
              ))}
            </div>
          </CollapsibleSection>

          {/* Provider Filter */}
          <CollapsibleSection title="Provider" icon="hub" activeCount={selectedProviders.length} activeLabels={providers.filter(p => selectedProviders.includes(p.id)).map(p => p.name)} defaultOpen={false}>
            <div className="flex flex-col gap-2">
              {providers.map(provider => (
                <label key={provider.id} className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    className="w-4 h-4 rounded border-outline text-primary focus:ring-primary" 
                    type="checkbox"
                    checked={selectedProviders.includes(provider.id)}
                    onChange={() => toggleProvider(provider.id)}
                  />
                  <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-primary transition-colors">{provider.name}</span>
                </label>
              ))}
            </div>
          </CollapsibleSection>

          <button 
            onClick={resetAllFilters}
            className={`w-full py-2 font-label-mono text-label-mono rounded-lg transition-colors border border-outline-variant ${
              hasActiveFilters 
                ? 'bg-primary text-white hover:bg-primary-container' 
                : 'bg-surface-container-highest hover:bg-surface-variant text-on-surface-variant'
            }`}
          >
            Reset All Filters
          </button>
        </div>
        <div className="p-4 bg-surface-container-lowest border border-outline-variant rounded-xl bg-primary-container-light/30">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5">
              <span className="font-label-mono text-label-mono text-primary font-bold">Network Load</span>
              <div className="relative group/icon">
                <span className="material-symbols-outlined text-[14px] text-on-surface-variant cursor-help">help</span>
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 px-3 py-2 bg-surface-container-dark text-white text-xs rounded-lg opacity-0 invisible group-hover/icon:opacity-100 group-hover/icon:visible transition-all duration-200 z-50 pointer-events-none shadow-lg">
                  <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-2.5 h-2.5 bg-surface-container-dark rotate-45"></div>
                  <div className="relative">
                    <p className="font-bold mb-1">Network Load</p>
                    <p className="text-slate-300">Indicates platform utilization based on {models.length} indexed models across {providers.length} active providers.</p>
                    <p className="mt-1">
                      <span className={networkStats.status === 'Optimal' ? 'text-green-400' : networkStats.status === 'Moderate' ? 'text-yellow-400' : 'text-red-400'}>
                        {networkStats.status}:
                      </span> {networkStats.loadPercent}% capacity utilized
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <span className={`font-label-mono text-label-mono ${
              networkStats.status === 'Optimal' ? 'text-success' : 
              networkStats.status === 'Moderate' ? 'text-warning' : 'text-error'
            }`}>{networkStats.status}</span>
          </div>
          <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                networkStats.loadPercent > 75 ? 'bg-error' : 
                networkStats.loadPercent > 50 ? 'bg-warning' : 'bg-primary'
              }`} 
              style={{ width: `${networkStats.loadPercent}%` }}
            ></div>
          </div>
          <div className="mt-2 flex justify-between text-xs font-label-mono text-on-surface-variant">
            <span>{models.length} models indexed</span>
            <span>{providers.length} providers active</span>
          </div>
        </div>
      </aside>

      {/* Main Column: Model Directory (75%) */}
      <div className="flex-1 min-w-0">
        {/* Comparison Selection Panel - Horizontal Layout (Sticky) */}
        <div className="sticky top-16 z-30 mb-6 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-md">
          {/* Header with icon and instruction */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-container-light flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[18px]">compare_arrows</span>
              </div>
              <h3 className="font-headline-md text-sm font-bold text-on-surface">Compare</h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {!selectedModel ? (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Click a model to start
                </span>
              ) : selectedProvidersForCompare.length < 2 ? (
                <span className="flex items-center gap-1 text-secondary font-medium">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Select {2 - selectedProvidersForCompare.length} more provider{selectedProvidersForCompare.length === 0 ? 's' : ''}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-success font-medium">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Ready to compare
                </span>
              )}
            </div>
          </div>

          {/* Placeholders Row */}
          <div className="flex items-end gap-3">
            {/* Model Placeholder */}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">Model</div>
              <div className={`px-3 py-2.5 rounded-lg border transition-all ${
                selectedModel 
                  ? 'border-primary bg-primary-container-light/20' 
                  : 'border-dashed border-outline-variant bg-surface-container'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    selectedModel ? 'bg-primary text-white' : 'bg-outline-variant text-on-surface-variant'
                  }`}>1</div>
                  {selectedModel ? (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-headline-md text-xs font-bold text-on-surface truncate">{selectedModel.name}</span>
                      <button onClick={() => clearSelection('model')} className="shrink-0 p-0.5 rounded text-on-surface-variant hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-on-surface-variant truncate italic">Select model</span>
                  )}
                </div>
              </div>
            </div>

            {/* Provider A Placeholder */}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">Provider A</div>
              <div className={`px-3 py-2.5 rounded-lg border transition-all ${
                selectedProvidersForCompare[0] 
                  ? 'border-secondary bg-secondary-container/10' 
                  : 'border-dashed border-outline-variant bg-surface-container'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    selectedProvidersForCompare[0] ? 'bg-secondary text-white' : 'bg-outline-variant text-on-surface-variant'
                  }`}>2</div>
                  {selectedProvidersForCompare[0] ? (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-headline-md text-xs font-bold text-on-surface truncate">{selectedProvidersForCompare[0].name}</span>
                      <button onClick={() => clearSelection('provider1')} className="shrink-0 p-0.5 rounded text-on-surface-variant hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <span className={`text-xs truncate italic ${selectedModel ? 'text-on-surface-variant' : 'text-outline'}`}>Select provider</span>
                  )}
                </div>
              </div>
            </div>

            {/* VS */}
            <div className="pb-2.5">
              <span className="font-label-mono text-xs font-bold text-on-surface-variant">vs</span>
            </div>

            {/* Provider B Placeholder */}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">Provider B</div>
              <div className={`px-3 py-2.5 rounded-lg border transition-all ${
                selectedProvidersForCompare[1] 
                  ? 'border-tertiary bg-tertiary-fixed/10' 
                  : 'border-dashed border-outline-variant bg-surface-container'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    selectedProvidersForCompare[1] ? 'bg-tertiary text-white' : 'bg-outline-variant text-on-surface-variant'
                  }`}>3</div>
                  {selectedProvidersForCompare[1] ? (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-headline-md text-xs font-bold text-on-surface truncate">{selectedProvidersForCompare[1].name}</span>
                      <button onClick={() => clearSelection('provider2')} className="shrink-0 p-0.5 rounded text-on-surface-variant hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <span className={`text-xs truncate italic ${selectedProvidersForCompare[0] ? 'text-on-surface-variant' : 'text-outline'}`}>Select provider</span>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-10 bg-outline-variant shrink-0 mx-1"></div>

            {/* Reset & Compare Button */}
            <div className="flex flex-col items-center gap-1.5 shrink-0 pb-0.5">
              {(selectedModel || selectedProvidersForCompare.length > 0) && (
                <button 
                  onClick={() => clearSelection('all')}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                  title="Reset selection"
                >
                  <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                </button>
              )}
              <a
                href={getCompareUrl()}
                className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  canCompare 
                    ? 'bg-primary text-white hover:bg-primary-container shadow-md shadow-primary/20' 
                    : 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed opacity-50'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{canCompare ? 'arrow_forward' : 'compare_arrows'}</span>
                {canCompare ? 'Compare' : 'Go'}
              </a>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Model Registry</h1>
            <p className="text-on-surface-variant font-body-md mt-1">{filteredModels.length} of {models.length} models shown</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-label-mono text-label-mono text-on-surface-variant">Sort by:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-surface border-outline-variant rounded-lg font-label-mono text-label-mono py-1.5 pr-8 text-primary cursor-pointer text-sm"
            >
              <option value="name">Name</option>
              <option value="context">Context Window</option>
              <option value="price">Pricing (Low to High)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-outline-variant">
                <th className="pb-3 font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider pl-2 text-xs">Model</th>
                <th className="pb-3 font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider text-xs">Context</th>
                <th className="pb-3 font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider text-xs">Providers</th>
                <th className="pb-3 font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider text-right pr-2 text-xs">Cost / 1M</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {sorted.map((model, idx) => (
                <React.Fragment key={model.id}>
                  <tr className={`group transition-colors ${
                    selectedModel?.id === model.id 
                      ? 'bg-primary-container-light/30 border-l-2 border-l-primary' 
                      : 'hover:bg-surface-container-lowest'
                  }`}>
                    <td className="py-4 pl-2">
                      <div className="flex items-center gap-3">
                        <button 
                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                            selectedModel?.id === model.id 
                              ? 'bg-primary text-white shadow-md' 
                              : `${modelColors[idx % modelColors.length]} hover:shadow-md`
                          }`}
                          onClick={() => selectModelForCompare(model)}
                          title={selectedModel?.id === model.id ? 'Selected as comparison model' : 'Click to select this model'}
                        >
                          {selectedModel?.id === model.id ? (
                            <span className="material-symbols-outlined">check</span>
                          ) : (
                            <span className="material-symbols-outlined">{modelIcons[idx % modelIcons.length]}</span>
                          )}
                        </button>
                        <div className="cursor-pointer flex-1" onClick={() => selectModelForCompare(model)}>
                          <div className={`font-headline-md text-[15px] font-bold transition-colors ${selectedModel?.id === model.id ? 'text-primary' : 'text-on-surface group-hover:text-primary'}`}>{model.name}</div>
                          <div className="font-body-md text-[12px] text-on-surface-variant">{model.category || 'LLM'}</div>
                        </div>
                        <button 
                          onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}
                          className="p-1.5 rounded-lg hover:bg-surface-container-highest transition-colors"
                          title={expandedModel === model.id ? 'Collapse details' : 'Expand details'}
                        >
                          <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${expandedModel === model.id ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="font-metric-display text-[14px] text-on-surface">{model.context_window?.toLocaleString()}</span>
                      <span className="text-xs text-on-surface-variant ml-0.5">t</span>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {model.providers.map(p => {
                          const isSelected = selectedProvidersForCompare.some(sp => sp.id === p.id);
                          const providerIndex = selectedProvidersForCompare.findIndex(sp => sp.id === p.id);
                          return (
                            <button
                              key={p.id}
                              onClick={() => toggleProviderForCompare(p)}
                              disabled={!selectedModel}
                              title={!selectedModel ? 'Select a model first' : isSelected ? `Selected as Provider ${providerIndex === 0 ? 'A' : 'B'} - click to remove` : 'Click to select for comparison'}
                              className={`px-2.5 py-1 rounded-full font-label-mono text-[10px] uppercase font-medium border transition-all ${
                                isSelected 
                                  ? providerIndex === 0
                                    ? 'bg-secondary text-white border-secondary shadow-sm'
                                    : 'bg-tertiary text-white border-tertiary shadow-sm'
                                  : selectedModel
                                    ? 'bg-surface-container text-on-surface-variant border-outline-variant hover:border-secondary hover:bg-secondary-container/20 cursor-pointer'
                                    : 'bg-surface-container text-on-surface-variant border-outline-variant opacity-50 cursor-not-allowed'
                              }`}
                            >
                              {isSelected && <span className="mr-1">{providerIndex === 0 ? 'A' : 'B'}</span>}
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-4 text-right pr-2">
                      <span className="font-metric-display text-[14px] text-primary">
                        {model.minPrice > 0 ? format(convert(model.minPrice)) : 'N/A'}
                      </span>
                      {model.maxPrice > model.minPrice && model.minPrice > 0 && (
                        <span className="text-xs text-on-surface-variant"> - {format(convert(model.maxPrice))}</span>
                      )}
                    </td>
                  </tr>
                  {expandedModel === model.id && (
                    <tr>
                      <td colSpan="4" className="px-4 py-4 bg-surface-container-low">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-surface rounded-lg border border-outline-variant">
                            <div className="font-label-mono text-xs text-on-surface-variant uppercase mb-1">Max Output</div>
                            <div className="font-metric-display text-lg text-on-surface">{model.max_output?.toLocaleString() || 'N/A'}</div>
                          </div>
                          <div className="p-3 bg-surface rounded-lg border border-outline-variant">
                            <div className="font-label-mono text-xs text-on-surface-variant uppercase mb-1">Max Throughput</div>
                            <div className="font-metric-display text-lg text-on-surface">{model.maxTps} TPS</div>
                          </div>
                          <div className="p-3 bg-surface rounded-lg border border-outline-variant">
                            <div className="font-label-mono text-xs text-on-surface-variant uppercase mb-1">Prompt Caching</div>
                            <div className={`font-metric-display text-lg ${model.hasPromptCaching ? 'text-success' : 'text-error'}`}>
                              {model.hasPromptCaching ? 'Supported' : 'Not Supported'}
                            </div>
                          </div>
                          <div className="p-3 bg-surface rounded-lg border border-outline-variant">
                            <div className="font-label-mono text-xs text-on-surface-variant uppercase mb-1">Reasoning Pricing</div>
                            <div className={`font-metric-display text-lg ${model.hasReasoningPricing ? 'text-success' : 'text-error'}`}>
                              {model.hasReasoningPricing ? 'Available' : 'Not Available'}
                            </div>
                          </div>
                          <div className="p-3 bg-surface rounded-lg border border-outline-variant">
                            <div className="font-label-mono text-xs text-on-surface-variant uppercase mb-1">Daily Limit</div>
                            <div className="font-metric-display text-lg text-on-surface">
                              {model.hasUnlimited ? 'Unlimited' : model.hasLimited ? 'Limited' : 'N/A'}
                            </div>
                          </div>
                          <div className="p-3 bg-surface rounded-lg border border-outline-variant">
                            <div className="font-label-mono text-xs text-on-surface-variant uppercase mb-1">Input Price</div>
                            <div className="font-metric-display text-lg text-primary">{format(convert(model.minPrice))}</div>
                          </div>
                          <div className="p-3 bg-surface rounded-lg border border-outline-variant">
                            <div className="font-label-mono text-xs text-on-surface-variant uppercase mb-1">Output Price</div>
                            <div className="font-metric-display text-lg text-primary">{format(convert(model.maxPrice))}</div>
                          </div>
                          <div className="p-3 bg-surface rounded-lg border border-outline-variant">
                            <div className="font-label-mono text-xs text-on-surface-variant uppercase mb-1">Providers</div>
                            <div className="font-metric-display text-lg text-on-surface">{model.providers.length}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {sorted.length === 0 && !loading && (
          <div className="mt-8 text-center py-12">
            <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2">inventory_2</span>
            <p className="font-body-md text-body-md text-on-surface-variant">No models match the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
