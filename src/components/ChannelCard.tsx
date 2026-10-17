import { useRef, useState } from 'react';
import { ArrowUp, ExternalLink, Users, DollarSign, Globe, Sparkles } from 'lucide-react';
import type { ChannelWithRelations } from '@/lib/supabase';
import { getIcon, costColors } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { safeUrl } from '@/lib/utils';
import SpotlightCard from '@/components/SpotlightCard';
import type { VoteResult } from '@/lib/queries';

type Props = {
  channel: ChannelWithRelations;
  hasVoted: boolean;
  onVote: () => Promise<VoteResult>;
};

export default function ChannelCard({ channel, hasVoted, onVote }: Props) {
  const [upvotes, setUpvotes] = useState(channel.upvotes);
  const [voting, setVoting] = useState(false);
  const inFlight = useRef(false);
  const [voteError, setVoteError] = useState(false);
  const { session, openAuthModal } = useAuth();
  const Icon = getIcon(channel.category?.icon ?? 'Rocket');
  const costClass = costColors[channel.cost] ?? 'bg-ink-100 text-ink-700';

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
    <SpotlightCard
      glow={channel.is_featured ? '217, 119, 6' : '37, 99, 235'}
      className={`group card-hover bg-white rounded-3xl p-6 hover:shadow-soft-lg overflow-hidden relative ${channel.is_featured ? 'border-2 border-warning-300 shadow-soft-lg' : 'border border-ink-200/80 hover:border-brand-200/60'}`}
    >
      {/* Subtle gradient on hover */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${channel.is_featured ? 'bg-gradient-to-br from-warning-50/50 to-warning-100/30' : 'bg-gradient-to-br from-brand-50/40 to-accent-50/40 opacity-0 group-hover:opacity-100'}`} />
      {channel.is_featured && (
        <div className="absolute top-4 left-6 z-10">
          <span title="Featured listing" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-warning-400 to-warning-500 text-white shadow-soft">
            <Sparkles className="w-3 h-3" /> Featured listing
          </span>
        </div>
      )}

      <div className={`relative flex items-start justify-between mb-4 ${channel.is_featured ? 'mt-8' : ''}`} >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 border border-brand-100/60 flex items-center justify-center group-hover:from-brand-600 group-hover:to-accent-600 group-hover:border-transparent transition-all duration-300">
            <Icon className="w-5 h-5 text-brand-600 group-hover:text-white transition-colors duration-300" />
          </div>
          <div>
            <h3 className="font-bold text-ink-900 leading-tight">{channel.name}</h3>
            <p className="text-xs text-ink-500 mt-0.5">{channel.category?.name ?? 'Uncategorized'}</p>
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
          aria-label={hasVoted ? `Remove your vote from ${channel.name}, currently ${upvotes} upvotes` : `Upvote ${channel.name}, ${upvotes} upvotes`}
        >
          <ArrowUp className={`w-4 h-4 transition-transform ${hasVoted ? 'fill-brand-600' : 'group-hover:translate-y-[-2px]'} ${!hasVoted ? 'hover:-translate-y-0.5' : ''}`} />
          <span className="text-xs font-bold mt-0.5">{upvotes}</span>
        </button>
      </div>

      {voteError && <p className="relative text-xs text-error-600 mb-2">Couldn’t record your vote. Please try again.</p>}
      <p className="relative text-sm text-ink-600 leading-relaxed mb-4 line-clamp-3">
        {channel.description}
      </p>

      <div className="relative flex items-center gap-2 flex-wrap mb-4">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${costClass}`}>
          <DollarSign className="w-3 h-3" />
          {channel.cost}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-ink-100 text-ink-700">
          <Users className="w-3 h-3" />
          {channel.audience_size}
        </span>
        {channel.region && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-ink-100 text-ink-700">
            <Globe className="w-3 h-3" />
            {channel.region.name}
          </span>
        )}
      </div>

      <a
        href={safeUrl(channel.url)}
        target="_blank"
        rel="noopener noreferrer"
        className="relative inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 group/link"
      >
        Visit Channel
        <ExternalLink className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
      </a>
    </SpotlightCard>
  );
}
