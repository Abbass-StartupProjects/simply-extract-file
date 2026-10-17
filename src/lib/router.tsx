import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { View } from '@/lib/queries';

type RouterContextType = {
  view: View;
  params: Record<string, string>;
  navigate: (view: View, params?: Record<string, string>) => void;
};

const RouterContext = createContext<RouterContextType | null>(null);

function parseHash(): { view: View; params: Record<string, string> } {
  const hash = window.location.hash.slice(1) || '/';
  const [path, queryString] = hash.split('?');
  const params: Record<string, string> = {};
  if (queryString) {
    new URLSearchParams(queryString).forEach((v, k) => (params[k] = v));
  }

  const segments = path.split('/').filter(Boolean);
  const viewMap: Record<string, View> = {
    '': 'home',
    channels: 'channels',
    startups: 'startups',
    'submit-startup': 'submit-startup',
    'submit-channel': 'submit-channel',
    feedback: 'feedback',
    'slack-settings': 'slack-settings',
    admin: 'admin',
  };
  const view = viewMap[segments[0] ?? ''] ?? 'home';
  return { view, params };
}

function viewToHash(view: View, params?: Record<string, string>): string {
  const path = view === 'home' ? '/' : `/${view}`;
  const qs = params && Object.keys(params).length
    ? '?' + new URLSearchParams(params).toString()
    : '';
  return path + qs;
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(parseHash());

  useEffect(() => {
    const onHashChange = () => setState(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Accessibility + SEO: keep the document title in sync with the view,
  // and announce the change to screen readers (WCAG 4.1.2 / route-change focus).
  const titles: Record<View, string> = {
    home: 'Launchrocket — Find Customers Worldwide',
    channels: 'Growth Channels — Launchrocket',
    startups: 'Startups — Launchrocket',
    'submit-startup': 'List Your Startup — Launchrocket',
    'submit-channel': 'Submit a Channel — Launchrocket',
    feedback: 'Feedback & Support — Launchrocket',
    'slack-settings': 'Notifications — Launchrocket',
    admin: 'Admin Dashboard — Launchrocket',
  };
  const announcements: Record<View, string> = {
    home: 'Home page loaded',
    channels: 'Growth channels page loaded',
    startups: 'Startup directory page loaded',
    'submit-startup': 'List your startup page loaded',
    'submit-channel': 'Submit a channel page loaded',
    feedback: 'Feedback and support page loaded',
    'slack-settings': 'Notification settings page loaded',
    admin: 'Admin dashboard page loaded',
  };
  useEffect(() => {
    document.title = titles[state.view] ?? 'Launchrocket';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view]);

  const navigate = (view: View, params?: Record<string, string>) => {
    window.location.hash = viewToHash(view, params);
  };

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcements[state.view] ?? ''}
      </div>
      <RouterContext.Provider value={{ view: state.view, params: state.params, navigate }}>
        {children}
      </RouterContext.Provider>
    </>
  );
}

export function useIsAdminRoute() {
  const { view } = useRouter();
  return view === 'admin';
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
