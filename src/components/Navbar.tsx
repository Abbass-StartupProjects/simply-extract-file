import { Rocket, Menu, X, Search, Send, LogIn, LogOut, MessageSquare, ChevronDown, Bell } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/lib/router';
import type { View } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { gsap } from '@/lib/gsap';

export default function Navbar() {
  const { view, navigate } = useRouter();
  const { session, signOut, openAuthModal } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const submitMenuRef = useRef<HTMLDetailsElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        y: -70,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    submitMenuRef.current?.removeAttribute('open');
  }, [view]);

  const links: { label: string; view: View }[] = [
    { label: 'Channels', view: 'channels' },
    { label: 'Startups', view: 'startups' },
    { label: 'Feedback', view: 'feedback' },
    { label: 'Notifications', view: 'slack-settings' },
  ];

  const go = (v: View) => {
    submitMenuRef.current?.removeAttribute('open');
    navigate(v);
    setMobileOpen(false);
  };

  return (
    <>
      <header
      ref={headerRef}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'glass border-b border-ink-200/60 shadow-soft'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => go('home')}
            className="flex items-center gap-2.5 group"
          >
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center shadow-glow group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Rocket className="w-5 h-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand-400 to-accent-400 opacity-0 group-hover:opacity-40 blur-md transition-opacity duration-300" />
            </div>
            <span className="text-xl font-bold tracking-tight text-ink-900">
              Launch<span className="gradient-text">rocket</span>
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-0.5">
            {links.slice(0, 2).map((link) => (
              <button
                key={link.view}
                onClick={() => go(link.view)}
                aria-current={view === link.view ? 'page' : undefined}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  view === link.view
                    ? 'text-brand-600'
                    : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                {link.label}
                {view === link.view && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-brand-600 to-accent-500" />
                )}
              </button>
            ))}
            <details ref={submitMenuRef} className="relative group">
              <summary className={`flex cursor-pointer list-none items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-all [&::-webkit-details-marker]:hidden ${
                view === 'submit-startup' || view === 'submit-channel'
                  ? 'text-brand-600'
                  : 'text-ink-600 hover:text-ink-900'
              }`}>
                Submit
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-ink-200/80 bg-white p-1.5 shadow-soft-lg">
                <a href="#/submit-startup" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setMobileOpen(false); }} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-ink-600 hover:bg-brand-50 hover:text-brand-700">Submit a startup</a>
                <a href="#/submit-channel" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setMobileOpen(false); }} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-ink-600 hover:bg-brand-50 hover:text-brand-700">Submit a channel</a>
              </div>
            </details>
            {links.slice(2, 3).map((link) => (
              <button
                key={link.view}
                onClick={() => go(link.view)}
                aria-current={view === link.view ? 'page' : undefined}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  view === link.view
                    ? 'text-brand-600'
                    : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                <MessageSquare className="mr-1.5 inline-block h-4 w-4" />
                {link.label}
                {view === link.view && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-brand-600 to-accent-500" />}
              </button>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-2">
            {session ? (
              <button onClick={() => signOut()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-100/60 transition-all" title="Sign out">
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            ) : (
              <button onClick={() => openAuthModal()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-brand-600 hover:bg-brand-50 transition-all">
                <LogIn className="w-4 h-4" />
                Sign in
              </button>
            )}
            <button
              onClick={() => go('channels')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-100/60 transition-all"
            >
              <Search className="w-4 h-4" />
              Browse
            </button>
            <button
              onClick={() => go('submit-startup')}
              className="relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all duration-300 hover:shadow-glow-lg hover:scale-[1.02]"
            >
              <Send className="w-3.5 h-3.5" />
              Launch
            </button>
            <button
              onClick={() => go('slack-settings')}
              title="Notification settings"
              aria-label="Notification settings"
              className={`relative p-2.5 rounded-lg transition-all ${
                view === 'slack-settings'
                  ? 'text-brand-600 bg-brand-50'
                  : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100/60'
              }`}
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden p-2 rounded-lg text-ink-600 hover:bg-ink-100/60 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden glass border-t border-ink-200/60 animate-slide-down">
          <div className="px-4 py-3 space-y-1">
            {links.map((link) => (
              <button
                key={link.view}
                onClick={() => go(link.view)}
                aria-current={view === link.view ? 'page' : undefined}
                className={`block w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  view === link.view
                    ? 'text-brand-600 bg-brand-50'
                    : 'text-ink-600 hover:bg-ink-100/60'
                }`}
              >
                {link.label}
              </button>
            ))}
            {session ? (
              <button onClick={() => { signOut(); setMobileOpen(false); }} className="block w-full text-center px-4 py-3 mt-2 rounded-xl text-sm font-semibold text-ink-700 bg-ink-100 hover:bg-ink-200">
                Sign out
              </button>
            ) : (
              <button onClick={() => { openAuthModal(); setMobileOpen(false); }} className="block w-full text-center px-4 py-3 mt-2 rounded-xl text-sm font-semibold text-brand-700 bg-brand-50">
                Sign in to vote
              </button>
            )}
            <div className="mt-3 rounded-xl border border-ink-200/80 bg-white/70 p-2">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ink-400">Submit</p>
              <a href="#/submit-startup" onClick={() => setMobileOpen(false)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-600 hover:bg-brand-50 hover:text-brand-700">Submit a startup</a>
              <a href="#/submit-channel" onClick={() => setMobileOpen(false)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-600 hover:bg-brand-50 hover:text-brand-700">Submit a channel</a>
            </div>
            <button
              onClick={() => go('submit-startup')}
              className="block w-full text-center px-4 py-3 mt-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 shadow-glow"
            >
              Launch Your Startup
            </button>
          </div>
        </div>
      )}
    </header>
    </>
  );
}
