// src/utils/seoGenerator.js

import { convertPrice, getCurrencySymbol } from './currency';

function ensureHttps(url) {
  if (!url) return '#';
  // Extract URL from markdown format [text](url)
  const markdownMatch = url.match(/\[.*?\]\((.*?)\)/);
  if (markdownMatch) url = markdownMatch[1];
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

export function generateProgrammaticSeoContent(model, providerA, providerB, pricingA, pricingB, currency = 'USD', rates = null) {
  const urlA = ensureHttps(providerA.affiliate_url);
  const urlB = ensureHttps(providerB.affiliate_url);
  const symbol = getCurrencySymbol(currency);

  function fmt(usdPrice) {
    if (!rates || currency === 'USD') return `$${usdPrice}`;
    const converted = convertPrice(usdPrice, 'USD', currency, rates);
    return `${symbol}${converted.toFixed(2)}`;
  }

  // 1. Calculate price-differences
  const inputDiff = parseFloat(pricingB.input_price_per_m) / parseFloat(pricingA.input_price_per_m);
  const outputDiff = parseFloat(pricingB.output_price_per_m) / parseFloat(pricingA.output_price_per_m);

  const INPUT_EQUALITY_THRESHOLD = 0.01;
  const pricesEqual = Math.abs(inputDiff - 1) <= INPUT_EQUALITY_THRESHOLD;

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
  const linkA = `<a href="${urlA}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-container transition-colors">${providerA.name}</a>`;
  const linkB = `<a href="${urlB}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-container transition-colors">${providerB.name}</a>`;

  let introduction;
  let pricingDeepDive;

  if (pricesEqual) {
    introduction = `Comparing open-weights inference options for the ${model.name} model shows that both providers offer identical input pricing, making cost less of a differentiator. For developer teams deploying agent workflows or real-time query portals, the decision between these hosts should factor in throughput, caching, and latency rather than raw price. Below, we break down the operational pricing models and verified server characteristics for ${linkA} and ${linkB}.`;

    pricingDeepDive = `Both ${linkA} and ${linkB} currently charge the same rate for ${model.name} input tokens at ${fmt(pricingA.input_price_per_m)}/M. With no meaningful cost difference on the input side, your choice should be guided by other factors such as output pricing, throughput, and caching support.${promoLinks ? ` Be sure to check out available ${promoLinks} for additional savings.` : ''}`;
  } else {
    introduction = `Comparing open-weights inference options for the ${model.name} model reveals cost-variance depending on the provider you choose. For developer teams deploying agent workflows or real-time query portals, selecting the correct host directly impacts net margins. Below, we break down the operational pricing models and verified server characteristics for ${linkA} and ${linkB}.`;

    pricingDeepDive = `In terms of raw input costs, <a href="${cheaperUrl}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-container transition-colors">${cheaperInputProvider.name}</a> offers a financial advantage. Currently, ${cheaperInputProvider.name} is priced at ${fmt(cheaperPricing.input_price_per_m)}/M input tokens, which is approximately ${absMultiplier}x cheaper than <a href="${expensiveUrl}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-container transition-colors">${expensiveInputProvider.name}</a> (${fmt(expensivePricing.input_price_per_m)}/M). When scaling to production environments of over 10 million monthly queries, this cost multiplier represents a considerable delta in regular operations.${promoLinks ? ` Be sure to check out available ${promoLinks} for additional savings.` : ''}`;
  }

  const performanceReview = `Beyond cost, developer teams must consider context window sizes and caching. While ${model.name} natively supports a ${model.context_window.toLocaleString()} token context window, your actual hosting limit depends on provider constraints. ${linkA} supports up to ${pricingA.latency_tps} tokens per second with ${pricingA.prompt_caching ? 'active Prompt Caching' : 'no prompt caching'}, while ${linkB} processes requests at a speed of ${pricingB.latency_tps} tokens per second. Choosing the optimal provider requires balancing these latency limits against other operational factors.`;

  return { introduction, pricingDeepDive, performanceReview };
}