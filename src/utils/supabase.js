import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://pbazjkkfzyovldltwrkd.supabase.co';
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_-7jL1RyGTKvOiSmN5IUK_Q_OCy4eGcZ';

let client = null;

export function getSupabase() {
  if (!client) {
    client = createClient(supabaseUrl, supabaseKey);
  }
  return client;
}

export async function fetchModels() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('models')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchProviders() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchPricing() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('provider_pricing')
    .select(`
      *,
      models (id, slug, name, context_window, max_output, category),
      providers (id, slug, name, affiliate_url, discount_promo)
    `);
  if (error) throw error;
  return data || [];
}

export async function fetchLastSynced() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('pricing_sources')
    .select('slug, last_synced_at')
    .order('last_synced_at', { ascending: false });
  if (error) return null;
  if (!data || data.length === 0) return null;
  return data.reduce((latest, s) => {
    if (!s.last_synced_at) return latest;
    return !latest || new Date(s.last_synced_at) > new Date(latest) ? s.last_synced_at : latest;
  }, null);
}

export async function fetchModelPricing(modelSlug) {
  const supabase = getSupabase();
  const { data: model, error: modelError } = await supabase
    .from('models')
    .select('*')
    .eq('slug', modelSlug)
    .single();
  if (modelError || !model) return null;

  const { data: pricing, error: pricingError } = await supabase
    .from('provider_pricing')
    .select(`
      *,
      providers (id, slug, name, affiliate_url, discount_promo)
    `)
    .eq('model_id', model.id);
  if (pricingError) throw pricingError;

  return { model, pricing: pricing || [] };
}

export async function fetchComparison(modelSlug, providerASlug, providerBSlug) {
  const supabase = getSupabase();

  const { data: model, error: modelError } = await supabase
    .from('models')
    .select('*')
    .eq('slug', modelSlug)
    .single();
  if (modelError || !model) return null;

  const { data: providers, error: provError } = await supabase
    .from('providers')
    .select('*')
    .in('slug', [providerASlug, providerBSlug]);
  if (provError || !providers || providers.length < 2) return null;

  const providerA = providers.find(p => p.slug === providerASlug);
  const providerB = providers.find(p => p.slug === providerBSlug);

  const { data: pricing, error: pricingError } = await supabase
    .from('provider_pricing')
    .select('*')
    .eq('model_id', model.id)
    .in('provider_id', [providerA.id, providerB.id]);
  if (pricingError) throw pricingError;

  const pricingA = pricing.find(p => p.provider_id === providerA.id);
  const pricingB = pricing.find(p => p.provider_id === providerB.id);

  return { model, providerA, providerB, pricingA, pricingB };
}
