import { useEffect, useMemo, useState } from 'react';
import {
  Rocket, Search, ArrowRight, Globe2, TrendingUp, Users,
  Sparkles, MapPin, Zap, ChevronRight,
} from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useChannels, useStartups, useUpvote } from '@/lib/queries';
import { useCategories, useRegions, usePublicCounts } from '@/lib/hooks';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { gsap } from '@/lib/gsap';
import ChannelCard from '@/components/ChannelCard';
import StartupCard from '@/components/StartupCard';
import CountUp from '@/components/CountUp';
import GrowthChart from '@/components/GrowthChart';
import { getIcon } from '@/lib/ui';

export default function HomePage() {
  const { navigate } = useRouter();
  const { channels, loading: channelsLoading, error: channelsError } = useChannels({ featuredOnly: true, sortBy: 'upvotes' });
  const { startups, loading: startupsLoading, error: startupsError } = useStartups({ featuredOnly: true, sortBy: 'upvotes' });
  const { categories } = useCategories();
  const { regions } = useRegions();
  const publicCounts = usePublicCounts();
  const { votedChannels, votedStartups, toggleChannelVote, toggleStartupVote } = useUpvote();
  const [search, setSearch] = useState('');
  const scrollRef = useScrollReveal<HTMLDivElement>();

  const featuredChannels = channels.slice(0, 6);
  const featuredStartups = startups.slice(0, 6);

  const stats = useMemo(() => [
    { label: 'Growth Channels', value: publicCounts ? `${publicCounts.channels}` : '—', icon: TrendingUp },
    { label: 'Global Regions', value: `${regions.length || 8}`, icon: Globe2 },
    { label: 'Startups Listed', value: publicCounts ? `${publicCounts.startups}` : '—', icon: Rocket },
    { label: 'Categories', value: `${categories.length || 10}`, icon: Sparkles },
  ], [publicCounts, regions.length, categories.length]);

  const handleSearch = () => {
    navigate('channels', search ? { q: search } : undefined);
  };

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      // Hero entrance: badge, headline words, copy, search, links — sequenced.
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero-badge', { opacity: 0, y: 18, scale: 0.92, duration: 0.55 })
        .from(
          '.hero-word',
          { opacity: 0, yPercent: 110, duration: 0.85, stagger: 0.09, ease: 'power4.out' },
          '-=0.2'
        )
        .from('.hero-copy', { opacity: 0, y: 22, duration: 0.7 }, '-=0.45')
        .from('.hero-search', { opacity: 0, y: 24, scale: 0.97, duration: 0.7 }, '-=0.45')
        .from('.hero-links', { opacity: 0, y: 16, duration: 0.6 }, '-=0.45')
        .from('.stat-card', { opacity: 0, y: 30, scale: 0.95, duration: 0.65, stagger: 0.08 }, '-=0.35');

      // Parallax: background blobs drift as the page scrolls away.
      gsap.utils.toArray<HTMLElement>('.hero-blob').forEach((blob, i) => {
        gsap.to(blob, {
          yPercent: i % 2 === 0 ? 22 : -16,
          ease: 'none',
          scrollTrigger: {
            trigger: blob.closest('section'),
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
          },
        });
      });

      // Interactive tilt on the search bar.
      const search = document.querySelector('.hero-search');
      if (search) {
        const move = (e: Event) => {
          const me = e as MouseEvent;
          const r = (search as HTMLElement).getBoundingClientRect();
          const dx = (me.clientX - r.left - r.width / 2) / r.width;
          const dy = (me.clientY - r.top - r.height / 2) / r.height;
          gsap.to(search, { rotateY: dx * 4, rotateX: -dy * 3, transformPerspective: 800, duration: 0.4, overwrite: true });
        };
        const leave = () => gsap.to(search, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)', overwrite: true });
        search.addEventListener('mousemove', move);
        search.addEventListener('mouseleave', leave);
      }
    }, scrollRef);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={scrollRef}>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-ink-50 via-white to-white">
        {/* Background patterns */}
        <div className="absolute inset-0 grid-pattern opacity-60" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-brand-200/30 blur-3xl animate-float hero-blob" />
          <div className="absolute top-20 -left-32 w-[24rem] h-[24rem] rounded-full bg-accent-200/30 blur-3xl animate-float hero-blob" style={{ animationDelay: '2s' }} />
        </div>
        {/* Stock-ticker uptrend sweeping the bottom of the hero — growth made visible */}
        <GrowthChart className="absolute inset-x-0 bottom-0 w-full h-44 sm:h-60 chart-sweep opacity-90" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-40">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-brand-200/60 text-brand-600 text-xs font-semibold mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
              </span>
              <Zap className="w-3.5 h-3.5" />
              Find your first customers — anywhere in the world
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-ink-900 leading-[1.15] text-balance">
              <span className="hero-word inline-block">Launch</span>{' '}
              <span className="hero-word inline-block">your</span>{' '}
              <span className="hero-word inline-block">startup.</span>
              <br />
              <span className="hero-word inline-block gradient-text">Go</span>{' '}
              <span className="hero-word inline-block gradient-text">global.</span>
            </h1>

            <p className="hero-copy text-lg text-ink-600 mt-7 leading-relaxed max-w-2xl mx-auto text-pretty">
              The platform where founders discover the best channels to find early
              customers worldwide — and showcase their startups to a global community
              of early adopters.
            </p>

            {/* Search bar */}
            <div className="hero-search mt-10 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400 group-focus-within:text-brand-500 transition-colors" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search channels, communities, platforms..."
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-ink-200 bg-white/80 text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300 shadow-soft transition-all"
                />
              </div>
              <button
                onClick={handleSearch}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all duration-300 hover:shadow-glow-lg hover:scale-[1.02]"
              >
                <Search className="w-5 h-5" />
                Search
              </button>
            </div>

            <div className="hero-links flex items-center justify-center gap-4 mt-6 text-sm">
              <button
                onClick={() => navigate('submit-startup')}
                className="text-brand-600 font-semibold hover:text-brand-700 inline-flex items-center gap-1 group transition-colors"
              >
                List your startup
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <span className="text-ink-300">|</span>
              <button
                onClick={() => navigate('submit-channel')}
                className="text-ink-600 font-medium hover:text-ink-900 transition-colors"
              >
                Submit a channel
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 mb-16 max-w-4xl mx-auto">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="stat-card bg-white rounded-2xl border border-ink-200/60 p-5 text-center card-hover hover:shadow-soft"
              >
                <stat.icon className="w-6 h-6 text-brand-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-ink-900"><CountUp value={stat.value} /></div>
                <div className="text-xs text-ink-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-end justify-between mb-10 reveal">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-900">Browse by Category</h2>
            <p className="text-ink-500 mt-2">Find channels tailored to your startup's domain</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {categories.map((cat) => {
            const Icon = getIcon(cat.icon);
            return (
              <button
                key={cat.id}
                onClick={() => navigate('channels', { cat: cat.id })}
                className="reveal group bg-white rounded-2xl border border-ink-200/80 p-5 card-hover hover:shadow-soft-lg hover:border-brand-200/60 transition-all text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-50 border border-brand-100/60 flex items-center justify-center mb-3 group-hover:bg-gradient-to-br group-hover:from-brand-600 group-hover:to-accent-600 group-hover:border-transparent transition-all duration-300">
                  <Icon className="w-5 h-5 text-brand-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <p className="text-sm font-semibold text-ink-900">{cat.name}</p>
                <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all mt-1" />
              </button>
            );
          })}
        </div>
      </section>

      {/* REGIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="reveal relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-950 to-ink-900 p-8 sm:p-12">
          <div className="absolute inset-0 dot-pattern opacity-30" />
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-brand-600/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Globe2 className="w-5 h-5 text-accent-400" />
              <span className="text-accent-400 text-sm font-semibold uppercase tracking-wide">Go Global</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8">
              Find customers in every region
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {regions.map((region) => (
                <button
                  key={region.id}
                  onClick={() => navigate('channels', { region: region.id })}
                  className="reveal group flex items-center gap-2 px-4 py-3.5 rounded-xl bg-ink-800/80 hover:bg-ink-700/80 border border-ink-700/60 hover:border-accent-500/40 transition-all text-left card-hover hover:shadow-glow"
                >
                  <MapPin className="w-4 h-4 text-ink-400 group-hover:text-accent-400 transition-colors" />
                  <span className="text-sm font-medium text-ink-200 group-hover:text-white transition-colors">{region.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED CHANNELS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-end justify-between mb-10 reveal">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-900">Featured Growth Channels</h2>
            <p className="text-ink-500 mt-2">The highest-rated places to find your first customers</p>
          </div>
          <button
            onClick={() => navigate('channels')}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 group"
          >
            View all <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {channelsLoading ? (
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
                <div className="h-3 skeleton rounded w-5/6 mb-2" />
                <div className="h-3 skeleton rounded w-4/6" />
              </div>
            ))}
          </div>
        ) : channelsError ? (
          <p className="text-sm text-ink-500">Featured channels are temporarily unavailable.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredChannels.map((channel) => (
              <div key={channel.id} className="reveal">
                <ChannelCard
                  channel={channel}
                  hasVoted={votedChannels.has(channel.id)}
                  onVote={() => toggleChannelVote(channel.id)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FEATURED STARTUPS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-end justify-between mb-10 reveal">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-900">Trending Startups</h2>
            <p className="text-ink-500 mt-2">Discover what founders are building right now</p>
          </div>
          <button
            onClick={() => navigate('startups')}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 group"
          >
            View all <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {startupsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-ink-200/80 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl skeleton" />
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
        ) : startupsError ? (
          <p className="text-sm text-ink-500">Featured startups are temporarily unavailable.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredStartups.map((startup) => (
              <div key={startup.id} className="reveal">
                <StartupCard
                  startup={startup}
                  hasVoted={votedStartups.has(startup.id)}
                  onVote={() => toggleStartupVote(startup.id)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="reveal relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-accent-700 p-8 sm:p-16 text-center">
          <div className="absolute inset-0 dot-pattern opacity-20" />
          <div className="absolute inset-0">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl animate-float" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-accent-300/20 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
          </div>
          <div className="relative">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm items-center justify-center mb-5">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 text-balance">
              Ready to find your first customers?
            </h2>
            <p className="text-brand-100 text-lg max-w-xl mx-auto mb-8 text-pretty">
              List your startup for free and get discovered by early adopters around the world.
              Join a community of builders shipping fast.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('submit-startup')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-brand-600 bg-white hover:bg-brand-50 shadow-soft-lg transition-all duration-300 hover:scale-[1.02]"
              >
                <Rocket className="w-5 h-5" />
                List Your Startup
              </button>
              <button
                onClick={() => navigate('channels')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white border border-white/25 hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
              >
                Explore Channels
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
