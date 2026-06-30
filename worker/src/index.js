// worker/src/index.js — Cron-triggered multi-source pricing sync
// Sources: OpenRouter, OpenAI, Anthropic, Mistral, DeepInfra, Together AI, Groq, Fireworks

export default {
  async fetch() { return new Response('Tokens@UG Sync Worker — cron only'); },
  async scheduled(event, env) {
    const result = await syncAll(env);
    console.log(JSON.stringify(result));
  },
};

function slugify(t) { return t.toLowerCase().replace(/:free$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function titleCase(s) { return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

function normalizeModelSlug(rawName) {
  let name = rawName.replace(/^[^/]+\//, '').toLowerCase();
  name = name.replace(/[-_](awq|gptq|gguf|fp8|fp16|int4|int8|bf16|mlx)$/g, '');
  name = name.replace(/[-_]instruct[-_]?turbo$/g, '');
  name = name.replace(/[-_]chat[-_]?turbo$/g, '');
  name = name.replace(/[-_]preview$/g, '');
  name = name.replace(/[-_]instruct$/g, '');
  name = name.replace(/[-_]chat$/g, '');
  name = name.replace(/[-_]turbo$/g, '');
  name = name.replace(/[-_]versatile$/g, '');
  name = name.replace(/[-_]latest$/g, '');
  name = name.replace(/[-_]v\d+(\.\d+)?$/g, '');
  name = name.replace(/[-_]\d{8}$/g, '');
  name = name.replace(/(llama)\s*(\d)/g, '$1-$2');
  name = name.replace(/(mixtral)\s*(\d)/g, '$1-$2');
  name = name.replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  return name;
}

const PROVIDER_INFO = {
  openai: { name: 'OpenAI', url: 'https://openai.com' },
  anthropic: { name: 'Anthropic', url: 'https://anthropic.com' },
  mistral: { name: 'Mistral', url: 'https://mistral.ai' },
  deepinfra: { name: 'DeepInfra', url: 'https://deepinfra.com' },
  'together-ai': { name: 'Together AI', url: 'https://together.ai' },
  groq: { name: 'Groq', url: 'https://groq.com' },
  fireworks: { name: 'Fireworks AI', url: 'https://fireworks.ai' },
  meta: { name: 'Meta', url: 'https://llama.meta.com' },
  deepseek: { name: 'DeepSeek', url: 'https://deepseek.com' },
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
};

function parseOpenRouterModels(data) {
  return (data || []).filter(m => m.pricing && !m.id.endsWith(':free') && parseFloat(m.pricing.prompt) > 0).map(m => {
    const parts = m.id.split('/');
    const org = parts[0], name = parts.slice(1).join('/');
    const promptPrice = parseFloat(m.pricing.prompt) * 1e6;
    const cacheRead = parseFloat(m.pricing.input_cache_read || 0) * 1e6;
    const cacheWrite = parseFloat(m.pricing.input_cache_write || 0) * 1e6;
    const cacheDiscount = promptPrice > 0 && cacheRead > 0 ? +(cacheRead / promptPrice).toFixed(4) : null;
    return {
      sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName: m.name || name,
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

// DeepInfra: pricing already per 1M tokens — do NOT multiply by 1e6
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

function parseDeepInfraModels(data) {
  if (!data?.data) return [];
  return data.data.filter(m => {
    const p = extractDeepInfraPricing(m);
    return p && p.input > 0;
  }).map(m => {
    const p = extractDeepInfraPricing(m);
    const meta = m.metadata || {};
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
      sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName: m.name || m.id,
      providerSlug: 'deepinfra', input: p.input, output: p.output,
      contextWindow: meta.context_length || null, maxOutput: meta.max_tokens || null, source: 'deepinfra',
      _maxCompletion: meta.max_tokens || null,
      _maxContext: meta.context_length || null,
      _quantLevel: quant,
    };
  });
}

function parseTogetherModels(data) {
  if (!data?.data) return [];
  return data.data.filter(m => m.pricing?.prompt && parseFloat(m.pricing.prompt) > 0).map(m => ({
    sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName: m.name || m.id,
    providerSlug: 'together-ai', input: parseFloat(m.pricing.prompt) * 1e6, output: parseFloat(m.pricing.completion) * 1e6,
    contextWindow: m.context_length || null, maxOutput: m.max_output || null, source: 'together-ai',
  }));
}

function parseGroqModels(data) {
  if (!data?.data) return [];
  const GP = {
    'llama-3.3-70b-versatile': [0.59, 0.79], 'llama-3.1-8b-instant': [0.05, 0.08],
    'llama-3.1-70b-versatile': [0.59, 0.79], 'llama-3.1-405b-reasoning': [2.00, 2.00],
    'llama-3.2-1b-preview': [0.03, 0.03], 'llama-3.2-3b-preview': [0.06, 0.06],
    'llama-3.2-11b-vision-preview': [0.18, 0.18], 'llama-3.2-90b-vision-preview': [0.90, 0.90],
    'gemma2-9b-it': [0.20, 0.20], 'mixtral-8x7b-32768': [0.24, 0.24],
    'mixtral-8x22b-32768': [0.60, 0.60], 'mistral-small-3.1-24b-instruct': [0.10, 0.10],
    'qwen-qwq-32b': [0.29, 0.39], 'deepseek-r1-distill-llama-70b': [0.39, 0.59],
  };
  return data.data.filter(m => GP[m.id]).map(m => ({
    sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName: m.name || m.id,
    providerSlug: 'groq', input: GP[m.id][0], output: GP[m.id][1],
    contextWindow: m.context_window || 32768, maxOutput: null, source: 'groq',
  }));
}

function parseFireworksModels(data) {
  if (!data?.list) return [];
  return data.list.filter(m => m.pricing?.prompt && parseFloat(m.pricing.prompt) > 0).map(m => ({
    sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName: m.name || m.id,
    providerSlug: 'fireworks', input: parseFloat(m.pricing.prompt) * 1e6, output: parseFloat(m.pricing.completion) * 1e6,
    contextWindow: m.context_length || null, maxOutput: null, source: 'fireworks',
  }));
}

function parseArtificialAnalysisModels(data) {
  if (!data?.data) return [];
  return data.data.filter(m => m.pricing?.price_1m_input_tokens > 0).map(m => {
    const creator = m.model_creator?.name || 'Unknown';
    const creatorSlug = creator.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const inModal = m.capabilities?.input_modalities || ['text'];
    const outModal = m.capabilities?.output_modalities || ['text'];
    const benchmarks = {};
    if (m.evaluations?.artificial_analysis_intelligence_index != null) benchmarks.intelligence_index = m.evaluations.artificial_analysis_intelligence_index;
    if (m.evaluations?.artificial_analysis_coding_index != null) benchmarks.coding_index = m.evaluations.artificial_analysis_coding_index;
    if (m.evaluations?.artificial_analysis_agentic_index != null) benchmarks.agentic_index = m.evaluations.artificial_analysis_agentic_index;
    const cacheHit = m.pricing.price_1m_cache_hit_tokens || null;
    const cacheWrite = m.pricing.price_1m_cache_write_tokens || null;
    const inputPrice = m.pricing.price_1m_input_tokens;
    const cacheDiscount = (cacheHit != null && inputPrice > 0) ? +(cacheHit / inputPrice).toFixed(4) : null;
    return {
      sourceModelId: m.id, modelSlug: normalizeModelSlug(m.slug || m.name), modelName: m.name,
      providerSlug: creatorSlug, input: inputPrice, output: m.pricing.price_1m_output_tokens,
      contextWindow: m.context_window_tokens || null, maxOutput: null, source: 'artificialanalysis',
      _maxCompletion: null,
      _maxContext: m.context_window_tokens || null,
      _baseInput: inputPrice,
      _baseOutput: m.pricing.price_1m_output_tokens,
      _cacheHit: cacheHit,
      _cacheWrite: cacheWrite,
      _cacheDiscountRate: cacheDiscount,
      _inputModalities: inModal,
      _outputModalities: outModal,
      _benchmarks: Object.keys(benchmarks).length > 0 ? benchmarks : null,
      _avgTtftMs: m.performance?.median_time_to_first_token_seconds ? +(m.performance.median_time_to_first_token_seconds * 1000).toFixed(2) : null,
      _avgThroughputTps: m.performance?.median_output_tokens_per_second || null,
      _aa: {
        intelligenceIndex: m.evaluations?.artificial_analysis_intelligence_index || null,
        medianTps: m.performance?.median_output_tokens_per_second || null,
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

const BATCH = 80;
async function bulkUpsert(base, hdrs, table, rows, conflict, merge = false) {
  if (!rows.length) return [];
  const all = [];
  const h = { ...hdrs, Prefer: `return=representation,resolution=${merge ? 'merge-duplicates' : 'ignore-duplicates'}` };
  for (let i = 0; i < rows.length; i += BATCH) {
    const res = await fetch(`${base}/${table}?on_conflict=${conflict}`, { method: 'POST', headers: h, body: JSON.stringify(rows.slice(i, i + BATCH)) });
    if (res.ok) { const d = await res.json(); if (Array.isArray(d)) all.push(...d); }
  }
  return all;
}

async function syncAll(env) {
  const base = `${env.SUPABASE_URL}/rest/v1`;
  const hdrs = { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };

  const srcRes = await fetch(`${base}/pricing_sources?select=id,slug`, { headers: hdrs });
  if (!srcRes.ok) return { error: 'Run SQL migration first' };
  const sources = await srcRes.json();
  const srcMap = {}; sources.forEach(s => { srcMap[s.slug] = s.id; });

  const authH = (key) => key ? { headers: { Authorization: `Bearer ${key}` } } : {};
  const AA_KEY = env.ARTIFICIAL_ANALYSIS_API_KEY || '';
  const [orRes, deepinfraRes, mistralRes, togetherRes, groqRes, fireworksRes, aaRes] = await Promise.all([
    fetch('https://openrouter.ai/api/v1/models'),
    fetch('https://api.deepinfra.com/v1/openai/models'),
    env.MISTRAL_API_KEY ? fetch('https://api.mistral.ai/v1/models', authH(env.MISTRAL_API_KEY)) : Promise.resolve(null),
    env.TOGETHER_API_KEY ? fetch('https://api.together.xyz/v1/models', authH(env.TOGETHER_API_KEY)) : Promise.resolve(null),
    env.GROQ_API_KEY ? fetch('https://api.groq.com/openai/v1/models', authH(env.GROQ_API_KEY)) : Promise.resolve(null),
    env.FIREWORKS_API_KEY ? fetch('https://api.fireworks.ai/inference/v1/models', authH(env.FIREWORKS_API_KEY)) : Promise.resolve(null),
    AA_KEY ? fetch('https://artificialanalysis.ai/api/v2/language/models/free', { headers: { 'x-api-key': AA_KEY } }) : Promise.resolve(null),
  ]);

  const allParsed = [];
  if (orRes.ok) { const { data } = await orRes.json(); allParsed.push(...parseOpenRouterModels(data)); }
  allParsed.push(...parseAnthropicModels());
  if (mistralRes?.ok) { allParsed.push(...parseMistralModels(await mistralRes.json())); }
  if (deepinfraRes?.ok) { allParsed.push(...parseDeepInfraModels(await deepinfraRes.json())); }
  if (togetherRes?.ok) { allParsed.push(...parseTogetherModels(await togetherRes.json())); }
  if (groqRes?.ok) { allParsed.push(...parseGroqModels(await groqRes.json())); }
  if (fireworksRes?.ok) { allParsed.push(...parseFireworksModels(await fireworksRes.json())); }
  if (aaRes?.ok) { allParsed.push(...parseArtificialAnalysisModels(await aaRes.json())); }

  const provMap = {}, modMap = {};
  for (const e of allParsed) {
    if (!provMap[e.providerSlug]) {
      const info = PROVIDER_INFO[e.providerSlug] || { name: titleCase(e.providerSlug), url: null };
      const meta = PROVIDER_META[e.providerSlug] || {};
      provMap[e.providerSlug] = { slug: e.providerSlug, name: info.name, affiliate_url: info.url, ...meta };
    }
    if (!modMap[e.modelSlug]) {
      const meta = resolveModelMeta(e.modelSlug);
      modMap[e.modelSlug] = {
        slug: e.modelSlug, name: e.modelName, context_window: e.contextWindow || 4096,
        max_output: e.maxOutput || Math.floor((e.contextWindow || 4096) / 4), category: 'LLM',
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

  await bulkUpsert(base, hdrs, 'providers', Object.values(provMap), 'slug', true);
  await bulkUpsert(base, hdrs, 'models', Object.values(modMap), 'slug', true);

  const [pRes, mRes] = await Promise.all([
    fetch(`${base}/providers?select=id,slug`, { headers: hdrs }),
    fetch(`${base}/models?select=id,slug`, { headers: hdrs }),
  ]);
  const pM = {}, mM = {};
  (await pRes.json()).forEach(p => { pM[p.slug] = p.id; });
  (await mRes.json()).forEach(m => { mM[m.slug] = m.id; });

  const now = new Date().toISOString();
  const MAX_PRICE = 999999.9999;
  const clamp = (v) => Math.min(Math.max(v, 0), MAX_PRICE);
  const allPricingRows = allParsed.filter(e => mM[e.modelSlug] && pM[e.providerSlug] && srcMap[e.source]).map(e => {
    const provLimits = PROVIDER_LIMITS[e.providerSlug] || {};
    return {
      model_id: mM[e.modelSlug], provider_id: pM[e.providerSlug], source_id: srcMap[e.source], source_model_id: e.sourceModelId,
      input_price_per_m: clamp(e.input), output_price_per_m: clamp(e.output),
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

  // Deduplicate by (model_id, provider_id) — DB constraint doesn't include source_id
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

  const createdPricing = await bulkUpsert(base, hdrs, 'provider_pricing', pricingRows, 'model_id,provider_id');

  await fetch(`${base}/pricing_sources?slug=in.(${sources.map(s => s.slug).join(',')})`, {
    method: 'PATCH', headers: { ...hdrs, Prefer: 'return=minimal' }, body: JSON.stringify({ last_synced_at: now }),
  });

  return { parsed: allParsed.length, providers: Object.keys(provMap).length, models: Object.keys(modMap).length, pricingInserted: createdPricing.length };
}
