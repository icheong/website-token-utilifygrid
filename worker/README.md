# Pricing Sync Worker

Cloudflare Cron Worker that synchronizes AI model pricing data from OpenRouter to Supabase.

## Setup

1. Install dependencies:
   ```bash
   cd worker
   npm install
   ```

2. Configure environment variables in `wrangler.toml`:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `ASTRO_BUILD_WEBHOOK` - (Optional) Cloudflare Pages deploy webhook URL

3. Deploy to Cloudflare Workers:
   ```bash
   npm run deploy
   ```

## How It Works

The worker runs daily at midnight (configured in `wrangler.toml`) and:

1. Fetches latest pricing from OpenRouter API (`/api/v1/models`)
2. Compares with existing pricing in Supabase `provider_pricing` table
3. Updates records where prices have changed by more than 1%
4. Triggers Astro rebuild webhook if any updates occurred

## Manual Testing

To test locally:
```bash
npm run dev
```

To trigger a manual sync:
```bash
curl -X POST http://localhost:8787/__scheduled
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project REST API URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `ASTRO_BUILD_WEBHOOK` | No | Cloudflare Pages deploy webhook |
