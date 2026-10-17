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
import heroRocket from '@/assets/hero-rocket.webp';

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
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="absolute inset-0 hero-grid opacity-40" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="aurora-blob hero-blob absolute -top-40 -left-20 w-[38rem] h-[38rem] rounded-full bg-brand-600/40 blur-[120px]" />
          <div className="aurora-blob hero-blob absolute top-10 right-0 w-[32rem] h-[32rem] rounded-full bg-accent-500/25 blur-[120px]" style={{ animationDelay: '-6s' }} />
          <div className="aurora-blob absolute bottom-0 left-1/3 w-[28rem] h-[28rem] rounded-full bg-brand-400/20 blur-[100px]" style={{ animationDelay: '-12s' }} />
        </div>
        <div className="absolute inset-0 hero-grain pointer-events-none" />
        <GrowthChart className="absolute inset-x-0 bottom-0 w-full h-40 sm:h-52 chart-sweep opacity-50" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-36">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur text-accent-200 text-xs font-semibold mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-400" />
                </span>
                <Zap className="w-3.5 h-3.5" />
                Find your first customers — anywhere in the world
              </div>

              <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tighter leading-[1.02] text-balance">
                <span className="block overflow-hidden"><span className="hero-word inline-block">Launch</span>{' '}<span className="hero-word inline-block">your</span>{' '}<span className="hero-word inline-block">startup.</span></span>
                <span className="block overflow-hidden pb-2"><span className="hero-word inline-block text-gradient-bright">Go</span>{' '}<span className="hero-word inline-block text-gradient-bright">global.</span></span>
              </h1>

              <p className="hero-copy text-lg text-ink-300 mt-7 leading-relaxed max-w-xl mx-auto lg:mx-0 text-pretty">
                The platform where founders discover the best channels to find early
                customers worldwide — and showcase their startups to a global community
                of early adopters.
              </p>

              <div className="hero-search conic-border mt-10 rounded-2xl max-w-xl mx-auto lg:mx-0">
                <div className="flex items-center gap-2 rounded-2xl bg-ink-900/95 p-2">
                  <Search className="ml-3 w-5 h-5 text-ink-400 shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search channels, communities, platforms..."
                    aria-label="Search channels"
                    className="min-w-0 flex-1 bg-transparent px-2 py-3 text-white placeholder-ink-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSearch}
                    className="shine inline-flex shrink-0 items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:shadow-glow-lg transition-shadow"
                  >
                    Search <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="hero-links flex items-center justify-center lg:justify-start gap-4 mt-6 text-sm">
                <button onClick={() => navigate('submit-startup')} className="text-accent-300 font-semibold hover:text-white inline-flex items-center gap-1 group transition-colors">
                  List your startup <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <span className="text-ink-700">|</span>
                <button onClick={() => navigate('submit-channel')} className="text-ink-300 font-medium hover:text-white transition-colors">
                  Submit a channel
                </button>
              </div>
            </div>

            {/* Visual */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none aspect-square hidden sm:block">
              <div className="glow-pulse absolute inset-[18%] rounded-full bg-brand-500/40 blur-3xl" />
              <div className="orbit-ring absolute inset-[6%] rounded-full border border-dashed border-white/10" />
              <div className="orbit-ring absolute inset-[18%] rounded-full border border-white/5" style={{ animationDirection: 'reverse', animationDuration: '60s' }} />
              <img src={heroRocket} alt="Rocket launching from a glowing globe" width={720} height={720} fetchPriority="high" decoding="async" className="rocket-float relative w-full h-full object-contain drop-shadow-[0_30px_60px_rgba(37,99,235,0.45)]" />
              <div className="chip-float absolute top-[14%] -left-2 flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md px-3 py-2 text-xs font-semibold shadow-soft-lg">
                <TrendingUp className="w-4 h-4 text-success-400" /> +342 upvotes today
              </div>
              <div className="chip-float absolute bottom-[22%] -right-2 flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md px-3 py-2 text-xs font-semibold shadow-soft-lg" style={{ animationDelay: '-3s' }}>
                <Globe2 className="w-4 h-4 text-accent-300" /> {regions.length || 8} regions live
              </div>
              <div className="chip-float absolute bottom-[6%] left-[12%] flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md px-3 py-2 text-xs font-semibold shadow-soft-lg" style={{ animationDelay: '-5s' }}>
                <Users className="w-4 h-4 text-brand-300" /> First customer found
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-16 max-w-5xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-card group rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur p-5 hover:bg-white/[0.08] hover:border-accent-400/30 transition-colors">
                <stat.icon className="w-5 h-5 text-accent-300 mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-3xl font-extrabold tracking-tight"><CountUp value={stat.value} /></div>
                <div className="text-xs text-ink-400 mt-1 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      {featuredChannels.length > 0 && (
        <section aria-label="Featured channels" className="border-y border-ink-200/70 bg-white py-5">
          <div className="marquee overflow-hidden">
            <div className="marquee-track gap-10">
              {[...channels, ...channels].map((c, i) => (
                <button key={c.id + i} onClick={() => navigate('channels', { q: c.name })} className="flex shrink-0 items-center gap-2 text-ink-400 hover:text-brand-600 font-semibold text-lg transition-colors" tabIndex={i >= channels.length ? -1 : 0}>
                  <Sparkles className="w-4 h-4 text-accent-500" /> {c.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS — bento */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-4">
        <div className="reveal text-center max-w-2xl mx-auto mb-12">
          <span className="text-brand-600 text-sm font-semibold uppercase tracking-widest">How it works</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink-900 mt-3 text-balance">From zero to your first customers</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: Search, t: 'Discover channels', d: 'Browse curated communities, directories and platforms filtered by category and region.', go: () => navigate('channels'), span: 'md:col-span-2', dark: true },
            { icon: Rocket, t: 'List your startup', d: 'Get in front of early adopters worldwide — free.', go: () => navigate('submit-startup'), span: '', dark: false },
            { icon: TrendingUp, t: 'Climb the board', d: 'Upvotes push the best products to the top.', go: () => navigate('startups'), span: '', dark: false },
            { icon: Globe2, t: 'Go global', d: `Reach customers across ${regions.length || 8} regions with channels that actually convert.`, go: () => navigate('channels'), span: 'md:col-span-2', dark: false },
          ].map((b, i) => (
            <button key={b.t} onClick={b.go} className={`reveal bento-card group relative overflow-hidden text-left rounded-3xl p-8 min-h-[220px] border ${b.span} ${b.dark ? 'bg-ink-950 border-ink-800 text-white' : 'bg-white border-ink-200/80'}`}>
              <div className={`absolute -right-10 -bottom-10 w-48 h-48 rounded-full blur-3xl transition-opacity opacity-40 group-hover:opacity-80 ${i % 2 ? 'bg-accent-300/40' : 'bg-brand-500/30'}`} />
              <span className={`text-xs font-mono ${b.dark ? 'text-ink-500' : 'text-ink-400'}`}>0{i + 1}</span>
              <div className="relative mt-4 w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center shadow-glow group-hover:rotate-6 group-hover:scale-110 transition-transform duration-300">
                <b.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className={`relative text-xl font-bold mt-5 ${b.dark ? 'text-white' : 'text-ink-900'}`}>{b.t}</h3>
              <p className={`relative mt-2 max-w-md ${b.dark ? 'text-ink-400' : 'text-ink-500'}`}>{b.d}</p>
              <ArrowRight className={`absolute top-8 right-8 w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 -rotate-45 ${b.dark ? 'text-ink-500' : 'text-ink-300'}`} />
            </button>
          ))}
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
        <div className="reveal relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-700 to-accent-700 p-8 sm:p-20 text-center">
          <div className="absolute inset-0 dot-pattern opacity-20" />
          <div className="absolute inset-0">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl aurora-blob" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-accent-300/20 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
          </div>
          <div className="relative">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm items-center justify-center mb-5">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-5 text-balance">
              Ready to find your first customers?
            </h2>
            <p className="text-brand-100 text-lg max-w-xl mx-auto mb-8 text-pretty">
              List your startup for free and get discovered by early adopters around the world.
              Join a community of builders shipping fast.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('submit-startup')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl shine font-semibold text-brand-600 bg-white hover:bg-brand-50 shadow-soft-lg transition-all duration-300 hover:scale-[1.02]"
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
