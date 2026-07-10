// src/pages/api/sync-pricing.js
// Multi-source pricing sync — bulk-optimized for Cloudflare's subrequest limit
// Sources: OpenRouter, DeepInfra, Mistral, Groq, Fireworks, Cerebras, SambaNova, NVIDIA NIM, Cohere, Google Gemini, Hugging Face, Artificial Analysis

export const prerender = false;

const BATCH = 80;

const PROVIDER_INFO = {
  openai: { name: 'OpenAI', url: 'https://openai.com' },
  anthropic: { name: 'Anthropic', url: 'https://anthropic.com' },
  google: { name: 'Google', url: 'https://ai.google.dev' },
  mistral: { name: 'Mistral', url: 'https://mistral.ai' },
  meta: { name: 'Meta', url: 'https://llama.meta.com' },
  deepseek: { name: 'DeepSeek', url: 'https://deepseek.com' },
  cohere: { name: 'Cohere', url: 'https://cohere.com' },
  '01-ai': { name: '01.AI', url: 'https://01.ai' },
  nvidia: { name: 'NVIDIA', url: 'https://nvidia.com' },
  microsoft: { name: 'Microsoft', url: 'https://microsoft.com' },
  deepinfra: { name: 'DeepInfra', url: 'https://deepinfra.com' },
  'together-ai': { name: 'Together AI', url: 'https://together.ai' },
  groq: { name: 'Groq', url: 'https://groq.com' },
  fireworks: { name: 'Fireworks AI', url: 'https://fireworks.ai' },
  cerebras: { name: 'Cerebras', url: 'https://cerebras.ai' },
  sambanova: { name: 'SambaNova', url: 'https://sambanova.ai' },
  nvidia: { name: 'NVIDIA NIM', url: 'https://nvidia.com' },
  'huggingface': { name: 'Hugging Face', url: 'https://huggingface.co' },
  'artificial-analysis': { name: 'Artificial Analysis', url: 'https://artificialanalysis.ai' },
};

const PROVIDER_META = {
  openai: {
    avg_ttft_ms: 450, avg_throughput_tps: 85, p50_latency: 1200, p99_latency: 4500,
    uptime_30s: 0.9999, concurrency_limit: 500,
    rate_limits: { free: { rpm: 200, tpm: 40000 }, tier1: { rpm: 500, tpm: 200000 }, tier2: { rpm: 5000, tpm: 2000000 }, tier3: { rpm: 10000, tpm: 10000000 } },
    zero_data_retention: false, is_moderated: true, batch_discount: 0.50,
  },
  anthropic: {
    avg_ttft_ms: 550, avg_throughput_tps: 75, p50_latency: 1500, p99_latency: 5500,
    uptime_30s: 0.9998, concurrency_limit: 400,
    rate_limits: { free: { rpm: 50, tpm: 40000 }, pro: { rpm: 1000, tpm: 400000 }, enterprise: { rpm: 4000, tpm: 4000000 } },
    zero_data_retention: false, is_moderated: true, batch_discount: 0.50,
  },
  mistral: {
    avg_ttft_ms: 500, avg_throughput_tps: 70, p50_latency: 1400, p99_latency: 5000,
    uptime_30s: 0.9995, concurrency_limit: 200,
    rate_limits: { free: { rpm: 30, tpm: 30000 }, paid: { rpm: 500, tpm: 500000 }, enterprise: { rpm: 3000, tpm: 3000000 } },
    zero_data_retention: true, is_moderated: true, batch_discount: 0.50,
  },
  deepinfra: {
    avg_ttft_ms: 350, avg_throughput_tps: 120, p50_latency: 800, p99_latency: 3000,
    uptime_30s: 0.9990, concurrency_limit: 100,
    rate_limits: { free: { rpm: 10, tpm: 20000 }, pro: { rpm: 200, tpm: 1000000 }, enterprise: { rpm: 1000, tpm: 10000000 } },
    zero_data_retention: true, is_moderated: false, batch_discount: 0,
  },
  'together-ai': {
    avg_ttft_ms: 380, avg_throughput_tps: 110, p50_latency: 900, p99_latency: 3200,
    uptime_30s: 0.9992, concurrency_limit: 100,
    rate_limits: { free: { rpm: 20, tpm: 30000 }, paid: { rpm: 500, tpm: 500000 }, enterprise: { rpm: 2000, tpm: 2000000 } },
    zero_data_retention: true, is_moderated: false, batch_discount: 0,
  },
  groq: {
    avg_ttft_ms: 200, avg_throughput_tps: 250, p50_latency: 500, p99_latency: 1500,
    uptime_30s: 0.9997, concurrency_limit: 30,
    rate_limits: { free: { rpm: 30, tpm: 13000 }, paid: { rpm: 300, tpm: 600000 }, enterprise: { rpm: 1000, tpm: 4000000 } },
    zero_data_retention: false, is_moderated: true, batch_discount: 0,
  },
  fireworks: {
    avg_ttft_ms: 300, avg_throughput_tps: 140, p50_latency: 700, p99_latency: 2500,
    uptime_30s: 0.9994, concurrency_limit: 200,
    rate_limits: { free: { rpm: 20, tpm: 30000 }, paid: { rpm: 500, tpm: 1000000 }, enterprise: { rpm: 3000, tpm: 10000000 } },
    zero_data_retention: true, is_moderated: false, batch_discount: 0,
  },
  deepseek: {
    avg_ttft_ms: 600, avg_throughput_tps: 60, p50_latency: 1800, p99_latency: 6000,
    uptime_30s: 0.9985, concurrency_limit: 50,
    rate_limits: { free: { rpm: 10, tpm: 10000 }, paid: { rpm: 100, tpm: 500000 }, enterprise: { rpm: 500, tpm: 5000000 } },
    zero_data_retention: false, is_moderated: true, batch_discount: 0,
  },
  cerebras: {
    avg_ttft_ms: 150, avg_throughput_tps: 2600, p50_latency: 300, p99_latency: 800,
    uptime_30s: 0.9995, concurrency_limit: 30,
    rate_limits: { free: { rpm: 30, tpm: 100000 }, pro: { rpm: 100, tpm: 400000 }, enterprise: { rpm: 500, tpm: 2000000 } },
    zero_data_retention: false, is_moderated: false, batch_discount: 0,
  },
  sambanova: {
    avg_ttft_ms: 180, avg_throughput_tps: 2000, p50_latency: 350, p99_latency: 900,
    uptime_30s: 0.9990, concurrency_limit: 20,
    rate_limits: { free: { rpm: 20, tpm: 60000 }, paid: { rpm: 200, tpm: 1000000 }, enterprise: { rpm: 1000, tpm: 5000000 } },
    zero_data_retention: false, is_moderated: false, batch_discount: 0,
  },
  nvidia: {
    avg_ttft_ms: 400, avg_throughput_tps: 90, p50_latency: 1000, p99_latency: 4000,
    uptime_30s: 0.9995, concurrency_limit: 40,
    rate_limits: { free: { rpm: 40, tpm: 50000 }, paid: { rpm: 500, tpm: 500000 }, enterprise: { rpm: 2000, tpm: 5000000 } },
    zero_data_retention: false, is_moderated: false, batch_discount: 0,
  },
  huggingface: {
    avg_ttft_ms: 500, avg_throughput_tps: 80, p50_latency: 1200, p99_latency: 5000,
    uptime_30s: 0.9990, concurrency_limit: 50,
    rate_limits: { free: { rpm: 20, tpm: 30000 }, pro: { rpm: 200, tpm: 500000 }, enterprise: { rpm: 1000, tpm: 5000000 } },
    zero_data_retention: false, is_moderated: false, batch_discount: 0,
  },
};

function slugify(t) { return t.toLowerCase().replace(/:free$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function titleCase(s) { return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

// Generate a proper display name from a raw model ID
function generateModelName(rawId) {
  if (!rawId) return '';
  // Strip org prefix
  let n = rawId.replace(/^[^/]+\//, '');
  // Replace hyphens/underscores with spaces
  n = n.replace(/[-_]+/g, ' ');
  // Split and format each word
  n = n.split(' ').map(w => {
    if (!w) return '';
    // Already uppercase acronym (2+ chars): keep as-is
    if (/^[A-Z]{2,}$/.test(w)) return w;
    // Number followed by unit: "300m" → "300M", "70b" → "70B"
    if (/^\d+[a-z]+$/i.test(w)) return w.replace(/[a-z]+$/i, m => m.toUpperCase());
    // Starts with uppercase and has lowercase: likely already proper (e.g. "Llama")
    if (/^[A-Z][a-z]/.test(w)) return w;
    // All lowercase — capitalize first letter
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
  return n;
}

// Normalize model name to a canonical slug that matches across providers
function normalizeModelSlug(rawName) {
  let name = rawName;

  // Strip org prefixes: meta-llama/, accounts/fireworks/models/, etc.
  name = name.replace(/^[^/]+\//, '');

  // Lowercase
  name = name.toLowerCase();

  // Strip quantization/format suffixes first
  name = name.replace(/[-_](awq|gptq|gguf|fp8|fp16|int4|int8|bf16|mlx)$/g, '');

  // Strip common variant suffixes (order matters — longer first)
  name = name.replace(/[-_]instruct[-_]?turbo$/g, '');
  name = name.replace(/[-_]chat[-_]?turbo$/g, '');
  name = name.replace(/[-_]preview$/g, '');
  name = name.replace(/[-_]instruct$/g, '');
  name = name.replace(/[-_]chat$/g, '');
  name = name.replace(/[-_]turbo$/g, '');
  name = name.replace(/[-_]versatile$/g, '');
  name = name.replace(/[-_]latest$/g, '');

  // Strip version suffixes like -v0.1, -v2
  name = name.replace(/[-_]v\d+(\.\d+)?$/g, '');

  // Strip trailing dates like -20241022, -20240229
  name = name.replace(/[-_]\d{8}$/g, '');

  // Normalize "llama3" → "llama-3", "llama2" → "llama-2"
  name = name.replace(/(llama)\s*(\d)/g, '$1-$2');
  // Normalize "mixtral8x7b" → "mixtral-8x7b"
  name = name.replace(/(mixtral)\s*(\d)/g, '$1-$2');

  // Replace any non-alphanumeric (except -) with -
  name = name.replace(/[^a-z0-9-]+/g, '-');

  // Collapse multiple dashes
  name = name.replace(/-{2,}/g, '-');

  // Strip leading/trailing dashes
  name = name.replace(/^-|-$/g, '');

  return name;
}

function parseOpenRouterModels(data) {
  return (data || []).filter(m => m.pricing && !m.id.endsWith(':free') && parseFloat(m.pricing.prompt) > 0).map(m => {
    const parts = m.id.split('/');
    const org = parts[0], name = parts.slice(1).join('/');
    const modelName = (m.name && m.name !== m.id) ? m.name : generateModelName(m.id);
    const promptPrice = parseFloat(m.pricing.prompt) * 1e6;
    const cacheRead = parseFloat(m.pricing.input_cache_read || 0) * 1e6;
    const cacheWrite = parseFloat(m.pricing.input_cache_write || 0) * 1e6;
    const cacheDiscount = promptPrice > 0 && cacheRead > 0 ? +(cacheRead / promptPrice).toFixed(4) : null;
    return {
      sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName,
      providerSlug: slugify(org), input: promptPrice, output: parseFloat(m.pricing.completion) * 1e6,
      contextWindow: m.context_length || null, maxOutput: m.top_provider?.max_completion_tokens || null, source: 'openrouter',
      _maxCompletion: m.top_provider?.max_completion_tokens || null,
      _maxContext: m.context_length || null,
      _cacheDiscountRate: cacheDiscount,
      _cacheWriteCost: cacheWrite > 0 ? cacheWrite : null,
    };
  });
}

function parseOpenAIModels(data) {
  if (!data?.data) return [];
  const P = {
    'gpt-4o': [2.50, 10], 'gpt-4o-2024-08-06': [2.50, 10], 'gpt-4o-2024-11-20': [2.50, 10],
    'gpt-4o-mini': [0.15, 0.60], 'gpt-4o-mini-2024-07-18': [0.15, 0.60],
    'gpt-4-turbo': [10, 30], 'gpt-4': [30, 60], 'gpt-3.5-turbo': [0.50, 1.50],
    'o1': [15, 60], 'o1-2024-12-17': [15, 60], 'o1-mini': [3, 12], 'o1-mini-2024-12-17': [3, 12],
    'o3-mini': [1.10, 4.40], 'o3-mini-2025-01-31': [1.10, 4.40], 'o3': [10, 40],
    'o4-mini': [1.10, 4.40],
    'gpt-4.1': [2, 8], 'gpt-4.1-mini': [0.40, 1.60], 'gpt-4.1-nano': [0.10, 0.40],
  };
  const OPENAI_MAX_OUTPUT = {
    'gpt-4o': 16384, 'gpt-4o-mini': 16384, 'gpt-4-turbo': 4096, 'gpt-4': 8192,
    'o1': 100000, 'o1-mini': 65536, 'o3-mini': 100000, 'o3': 100000, 'o4-mini': 100000,
    'gpt-4.1': 32768, 'gpt-4.1-mini': 32768, 'gpt-4.1-nano': 32768,
  };
  return data.data.filter(m => !m.id.startsWith('ft:') && P[m.id]).map(m => ({
    sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName: m.name || m.id,
    providerSlug: 'openai', input: P[m.id][0], output: P[m.id][1],
    contextWindow: m.context_window || null, maxOutput: OPENAI_MAX_OUTPUT[m.id] || null, source: 'openai',
    _maxCompletion: OPENAI_MAX_OUTPUT[m.id] || null,
    _maxContext: m.context_window || null,
    _cachingType: 'automatic',
  }));
}

function parseAnthropicModels() {
  return [
    ['claude-opus-4-20250514', 'Claude Opus 4', 200000, 32000, 15, 75],
    ['claude-sonnet-4-20250514', 'Claude Sonnet 4', 200000, 64000, 3, 15],
    ['claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 200000, 8192, 3, 15],
    ['claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', 200000, 8192, 0.80, 4],
    ['claude-3-opus-20240229', 'Claude 3 Opus', 200000, 4096, 15, 75],
    ['claude-3-sonnet-20240229', 'Claude 3 Sonnet', 200000, 4096, 3, 15],
    ['claude-3-haiku-20240307', 'Claude 3 Haiku', 200000, 4096, 0.25, 1.25],
  ].map(([id, name, ctx, max, inp, out]) => ({
    sourceModelId: id, modelSlug: normalizeModelSlug(id), modelName: name,
    providerSlug: 'anthropic', input: inp, output: out,
    contextWindow: ctx, maxOutput: max, source: 'anthropic',
    _maxCompletion: max, _maxContext: ctx,
    _cachingType: 'explicit',
  }));
}

function parseMistralModels(data) {
  if (!data?.data) return [];
  return data.data.filter(m => m.pricing && parseFloat(m.pricing.prompt) > 0).map(m => ({
    sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName: m.name || m.id,
    providerSlug: 'mistral', input: parseFloat(m.pricing.prompt) * 1e6, output: parseFloat(m.pricing.completion) * 1e6,
    contextWindow: m.max_context_length || null, maxOutput: null, source: 'mistral',
  }));
}

// DeepInfra: pricing varies — could be object {input_tokens, output_tokens} or string "@{input_tokens=X; output_tokens=Y}"
// NOTE: DeepInfra prices are already per 1M tokens — do NOT multiply by 1e6
function parseDeepInfraModels(data) {
  if (!data?.data) return [];
  return data.data.filter(m => {
    const p = extractDeepInfraPricing(m);
    return p && p.input > 0;
  }).map(m => {
    const p = extractDeepInfraPricing(m);
    const meta = m.metadata || {};
    const modelName = (m.name && m.name !== m.id) ? m.name : generateModelName(m.id);
    const desc = (meta.description || '').toLowerCase();
    let quant = null;
    if (desc.includes('fp8')) quant = 'fp8';
    else if (desc.includes('fp16')) quant = 'fp16';
    else if (desc.includes('int8') || desc.includes('int 8')) quant = 'int8';
    else if (desc.includes('int4') || desc.includes('int 4')) quant = 'int4';
    else if (desc.includes('awq')) quant = 'awq';
    else if (desc.includes('gptq')) quant = 'gptq';
    else if (desc.includes('gguf')) quant = 'gguf';
    return {
      sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName,
      providerSlug: 'deepinfra', input: p.input, output: p.output,
      contextWindow: meta.context_length || null, maxOutput: meta.max_tokens || null, source: 'deepinfra',
      _maxCompletion: meta.max_tokens || null,
      _maxContext: meta.context_length || null,
      _quantLevel: quant,
    };
  });
}

function extractDeepInfraPricing(m) {
  const meta = m.metadata || {};
  const pricing = meta.pricing;
  if (!pricing) return null;
  let input = null, output = null;

  if (typeof pricing === 'object' && pricing.input_tokens !== undefined) {
    input = parseFloat(pricing.input_tokens);
    output = parseFloat(pricing.output_tokens);
  } else if (typeof pricing === 'string') {
    const inputMatch = pricing.match(/input_tokens[=:]\s*([\d.e+-]+)/);
    const outputMatch = pricing.match(/output_tokens[=:]\s*([\d.e+-]+)/);
    if (inputMatch) input = parseFloat(inputMatch[1]);
    if (outputMatch) output = parseFloat(outputMatch[1]);
  }

  if (input === null || isNaN(input)) return null;
  if (output === null || isNaN(output)) output = input;
  return { input, output };
}

// Together AI: pricing.prompt/completion per token
function parseTogetherModels(data) {
  if (!data?.data) return [];
  return data.data.filter(m => m.pricing?.prompt && parseFloat(m.pricing.prompt) > 0).map(m => ({
    sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName: m.name || m.id,
    providerSlug: 'together-ai', input: parseFloat(m.pricing.prompt) * 1e6, output: parseFloat(m.pricing.completion) * 1e6,
    contextWindow: m.context_length || null, maxOutput: m.max_output || null, source: 'together-ai',
  }));
}

// Groq: no pricing in API, hardcoded
function parseGroqModels(data) {
  if (!data?.data) return [];
  const GROQ_PRICES = {
    'llama-3.3-70b-versatile': [0.59, 0.79],
    'llama-3.1-8b-instant': [0.05, 0.08],
    'llama-3.1-70b-versatile': [0.59, 0.79],
    'llama-3.1-405b-reasoning': [2.00, 2.00],
    'llama-3.2-1b-preview': [0.03, 0.03],
    'llama-3.2-3b-preview': [0.06, 0.06],
    'llama-3.2-11b-vision-preview': [0.18, 0.18],
    'llama-3.2-90b-vision-preview': [0.90, 0.90],
    'gemma2-9b-it': [0.20, 0.20],
    'mixtral-8x7b-32768': [0.24, 0.24],
    'mixtral-8x22b-32768': [0.60, 0.60],
    'mistral-small-3.1-24b-instruct': [0.10, 0.10],
    'qwen-qwq-32b': [0.29, 0.39],
    'deepseek-r1-distill-llama-70b': [0.39, 0.59],
  };
  return data.data.filter(m => GROQ_PRICES[m.id]).map(m => ({
    sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName: m.name || m.id,
    providerSlug: 'groq', input: GROQ_PRICES[m.id][0], output: GROQ_PRICES[m.id][1],
    contextWindow: m.context_window || 32768, maxOutput: null, source: 'groq',
  }));
}

// Fireworks: pricing in .pricing.prompt/.pricing.completion per token
function parseFireworksModels(data) {
  if (!data?.list) return [];
  return data.list.filter(m => m.pricing?.prompt && parseFloat(m.pricing.prompt) > 0).map(m => ({
    sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName: m.name || m.id,
    providerSlug: 'fireworks', input: parseFloat(m.pricing.prompt) * 1e6, output: parseFloat(m.pricing.completion) * 1e6,
    contextWindow: m.context_length || null, maxOutput: null, source: 'fireworks',
  }));
}

// Cerebras: OpenAI-compatible, pricing per 1M tokens
function parseCerebrasModels(data) {
  if (!data?.data) return [];
  const CEREBRAS_PRICES = {
    'llama-3.3-70b': [0.60, 0.60],
    'llama-3.1-8b': [0.10, 0.10],
    'llama-3.1-70b': [0.60, 0.60],
    'llama-3.1-405b': [2.00, 2.00],
    'qwen-2.5-32b': [0.40, 0.40],
    'gemma-2-9b': [0.10, 0.10],
  };
  return data.data.filter(m => {
    const slug = normalizeModelSlug(m.id);
    return CEREBRAS_PRICES[slug] || CEREBRAS_PRICES[m.id];
  }).map(m => {
    const slug = normalizeModelSlug(m.id);
    const prices = CEREBRAS_PRICES[slug] || CEREBRAS_PRICES[m.id];
    return {
      sourceModelId: m.id, modelSlug: slug, modelName: m.name || m.id,
      providerSlug: 'cerebras', input: prices[0], output: prices[1],
      contextWindow: m.context_window || 8192, maxOutput: null, source: 'cerebras',
    };
  });
}

// SambaNova: OpenAI-compatible, pricing per 1M tokens
function parseSambaNovaModels(data) {
  if (!data?.data) return [];
  const SAMBANOVA_PRICES = {
    'deepseek-r1': [0.80, 2.40],
    'deepseek-v3-0324': [0.90, 2.70],
    'llama-3.3-70b-instruct': [0.60, 0.60],
    'llama-3.1-8b-instruct': [0.10, 0.10],
    'llama-3.1-405b-instruct': [2.50, 2.50],
    'qwen-2.5-72b-instruct': [0.80, 0.80],
    'gemma-2-9b-it': [0.10, 0.10],
  };
  return data.data.filter(m => {
    const slug = normalizeModelSlug(m.id);
    return SAMBANOVA_PRICES[slug] || SAMBANOVA_PRICES[m.id];
  }).map(m => {
    const slug = normalizeModelSlug(m.id);
    const prices = SAMBANOVA_PRICES[slug] || SAMBANOVA_PRICES[m.id];
    return {
      sourceModelId: m.id, modelSlug: slug, modelName: m.name || m.id,
      providerSlug: 'sambanova', input: prices[0], output: prices[1],
      contextWindow: m.context_window || 8192, maxOutput: null, source: 'sambanova',
    };
  });
}

// NVIDIA NIM: OpenAI-compatible, pricing per 1M tokens
function parseNvidiaNimModels(data) {
  if (!data?.data) return [];
  const NVIDIA_PRICES = {
    'deepseek-ai/deepseek-r1': [0.55, 2.19],
    'meta/llama-3.3-70b-instruct': [0.20, 0.20],
    'meta/llama-3.1-8b-instruct': [0.02, 0.02],
    'meta/llama-3.1-405b-instruct': [2.50, 2.50],
    'nvidia/llama-3.1-nemotron-ultra-253b-v1': [1.50, 1.50],
    'qwen/qwen2.5-72b-instruct': [0.50, 0.50],
    'google/gemma-2-9b-it': [0.05, 0.05],
    'mistralai/mistral-large-2-instruct': [2.00, 2.00],
    'minimax/minimax-m2.7': [0.50, 1.50],
  };
  return data.data.filter(m => {
    const slug = normalizeModelSlug(m.id);
    return NVIDIA_PRICES[slug] || NVIDIA_PRICES[m.id];
  }).map(m => {
    const slug = normalizeModelSlug(m.id);
    const prices = NVIDIA_PRICES[slug] || NVIDIA_PRICES[m.id];
    return {
      sourceModelId: m.id, modelSlug: slug, modelName: m.name || m.id,
      providerSlug: 'nvidia', input: prices[0], output: prices[1],
      contextWindow: m.context_window || 128000, maxOutput: null, source: 'nvidia',
    };
  });
}

// Hugging Face: OpenAI-compatible router, pricing from model cards
function parseHuggingFaceModels(data) {
  if (!data?.data) return [];
  const HF_PRICES = {
    'meta-llama-3.1-8b-instruct': [0.05, 0.05],
    'meta-llama-3.3-70b-instruct': [0.30, 0.30],
    'mistral-7b-instruct-v0.3': [0.02, 0.02],
    'qwen2.5-7b-instruct': [0.03, 0.03],
    'phi-3.5-mini-instruct': [0.03, 0.03],
    'gemma-2-9b-it': [0.05, 0.05],
    'deepseek-r1': [0.50, 1.50],
  };
  return data.data.filter(m => {
    const slug = normalizeModelSlug(m.id);
    return HF_PRICES[slug] || HF_PRICES[m.id];
  }).map(m => {
    const slug = normalizeModelSlug(m.id);
    const prices = HF_PRICES[slug] || HF_PRICES[m.id];
    return {
      sourceModelId: m.id, modelSlug: slug, modelName: m.name || m.id,
      providerSlug: 'huggingface', input: prices[0], output: prices[1],
      contextWindow: m.context_window || 128000, maxOutput: null, source: 'huggingface',
    };
  });
}

// Artificial Analysis: pricing already per 1M tokens — no multiplication needed
function parseArtificialAnalysisModels(data) {
  if (!data?.data) return [];
  return data.data.filter(m => m.pricing?.price_1m_input_tokens > 0).map(m => {
    const creator = m.model_creator?.name || 'Unknown';
    const creatorSlug = slugify(creator);
    const inModal = m.capabilities?.input_modalities || ['text'];
    const outModal = m.capabilities?.output_modalities || ['text'];
    const benchmarks = {};
    if (m.evaluations?.artificial_analysis_intelligence_index != null) benchmarks.intelligence_index = m.evaluations.artificial_analysis_intelligence_index;
    if (m.evaluations?.artificial_analysis_coding_index != null) benchmarks.coding_index = m.evaluations.artificial_analysis_coding_index;
    if (m.evaluations?.artificial_analysis_agentic_index != null) benchmarks.agentic_index = m.evaluations.artificial_analysis_agentic_index;
    return {
      sourceModelId: m.id, modelSlug: normalizeModelSlug(m.slug || m.name), modelName: m.name,
      providerSlug: creatorSlug, input: m.pricing.price_1m_input_tokens, output: m.pricing.price_1m_output_tokens,
      contextWindow: m.context_window_tokens || null, maxOutput: null, source: 'artificialanalysis',
      _maxCompletion: null,
      _maxContext: m.context_window_tokens || null,
      _baseInput: m.pricing.price_1m_input_tokens,
      _baseOutput: m.pricing.price_1m_output_tokens,
      _cacheHit: m.pricing.price_1m_cache_hit_tokens || null,
      _cacheWrite: m.pricing.price_1m_cache_write_tokens || null,
      _cacheDiscountRate: (m.pricing.price_1m_cache_hit_tokens != null && m.pricing.price_1m_input_tokens > 0)
        ? +(m.pricing.price_1m_cache_hit_tokens / m.pricing.price_1m_input_tokens).toFixed(4) : null,
      _inputModalities: inModal,
      _outputModalities: outModal,
      _benchmarks: Object.keys(benchmarks).length > 0 ? benchmarks : null,
      _avgTtftMs: m.performance?.median_time_to_first_token_seconds ? +(m.performance.median_time_to_first_token_seconds * 1000).toFixed(2) : null,
      _avgThroughputTps: m.performance?.median_output_tokens_per_second || null,
      _aa: {
        intelligenceIndex: m.evaluations?.artificial_analysis_intelligence_index || null,
        codingIndex: m.evaluations?.artificial_analysis_coding_index || null,
        agenticIndex: m.evaluations?.artificial_analysis_agentic_index || null,
        medianTps: m.performance?.median_output_tokens_per_second || null,
        medianTtft: m.performance?.median_time_to_first_token_seconds || null,
        releaseDate: m.release_date || null,
        reasoningModel: m.reasoning_model || false,
      },
    };
  });
}

const REASONING_SLUGS = new Set([
  'o1', 'o1-mini', 'o3', 'o3-mini', 'o4-mini', 'o3-pro',
  'deepseek-r1', 'deepseek-v3', 'deepseek-chat',
  'qwen3-max-thinking', 'qwen3-235b-a22b-thinking', 'qwen3-coder-480b-a35b',
  'claude-opus-4', 'claude-opus-4-1', 'claude-opus-4-5', 'claude-opus-4-6', 'claude-opus-4-7', 'claude-opus-4-8',
  'claude-sonnet-4', 'claude-sonnet-4-5',
  'gemini-2-5-pro', 'gemini-2-5-flash',
  'kimi-k2',
]);

const CACHING_SLUGS = new Set([
  'claude-opus-4', 'claude-opus-4-1', 'claude-opus-4-5', 'claude-opus-4-6', 'claude-opus-4-7', 'claude-opus-4-8',
  'claude-sonnet-4', 'claude-sonnet-4-5', 'claude-3-5-sonnet', 'claude-3-5-haiku',
  'gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
  'o1', 'o3', 'o3-mini', 'o4-mini',
  'gemini-2-5-pro', 'gemini-2-5-flash', 'gemini-2-0-flash',
]);

const BENCHMARK_MODELS = {
  'gpt-4o':                    { coding_index: 38.8, math_index: 74.6, intelligence_index: 75.0 },
  'gpt-4o-mini':               { coding_index: 26.3, math_index: 70.2, intelligence_index: 70.0 },
  'gpt-4.1':                   { coding_index: 55.0, math_index: 78.0, intelligence_index: 80.0 },
  'gpt-4.1-mini':              { coding_index: 42.0, math_index: 72.0, intelligence_index: 73.0 },
  'o1':                        { coding_index: 48.9, math_index: 83.3, intelligence_index: 88.0 },
  'o3':                        { coding_index: 69.1, math_index: 96.7, intelligence_index: 92.0 },
  'o3-mini':                   { coding_index: 49.3, math_index: 87.3, intelligence_index: 85.0 },
  'o4-mini':                   { coding_index: 68.1, math_index: 93.0, intelligence_index: 89.0 },
  'claude-3-5-sonnet':         { coding_index: 49.0, math_index: 71.1, intelligence_index: 78.0 },
  'claude-sonnet-4':           { coding_index: 62.3, math_index: 79.0, intelligence_index: 85.0 },
  'claude-opus-4':             { coding_index: 72.5, math_index: 85.0, intelligence_index: 92.0 },
  'claude-opus-4-5':           { coding_index: 74.0, math_index: 88.0, intelligence_index: 94.0 },
  'deepseek-r1':               { coding_index: 49.2, math_index: 79.8, intelligence_index: 82.0 },
  'deepseek-v3':               { coding_index: 42.0, math_index: 65.0, intelligence_index: 75.0 },
  'gemini-2-5-pro':            { coding_index: 63.8, math_index: 92.0, intelligence_index: 90.0 },
  'gemini-2-5-flash':          { coding_index: 47.0, math_index: 85.0, intelligence_index: 82.0 },
  'gemini-2-0-flash':          { coding_index: 35.0, math_index: 75.0, intelligence_index: 76.0 },
  'qwen3-coder-480b-a35b':     { coding_index: 65.0, math_index: 82.0, intelligence_index: 86.0 },
  'llama-3.3-70b-versatile':   { coding_index: 32.0, math_index: 58.0, intelligence_index: 68.0 },
  'llama-3.1-405b-reasoning':  { coding_index: 38.0, math_index: 72.0, intelligence_index: 76.0 },
};

// Provider-specific rate limits and batch discounts (from documentation)
const PROVIDER_LIMITS = {
  openai:       { rpm: 10000, tpm: 1000000, batchDiscount: 0.50, cachingType: 'automatic' },
  anthropic:    { rpm: 4000,  tpm: 400000,  batchDiscount: 0.50, cachingType: 'explicit' },
  google:       { rpm: 600,   tpm: 4000000, batchDiscount: 0.50, cachingType: 'explicit' },
  mistral:      { rpm: 3000,  tpm: 5000000, batchDiscount: null, cachingType: null },
  deepseek:     { rpm: 60,    tpm: 100000,  batchDiscount: null, cachingType: 'automatic' },
  groq:         { rpm: 30,    tpm: 131072,  batchDiscount: null, cachingType: null },
  fireworks:    { rpm: 600,   tpm: 200000,  batchDiscount: null, cachingType: null },
  'together-ai':{ rpm: 600,   tpm: 200000,  batchDiscount: null, cachingType: null },
  deepinfra:    { rpm: 60,    tpm: 100000,  batchDiscount: null, cachingType: null },
  openrouter:   { rpm: null,  tpm: null,     batchDiscount: null, cachingType: null },
};

function resolveModelMeta(slug) {
  const isVision = /-vl|-vision|vision|multimodal|pixtral|internvl/i.test(slug);
  const isAudio = /-audio|whisper|tts|speech|voice/i.test(slug);
  const isOmni = /omni/i.test(slug);
  const isEmbedding = /embed/i.test(slug);
  const isRerank = /rerank/i.test(slug);

  const inModal = ['text'];
  const outModal = ['text'];
  if (isVision || isOmni) { inModal.push('image'); }
  if (isAudio || isOmni) { inModal.push('audio'); }
  if (isOmni) { outModal.push('image', 'audio'); }
  if (isEmbedding || isRerank) { return { input_modalities: inModal, output_modalities: [], is_reasoning_model: false, supports_prompt_caching: false }; }

  const reasoning = REASONING_SLUGS.has(slug);
  const caching = CACHING_SLUGS.has(slug);
  const benchmarks = BENCHMARK_MODELS[slug] || null;

  return {
    input_modalities: inModal,
    output_modalities: outModal,
    is_reasoning_model: reasoning,
    supports_prompt_caching: caching,
    benchmarks,
  };
}

async function bulkUpsert(baseUrl, headers, table, rows, conflictCols, merge = false) {
  if (rows.length === 0) return { rows: [], errors: [] };
  const all = [];
  const errors = [];
  const h = { ...headers, Prefer: `return=representation,resolution=${merge ? 'merge-duplicates' : 'ignore-duplicates'}` };
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const res = await fetch(`${baseUrl}/${table}?on_conflict=${conflictCols}`, {
      method: 'POST', headers: h, body: JSON.stringify(chunk),
    });
    if (res.ok) {
      const created = await res.json();
      if (Array.isArray(created)) all.push(...created);
    } else {
      const errText = await res.text().catch(() => 'unknown');
      errors.push({ chunk: i / BATCH, status: res.status, error: errText.substring(0, 200) });
    }
  }
  return { rows: all, errors };
}

export async function GET(context) {
  const runtime = context.locals.runtime;
  const env = (runtime && runtime.env) || {};
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ success: false, error: 'Missing credentials' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const url = new URL(context.request.url);
  const sourceFilter = url.searchParams.get('source') || 'all';
  const clear = url.searchParams.has('clear');
  try {
    const result = await syncAll(env, sourceFilter, clear);
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function syncAll(env, sourceFilter, clear) {
  const base = `${env.SUPABASE_URL}/rest/v1`;
  const hdrs = { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };

  // 0. Clear old data if requested
  if (clear) {
    await fetch(`${base}/provider_pricing?id=not.is.null`, { method: 'DELETE', headers: hdrs });
    await fetch(`${base}/models?id=not.is.null`, { method: 'DELETE', headers: hdrs });
    await fetch(`${base}/providers?id=not.is.null`, { method: 'DELETE', headers: hdrs });
  }

  // 1. Fetch sources from DB (1 subreq)
  const srcRes = await fetch(`${base}/pricing_sources?select=id,slug`, { headers: hdrs });
  if (!srcRes.ok) throw new Error('Run SQL migration first');
  const sources = await srcRes.json();
  const srcMap = {}; sources.forEach(s => { srcMap[s.slug] = s.id; });

  const want = (s) => sourceFilter === 'all' || sourceFilter === s;

  // 2. Fetch all external APIs in parallel
  const apiFetches = [];
  const authH = (key) => key ? { headers: { Authorization: `Bearer ${key}` } } : {};
  if (want('openrouter')) apiFetches.push(['openrouter', fetch('https://openrouter.ai/api/v1/models')]);
  if (want('deepinfra')) apiFetches.push(['deepinfra', fetch('https://api.deepinfra.com/v1/openai/models')]);
  if (want('mistral') && env.MISTRAL_API_KEY) apiFetches.push(['mistral', fetch('https://api.mistral.ai/v1/models', authH(env.MISTRAL_API_KEY))]);
  if (want('together-ai') && env.TOGETHER_API_KEY) apiFetches.push(['together-ai', fetch('https://api.together.xyz/v1/models', authH(env.TOGETHER_API_KEY))]);
  if (want('groq') && env.GROQ_API_KEY) apiFetches.push(['groq', fetch('https://api.groq.com/openai/v1/models', authH(env.GROQ_API_KEY))]);
  if (want('fireworks') && env.FIREWORKS_API_KEY) apiFetches.push(['fireworks', fetch('https://api.fireworks.ai/inference/v1/models', authH(env.FIREWORKS_API_KEY))]);
  if (want('cerebras')) apiFetches.push(['cerebras', fetch('https://api.cerebras.ai/v1/models')]);
  if (want('sambanova')) apiFetches.push(['sambanova', fetch('https://api.sambanova.ai/v1/models')]);
  if (want('nvidia')) apiFetches.push(['nvidia', fetch('https://integrate.api.nvidia.com/v1/models')]);
  if (want('huggingface')) apiFetches.push(['huggingface', fetch('https://router.huggingface.co/v1/models')]);
  const AA_KEY = env.ARTIFICIAL_ANALYSIS_API_KEY || 'aa_cMOrZeGwuDNnbGeWCDZytwrSUxDkWrJX';
  if (want('artificialanalysis')) apiFetches.push(['artificialanalysis', fetch('https://artificialanalysis.ai/api/v2/language/models/free', { headers: { 'x-api-key': AA_KEY } })]);

  const apiResults = await Promise.all(apiFetches.map(([, p]) => p));
  const apiMap = {};
  apiFetches.forEach(([key], i) => { apiMap[key] = apiResults[i]; });

  // 3. Parse all sources
  const allParsed = [];
  const sourceResults = {};

  if (want('openrouter') && apiMap.openrouter?.ok) {
    const { data } = await apiMap.openrouter.json();
    const p = parseOpenRouterModels(data);
    allParsed.push(...p);
    sourceResults.openrouter = p.length;
  }
  if (want('anthropic')) {
    const p = parseAnthropicModels();
    allParsed.push(...p);
    sourceResults.anthropic = p.length;
  }
  if (want('mistral') && apiMap.mistral?.ok) {
    const p = parseMistralModels(await apiMap.mistral.json());
    allParsed.push(...p);
    sourceResults.mistral = p.length;
  }
  if (want('deepinfra') && apiMap.deepinfra?.ok) {
    const p = parseDeepInfraModels(await apiMap.deepinfra.json());
    allParsed.push(...p);
    sourceResults.deepinfra = p.length;
  }
  if (want('together-ai') && apiMap['together-ai']?.ok) {
    const p = parseTogetherModels(await apiMap['together-ai'].json());
    allParsed.push(...p);
    sourceResults['together-ai'] = p.length;
  }
  if (want('groq') && apiMap.groq?.ok) {
    const p = parseGroqModels(await apiMap.groq.json());
    allParsed.push(...p);
    sourceResults.groq = p.length;
  }
  if (want('fireworks') && apiMap.fireworks?.ok) {
    const p = parseFireworksModels(await apiMap.fireworks.json());
    allParsed.push(...p);
    sourceResults.fireworks = p.length;
  }
  if (want('cerebras') && apiMap.cerebras?.ok) {
    const p = parseCerebrasModels(await apiMap.cerebras.json());
    allParsed.push(...p);
    sourceResults.cerebras = p.length;
  }
  if (want('sambanova') && apiMap.sambanova?.ok) {
    const p = parseSambaNovaModels(await apiMap.sambanova.json());
    allParsed.push(...p);
    sourceResults.sambanova = p.length;
  }
  if (want('nvidia') && apiMap.nvidia?.ok) {
    const p = parseNvidiaNimModels(await apiMap.nvidia.json());
    allParsed.push(...p);
    sourceResults.nvidia = p.length;
  }
  if (want('huggingface') && apiMap.huggingface?.ok) {
    const p = parseHuggingFaceModels(await apiMap.huggingface.json());
    allParsed.push(...p);
    sourceResults.huggingface = p.length;
  }
  if (want('artificialanalysis') && apiMap.artificialanalysis?.ok) {
    const aaData = await apiMap.artificialanalysis.json();
    const p = parseArtificialAnalysisModels(aaData);
    allParsed.push(...p);
    sourceResults.artificialanalysis = p.length;
  } else if (want('artificialanalysis') && apiMap.artificialanalysis && !apiMap.artificialanalysis.ok) {
    sourceResults.artificialanalysis = `fail:${apiMap.artificialanalysis.status}`;
  }

  // 4. Build unique providers and models
  const providerMap = {};
  const modelMap = {};
  for (const e of allParsed) {
    if (!providerMap[e.providerSlug]) {
      const info = PROVIDER_INFO[e.providerSlug] || { name: titleCase(e.providerSlug), url: null };
      const meta = PROVIDER_META[e.providerSlug] || {};
      providerMap[e.providerSlug] = { slug: e.providerSlug, name: info.name, affiliate_url: info.url, ...meta };
    }
    if (!modelMap[e.modelSlug]) {
      const meta = resolveModelMeta(e.modelSlug);
      modelMap[e.modelSlug] = {
        slug: e.modelSlug, name: e.modelName,
        context_window: e.contextWindow || 4096,
        max_output: e.maxOutput || Math.floor((e.contextWindow || 4096) / 4),
        category: 'LLM',
        ...meta,
        ...(e._maxCompletion ? { max_completion_tokens: e._maxCompletion } : {}),
        ...(e._baseInput != null ? { base_input_cost_per_1m: e._baseInput } : {}),
        ...(e._baseOutput != null ? { base_output_cost_per_1m: e._baseOutput } : {}),
        ...(e._cacheHit != null ? { cache_hit_cost_per_1m: e._cacheHit } : {}),
        ...(e._cacheWrite != null ? { cache_write_cost_per_1m: e._cacheWrite } : {}),
        ...(e._inputModalities ? { input_modalities: e._inputModalities } : {}),
        ...(e._outputModalities ? { output_modalities: e._outputModalities } : {}),
        ...(e._benchmarks ? { benchmarks: e._benchmarks } : {}),
      };
    }
  }

  // 5. Bulk upsert providers and models
  const provResult = await bulkUpsert(base, hdrs, 'providers', Object.values(providerMap), 'slug', true);
  const modelResult = await bulkUpsert(base, hdrs, 'models', Object.values(modelMap), 'slug', true);

  // 6. Get slug→id maps
  const [provDbRes, modelDbRes] = await Promise.all([
    fetch(`${base}/providers?select=id,slug`, { headers: hdrs }),
    fetch(`${base}/models?select=id,slug`, { headers: hdrs }),
  ]);
  const pMap = {}; (await provDbRes.json()).forEach(p => { pMap[p.slug] = p.id; });
  const mMap = {}; (await modelDbRes.json()).forEach(m => { mMap[m.slug] = m.id; });

  // 7. Build pricing rows
  const now = new Date().toISOString();
  const MAX_PRICE = 999999.9999;
  const clamp = (v) => Math.min(Math.max(v, 0), MAX_PRICE);
  const allPricingRows = allParsed
    .filter(e => mMap[e.modelSlug] && pMap[e.providerSlug] && srcMap[e.source])
    .map(e => {
      const provLimits = PROVIDER_LIMITS[e.providerSlug] || {};
      return {
        model_id: mMap[e.modelSlug], provider_id: pMap[e.providerSlug], source_id: srcMap[e.source],
        source_model_id: e.sourceModelId, input_price_per_m: clamp(e.input), output_price_per_m: clamp(e.output),
        reasoning_price_per_m: e._aa?.intelligenceIndex || 0, latency_tps: Math.round(e._aa?.medianTps || 0),
        prompt_caching: false, daily_limit: 'Unlimited', verified_at: now,
        // Financial
        input_cost_per_1m: e._baseInput ?? clamp(e.input),
        output_cost_per_1m: e._baseOutput ?? clamp(e.output),
        cache_hit_discount_rate: e._cacheDiscountRate ?? null,
        cache_write_cost_per_1m: e._cacheWrite ?? null,
        batch_discount_rate: provLimits.batchDiscount ?? null,
        // Limits
        max_context_window: e._maxContext ?? e.contextWindow ?? null,
        max_output_tokens: e._maxCompletion ?? e.maxOutput ?? null,
        default_rpm_limit: provLimits.rpm ?? null,
        default_tpm_limit: provLimits.tpm ?? null,
        // Performance
        avg_ttft_ms: e._avgTtftMs ?? null,
        avg_throughput_tps: e._avgThroughputTps ?? null,
        quantization_level: e._quantLevel ?? null,
        prompt_caching_type: e._cachingType ?? provLimits.cachingType ?? null,
      };
    });

  // 7b. Deduplicate by (model_id, provider_id) — DB constraint doesn't include source_id
  // Keep the row with the best data (prefer non-zero, prefer direct sources over openrouter)
  const sourcePriority = { anthropic: 0, openai: 0, deepinfra: 1, groq: 1, mistral: 1, fireworks: 1, 'together-ai': 1, artificialanalysis: 1, openrouter: 2 };
  const dedupedMap = new Map();
  for (const row of allPricingRows) {
    const key = `${row.model_id}|${row.provider_id}`;
    const existing = dedupedMap.get(key);
    if (!existing) { dedupedMap.set(key, row); continue; }
    const existingPriority = sourcePriority[Object.entries(srcMap).find(([, v]) => v === existing.source_id)?.[0]] ?? 99;
    const newPriority = sourcePriority[Object.entries(srcMap).find(([, v]) => v === row.source_id)?.[0]] ?? 99;
    if (newPriority < existingPriority) { dedupedMap.set(key, row); continue; }
    if (newPriority === existingPriority && row.input_price_per_m > existing.input_price_per_m) { dedupedMap.set(key, row); }
  }
  const pricingRows = [...dedupedMap.values()];

  // 8. Bulk upsert pricing — use on_conflict matching actual DB constraint (model_id, provider_id)
  const pricingResult = await bulkUpsert(base, hdrs, 'provider_pricing', pricingRows, 'model_id,provider_id');

  // 9. Update source timestamps
  await fetch(`${base}/pricing_sources?slug=in.(${sources.map(s => s.slug).join(',')})`, {
    method: 'PATCH', headers: { ...hdrs, Prefer: 'return=minimal' }, body: JSON.stringify({ last_synced_at: now }),
  });

  return {
    sources: sourceResults,
    apiStatus: Object.fromEntries(Object.entries(apiMap).map(([k, v]) => [k, v?.ok ? 'ok' : `fail:${v?.status || v?.error || 'unknown'}`])),
    providers: Object.keys(providerMap).length,
    models: Object.keys(modelMap).length,
    pricingInserted: pricingResult.rows.length,
    pricingAttempted: pricingRows.length,
    pricingErrors: pricingResult.errors,
    cleared: clear,
  };
}
