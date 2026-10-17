/*
# Launchrocket — Global Customer Discovery Platform

## Overview
Launchrocket is a two-sided discovery platform:
1. **Channels** — curated growth channels (communities, directories, ad platforms, 
   influencer networks, SEO forums, etc.) where founders can find early customers, 
   organized by region and category.
2. **Startups** — a showcase directory where founders list their startups to reach 
   early adopters worldwide.

## New Tables
- `categories` — channel/startup categories (e.g. "Developer Tools", "B2B SaaS", "Consumer")
- `regions` — geographic regions for targeting customers worldwide
- `channels` — curated growth channels with description, audience size, cost, region, category
- `startups` — startup listings with name, tagline, description, website, category, region, stage

## Security
- Single-tenant (no auth) public directory: all tables use `TO anon, authenticated` 
  with `USING (true)` for SELECT, and open INSERT for submissions.
- UPDATE/DELETE are restricted to `authenticated` so only a future admin flow can moderate.

## Notes
- All tables have `created_at` timestamps.
- `channels` and `startups` have `upvotes` integer for community voting.
- `is_featured` flags curated homepage content.
- `status` on submissions defaults to 'approved' for instant visibility (MVP simplicity).
*/

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT 'Rocket',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_categories" ON categories;
CREATE POLICY "anon_read_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- REGIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_regions" ON regions;
CREATE POLICY "anon_read_regions" ON regions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_regions" ON regions;
CREATE POLICY "anon_insert_regions" ON regions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- CHANNELS
-- ============================================================
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL,
  url text NOT NULL,
  audience_size text NOT NULL DEFAULT 'Unknown',
  cost text NOT NULL DEFAULT 'Free',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  region_id uuid REFERENCES regions(id) ON DELETE SET NULL,
  upvotes integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_channels" ON channels;
CREATE POLICY "anon_read_channels" ON channels FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_channels" ON channels;
CREATE POLICY "anon_insert_channels" ON channels FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_channels" ON channels;
CREATE POLICY "anon_update_channels" ON channels FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- STARTUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS startups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  tagline text NOT NULL,
  description text NOT NULL,
  url text NOT NULL,
  logo_url text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  region_id uuid REFERENCES regions(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'Idea',
  upvotes integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE startups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_startups" ON startups;
CREATE POLICY "anon_read_startups" ON startups FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_startups" ON startups;
CREATE POLICY "anon_insert_startups" ON startups FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_startups" ON startups;
CREATE POLICY "anon_update_startups" ON startups FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category_id);
CREATE INDEX IF NOT EXISTS idx_channels_region ON channels(region_id);
CREATE INDEX IF NOT EXISTS idx_channels_featured ON channels(is_featured);
CREATE INDEX IF NOT EXISTS idx_startups_category ON startups(category_id);
CREATE INDEX IF NOT EXISTS idx_startups_region ON startups(region_id);
CREATE INDEX IF NOT EXISTS idx_startups_featured ON startups(is_featured);

-- ============================================================
-- SEED: CATEGORIES
-- ============================================================
INSERT INTO categories (name, slug, icon) VALUES
  ('Developer Tools', 'developer-tools', 'Code2'),
  ('B2B SaaS', 'b2b-saas', 'Briefcase'),
  ('Consumer Apps', 'consumer-apps', 'Smartphone'),
  ('Fintech', 'fintech', 'CreditCard'),
  ('AI & ML', 'ai-ml', 'BrainCircuit'),
  ('Health & Wellness', 'health-wellness', 'HeartPulse'),
  ('Marketplaces', 'marketplaces', 'ShoppingCart'),
  ('Education', 'education', 'GraduationCap'),
  ('Gaming', 'gaming', 'Gamepad2'),
  ('Productivity', 'productivity', 'Zap')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED: REGIONS
-- ============================================================
INSERT INTO regions (name, slug) VALUES
  ('Global', 'global'),
  ('North America', 'north-america'),
  ('Europe', 'europe'),
  ('Asia Pacific', 'asia-pacific'),
  ('Latin America', 'latin-america'),
  ('Middle East & Africa', 'middle-east-africa'),
  ('Africa', 'africa'),
  ('Oceania', 'oceania')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED: CHANNELS
-- ============================================================
INSERT INTO channels (name, slug, description, url, audience_size, cost, category_id, region_id, upvotes, is_featured) VALUES
  ('Product Hunt', 'product-hunt', 'The largest product launch community. Daily launches reach 10k+ early adopters. Perfect for dev tools, SaaS, and consumer apps.', 'https://producthunt.com', '5M+ monthly', 'Free', (SELECT id FROM categories WHERE slug='developer-tools'), (SELECT id FROM regions WHERE slug='global'), 342, true),
  ('Hacker News', 'hacker-news', 'Y Combinator''s forum. Show HN posts can drive 50k+ visitors in a day. Best for developer tools and technical products.', 'https://news.ycombinator.com', '2M+ monthly', 'Free', (SELECT id FROM categories WHERE slug='developer-tools'), (SELECT id FROM regions WHERE slug='global'), 298, true),
  ('Reddit r/SaaS', 'reddit-saas', 'Active SaaS founder community. Great for feedback, beta users, and B2B customer discovery.', 'https://reddit.com/r/SaaS', '150K+ members', 'Free', (SELECT id FROM categories WHERE slug='b2b-saas'), (SELECT id FROM regions WHERE slug='global'), 187, true),
  ('Indie Hackers', 'indie-hackers', 'Community of independent founders. Share milestones, find co-founders, and get early users.', 'https://indiehackers.com', '500K+ monthly', 'Free', (SELECT id FROM categories WHERE slug='productivity'), (SELECT id FROM regions WHERE slug='global'), 156, true),
  ('Twitter/X Tech', 'twitter-tech', 'Build in public on X. The #buildinpublic hashtag reaches thousands of founders and early adopters daily.', 'https://twitter.com', '400M+ users', 'Free', (SELECT id FROM categories WHERE slug='ai-ml'), (SELECT id FROM regions WHERE slug='global'), 134, true),
  ('LinkedIn B2B', 'linkedin-b2b', 'The #1 platform for B2B customer discovery. Cold outreach, content marketing, and Sales Navigator for targeted leads.', 'https://linkedin.com', '900M+ users', 'Paid', (SELECT id FROM categories WHERE slug='b2b-saas'), (SELECT id FROM regions WHERE slug='global'), 112, true),
  ('BetaList', 'betalist', 'Get early adopters for your startup. Featured launches reach a curated audience of tech enthusiasts.', 'https://betalist.com', '50K+ subscribers', 'Freemium', (SELECT id FROM categories WHERE slug='consumer-apps'), (SELECT id FROM regions WHERE slug='global'), 89, false),
  ('Dev.to', 'dev-to', 'Developer community with 1M+ members. Write technical articles to attract dev-tool users.', 'https://dev.to', '1M+ monthly', 'Free', (SELECT id FROM categories WHERE slug='developer-tools'), (SELECT id FROM regions WHERE slug='global'), 76, false),
  ('WeChat Ecosystem', 'wechat-ecosystem', 'Reach 1.2B Chinese users via Mini Programs, Official Accounts, and WeChat Pay. Essential for China market entry.', 'https://wechat.com', '1.2B+ users', 'Paid', (SELECT id FROM categories WHERE slug='consumer-apps'), (SELECT id FROM regions WHERE slug='asia-pacific'), 64, false),
  ('Mercado Livre', 'mercado-livre', 'Latin America''s largest marketplace. 100M+ active buyers across Brazil, Argentina, Mexico.', 'https://mercadolivre.com', '100M+ buyers', 'Freemium', (SELECT id FROM categories WHERE slug='marketplaces'), (SELECT id FROM regions WHERE slug='latin-america'), 52, false),
  ('Jovem Nerd & TechBR', 'jovem-nerd-techbr', 'Brazilian tech communities and podcasts. Reach Portuguese-speaking early adopters and developers.', 'https://jovemnerd.com.br', '500K+ audience', 'Free', (SELECT id FROM categories WHERE slug='gaming'), (SELECT id FROM regions WHERE slug='latin-america'), 38, false),
  ('Nairaland', 'nairaland', 'Nigeria''s largest online forum. 3M+ members discussing tech, business, and startups. Key for West African market.', 'https://nairaland.com', '3M+ members', 'Free', (SELECT id FROM categories WHERE slug='consumer-apps'), (SELECT id FROM regions WHERE slug='africa'), 45, false),
  ('TechCrunch Disrupt', 'techcrunch-disrupt', 'Premier startup competition and conference. Winning startups get global press coverage and investor attention.', 'https://techcrunch.com', '10M+ readers', 'Paid', (SELECT id FROM categories WHERE slug='ai-ml'), (SELECT id FROM regions WHERE slug='global'), 91, false),
  ('Xiaohongshu (RedNote)', 'xiaohongshu', 'China''s leading lifestyle social platform. 200M+ users. Ideal for consumer brands and e-commerce startups.', 'https://xiaohongshu.com', '200M+ users', 'Paid', (SELECT id FROM categories WHERE slug='consumer-apps'), (SELECT id FROM regions WHERE slug='asia-pacific'), 73, false),
  ('Meetup.com Tech Groups', 'meetup-tech', 'Local tech meetups in 100+ cities. In-person networking for founder-to-customer relationships.', 'https://meetup.com', '50M+ members', 'Free', (SELECT id FROM categories WHERE slug='developer-tools'), (SELECT id FROM regions WHERE slug='global'), 67, false),
  ('Gumroad Community', 'gumroad-community', 'Sell digital products directly to creators. Built-in audience for productivity and education tools.', 'https://gumroad.com', '500K+ creators', 'Freemium', (SELECT id FROM categories WHERE slug='education'), (SELECT id FROM regions WHERE slug='global'), 54, false),
  ('Discord Server Lists', 'discord-server-lists', 'List your community on Disboard and Discord.me. Grow niche audiences for gaming and consumer apps.', 'https://disboard.org', '10M+ users', 'Free', (SELECT id FROM categories WHERE slug='gaming'), (SELECT id FROM regions WHERE slug='global'), 48, false),
  ('Crunchbase', 'crunchbase', 'The go-to database for startups and investors. Get listed for investor visibility and partnership discovery.', 'https://crunchbase.com', '75M+ users', 'Freemium', (SELECT id FROM categories WHERE slug='b2b-saas'), (SELECT id FROM regions WHERE slug='global'), 82, false),
  ('F6S', 'f6s', 'Global startup community with 5M+ members. Compete for grants, find accelerator programs, reach founders.', 'https://f6s.com', '5M+ members', 'Free', (SELECT id FROM categories WHERE slug='b2b-saas'), (SELECT id FROM regions WHERE slug='global'), 43, false),
  ('Itch.io', 'itch-io', 'Indie game marketplace and community. 500K+ creators. Best for indie games and experimental projects.', 'https://itch.io', '500K+ creators', 'Freemium', (SELECT id FROM categories WHERE slug='gaming'), (SELECT id FROM regions WHERE slug='global'), 61, false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: STARTUPS
-- ============================================================
INSERT INTO startups (name, slug, tagline, description, url, logo_url, category_id, region_id, stage, upvotes, is_featured) VALUES
  ('NimbusDeploy', 'nimbusdeploy', 'Zero-config deployments in 60 seconds', 'NimbusDeploy makes deploying web apps as easy as dragging a folder. No config files, no Docker, no Kubernetes. Connect your repo and ship.', 'https://nimbusdeploy.example.com', NULL, (SELECT id FROM categories WHERE slug='developer-tools'), (SELECT id FROM regions WHERE slug='north-america'), 'Seed', 218, true),
  ('FlowMetrics', 'flowmetrics', 'Real-time analytics for product teams', 'FlowMetrics gives product teams a live view of user behavior. See exactly where users drop off, what features they love, and where to focus next.', 'https://flowmetrics.example.com', NULL, (SELECT id FROM categories WHERE slug='b2b-saas'), (SELECT id FROM regions WHERE slug='europe'), 'Series A', 174, true),
  ('MindBridge AI', 'mindbridge-ai', 'AI-powered mental health companion', 'MindBridge uses conversational AI to provide 24/7 mental health support. clinically validated, privacy-first, and available in 12 languages.', 'https://mindbridge.example.com', NULL, (SELECT id FROM categories WHERE slug='health-wellness'), (SELECT id FROM regions WHERE slug='global'), 'Seed', 312, true),
  ('PayCircle', 'paycircle', 'Borderless payments for African businesses', 'PayCircle enables businesses across Africa to send and receive payments globally with low fees and instant settlement.', 'https://paycircle.example.com', NULL, (SELECT id FROM categories WHERE slug='fintech'), (SELECT id FROM regions WHERE slug='africa'), 'Pre-seed', 198, true),
  ('CodeMentor X', 'codementor-x', 'AI pair programmer that learns your codebase', 'CodeMentor X integrates with your IDE and learns your codebase patterns. It suggests fixes, writes tests, and reviews PRs with full context awareness.', 'https://codementor.example.com', NULL, (SELECT id FROM categories WHERE slug='ai-ml'), (SELECT id FROM regions WHERE slug='north-america'), 'Seed', 267, true),
  ('ShopSphere', 'shopsphere', 'Turn your social following into a storefront', 'ShopSphere lets creators launch a shoppable store from their social bio. One link, instant checkout, zero inventory needed.', 'https://shopsphere.example.com', NULL, (SELECT id FROM categories WHERE slug='marketplaces'), (SELECT id FROM regions WHERE slug='asia-pacific'), 'Pre-seed', 143, false),
  ('LinguaLeap', 'lingualeap', 'Learn languages through AI conversation', 'LinguaLeap uses AI to create immersive conversation practice in 30+ languages. Adaptive difficulty based on your proficiency level.', 'https://lingualeap.example.com', NULL, (SELECT id FROM categories WHERE slug='education'), (SELECT id FROM regions WHERE slug='global'), 'Idea', 89, false),
  ('TaskFlow Pro', 'taskflow-pro', 'Project management that thinks ahead', 'TaskFlow Pro uses AI to predict project delays, auto-assign tasks based on team capacity, and surface blockers before they happen.', 'https://taskflow.example.com', NULL, (SELECT id FROM categories WHERE slug='productivity'), (SELECT id FROM regions WHERE slug='europe'), 'Seed', 121, false),
  ('PixelForge', 'pixelforge', 'Game asset marketplace for indie developers', 'PixelForge connects indie game developers with 2D/3D asset creators. Buy, sell, or trade assets with built-in licensing.', 'https://pixelforge.example.com', NULL, (SELECT id FROM categories WHERE slug='gaming'), (SELECT id FROM regions WHERE slug='latin-america'), 'Pre-seed', 76, false),
  ('CareNest', 'carenest', 'Family caregiving coordination platform', 'CareNest helps families coordinate care for aging relatives. Shared calendars, medication tracking, and caregiver messaging in one app.', 'https://carenest.example.com', NULL, (SELECT id FROM categories WHERE slug='health-wellness'), (SELECT id FROM regions WHERE slug='north-america'), 'Seed', 134, false)
ON CONFLICT DO NOTHING;