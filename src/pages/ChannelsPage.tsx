import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, TrendingUp, Clock, Send } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useChannels, useUpvote } from '@/lib/queries';
import { useCategories, useRegions } from '@/lib/hooks';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { useDebounce } from '@/lib/useDebounce';
import ChannelCard from '@/components/ChannelCard';
import SearchFilters from '@/components/SearchFilters';

export default function ChannelsPage() {
  const { params, navigate } = useRouter();
  const { categories } = useCategories();
  const { regions } = useRegions();

  const [search, setSearch] = useState(params.q ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(params.cat ?? null);
  const [regionId, setRegionId] = useState<string | null>(params.region ?? null);
  const [sortBy, setSortBy] = useState<'upvotes' | 'newest'>('upvotes');

  useEffect(() => {
    setSearch(params.q ?? '');
    setCategoryId(params.cat ?? null);
    setRegionId(params.region ?? null);
  }, [params.q, params.cat, params.region]);

  const debouncedSearch = useDebounce(search, 300);

  const { channels, loading, error } = useChannels({
    search: debouncedSearch || undefined,
    categoryId,
    regionId,
    sortBy,
  });

  // Re-scan for newly rendered cards whenever the list changes, so they reveal
  // instead of staying invisible.
  const revealKey = `${loading ? 'L' : 'D'}:${channels.length}:${debouncedSearch}`;
  const scrollRef = useScrollReveal<HTMLDivElement>([revealKey]);

  const { votedChannels, toggleChannelVote } = useUpvote();

  return (
    <div ref={scrollRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SearchFilters
        title="Growth Channels"
        subtitle="Curated platforms, communities, and directories to find your first customers worldwide"
        action={
          <button
            onClick={() => navigate('submit-channel')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all duration-300 hover:scale-[1.02]"
          >
            <Send className="w-4 h-4" />
            Submit Channel
          </button>
        }
      >
        <div className="relative flex-1 min-w-[200px] group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 group-focus-within:text-brand-500 transition-colors" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels..."
            aria-label="Search channels"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300 transition-all"
          />
        </div>

        <select
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value || null)}
          aria-label="Filter by category"
          className="px-3.5 py-2.5 rounded-xl border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300 transition-all min-w-[140px] cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={regionId ?? ''}
          onChange={(e) => setRegionId(e.target.value || null)}
          aria-label="Filter by region"
          className="px-3.5 py-2.5 rounded-xl border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300 transition-all min-w-[140px] cursor-pointer"
        >
          <option value="">All Regions</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <div className="inline-flex rounded-xl border border-ink-200 overflow-hidden bg-white">
          <button
            onClick={() => setSortBy('upvotes')}
            aria-pressed={sortBy === 'upvotes'}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all ${
              sortBy === 'upvotes' ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Top
          </button>
          <button
            onClick={() => setSortBy('newest')}
            aria-pressed={sortBy === 'newest'}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all ${
              sortBy === 'newest' ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            New
          </button>
        </div>
      </SearchFilters>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-ink-200/80 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton rounded w-3/4" />
                  <div className="h-3 skeleton rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 skeleton rounded mb-2" />
              <div className="h-3 skeleton rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-24 reveal">
          <h3 className="text-lg font-bold text-ink-900 mb-2">Channels are temporarily unavailable</h3>
          <p className="text-ink-500">Please try again in a moment.</p>
        </div>
      ) : channels.length === 0 ? (
        <div className="text-center py-24 reveal">
          <div className="w-16 h-16 rounded-2xl bg-ink-100 flex items-center justify-center mx-auto mb-5">
            <SlidersHorizontal className="w-7 h-7 text-ink-400" />
          </div>
          <h3 className="text-lg font-bold text-ink-900 mb-2">No channels found</h3>
          <p className="text-ink-500 mb-6">Try adjusting your filters or search terms</p>
          <button
            onClick={() => {
              setSearch('');
              setCategoryId(null);
              setRegionId(null);
            }}
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-500 mb-5">
            {channels.length} channel{channels.length !== 1 ? 's' : ''} found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map((channel) => (
              <div key={channel.id} className="reveal">
                <ChannelCard
                  channel={channel}
                  hasVoted={votedChannels.has(channel.id)}
                  onVote={() => toggleChannelVote(channel.id)}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
