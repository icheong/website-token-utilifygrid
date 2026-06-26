// worker/src/index.js
// Cloudflare Cron Worker for daily pricing synchronization

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncPricingData(env));
  }
};

async function syncPricingData(env) {
  // Create Supabase client using REST API (no npm dependency needed in Workers)
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in environment variables");
    return;
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  try {
    // 1. Fetch latest pricing from OpenRouter API
    console.log("Fetching pricing from OpenRouter...");
    const registryResponse = await fetch('https://openrouter.ai/api/v1/models');
    
    if (!registryResponse.ok) {
      throw new Error(`OpenRouter API returned ${registryResponse.status}`);
    }
    
    const registry = await registryResponse.json();
    const modelsData = registry.data || [];
    console.log(`Fetched ${modelsData.length} models from OpenRouter`);

    // 2. Fetch all known pricing relationships from Supabase
    console.log("Fetching existing pricing from Supabase...");
    const pricingResponse = await fetch(
      `${supabaseUrl}/provider_pricing?select=id,model_id,provider_id,input_price_per_m,output_price_per_m,verified_at`,
      { headers }
    );
    
    if (!pricingResponse.ok) {
      throw new Error(`Supabase fetch failed: ${pricingResponse.status}`);
    }
    
    const dbPricing = await pricingResponse.json();
    console.log(`Found ${dbPricing.length} pricing records in Supabase`);

    // 3. Fetch model and provider slugs for matching
    const [modelsRes, providersRes] = await Promise.all([
      fetch(`${supabaseUrl}/models?select=id,slug`, { headers }),
      fetch(`${supabaseUrl}/providers?select=id,slug`, { headers })
    ]);

    if (!modelsRes.ok || !providersRes.ok) {
      throw new Error("Failed to fetch models or providers");
    }

    const models = await modelsRes.json();
    const providers = await providersRes.json();

    // Create lookup maps
    const modelSlugMap = {};
    models.forEach(m => { modelSlugMap[m.id] = m.slug; });
    
    const providerSlugMap = {};
    providers.forEach(p => { providerSlugMap[p.id] = p.slug; });

    let databaseUpdated = false;
    let updateCount = 0;

    // 4. Loop and evaluate deviations
    for (const record of dbPricing) {
      const modelSlug = modelSlugMap[record.model_id];
      const providerSlug = providerSlugMap[record.provider_id];

      if (!modelSlug || !providerSlug) continue;

      // Try to find matching model in OpenRouter data
      // OpenRouter model IDs typically look like: "provider/model-name"
      const externalMatch = modelsData.find(m => {
        const mId = m.id.toLowerCase();
        return mId.includes(modelSlug) || mId.includes(providerSlug);
      });

      if (externalMatch && externalMatch.pricing) {
        const externalInputPrice = parseFloat(externalMatch.pricing.prompt) * 1000000;
        const externalOutputPrice = parseFloat(externalMatch.pricing.completion) * 1000000;

        // Check for significant deviations (>1% change)
        const inputDeviation = Math.abs(record.input_price_per_m - externalInputPrice) / record.input_price_per_m;
        const outputDeviation = Math.abs(record.output_price_per_m - externalOutputPrice) / record.output_price_per_m;

        if (inputDeviation > 0.01 || outputDeviation > 0.01) {
          console.log(`Updating ${modelSlug}/${providerSlug}: input ${record.input_price_per_m} -> ${externalInputPrice}, output ${record.output_price_per_m} -> ${externalOutputPrice}`);
          
          // Update the specific record
          const updateResponse = await fetch(
            `${supabaseUrl}/provider_pricing?id=eq.${record.id}`,
            {
              method: 'PATCH',
              headers: {
                ...headers,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                input_price_per_m: externalInputPrice,
                output_price_per_m: externalOutputPrice,
                verified_at: new Date().toISOString()
              })
            }
          );

          if (updateResponse.ok) {
            databaseUpdated = true;
            updateCount++;
          } else {
            console.error(`Failed to update record ${record.id}: ${updateResponse.status}`);
          }
        }
      }
    }

    console.log(`Sync complete. Updated ${updateCount} records.`);

    // 5. Trigger Astro build webhook if database updates occurred
    if (databaseUpdated && env.ASTRO_BUILD_WEBHOOK) {
      console.log("Triggering Astro build webhook...");
      const webhookResponse = await fetch(env.ASTRO_BUILD_WEBHOOK, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (webhookResponse.ok) {
        console.log("Astro build webhook triggered successfully");
      } else {
        console.error(`Webhook failed: ${webhookResponse.status}`);
      }
    }

  } catch (err) {
    console.error("Cron price sync failed:", err.message);
    throw err;
  }
}
