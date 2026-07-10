-- Enable Row Level Security on all tables
-- Run this in Supabase SQL Editor or via CLI

-- 1. Enable RLS
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_sources ENABLE ROW LEVEL SECURITY;

-- 2. Public read policies (anonymous users can read)
CREATE POLICY "Public read providers" ON providers
  FOR SELECT USING (true);

CREATE POLICY "Public read models" ON models
  FOR SELECT USING (true);

CREATE POLICY "Public read provider_pricing" ON provider_pricing
  FOR SELECT USING (true);

CREATE POLICY "Public read pricing_sources" ON pricing_sources
  FOR SELECT USING (true);

-- 3. Service role write policies (sync-pricing API uses service_role key)
-- The service_role key bypasses RLS, but these policies are explicit
CREATE POLICY "Service role insert providers" ON providers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role update providers" ON providers
  FOR UPDATE USING (true);

CREATE POLICY "Service role delete providers" ON providers
  FOR DELETE USING (true);

CREATE POLICY "Service role insert models" ON models
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role update models" ON models
  FOR UPDATE USING (true);

CREATE POLICY "Service role delete models" ON models
  FOR DELETE USING (true);

CREATE POLICY "Service role insert provider_pricing" ON provider_pricing
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role update provider_pricing" ON provider_pricing
  FOR UPDATE USING (true);

CREATE POLICY "Service role delete provider_pricing" ON provider_pricing
  FOR DELETE USING (true);

CREATE POLICY "Service role insert pricing_sources" ON pricing_sources
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role update pricing_sources" ON pricing_sources
  FOR UPDATE USING (true);

CREATE POLICY "Service role delete pricing_sources" ON pricing_sources
  FOR DELETE USING (true);
