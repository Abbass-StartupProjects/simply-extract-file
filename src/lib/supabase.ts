import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  created_at: string;
};

export type Region = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type Channel = {
  id: string;
  name: string;
  slug: string;
  description: string;
  url: string;
  audience_size: string;
  cost: string;
  category_id: string | null;
  region_id: string | null;
  upvotes: number;
  is_featured: boolean;
  status: string;
  created_at: string;
  category?: Category | null;
  region?: Region | null;
};

export type Startup = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  url: string;
  logo_url: string | null;
  category_id: string | null;
  region_id: string | null;
  stage: string;
  upvotes: number;
  is_featured: boolean;
  featured_until: string | null;
  status: string;
  created_at: string;
  category?: Category | null;
  region?: Region | null;
};

export type ChannelWithRelations = Channel & {
  category: Category | null;
  region: Region | null;
};

export type StartupWithRelations = Startup & {
  category: Category | null;
  region: Region | null;
};
