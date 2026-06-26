// src/utils/seoGenerator.js

function ensureHttps(url) {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

export function generateProgrammaticSeoContent(model, providerA, providerB, pricingA, pricingB) {
  const urlA = ensureHttps(providerA.affiliate_url);
  const urlB = ensureHttps(providerB.affiliate_url);

  // 1. Calculate price-differences
  const inputDiff = parseFloat(pricingB.input_price_per_m) / parseFloat(pricingA.input_price_per_m);
  const outputDiff = parseFloat(pricingB.output_price_per_m) / parseFloat(pricingA.output_price_per_m);

  const cheaperInputProvider = inputDiff > 1 ? providerA : providerB;
  const expensiveInputProvider = inputDiff > 1 ? providerB : providerA;
  const absMultiplier = inputDiff > 1 ? inputDiff.toFixed(1) : (1 / inputDiff).toFixed(1);

  const cheaperPricing = inputDiff > 1 ? pricingA : pricingB;
  const expensivePricing = inputDiff > 1 ? pricingB : pricingA;

  const cheaperUrl = inputDiff > 1 ? urlA : urlB;
  const expensiveUrl = inputDiff > 1 ? urlB : urlA;

  // 2. Build promotion links if available
  const promoA = providerA.discount_promo ? `<a href="${urlA}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-container transition-colors">${providerA.name} promotion</a>` : null;
  const promoB = providerB.discount_promo ? `<a href="${urlB}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-container transition-colors">${providerB.name} promotion</a>` : null;

  const promoLinks = [promoA, promoB].filter(Boolean).join(' and ');

  // 3. Draft dynamic structured paragraphs with embedded links
  return {
    introduction: `Comparing open-weights inference options for the ${model.name} model reveals significant cost-variance depending on the provider you choose. For developer teams deploying agent workflows or real-time query portals, selecting the correct host directly impacts net margins. Below, we break down the operational pricing models and verified server characteristics for <a href="${urlA}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-container transition-colors">${providerA.name}</a> and <a href="${urlB}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-container transition-colors">${providerB.name}</a>.`,
    
    pricingDeepDive: `In terms of raw input costs, <a href="${cheaperUrl}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-container transition-colors">${cheaperInputProvider.name}</a> offers a substantial financial advantage. Currently, ${cheaperInputProvider.name} is priced at $${cheaperPricing.input_price_per_m}/M input tokens, which is approximately ${absMultiplier}x cheaper than <a href="${expensiveUrl}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-container transition-colors">${expensiveInputProvider.name}</a> ($${expensivePricing.input_price_per_m}/M). When scaling to production environments of over 10 million monthly queries, this cost multiplier represents a considerable delta in regular operations.${promoLinks ? ` Be sure to check out available ${promoLinks} for additional savings.` : ''}`,

    performanceReview: `Beyond cost, developer teams must consider context window sizes and caching. While ${model.name} natively supports a ${model.context_window.toLocaleString()} token context window, your actual hosting limit depends on provider constraints. <a href="${urlA}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-container transition-colors">${providerA.name}</a> supports up to ${pricingA.latency_tps} tokens per second with ${pricingA.prompt_caching ? 'active Prompt Caching' : 'no prompt caching'}, while <a href="${urlB}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-container transition-colors">${providerB.name}</a> processes requests at a speed of ${pricingB.latency_tps} tokens per second. Choosing the optimal provider requires balancing these latency limits against raw cost arbitrage.`
  };
}