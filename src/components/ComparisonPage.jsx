import React, { useState, useEffect } from 'react';
import { fetchComparison } from '../utils/supabase';
import InteractiveCalculator from './InteractiveCalculator';
import { generateProgrammaticSeoContent } from '../utils/seoGenerator';

export default function ComparisonPage({ modelSlug, providerASlug, providerBSlug }) {
  const [data, setData] = useState(null);
  const [seoContent, setSeoContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchComparison(modelSlug, providerASlug, providerBSlug)
      .then(result => {
        if (result) {
          setData(result);
          const seo = generateProgrammaticSeoContent(
            result.model,
            result.providerA,
            result.providerB,
            result.pricingA,
            result.pricingB
          );
          setSeoContent(seo);
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
                  <th className="text-left py-3 px-4 font-label-mono text-xs uppercase tracking-wider text-on-surface-variant">Feature</th>
                  <th className="text-left py-3 px-4 font-headline-md text-sm text-primary font-semibold">{providerA.name}</th>
                  <th className="text-left py-3 px-4 font-headline-md text-sm text-primary font-semibold">{providerB.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium">Input Price (per 1M tokens)</td>
                  <td className="py-3 px-4 font-mono text-on-surface">${pricingA?.input_price_per_m}</td>
                  <td className="py-3 px-4 font-mono text-on-surface">${pricingB?.input_price_per_m}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium">Output Price (per 1M tokens)</td>
                  <td className="py-3 px-4 font-mono text-on-surface">${pricingA?.output_price_per_m}</td>
                  <td className="py-3 px-4 font-mono text-on-surface">${pricingB?.output_price_per_m}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium">Throughput</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingA?.latency_tps} TPS</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{pricingB?.latency_tps} TPS</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium">Prompt Caching</td>
                  <td className="py-3 px-4 text-on-surface">{pricingA?.prompt_caching ? '✓ Supported' : '✗ Not Supported'}</td>
                  <td className="py-3 px-4 text-on-surface">{pricingB?.prompt_caching ? '✓ Supported' : '✗ Not Supported'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium">Daily Limit</td>
                  <td className="py-3 px-4 text-on-surface">{pricingA?.daily_limit || 'Unlimited'}</td>
                  <td className="py-3 px-4 text-on-surface">{pricingB?.daily_limit || 'Unlimited'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-on-surface-variant font-medium">Context Window</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{model?.context_window?.toLocaleString()} tokens</td>
                  <td className="py-3 px-4 font-mono text-on-surface">{model?.context_window?.toLocaleString()} tokens</td>
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
                Cost = (Input_Tokens &times; ${pricingA?.input_price_per_m}/M) + (Output_Tokens &times; ${pricingA?.output_price_per_m}/M)
              </p>
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
