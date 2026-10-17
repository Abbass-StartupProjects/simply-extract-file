import { useRef, useState } from 'react';
import { ArrowUp, ExternalLink, Globe, Sparkles } from 'lucide-react';
import type { StartupWithRelations } from '@/lib/supabase';
import { getIcon, stageColors } from '@/lib/ui';
import { isStartupFeatured, featuredDaysLeft, type VoteResult } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { safeUrl } from '@/lib/utils';
import SpotlightCard from '@/components/SpotlightCard';
import BoostModal from '@/components/BoostModal';

type Props = {
  startup: StartupWithRelations;
  hasVoted: boolean;
  onVote: () => Promise<VoteResult>;
};

export default function StartupCard({ startup, hasVoted, onVote }: Props) {
  const [boostOpen, setBoostOpen] = useState(false);
  const [upvotes, setUpvotes] = useState(startup.upvotes);

  const [voting, setVoting] = useState(false);
  const inFlight = useRef(false);
  const [voteError, setVoteError] = useState(false);
  const { session, openAuthModal } = useAuth();
  const Icon = getIcon(startup.category?.icon ?? 'Rocket');
  const stageClass = stageColors[startup.stage] ?? 'bg-ink-100 text-ink-700';
  const initials = startup.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || '?';

  const featured = isStartupFeatured(startup);
  const daysLeft = featuredDaysLeft(startup.featured_until);

  const handleVote = async () => {
    if (!session) {
      openAuthModal();
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setVoting(true);
    setVoteError(false);
    const result = await onVote();
    if (result.success && result.newCount !== undefined) {
      setUpvotes(result.newCount);
    } else {
      setVoteError(true);
    }
    inFlight.current = false;
    setVoting(false);
  };

  return (
    <>
      <SpotlightCard
        glow={featured ? '217, 119, 6' : '37, 99, 235'}
        className={`group card-hover bg-white rounded-2xl p-6 relative overflow-hidden ${
          featured
            ? 'border-2 border-warning-300 shadow-soft-lg'
            : 'border border-ink-200/80 hover:shadow-soft-lg hover:border-brand-200/60'
        }`}
      >
        {/* Featured gradient glow */}
        {featured && (
          <div className="absolute inset-0 bg-gradient-to-br from-warning-50/50 to-warning-100/30 pointer-events-none" />
        )}
        {/* Hover gradient for non-featured */}
        {!featured && (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50/40 to-accent-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        )}

        {featured && (
          <div className="absolute top-4 left-6 z-10">
            <span title="Featured listing" aria-label={`Featured listing${daysLeft !== null && daysLeft > 0 ? `, ${daysLeft} days remaining` : ''}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-warning-400 to-warning-500 text-white shadow-soft">
              <Sparkles className="w-3 h-3" />
              Featured listing
              {daysLeft !== null && daysLeft > 0 && ` · ${daysLeft}d`}
            </span>
          </div>
        )}

        <div className={`relative flex items-start justify-between mb-4 ${featured ? 'mt-8' : 'mt-1'}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center text-white font-bold shadow-glow">
              {startup.logo_url ? (
                <img src={startup.logo_url} alt={`${startup.name} logo`} loading="lazy" width={48} height={48} className="w-full h-full rounded-xl object-cover" />
              ) : (
                <span className="text-lg">{initials}</span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-ink-900 leading-tight">{startup.name}</h3>
              <p className="text-xs text-ink-500 mt-0.5 flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {startup.category?.name ?? 'Uncategorized'}
              </p>
            </div>
          </div>
          <button
            onClick={handleVote}
            disabled={voting}
            aria-pressed={hasVoted}
            className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg transition-all duration-200 ${
              hasVoted
                ? 'bg-brand-50 text-brand-600 hover:bg-error-50 hover:text-error-600'
                : 'bg-ink-50 text-ink-400 hover:bg-brand-50 hover:text-brand-600 hover:scale-105'
            }`}
            title={hasVoted ? 'Remove your vote' : 'Upvote'}
            aria-label={hasVoted ? `Remove your vote from ${startup.name}, currently ${upvotes} upvotes` : `Upvote ${startup.name}, ${upvotes} upvotes`}
          >
            <ArrowUp className={`w-4 h-4 ${hasVoted ? 'fill-brand-600' : ''}`} />
            <span className="text-xs font-bold mt-0.5">{upvotes}</span>
          </button>
        </div>

        {voteError && <p className="relative text-xs text-error-600 mb-2">Couldn’t record your vote. Please try again.</p>}
        <p className="relative font-medium text-ink-800 text-sm mb-2">{startup.tagline}</p>
        <p className="relative text-sm text-ink-600 leading-relaxed mb-4 line-clamp-2">
          {startup.description}
        </p>

        <div className="relative flex items-center gap-2 flex-wrap mb-4">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${stageClass}`}>
            {startup.stage}
          </span>
          {startup.region && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-ink-100 text-ink-700">
              <Globe className="w-3 h-3" />
              {startup.region.name}
            </span>
          )}
        </div>

        <div className="relative flex items-center justify-between mt-auto">
          <a
            href={safeUrl(startup.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 group/link"
          >
            Visit Startup
            <ExternalLink className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
          </a>
          {!featured && (
            <button
              onClick={() => setBoostOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-warning-700 border border-warning-200 bg-warning-50 hover:bg-warning-100 hover:border-warning-300 transition-colors px-3 py-1.5 rounded-lg"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Get Featured
            </button>
          )}
        </div>
      </SpotlightCard>

      {boostOpen && (
        <BoostModal
          startupId={startup.id}
          startupName={startup.name}
          onClose={() => setBoostOpen(false)}
        />
      )}
    </>
  );
}
