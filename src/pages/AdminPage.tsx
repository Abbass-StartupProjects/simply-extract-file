import PageHero from '@/components/PageHero';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ShieldCheck, Loader2, AlertCircle, CheckCircle2, Rocket, Radio, Users,
  Ticket as TicketIcon, ShoppingBag, DollarSign, Eye, Check, X, Trash2,
  RefreshCw, Lock, CornerUpLeft, Send, Clock, MessageSquare, Bell, TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { safeUrl } from '@/lib/utils';

type PendingListing = {
  id: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  url: string;
  created_at: string;
  category: string | null;
  region: string | null;
};

type BoostOrder = {
  id: string;
  kind: string;
  listing_name: string;
  listing_url: string;
  plan: string;
  amount_cents: number;
  currency: string;
  payment_method: string | null;
  payment_reference: string | null;
  status: string;
  contact_email: string | null;
  featured_until: string | null;
  created_at: string;
};

type Ticket = {
  id: string;
  subject: string;
  body: string;
  email: string;
  status: string;
  created_at: string;
  reply_count?: number;
};

type TicketDetail = {
  ticket: Ticket;
  replies: { id: string; author_role: string; body: string; created_at: string }[];
};

type Stats = {
  users: number;
  startups: number;
  channels: number;
  startups7d: number;
  channels7d: number;
  votes: number;
  pendingStartups: number;
  pendingChannels: number;
  openTickets: number;
  pendingOrders: number;
  revenue7dCents: number;
};

type Tab = 'overview' | 'queue' | 'orders' | 'tickets';

const tabs: { key: Tab; label: string; icon: typeof Eye }[] = [
  { key: 'overview', label: 'Overview', icon: Eye },
  { key: 'queue', label: 'Moderation queue', icon: Check },
  { key: 'orders', label: 'Boost orders', icon: ShoppingBag },
  { key: 'tickets', label: 'Support tickets', icon: TicketIcon },
];

function formatMoney(cents: number, currency: string): string {
  const value = (cents / 100).toFixed(2);
  const symbol = currency === 'eur' ? '€' : currency === 'gbp' ? '£' : '$';
  return `${symbol}${value}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-warning-100 text-warning-800',
    verified: 'bg-success-100 text-success-700',
    approved: 'bg-success-100 text-success-700',
    rejected: 'bg-error-100 text-error-700',
    expired: 'bg-ink-100 text-ink-600',
    open: 'bg-brand-100 text-brand-700',
    answered: 'bg-success-100 text-success-700',
    closed: 'bg-ink-100 text-ink-600',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] ?? 'bg-ink-100 text-ink-600'}`}>
      {status}
    </span>
  );
}

function GenericError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error-50 border border-error-100 text-error-700 text-sm">
        <AlertCircle className="w-4 h-4 flex-shrink-0" /> {message}
      </div>
      <button onClick={onRetry} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
        <RefreshCw className="w-4 h-4" /> Try again
      </button>
    </div>
  );
}

export default function AdminPage() {
  const { session, loading: authLoading } = useAuth();

  const [tab, setTab] = useState<Tab>('overview');
  const tabRef = useRef<Tab>(tab);
  tabRef.current = tab;
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<{ startups: PendingListing[]; channels: PendingListing[] } | null>(null);
  const [orders, setOrders] = useState<BoostOrder[] | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionDone, setActionDone] = useState<string | null>(null);

  // detail drawer state
  const [openTicket, setOpenTicket] = useState<TicketDetail | null>(null);
  const openTicketIdRef = useRef<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const flash = (message: string) => {
    setActionDone(message);
    window.setTimeout(() => setActionDone((current) => (current === message ? null : current)), 3500);
  };

  const rpcCall = useCallback(async (fn: string, args: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> => {
    if (!session) return { ok: false, error: 'Please sign in first.' };
    const { error } = await supabase.rpc(fn, args);
    if (error) {
      if (error.message === 'Not authorized') return { ok: false, error: 'Only the site owner can do this.' };
      if (error.message === 'Not found') return { ok: false, error: 'That item no longer exists.' };
      return { ok: false, error: 'Something went wrong. Please try again.' };
    }
    return { ok: true };
  }, [session]);

  const loadData = useCallback(async (soft = false) => {
    if (!session) return;
    if (!soft) setLoadingData(true);
    setActionError(null);

    const wantStats = tab === 'overview';
    const wantQueue = tab === 'queue';
    const wantOrders = tab === 'orders';
    const wantTickets = tab === 'tickets';
    // Ignore responses that arrive after the user has switched tabs — the
    // previous tab's fetches must not overwrite the current view or raise
    // errors for data the user already left behind.
    const requestTab = tab;
    const isStale = () => requestTab !== tabRef.current;

    const results = await Promise.allSettled([
      wantStats
        ? fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).then(async (res) => {
            if (res.status === 403) { setIsOwner(false); return null; }
            const json = await res.json().catch(() => null);
            if (!res.ok || !json || typeof json.startups !== 'number') throw new Error('bad shape');
            setIsOwner(true);
            return json as Stats;
          })
        : Promise.resolve(null),
      wantQueue ? supabase.rpc('admin_list_pending_listings') : Promise.resolve(null),
      wantOrders ? supabase.rpc('admin_list_boost_orders') : Promise.resolve(null),
      wantTickets ? supabase.rpc('admin_list_tickets') : Promise.resolve(null),
    ]);

    const [statsRes, queueRes, ordersRes, ticketsRes] = results;

    if (isStale()) return;

    if (statsRes.status === 'fulfilled' && statsRes.value) setStats(statsRes.value);
    if (statsRes.status === 'rejected') setActionError('Could not load dashboard numbers. Please try again.');

    if (queueRes.status === 'fulfilled' && queueRes.value) {
      const value = queueRes.value.data as { startups: PendingListing[]; channels: PendingListing[] } | null;
      if (value && Array.isArray(value.startups) && Array.isArray(value.channels)) {
        setPending(value);
      } else if (queueRes.value.error) {
        setActionError('Could not load the moderation queue.');
      }
    } else if (queueRes.status === 'rejected') {
      setActionError('Could not load the moderation queue.');
    }

    if (ordersRes.status === 'fulfilled' && ordersRes.value) {
      const value = ordersRes.value.data as BoostOrder[] | null;
      if (Array.isArray(value)) setOrders(value);
      else if (ordersRes.value.error) setActionError('Could not load boost orders.');
    } else if (ordersRes.status === 'rejected') {
      setActionError('Could not load boost orders.');
    }

    if (ticketsRes.status === 'fulfilled' && ticketsRes.value) {
      const value = ticketsRes.value.data as Ticket[] | null;
      if (Array.isArray(value)) setTickets(value);
      else if (ticketsRes.value.error) setActionError('Could not load support tickets.');
    } else if (ticketsRes.status === 'rejected') {
      setActionError('Could not load support tickets.');
    }

    setLoadingData(false);
  }, [session, tab]);

  useEffect(() => {
    if (authLoading) return;
    if (!session) { setLoadingData(false); return; }
    loadData();
  }, [authLoading, session, loadData]);

  const runAction = async (fn: string, args: Record<string, unknown>, successMessage: string, busyKey: string) => {
    setBusyId(busyKey);
    setActionError(null);
    const result = await rpcCall(fn, args);
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.error ?? 'Something went wrong. Please try again.');
      return false;
    }
    flash(successMessage);
    return true;
  };

  const approveListing = async (kind: 'startup' | 'channel', id: string, name: string) => {
    if (await runAction('admin_approve_listing', { p_kind: kind, p_id: id }, `${name} is now live`, `${kind}-${id}`)) {
      setPending((current) => current ? {
        startups: current.startups.filter((s) => s.id !== id),
        channels: current.channels.filter((c) => c.id !== id),
      } : current);
    }
  };

  const deleteListing = async (kind: 'startup' | 'channel', id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    if (await runAction('admin_delete_listing', { p_kind: kind, p_id: id }, `${name} deleted`, `${kind}-${id}`)) {
      setPending((current) => current ? {
        startups: current.startups.filter((s) => s.id !== id),
        channels: current.channels.filter((c) => c.id !== id),
      } : current);
    }
  };

  const updateOrder = async (id: string, action: 'verify' | 'reject' | 'reactivate' | 'expire') => {
    if (await runAction('admin_update_boost_order', { p_id: id, p_action: action }, `Order ${action === 'verify' ? 'verified — listing featured for 14 days' : action + 'ed'}`, `order-${id}`)) {
      setOrders(null);
      loadData(true);
    }
  };

  const openTicketDetail = async (ticket: Ticket) => {
    setOpenTicket({ ticket, replies: [] });
    openTicketIdRef.current = ticket.id;
    setReplyText('');
    const requestTicketId = ticket.id;
    const { data, error } = await supabase.rpc('admin_get_ticket', { p_id: ticket.id });
    if (openTicketIdRef.current !== requestTicketId) return;
    if (error || !data) {
      setActionError('Could not load the conversation for this ticket.');
      return;
    }
    const parsed = data as TicketDetail;
    if (parsed && parsed.ticket && Array.isArray(parsed.replies)) {
      setOpenTicket(parsed);
    }
  };

  const sendReply = async () => {
    if (!openTicket || !replyText.trim()) return;
    setSendingReply(true);
    setActionError(null);
    const { error } = await supabase.rpc('admin_reply_ticket', { p_id: openTicket.ticket.id, p_body: replyText.trim() });
    setSendingReply(false);
    if (error) {
      setActionError(error.message === 'Not authorized'
        ? 'Only the site owner can reply.'
        : 'Could not send the reply. Please try again.');
      return;
    }
    setReplyText('');
    flash('Reply sent');
    await openTicketDetail(openTicket.ticket);
    setTickets(null);
    loadData(true);
  };

  const setTicketStatus = async (id: string, status: 'open' | 'answered' | 'closed') => {
    if (await runAction('admin_set_ticket_status', { p_id: id, p_status: status }, `Ticket marked ${status}`, `ticket-${id}`)) {
      setOpenTicket((current) => current && current.ticket.id === id
        ? { ...current, ticket: { ...current.ticket, status } }
        : current);
      setTickets(null);
      loadData(true);
    }
  };

  // ---- render gates ----

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex justify-center">
        <Loader2 className="w-6 h-6 text-ink-300 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-ink-100 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-ink-400" />
        </div>
        <h1 className="text-2xl font-bold text-ink-900 mb-3">Admin area</h1>
        <p className="text-ink-600 mb-8">Sign in with the site owner account to open the dashboard.</p>
        <a href="#/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all">
          Go to homepage
        </a>
      </div>
    );
  }

  if (isOwner === false) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-ink-100 flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-8 h-8 text-ink-400" />
        </div>
        <h1 className="text-2xl font-bold text-ink-900 mb-3">Owner only</h1>
        <p className="text-ink-600">Only the first account created on this site can open the admin dashboard.</p>
      </div>
    );
  }

  const pendingTotal = pending ? pending.startups.length + pending.channels.length : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <PageHero icon={ShieldCheck} eyebrow="Owner" title={'Admin dashboard'} subtitle={'Manage everything that happens on Launchrocket from one place.'} />

      {/* tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === key
                ? 'bg-ink-900 text-white shadow-sm'
                : 'bg-white text-ink-600 border border-ink-200 hover:border-ink-300 hover:text-ink-900'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
            {key === 'queue' && pendingTotal ? (
              <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-warning-500 text-white text-xs font-bold">{pendingTotal}</span>
            ) : null}
            {key === 'orders' && stats?.pendingOrders ? (
              <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-warning-500 text-white text-xs font-bold">{stats.pendingOrders}</span>
            ) : null}
            {key === 'tickets' && stats?.openTickets ? (
              <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-warning-500 text-white text-xs font-bold">{stats.openTickets}</span>
            ) : null}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="flex items-center gap-2 px-4 py-3 mb-6 rounded-xl bg-error-50 border border-error-100 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {actionError}
        </div>
      )}
      {actionDone && (
        <div className="flex items-center gap-2 px-4 py-3 mb-6 rounded-xl bg-success-50 border border-success-100 text-success-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {actionDone}
        </div>
      )}

      {loadingData ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-ink-300 animate-spin" /></div>
      ) : (
        <>
          {/* ---------- OVERVIEW ---------- */}
          {tab === 'overview' && (
            stats ? (
              <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Accounts', value: stats.users, icon: Users, tint: 'bg-brand-50 text-brand-600' },
                    { label: 'Startups', value: stats.startups, sub: `+${stats.startups7d} this week`, icon: Rocket, tint: 'bg-accent-50 text-accent-600' },
                    { label: 'Channels', value: stats.channels, sub: `+${stats.channels7d} this week`, icon: Radio, tint: 'bg-success-50 text-success-600' },
                    { label: 'Upvotes', value: stats.votes, icon: TrendingUp, tint: 'bg-warning-50 text-warning-600' },
                    { label: 'Pending review', value: stats.pendingStartups + stats.pendingChannels, icon: Clock, tint: 'bg-warning-50 text-warning-700' },
                    { label: 'Open tickets', value: stats.openTickets, icon: MessageSquare, tint: 'bg-brand-50 text-brand-700' },
                    { label: 'Orders awaiting review', value: stats.pendingOrders, icon: ShoppingBag, tint: 'bg-error-50 text-error-600' },
                    { label: 'Revenue (7 days)', value: formatMoney(stats.revenue7dCents, 'usd'), icon: DollarSign, tint: 'bg-success-50 text-success-700' },
                  ].map(({ label, value, sub, icon: Icon, tint }) => (
                    <div key={label} className="bg-white rounded-2xl border border-ink-200/80 p-5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${tint}`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="text-2xl font-bold text-ink-900 leading-tight">{value}</div>
                      <div className="text-sm text-ink-500">{label}</div>
                      {sub ? <div className="text-xs text-success-600 font-medium mt-1">{sub}</div> : null}
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl border border-ink-200/80 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-5 h-5 text-brand-600" />
                    <h2 className="font-bold text-ink-900">Notifications</h2>
                  </div>
                  <p className="text-sm text-ink-600 mb-4">
                    Slack alerts for new submissions, boost orders and support tickets.
                  </p>
                  <a
                    href="#/slack-settings"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all"
                  >
                    Manage notifications
                  </a>
                </div>
              </div>
            ) : <GenericError message="Could not load dashboard numbers." onRetry={() => loadData()} />
          )}

          {/* ---------- MODERATION QUEUE ---------- */}
          {tab === 'queue' && (
            pending ? (
              <div className="space-y-8">
                {pending.startups.length === 0 && pending.channels.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-ink-200/80 p-10 text-center">
                    <CheckCircle2 className="w-10 h-10 text-success-500 mx-auto mb-3" />
                    <p className="font-semibold text-ink-900">Queue is clear</p>
                    <p className="text-sm text-ink-500">New submissions will appear here for review.</p>
                  </div>
                ) : (
                  <>
                    {pending.startups.length > 0 && (
                      <section>
                        <h2 className="font-bold text-ink-900 mb-4">Pending startups ({pending.startups.length})</h2>
                        <div className="space-y-3">
                          {pending.startups.map((s) => (
                            <div key={s.id} className="bg-white rounded-2xl border border-ink-200/80 p-5">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-ink-900">{s.name}</h3>
                                    {s.category && <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">{s.category}</span>}
                                    {s.region && <span className="text-xs px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">{s.region}</span>}
                                  </div>
                                  {s.tagline && <p className="text-sm text-ink-700 mt-1">{s.tagline}</p>}
                                  {s.description && <p className="text-sm text-ink-500 mt-1 line-clamp-2">{s.description}</p>}
                                  <div className="flex items-center gap-3 mt-2 text-xs text-ink-400">
                                    <a href={safeUrl(s.url)} target="_blank" rel="noreferrer noopener" className="text-brand-600 hover:text-brand-700 font-medium break-all">{s.url}</a>
                                    <span>{formatDate(s.created_at)}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => approveListing('startup', s.id, s.name)}
                                    disabled={busyId === `startup-${s.id}`}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-success-600 hover:bg-success-700 transition-colors disabled:opacity-60"
                                  >
                                    {busyId === `startup-${s.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
                                  </button>
                                  <button
                                    onClick={() => deleteListing('startup', s.id, s.name)}
                                    disabled={busyId === `startup-${s.id}`}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-error-700 bg-error-50 hover:bg-error-100 transition-colors disabled:opacity-60"
                                  >
                                    <Trash2 className="w-4 h-4" /> Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {pending.channels.length > 0 && (
                      <section>
                        <h2 className="font-bold text-ink-900 mb-4">Pending channels ({pending.channels.length})</h2>
                        <div className="space-y-3">
                          {pending.channels.map((c) => (
                            <div key={c.id} className="bg-white rounded-2xl border border-ink-200/80 p-5">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-ink-900">{c.name}</h3>
                                    {c.category && <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">{c.category}</span>}
                                    {c.region && <span className="text-xs px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">{c.region}</span>}
                                  </div>
                                  {c.description && <p className="text-sm text-ink-500 mt-1 line-clamp-2">{c.description}</p>}
                                  <div className="flex items-center gap-3 mt-2 text-xs text-ink-400">
                                    <a href={safeUrl(c.url)} target="_blank" rel="noreferrer noopener" className="text-brand-600 hover:text-brand-700 font-medium break-all">{c.url}</a>
                                    <span>{formatDate(c.created_at)}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => approveListing('channel', c.id, c.name)}
                                    disabled={busyId === `channel-${c.id}`}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-success-600 hover:bg-success-700 transition-colors disabled:opacity-60"
                                  >
                                    {busyId === `channel-${c.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
                                  </button>
                                  <button
                                    onClick={() => deleteListing('channel', c.id, c.name)}
                                    disabled={busyId === `channel-${c.id}`}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-error-700 bg-error-50 hover:bg-error-100 transition-colors disabled:opacity-60"
                                  >
                                    <Trash2 className="w-4 h-4" /> Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </div>
            ) : <GenericError message="Could not load the moderation queue." onRetry={() => loadData()} />
          )}

          {/* ---------- BOOST ORDERS ---------- */}
          {tab === 'orders' && (
            orders ? (
              orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-ink-200/80 p-10 text-center">
                  <ShoppingBag className="w-10 h-10 text-ink-300 mx-auto mb-3" />
                  <p className="font-semibold text-ink-900">No boost orders yet</p>
                  <p className="text-sm text-ink-500">When someone buys a boost, it shows up here for you to verify payment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((o) => (
                    <div key={o.id} className="bg-white rounded-2xl border border-ink-200/80 p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-ink-900">{o.listing_name}</h3>
                            <StatusPill status={o.status} />
                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-50 text-accent-700 font-medium capitalize">{o.kind}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-ink-100 text-ink-600 capitalize">{o.plan}</span>
                          </div>
                          <div className="text-sm text-ink-600 mt-1">
                            {formatMoney(o.amount_cents, o.currency)} · {o.payment_method ?? 'payment method not set'}
                            {o.payment_reference ? <span className="text-ink-400"> · ref {o.payment_reference}</span> : null}
                          </div>
                          <div className="text-xs text-ink-400 mt-1">
                            {o.contact_email} · {formatDate(o.created_at)}
                            {o.featured_until ? ` · featured until ${formatDate(o.featured_until)}` : ''}
                          </div>
                        </div>
                        {(o.status === 'pending' || o.status === 'submitted') && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => updateOrder(o.id, 'verify')}
                              disabled={busyId === `order-${o.id}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-success-600 hover:bg-success-700 transition-colors disabled:opacity-60"
                            >
                              {busyId === `order-${o.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Verify payment
                            </button>
                            <button
                              onClick={() => updateOrder(o.id, 'reject')}
                              disabled={busyId === `order-${o.id}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-error-700 bg-error-50 hover:bg-error-100 transition-colors disabled:opacity-60"
                            >
                              <X className="w-4 h-4" /> Reject
                            </button>
                          </div>
                        )}
                        {(o.status === 'verified' || o.status === 'expired') && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => updateOrder(o.id, 'reactivate')}
                              disabled={busyId === `order-${o.id}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors disabled:opacity-60"
                            >
                              <RefreshCw className="w-4 h-4" /> Reactivate 14 days
                            </button>
                            {o.status === 'verified' && (
                              <button
                                onClick={() => updateOrder(o.id, 'expire')}
                                disabled={busyId === `order-${o.id}`}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200 transition-colors disabled:opacity-60"
                              >
                                <Clock className="w-4 h-4" /> End now
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : <GenericError message="Could not load boost orders." onRetry={() => loadData()} />
          )}

          {/* ---------- TICKETS ---------- */}
          {tab === 'tickets' && !openTicket && (
            tickets ? (
              tickets.length === 0 ? (
                <div className="bg-white rounded-2xl border border-ink-200/80 p-10 text-center">
                  <TicketIcon className="w-10 h-10 text-ink-300 mx-auto mb-3" />
                  <p className="font-semibold text-ink-900">No support tickets</p>
                  <p className="text-sm text-ink-500">Messages from the feedback form will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((t) => (
                    <div key={t.id} className="bg-white rounded-2xl border border-ink-200/80 p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-ink-900">{t.subject}</h3>
                            <StatusPill status={t.status} />
                          </div>
                          <p className="text-sm text-ink-500 mt-1 line-clamp-1">{t.body}</p>
                          <div className="text-xs text-ink-400 mt-1">{t.email} · {formatDate(t.created_at)}</div>
                        </div>
                        <button
                          onClick={() => openTicketDetail(t)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors flex-shrink-0"
                        >
                          <MessageSquare className="w-4 h-4" /> Open
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : <GenericError message="Could not load support tickets." onRetry={() => loadData()} />
          )}

          {tab === 'tickets' && openTicket && (
            <div className="bg-white rounded-2xl border border-ink-200/80 p-6">
              <button
                onClick={() => { setOpenTicket(null); openTicketIdRef.current = null; }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800 mb-4 transition-colors"
              >
                <CornerUpLeft className="w-4 h-4 rotate-180" /> Back to tickets
              </button>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="font-bold text-ink-900 text-lg">{openTicket.ticket.subject}</h2>
                <StatusPill status={openTicket.ticket.status} />
              </div>
              <div className="text-xs text-ink-400 mb-4">{openTicket.ticket.email} · {formatDate(openTicket.ticket.created_at)}</div>
              <div className="px-4 py-3 rounded-xl bg-ink-50 text-sm text-ink-700 whitespace-pre-wrap mb-4">{openTicket.ticket.body}</div>

              {openTicket.replies.length > 0 && (
                <div className="space-y-3 mb-4">
                  {openTicket.replies.map((r) => (
                    <div
                      key={r.id}
                      className={`px-4 py-3 rounded-xl text-sm whitespace-pre-wrap ${
                        r.author_role === 'admin'
                          ? 'bg-brand-50 text-brand-900 ml-8'
                          : 'bg-ink-50 text-ink-700'
                      }`}
                    >
                      <div className="text-xs font-semibold mb-1 text-ink-500">
                        {r.author_role === 'admin' ? 'You (support)' : 'User'} · {formatDate(r.created_at)}
                      </div>
                      {r.body}
                    </div>
                  ))}
                </div>
              )}

              <label className="block text-sm font-semibold text-ink-700 mb-1.5" htmlFor="admin-reply">Reply</label>
              <textarea
                id="admin-reply"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                maxLength={5000}
                placeholder="Write your reply..."
                className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300 transition-all resize-y"
              />
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={sendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send reply
                </button>
                {openTicket.ticket.status !== 'closed' ? (
                  <button
                    onClick={() => setTicketStatus(openTicket.ticket.id, 'closed')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-ink-700 bg-ink-100 hover:bg-ink-200 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark resolved
                  </button>
                ) : (
                  <button
                    onClick={() => setTicketStatus(openTicket.ticket.id, 'open')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-ink-700 bg-ink-100 hover:bg-ink-200 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" /> Reopen
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
