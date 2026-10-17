import type { ReactNode } from 'react';
import PageHero from '@/components/PageHero';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
};

export default function SearchFilters({ title, subtitle, children, action }: Props) {
  return (
    <div className="mb-10">
      <PageHero title={title} subtitle={subtitle} action={action} eyebrow="Directory" overlap />
      <div className="relative -mt-16 z-10 rounded-2xl bg-white/90 backdrop-blur-xl border border-ink-200/70 shadow-soft-lg p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-stretch sm:items-center">
          {children}
        </div>
      </div>
    </div>
  );
}
