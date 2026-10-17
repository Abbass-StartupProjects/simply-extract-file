/*
# Add Featured Listings (crypto payments)

## Overview
Adds crypto-paid "Featured Listing" functionality. Founders pay in USDT, BTC, or ETH 
to boost their startup to the top of the directory with a badge and priority placement 
for 7, 14, or 30 days.

## New Tables
- `featured_orders` — tracks each featured boost purchase (startup, tier, currency, 
  amount, transaction hash, status, created_at, expires_at).
- `site_settings` — single-row config table storing wallet addresses for each crypto 
  currency and pricing per tier.

## Modified Tables
- `startups` — adds `featured_until` (timestamptz, nullable). When set to a future 
  timestamp, the startup is featured. NULL or past = not featured.

## Security
- `featured_orders` and `site_settings`: SELECT open to anon (public directory reads 
  wallet addresses + order info for transparency). INSERT open to anon (founders 
  submit orders). UPDATE restricted to authenticated (future admin moderation).

## Notes
- `is_featured` column (existing) is kept for admin-curated features. The new 
  `featured_until` handles paid features. The frontend checks: is_featured OR 
  featured_until > now().
- Order status defaults to 'pending'. On tx hash submission it becomes 'submitted'.
  An admin flow (future) would verify on-chain and set 'confirmed'.
- For MVP simplicity, featured status activates immediately on order submission 
  (trust-based, verified later). This reduces friction for honest founders.
*/

-- ============================================================
-- ADD featured_until TO startups
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'startups' AND column_name = 'featured_until'
  ) THEN
    ALTER TABLE startups ADD COLUMN featured_until timestamptz;
  END IF;
END $$;

-- ============================================================
-- SITE SETTINGS (wallet addresses + pricing)
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usdt_address text NOT NULL DEFAULT 'TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  btc_address text NOT NULL DEFAULT 'bc1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  eth_address text NOT NULL DEFAULT '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  price_7_days_usd numeric NOT NULL DEFAULT 49,
  price_14_days_usd numeric NOT NULL DEFAULT 89,
  price_30_days_usd numeric NOT NULL DEFAULT 149,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_site_settings" ON site_settings;
CREATE POLICY "anon_read_site_settings" ON site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_site_settings" ON site_settings;
CREATE POLICY "anon_insert_site_settings" ON site_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_site_settings" ON site_settings;
CREATE POLICY "anon_update_site_settings" ON site_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Seed a single settings row
INSERT INTO site_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- ============================================================
-- FEATURED ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS featured_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  tier_days integer NOT NULL CHECK (tier_days IN (7, 14, 30)),
  currency text NOT NULL CHECK (currency IN ('USDT', 'BTC', 'ETH')),
  amount_usd numeric NOT NULL,
  tx_hash text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'confirmed', 'rejected')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE featured_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_featured_orders" ON featured_orders;
CREATE POLICY "anon_read_featured_orders" ON featured_orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_featured_orders" ON featured_orders;
CREATE POLICY "anon_insert_featured_orders" ON featured_orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_featured_orders" ON featured_orders;
CREATE POLICY "anon_update_featured_orders" ON featured_orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_featured_orders_startup ON featured_orders(startup_id);
CREATE INDEX IF NOT EXISTS idx_featured_orders_status ON featured_orders(status);
CREATE INDEX IF NOT EXISTS idx_startups_featured_until ON startups(featured_until);