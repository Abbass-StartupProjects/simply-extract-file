import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
};

export default function SearchFilters({ title, subtitle, children, action }: Props) {
  return (
    <div className="mb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div className="reveal">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-900">{title}</h1>
          {subtitle && <p className="text-ink-500 mt-2 text-pretty">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-stretch sm:items-center">
        {children}
      </div>
    </div>
  );
}
