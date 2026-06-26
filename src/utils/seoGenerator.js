// src/utils/seoGenerator.js

export function generateProgrammaticSeoContent(model, providerA, providerB, pricingA, pricingB) {
  // 1. Calculate price-differences
  const inputDiff = parseFloat(pricingB.input_price_per_m) / parseFloat(pricingA.input_price_per_m);
  const outputDiff = parseFloat(pricingB.output_price_per_m) / parseFloat(pricingA.output_price_per_m);

  const cheaperInputProvider = inputDiff > 1 ? providerA.name : providerB.name;
  const expensiveInputProvider = inputDiff > 1 ? providerB.name : providerA.name;
  const absMultiplier = inputDiff > 1 ? inputDiff.toFixed(1) : (1 / inputDiff).toFixed(1);

  // 2. Draft dynamic structured paragraphs
  return {
    introduction: `Comparing open-weights inference options for the ${model.name} model reveals significant cost-variance depending on the provider you choose. For developer teams deploying agent workflows or real-time query portals, selecting the correct host directly impacts net margins. Below, we break down the operational pricing models and verified server characteristics for ${providerA.name} and ${providerB.name}.`,
    
    pricingDeepDive: `In terms of raw input costs, ${cheaperInputProvider} offers a substantial financial advantage. Currently, ${cheaperInputProvider} is priced at $${cheaperInputProvider === providerA.name ? pricingA.input_price_per_m : pricingB.input_price_per_m}/M input tokens, which is approximately ${absMultiplier}x cheaper than ${expensiveInputProvider} ($${expensiveInputProvider === providerA.name ? pricingA.input_price_per_m : pricingB.input_price_per_m}/M). When scaling to production environments of over 10 million monthly queries, this cost multiplier represents a considerable delta in regular operations.`,

    performanceReview: `Beyond cost, developer teams must consider context window sizes and caching. While ${model.name} natively supports a ${model.context_window.toLocaleString()} token context window, your actual hosting limit depends on provider constraints. ${providerA.name} supports up to ${pricingA.latency_tps} tokens per second with ${pricingA.prompt_caching ? 'active Prompt Caching' : 'no prompt caching'}, while ${providerB.name} processes requests at a speed of ${pricingB.latency_tps} tokens per second. Choosing the optimal provider requires balancing these latency limits against raw cost arbitrage.`
  };
}