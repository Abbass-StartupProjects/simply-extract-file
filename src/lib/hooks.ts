import { useEffect, useState } from 'react';
import { supabase, type Category, type Region } from '@/lib/supabase';
import type { SiteSettings } from '@/lib/crypto';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('categories')
      .select('*')
      .order('name')
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        setCategories(data ?? []);
        setError(Boolean(queryError));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { categories, loading, error };
}

export function useRegions() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('regions')
      .select('*')
      .order('name')
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        setRegions(data ?? []);
        setError(Boolean(queryError));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { regions, loading, error };
}

export function usePublicCounts() {
  const [counts, setCounts] = useState<{ channels: number; startups: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from('channels').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('startups').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    ]).then(([channelsRes, startupsRes]) => {
      if (cancelled) return;
      setCounts({
        channels: channelsRes.count ?? 0,
        startups: startupsRes.count ?? 0,
      });
    });
    return () => { cancelled = true; };
  }, []);

  return counts;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('site_settings')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        setSettings(data as unknown as SiteSettings ?? null);
        setError(Boolean(queryError));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { settings, loading, error };
}
