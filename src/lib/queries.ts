import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  supabase,
  type ChannelWithRelations,
  type StartupWithRelations,
  type Category,
  type Region,
  type Startup,
} from '@/lib/supabase';
import { sanitizeForPostgrest } from '@/lib/utils';

type View = 'home' | 'channels' | 'startups' | 'submit-startup' | 'submit-channel' | 'feedback' | 'slack-settings' | 'admin';

export function useChannels(
  filters: {
    search?: string;
    categoryId?: string | null;
    regionId?: string | null;
    featuredOnly?: boolean;
    sortBy?: 'upvotes' | 'newest';
  } = {}
) {
  const [channels, setChannels] = useState<ChannelWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    let query = supabase
      .from('channels')
      .select('*, category:categories(*), region:regions(*)')
      .eq('status', 'approved');

    if (filters.featuredOnly) query = query.eq('is_featured', true);
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.regionId) query = query.eq('region_id', filters.regionId);
    if (filters.search) {
      const s = sanitizeForPostgrest(filters.search);
      if (s) query = query.or(`name.ilike.%${s}%,description.ilike.%${s}%`);
    }
    if (filters.sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('upvotes', { ascending: false });
    }

    query.then(({ data, error: queryError }) => {
      if (cancelled) return;
      setChannels((data ?? []) as unknown as ChannelWithRelations[]);
      setError(Boolean(queryError));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [
    filters.search,
    filters.categoryId,
    filters.regionId,
    filters.featuredOnly,
    filters.sortBy,
  ]);

  return { channels, loading, error };
}

export function useStartups(
  filters: {
    search?: string;
    categoryId?: string | null;
    regionId?: string | null;
    featuredOnly?: boolean;
    sortBy?: 'upvotes' | 'newest';
  } = {}
) {
  const [startups, setStartups] = useState<StartupWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    let query = supabase
      .from('startups')
      .select('*, category:categories(*), region:regions(*)')
      .eq('status', 'approved');

    if (filters.featuredOnly) {
      const now = new Date().toISOString();
      query = query.or(`is_featured.eq.true,featured_until.gt.${now}`);
    }
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.regionId) query = query.eq('region_id', filters.regionId);
    if (filters.search) {
      const s = sanitizeForPostgrest(filters.search);
      if (s) query = query.or(`name.ilike.%${s}%,tagline.ilike.%${s}%,description.ilike.%${s}%`);
    }
    if (filters.sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('upvotes', { ascending: false });
    }

    query.then(({ data, error: queryError }) => {
      if (cancelled) return;
      setError(Boolean(queryError));
      const rows = (data ?? []) as unknown as StartupWithRelations[];
      // Re-sort: featured (is_featured OR featured_until > now) first, then original order
      const now = new Date().toISOString();
      const sorted = [...rows].sort((a, b) => {
        const aFeatured = a.is_featured || (a.featured_until && a.featured_until > now) ? 1 : 0;
        const bFeatured = b.is_featured || (b.featured_until && b.featured_until > now) ? 1 : 0;
        if (aFeatured !== bFeatured) return bFeatured - aFeatured;
        return 0; // preserve original sort order within groups
      });
      setStartups(sorted);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [
    filters.search,
    filters.categoryId,
    filters.regionId,
    filters.featuredOnly,
    filters.sortBy,
  ]);

  return { startups, loading, error };
}

export type VoteResult = {
  success: boolean;
  voted: boolean;
  newCount?: number;
};

export function useUpvote() {
  const { session } = useAuth();
  const [votedChannels, setVotedChannels] = useState<Set<string>>(new Set());
  const [votedStartups, setVotedStartups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session) {
      setVotedChannels(new Set());
      setVotedStartups(new Set());
      return;
    }

    let cancelled = false;
    Promise.all([
      supabase.from('channel_votes').select('channel_id'),
      supabase.from('startup_votes').select('startup_id'),
    ]).then(([channelsResult, startupsResult]) => {
      if (cancelled) return;
      setVotedChannels(new Set((channelsResult.data ?? []).map((vote) => vote.channel_id)));
      setVotedStartups(new Set((startupsResult.data ?? []).map((vote) => vote.startup_id)));
    });

    return () => { cancelled = true; };
  }, [session]);

  const toggleChannelVote = async (id: string): Promise<VoteResult> => {
    const { data, error } = await supabase.rpc('toggle_channel_vote', { p_channel_id: id });
    const result = Array.isArray(data) ? data[0] : data;
    if (error || !result || typeof result.new_count !== 'number') {
      return { success: false, voted: votedChannels.has(id) };
    }
    setVotedChannels((prev) => {
      const next = new Set(prev);
      if (result.voted) next.add(id); else next.delete(id);
      return next;
    });
    return { success: true, voted: result.voted, newCount: result.new_count };
  };

  const toggleStartupVote = async (id: string): Promise<VoteResult> => {
    const { data, error } = await supabase.rpc('toggle_startup_vote', { p_startup_id: id });
    const result = Array.isArray(data) ? data[0] : data;
    if (error || !result || typeof result.new_count !== 'number') {
      return { success: false, voted: votedStartups.has(id) };
    }
    setVotedStartups((prev) => {
      const next = new Set(prev);
      if (result.voted) next.add(id); else next.delete(id);
      return next;
    });
    return { success: true, voted: result.voted, newCount: result.new_count };
  };

  return {
    votedChannels,
    votedStartups,
    toggleChannelVote,
    toggleStartupVote,
  };
}

export function isStartupFeatured(startup: Pick<Startup, 'is_featured' | 'featured_until'>): boolean {
  if (startup.is_featured) return true;
  if (startup.featured_until) {
    return new Date(startup.featured_until) > new Date();
  }
  return false;
}

export function featuredDaysLeft(featuredUntil: string | null): number | null {
  if (!featuredUntil) return null;
  const diff = new Date(featuredUntil).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export type { View };
export type { Category, Region };
