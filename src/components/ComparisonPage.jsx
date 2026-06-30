import React, { useState, useEffect } from 'react';
import { fetchComparison } from '../utils/supabase';
import InteractiveCalculator from './InteractiveCalculator';
import { generateProgrammaticSeoContent } from '../utils/seoGenerator';
import { useCurrencyStore } from '../stores/useCurrencyStore';
import { convertPrice, getCurrencySymbol } from '../utils/currency';

export default function ComparisonPage({ modelSlug, providerASlug, providerBSlug }) {
  const { unit, currency, rates } = useCurrencyStore();

  function fmt(usdPrice) {
    if (!rates || currency === 'USD') return `$${usdPrice}`;
    const converted = convertPrice(usdPrice, 'USD', currency, rates);
    return `${getCurrencySymbol(currency)}${converted.toFixed(2)}`;
  }
  const [data, setData] = useState(null);
  const [seoContent, setSeoContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchComparison(modelSlug, providerASlug, providerBSlug)
      .then(result => {
        if (result) {
          setData(result);
        } else {
          setError('Comparison not found in Supabase');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [modelSlug, providerASlug, providerBSlug]);

  useEffect(() => {
    if (!data) return;
    const seo = generateProgrammaticSeoContent(
      data.model,
      data.providerA,
      data.providerB,
      data.pricingA,
      data.pricingB,
      currency,
      rates
    );
    setSeoContent(seo);
  }, [data, currency, rates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
          <span className="font-body-md text-body-md">Loading comparison...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <span className="material-symbols-outlined text-error text-5xl mb-4">error_outline</span>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Comparison Not Found</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4">
            {error || 'No pricing data available for this model/provider combination.'}
          </p>
          <p className="font-label-mono text-label-mono text-on-surface-variant">
            Requested: {modelSlug} / {providerASlug} vs {providerBSlug}
          </p>
          <a href="/" className="mt-6 inline-block px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary-container transition-colors">
            Back to Search
          </a>
        </div>
      </div>
    );
  }

  const { model, providerA, providerB, pricingA, pricingB } = data;

  return (
    <>
      <InteractiveCalculator
        client:load
        unit={unit}
        model={model}
        providerA={providerA}
        providerB={providerB}
        pricingA={pricingA}
        pricingB={pricingB}
      />

      <section className="max-w-7xl w-full mx-auto px-4 md:px-8 pb-12">
        <div className="ml-0 lg:ml-[calc(18rem+1rem)] bg-white dark:bg-surface-container-dark rounded-xl border border-outline-variant dark:border-outline-dark p-6 md:p-8 space-y-6 shadow-card">
          <h2 className="text-xl font-bold tracking-tight text-on-surface font-headline-md">
            {providerA.name} vs {providerB.name} Comparison
          </h2>

          {/* Feature Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="text-left py-3 px-4 font-label-mono text-xs uppercase tracking-wider text-on-surface-variant w-1/3">Feature</th>
                  <th className="text-left py-3 px-4 font-headline-md text-sm text-primary font-semibold">{providerA.name}</th>
                  <th className="text-left py-3 px-4 font-headline-md text-sm text-primary font-semibold">{providerB.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {/* Financial */}
                <tr className="bg-surface-container-lowest">
                  <td colSpan="3" className="py-2 px-4 font-label-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Financial</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium group relative">
                    Input Price (per 1M tokens)
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 ml-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity cursor-help">info</span>
                    <span className="absolute left-4 top-full mt-1 z-50 w-72 p-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface-variant shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      Cost per 1 million input tokens sent to the model. This is the base rate before any caching or batch discounts are applied.
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-on-surface">{fmt(pricingA?.input_price_per_m || pricingA?.input_cost_per_1m)}</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{fmt(pricingB?.input_price_per_m || pricingB?.input_cost_per_1m)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium group relative">
                    Output Price (per 1M tokens)
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 ml-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity cursor-help">info</span>
                    <span className="absolute left-4 top-full mt-1 z-50 w-72 p-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface-variant shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      Cost per 1 million output tokens generated by the model. Output tokens are typically more expensive than input tokens.
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-on-surface">{fmt(pricingA?.output_price_per_m || pricingA?.output_cost_per_1m)}</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{fmt(pricingB?.output_price_per_m || pricingB?.output_cost_per_1m)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium group relative">
                    Cache Hit Discount
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 ml-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity cursor-help">info</span>
                    <span className="absolute left-4 top-full mt-1 z-50 w-72 p-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface-variant shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      Percentage discount on input tokens when a cached prompt prefix is hit. E.g. 90% means you pay only 10% of the normal input price for cached content.
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingA?.cache_hit_discount_rate != null ? `${(pricingA.cache_hit_discount_rate * 100).toFixed(0)}%` : '—'}</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingB?.cache_hit_discount_rate != null ? `${(pricingB.cache_hit_discount_rate * 100).toFixed(0)}%` : '—'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium group relative">
                    Cache Write Cost (per 1M tokens)
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 ml-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity cursor-help">info</span>
                    <span className="absolute left-4 top-full mt-1 z-50 w-72 p-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface-variant shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      One-time cost per 1M tokens when writing to the prompt cache. Some providers charge a premium for cache writes, offset by cheaper cache reads.
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingA?.cache_write_cost_per_1m != null ? fmt(pricingA.cache_write_cost_per_1m) : '—'}</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingB?.cache_write_cost_per_1m != null ? fmt(pricingB.cache_write_cost_per_1m) : '—'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium group relative">
                    Batch Discount
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 ml-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity cursor-help">info</span>
                    <span className="absolute left-4 top-full mt-1 z-50 w-72 p-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface-variant shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      Discount applied when using batch/async API endpoints. Batch jobs are queued and processed during off-peak hours at a reduced rate.
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingA?.batch_discount_rate ? `${(pricingA.batch_discount_rate * 100).toFixed(0)}%` : '—'}</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingB?.batch_discount_rate ? `${(pricingB.batch_discount_rate * 100).toFixed(0)}%` : '—'}</td>
                </tr>

                {/* Limits */}
                <tr className="bg-surface-container-lowest">
                  <td colSpan="3" className="py-2 px-4 font-label-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Limits</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium group relative">
                    Context Window
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 ml-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity cursor-help">info</span>
                    <span className="absolute left-4 top-full mt-1 z-50 w-72 p-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface-variant shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      Maximum number of tokens the model can process in a single request, including both input and output tokens combined.
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-on-surface">{(pricingA?.max_context_window || model?.context_window)?.toLocaleString()} tokens</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{(pricingB?.max_context_window || model?.context_window)?.toLocaleString()} tokens</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium group relative">
                    Max Output Tokens
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 ml-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity cursor-help">info</span>
                    <span className="absolute left-4 top-full mt-1 z-50 w-72 p-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface-variant shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      Maximum number of tokens the model can generate in a single response. Longer outputs cost more and may take longer to complete.
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-on-surface">{(pricingA?.max_output_tokens || model?.max_output)?.toLocaleString() || '—'}</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{(pricingB?.max_output_tokens || model?.max_output)?.toLocaleString() || '—'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium group relative">
                    RPM Limit
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 ml-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity cursor-help">info</span>
                    <span className="absolute left-4 top-full mt-1 z-50 w-72 p-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface-variant shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      Maximum requests per minute allowed on the free tier. Higher tiers typically offer increased rate limits.
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingA?.default_rpm_limit?.toLocaleString() || '—'}</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingB?.default_rpm_limit?.toLocaleString() || '—'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium group relative">
                    TPM Limit
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 ml-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity cursor-help">info</span>
                    <span className="absolute left-4 top-full mt-1 z-50 w-72 p-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface-variant shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      Maximum tokens per minute allowed. This caps total throughput regardless of request count.
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingA?.default_tpm_limit?.toLocaleString() || '—'}</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingB?.default_tpm_limit?.toLocaleString() || '—'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium group relative">
                    Daily Limit
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 ml-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity cursor-help">info</span>
                    <span className="absolute left-4 top-full mt-1 z-50 w-72 p-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface-variant shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      Maximum number of requests or tokens allowed per day. Unlimited means no daily cap is enforced.
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingA?.daily_limit || 'Unlimited'}</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingB?.daily_limit || 'Unlimited'}</td>
                </tr>

                {/* Performance & Architecture */}
                <tr className="bg-surface-container-lowest">
                  <td colSpan="3" className="py-2 px-4 font-label-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Performance &amp; Architecture</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium group relative">
                    Avg TTFT
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 ml-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity cursor-help">info</span>
                    <span className="absolute left-4 top-full mt-1 z-50 w-72 p-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface-variant shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      Average Time To First Token — how long it takes before the model starts streaming its response. Lower is better for interactive use cases.
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingA?.avg_ttft_ms != null ? `${pricingA.avg_ttft_ms}ms` : '—'}</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingB?.avg_ttft_ms != null ? `${pricingB.avg_ttft_ms}ms` : '—'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium group relative">
                    Avg Throughput
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 ml-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity cursor-help">info</span>
                    <span className="absolute left-4 top-full mt-1 z-50 w-72 p-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface-variant shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      Average output speed in tokens per second. Higher TPS means faster responses and lower latency for long outputs.
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingA?.avg_throughput_tps != null ? `${pricingA.avg_throughput_tps} TPS` : pricingA?.latency_tps ? `${pricingA.latency_tps} TPS` : '—'}</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingB?.avg_throughput_tps != null ? `${pricingB.avg_throughput_tps} TPS` : pricingB?.latency_tps ? `${pricingB.latency_tps} TPS` : '—'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium group relative">
                    Quantization
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 ml-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity cursor-help">info</span>
                    <span className="absolute left-4 top-full mt-1 z-50 w-72 p-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface-variant shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      Model weight precision format. Lower precision (e.g. INT4, FP8) reduces memory and increases speed with minor quality trade-offs. FP16 is full precision.
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingA?.quantization_level || '—'}</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingB?.quantization_level || '—'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium group relative">
                    Prompt Caching
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 ml-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity cursor-help">info</span>
                    <span className="absolute left-4 top-full mt-1 z-50 w-72 p-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface-variant shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      How prompt caching works on this provider. "Explicit" requires marking cacheable prefixes. "Automatic" caches repeated patterns without configuration.
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingA?.prompt_caching_type || (pricingA?.prompt_caching ? '✓' : '✗')}</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingB?.prompt_caching_type || (pricingB?.prompt_caching ? '✓' : '✗')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-sm leading-relaxed text-on-surface-variant space-y-4">
            <p dangerouslySetInnerHTML={{ __html: seoContent?.introduction }} />

            <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant pt-2 font-label-mono">
              Pricing Structure &amp; Financial Efficiency
            </h3>
            <p dangerouslySetInnerHTML={{ __html: seoContent?.pricingDeepDive }} />

            <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant pt-2 font-label-mono">
              Latency Benchmarks &amp; Context Limits
            </h3>
            <p dangerouslySetInnerHTML={{ __html: seoContent?.performanceReview }} />

            <div className="bg-surface-container dark:bg-surface-container-dark rounded-lg p-4 font-mono text-xs border border-outline-variant dark:border-outline-dark space-y-2">
              <p className="font-bold">Total Cost Calculus Model Applied:</p>
              <p>
                Cost = (Input_Tokens &times; ${pricingA?.input_price_per_m || pricingA?.input_cost_per_1m}/M) + (Output_Tokens &times; ${pricingA?.output_price_per_m || pricingA?.output_cost_per_1m}/M)
                {pricingA?.cache_hit_discount_rate != null && (
                  <span className="text-success ml-2">[Cache: {(pricingA.cache_hit_discount_rate * 100).toFixed(0)}% off reads{pricingA.cache_write_cost_per_1m ? `, $${pricingA.cache_write_cost_per_1m}/M writes` : ''}]</span>
                )}
              </p>
              {pricingB && (
                <p>
                  vs ({pricingB?.input_price_per_m || pricingB?.input_cost_per_1m}/M in, {pricingB?.output_price_per_m || pricingB?.output_cost_per_1m}/M out)
                  {pricingB?.cache_hit_discount_rate != null && (
                    <span className="text-success ml-2">[Cache: {(pricingB.cache_hit_discount_rate * 100).toFixed(0)}% off reads{pricingB.cache_write_cost_per_1m ? `, $${pricingB.cache_write_cost_per_1m}/M writes` : ''}]</span>
                  )}
                </p>
              )}
            </div>

            {providerA.discount_promo && (
              <div className="bg-primary-container-light/30 rounded-lg p-4 border border-primary-container/30">
                <p className="font-bold text-primary text-sm">{providerA.name} Promotion</p>
                <p className="text-on-surface-variant">{providerA.discount_promo}</p>
              </div>
            )}
            {providerB.discount_promo && (
              <div className="bg-primary-container-light/30 rounded-lg p-4 border border-primary-container/30">
                <p className="font-bold text-primary text-sm">{providerB.name} Promotion</p>
                <p className="text-on-surface-variant">{providerB.discount_promo}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
