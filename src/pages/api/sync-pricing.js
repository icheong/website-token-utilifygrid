// src/pages/api/sync-pricing.js
// Multi-source pricing sync — bulk-optimized for Cloudflare's subrequest limit
// Sources: OpenRouter, OpenAI, Anthropic, Mistral, DeepInfra, Together AI, Groq, Fireworks

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
};

function slugify(t) { return t.toLowerCase().replace(/:free$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function titleCase(s) { return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

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
    return {
      sourceModelId: m.id, modelSlug: normalizeModelSlug(m.id), modelName: m.name || m.id,
      providerSlug: 'deepinfra', input: p.input, output: p.output,
      contextWindow: meta.context_length || null, maxOutput: meta.max_tokens || null, source: 'deepinfra',
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

async function bulkUpsert(baseUrl, headers, table, rows, conflictCols) {
  if (rows.length === 0) return { rows: [], errors: [] };
  const all = [];
  const errors = [];
  const h = { ...headers, Prefer: 'return=representation,resolution=ignore-duplicates' };
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

  // 4. Build unique providers and models
  const providerMap = {};
  const modelMap = {};
  for (const e of allParsed) {
    if (!providerMap[e.providerSlug]) {
      const info = PROVIDER_INFO[e.providerSlug] || { name: titleCase(e.providerSlug), url: null };
      providerMap[e.providerSlug] = { slug: e.providerSlug, name: info.name, affiliate_url: info.url };
    }
    if (!modelMap[e.modelSlug]) {
      modelMap[e.modelSlug] = {
        slug: e.modelSlug, name: e.modelName,
        context_window: e.contextWindow || 4096,
        max_output: e.maxOutput || Math.floor((e.contextWindow || 4096) / 4),
        category: 'LLM',
      };
    }
  }

  // 5. Bulk upsert providers and models
  const provResult = await bulkUpsert(base, hdrs, 'providers', Object.values(providerMap), 'slug');
  const modelResult = await bulkUpsert(base, hdrs, 'models', Object.values(modelMap), 'slug');

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
    .map(e => ({
      model_id: mMap[e.modelSlug], provider_id: pMap[e.providerSlug], source_id: srcMap[e.source],
      source_model_id: e.sourceModelId, input_price_per_m: clamp(e.input), output_price_per_m: clamp(e.output),
      reasoning_price_per_m: 0, latency_tps: 0, prompt_caching: false, daily_limit: 'Unlimited', verified_at: now,
    }));

  // 7b. Deduplicate by (model_id, provider_id) — DB constraint doesn't include source_id
  // Keep the row with the best data (prefer non-zero, prefer direct sources over openrouter)
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
