import type { ReactNode } from 'react';
import { ArrowLeft, type LucideIcon } from 'lucide-react';

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  back?: { label: string; onClick: () => void };
  /** Extra bottom space so a card below can overlap the band. */
  overlap?: boolean;
};

/**
 * Full-bleed dark aurora band used at the top of every inner page.
 * Breaks out of its parent container with negative margins, so pages keep
 * their existing layout wrapper. Pure CSS motion — no JS cost.
 */
export default function PageHero({ title, subtitle, eyebrow, icon: Icon, action, back, overlap }: Props) {
  return (
    <div className={`page-hero-bleed relative overflow-hidden bg-ink-950 text-white -mt-12 ${overlap ? 'mb-0 pb-28' : 'mb-10 pb-16'}`}>
      <div className="absolute inset-0 hero-grid opacity-30" />
      <div className="aurora-blob absolute -top-32 -left-10 w-[30rem] h-[30rem] rounded-full bg-brand-600/35 blur-[110px] pointer-events-none" />
      <div className="aurora-blob absolute -top-20 right-0 w-[26rem] h-[26rem] rounded-full bg-accent-500/20 blur-[110px] pointer-events-none" style={{ animationDelay: '-8s' }} />
      <div className="absolute inset-0 hero-grain pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent-400/40 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
        {back && (
          <button onClick={back.onClick} className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-white mb-8 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> {back.label}
          </button>
        )}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="page-hero-in min-w-0">
            <div className="flex items-center gap-3 mb-4">
              {Icon && (
                <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center shadow-glow">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              )}
              {eyebrow && <span className="text-accent-300 text-xs font-semibold uppercase tracking-widest">{eyebrow}</span>}
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tighter leading-[1.02] text-balance">{title}</h1>
            {subtitle && <p className="text-ink-300 mt-4 text-lg max-w-2xl text-pretty">{subtitle}</p>}
          </div>
          {action && <div className="page-hero-in shrink-0" style={{ animationDelay: '120ms' }}>{action}</div>}
        </div>
      </div>
    </div>
  );
}
