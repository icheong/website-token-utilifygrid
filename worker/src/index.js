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

function parseOpenRouterModels(data) {
  return (data || []).filter(m => m.pricing && !m.id.endsWith(':free') && parseFloat(m.pricing.prompt) > 0).map(m => {
    const parts = m.id.split('/');
    const org = parts[0], name = parts.slice(1).join('/');
    return {
      sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName: m.name || name,
      providerSlug: slugify(org), input: parseFloat(m.pricing.prompt) * 1e6, output: parseFloat(m.pricing.completion) * 1e6,
      contextWindow: m.context_length || null, maxOutput: m.top_provider?.max_completion_tokens || null, source: 'openrouter',
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
  return data.data.filter(m => !m.id.startsWith('ft:') && P[m.id]).map(m => ({
    sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName: m.name || m.id,
    providerSlug: 'openai', input: P[m.id][0], output: P[m.id][1],
    contextWindow: m.context_window || null, maxOutput: null, source: 'openai',
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
    return {
      sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName: m.name || m.id,
      providerSlug: 'deepinfra', input: p.input, output: p.output,
      contextWindow: meta.context_length || null, maxOutput: meta.max_tokens || null, source: 'deepinfra',
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

const BATCH = 80;
async function bulkUpsert(base, hdrs, table, rows, conflict) {
  if (!rows.length) return [];
  const all = [];
  const h = { ...hdrs, Prefer: 'return=representation,resolution=ignore-duplicates' };
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
  const [orRes, deepinfraRes, mistralRes, togetherRes, groqRes, fireworksRes] = await Promise.all([
    fetch('https://openrouter.ai/api/v1/models'),
    fetch('https://api.deepinfra.com/v1/openai/models'),
    env.MISTRAL_API_KEY ? fetch('https://api.mistral.ai/v1/models', authH(env.MISTRAL_API_KEY)) : Promise.resolve(null),
    env.TOGETHER_API_KEY ? fetch('https://api.together.xyz/v1/models', authH(env.TOGETHER_API_KEY)) : Promise.resolve(null),
    env.GROQ_API_KEY ? fetch('https://api.groq.com/openai/v1/models', authH(env.GROQ_API_KEY)) : Promise.resolve(null),
    env.FIREWORKS_API_KEY ? fetch('https://api.fireworks.ai/inference/v1/models', authH(env.FIREWORKS_API_KEY)) : Promise.resolve(null),
  ]);

  const allParsed = [];
  if (orRes.ok) { const { data } = await orRes.json(); allParsed.push(...parseOpenRouterModels(data)); }
  allParsed.push(...parseAnthropicModels());
  if (mistralRes?.ok) { allParsed.push(...parseMistralModels(await mistralRes.json())); }
  if (deepinfraRes?.ok) { allParsed.push(...parseDeepInfraModels(await deepinfraRes.json())); }
  if (togetherRes?.ok) { allParsed.push(...parseTogetherModels(await togetherRes.json())); }
  if (groqRes?.ok) { allParsed.push(...parseGroqModels(await groqRes.json())); }
  if (fireworksRes?.ok) { allParsed.push(...parseFireworksModels(await fireworksRes.json())); }

  const provMap = {}, modMap = {};
  for (const e of allParsed) {
    if (!provMap[e.providerSlug]) {
      const info = PROVIDER_INFO[e.providerSlug] || { name: titleCase(e.providerSlug), url: null };
      provMap[e.providerSlug] = { slug: e.providerSlug, name: info.name, affiliate_url: info.url };
    }
    if (!modMap[e.modelSlug]) {
      modMap[e.modelSlug] = {
        slug: e.modelSlug, name: e.modelName, context_window: e.contextWindow || 4096,
        max_output: e.maxOutput || Math.floor((e.contextWindow || 4096) / 4), category: 'LLM'
      };
    }
  }

  await bulkUpsert(base, hdrs, 'providers', Object.values(provMap), 'slug');
  await bulkUpsert(base, hdrs, 'models', Object.values(modMap), 'slug');

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
  const allPricingRows = allParsed.filter(e => mM[e.modelSlug] && pM[e.providerSlug] && srcMap[e.source]).map(e => ({
    model_id: mM[e.modelSlug], provider_id: pM[e.providerSlug], source_id: srcMap[e.source], source_model_id: e.sourceModelId,
    input_price_per_m: clamp(e.input), output_price_per_m: clamp(e.output),
    reasoning_price_per_m: 0, latency_tps: 0, prompt_caching: false, daily_limit: 'Unlimited', verified_at: now,
  }));

  // Deduplicate by (model_id, provider_id) — DB constraint doesn't include source_id
  const sourcePriority = { anthropic: 0, openai: 0, deepinfra: 1, groq: 1, mistral: 1, fireworks: 1, 'together-ai': 1, openrouter: 2 };
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
