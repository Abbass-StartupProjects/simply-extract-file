import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare, CheckCircle2, AlertCircle, ArrowLeft, LockKeyhole,
  Bug, Lightbulb, Flag, HelpCircle, Clock, XCircle, Send, Loader2, ChevronRight,
} from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { supabase } from '@/lib/supabase';

type Category = 'bug' | 'feedback' | 'abuse' | 'other';

type Ticket = {
  id: string;
  subject: string;
  message: string;
  category: Category;
  status: 'open' | 'closed';
  created_at: string;
  closed_at: string | null;
};

const CATEGORY_META: Record<Category, { label: string; icon: typeof Bug; color: string }> = {
  bug: { label: 'Bug Report', icon: Bug, color: 'text-error-600 bg-error-50 border-error-200' },
  feedback: { label: 'Feedback', icon: Lightbulb, color: 'text-warning-600 bg-warning-50 border-warning-200' },
  abuse: { label: 'Report Abuse', icon: Flag, color: 'text-error-600 bg-error-50 border-error-200' },
  other: { label: 'Other', icon: HelpCircle, color: 'text-ink-600 bg-ink-50 border-ink-200' },
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function FeedbackPage() {
  const { navigate } = useRouter();
  const { session, openAuthModal } = useAuth();
  const scrollRef = useScrollReveal<HTMLDivElement>();

  const [form, setForm] = useState({ subject: '', message: '', category: 'feedback' as Category });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [replies, setReplies] = useState<{ id: string; message: string; is_staff: boolean; created_at: string }[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const repliesRequestRef = useRef(0);

  const loadTickets = useCallback(async () => {
    if (!session) { setTickets([]); setTicketsLoading(false); return; }
    setTicketsLoading(true);
    setTicketsError(false);
    const { data, error: err } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });
    setTicketsLoading(false);
    if (err || !data) { setTickets([]); setTicketsError(true); return; }
    setTickets(data as Ticket[]);
  }, [session]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadReplies = useCallback(async (ticketId: string) => {
    const requestId = repliesRequestRef.current + 1;
    repliesRequestRef.current = requestId;
    setRepliesLoading(true);
    const { data, error: repliesError } = await supabase
      .from('ticket_replies')
      .select('id, message, is_staff, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (requestId !== repliesRequestRef.current) return;
    setRepliesLoading(false);
    if (repliesError || !data) {
      setReplies([]);
      setReplyError("Couldn't load the conversation. Please try again.");
      return;
    }
    setReplies(data);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      setError('Please fill in the subject and your message.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from('tickets').insert({
      subject: form.subject.trim(),
      message: form.message.trim(),
      category: form.category,
    });
    setSubmitting(false);
    if (insertError) {
      setError('Something went wrong submitting your ticket. Please try again.');
      return;
    }
    setSuccess(true);
    setForm({ subject: '', message: '', category: 'feedback' });
    loadTickets();
  };

  const closeTicket = async (ticket: Ticket) => {
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ status: 'closed', closed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', ticket.id);
    if (updateError) {
      setReplyError('Could not close the ticket. Please try again.');
      return;
    }
    setSelectedTicket(null);
    loadTickets();
  };

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !reply.trim()) return;
    setReplySubmitting(true);
    setReplyError(null);
    const { error: insertError } = await supabase.from('ticket_replies').insert({
      ticket_id: selectedTicket.id,
      message: reply.trim(),
    });
    setReplySubmitting(false);
    if (insertError) {
      setReplyError('Failed to send your reply. Please try again.');
      return;
    }
    setReply('');
    loadReplies(selectedTicket.id);
  };

  const openTicket = (ticket: Ticket) => {
    repliesRequestRef.current += 1;
    setReplies([]);
    setSelectedTicket(ticket);
    setReply('');
    setReplyError(null);
    loadReplies(ticket.id);
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300 transition-all';
  const labelClass = 'block text-sm font-semibold text-ink-700 mb-1.5';

  if (!session) {
    return (
      <div ref={scrollRef} className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-6">
            <LockKeyhole className="w-8 h-8 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-ink-900 mb-3">Sign in to send feedback</h1>
          <p className="text-ink-600 mb-8 max-w-md mx-auto">
            You need an account to submit a ticket. This helps us track your report and get back to you.
          </p>
          <button onClick={openAuthModal} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all duration-300 hover:scale-[1.02]">
            <MessageSquare className="w-4 h-4" /> Sign in or create account
          </button>
          <div className="mt-4">
            <button onClick={() => navigate('home')} className="text-sm text-ink-500 hover:text-ink-900 transition-colors">
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedTicket) {
    const meta = CATEGORY_META[selectedTicket.category];
    const StatusIcon = selectedTicket.status === 'open' ? Clock : XCircle;
    return (
      <div ref={scrollRef} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button onClick={() => setSelectedTicket(null)} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to your tickets
        </button>

        <div className="bg-white rounded-2xl border border-ink-200/80 overflow-hidden">
          <div className="p-6 border-b border-ink-100">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${meta.color}`}>
                <meta.icon className="w-3 h-3" /> {meta.label}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${selectedTicket.status === 'open' ? 'bg-success-50 text-success-700 border border-success-200' : 'bg-ink-100 text-ink-500'}`}>
                <StatusIcon className="w-3 h-3" /> {selectedTicket.status === 'open' ? 'Open' : 'Closed'}
              </span>
              <span className="text-xs text-ink-400">{timeAgo(selectedTicket.created_at)}</span>
            </div>
            <h1 className="text-xl font-bold text-ink-900 mb-2">{selectedTicket.subject}</h1>
            <p className="text-sm text-ink-600 leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
          </div>

          <div className="p-6">
            <h3 className="text-sm font-semibold text-ink-700 mb-4">Conversation</h3>
            {repliesLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-ink-300 animate-spin" /></div>
            ) : replies.length === 0 ? (
              <p className="text-sm text-ink-400 text-center py-8">No replies yet. We'll get back to you soon.</p>
            ) : (
              <div className="space-y-4">
                {replies.map((r) => (
                  <div key={r.id} className={`flex gap-3 ${r.is_staff ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.is_staff ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500'}`}>
                      {r.is_staff ? <MessageSquare className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[75%] rounded-xl px-4 py-3 ${r.is_staff ? 'bg-brand-50 border border-brand-100' : 'bg-ink-50 border border-ink-100'}`}>
                      <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{r.message}</p>
                      <p className="text-xs text-ink-400 mt-1.5">{timeAgo(r.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedTicket.status === 'open' && (
              <form onSubmit={submitReply} className="mt-6">
                {replyError && (
                  <div role="alert" className="mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-error-50 border border-error-100 text-error-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {replyError}
                  </div>
                )}
                <label htmlFor="fb-reply" className="sr-only">Your reply</label>
                <textarea
                  id="fb-reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Add a follow-up message..."
                  className={inputClass + ' resize-none'}
                />
                <div className="flex items-center gap-3 mt-3">
                  <button type="submit" disabled={replySubmitting || !reply.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-soft transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {replySubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Reply
                  </button>
                  <button type="button" onClick={() => closeTicket(selectedTicket)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200 transition-all">
                    <XCircle className="w-4 h-4" /> Close Ticket
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button onClick={() => navigate('home')} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to home
      </button>

      <div className="flex items-center gap-3 mb-2 reveal">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center shadow-glow">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-ink-900">Feedback & Support</h1>
      </div>
      <p className="text-ink-600 mb-8 reveal">Found a bug, have a suggestion, or want to report something? We're listening.</p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form */}
        <div className="lg:col-span-3">
          {success ? (
            <div className="bg-white rounded-2xl border border-ink-200/80 p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-success-100 flex items-center justify-center mx-auto mb-5 animate-scale-in">
                <CheckCircle2 className="w-7 h-7 text-success-600" />
              </div>
              <h2 className="text-xl font-bold text-ink-900 mb-2">Ticket submitted!</h2>
              <p className="text-sm text-ink-600 mb-6 max-w-sm mx-auto">
                Thank you for reaching out. We'll review your ticket and get back to you as soon as possible.
              </p>
              <button onClick={() => setSuccess(false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-soft transition-all">
                Submit Another Ticket
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-ink-200/80 p-6 sm:p-8">
              {error && (
                <div role="alert" className="mb-5 flex items-center gap-2 px-4 py-3 rounded-xl bg-error-50 border border-error-100 text-error-700 text-sm animate-slide-down">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className={labelClass} id="fb-category-label">Category</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-labelledby="fb-category-label">
                    {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
                      const meta = CATEGORY_META[cat];
                      const Icon = meta.icon;
                      return (
                        <button key={cat} type="button" onClick={() => setForm((f) => ({ ...f, category: cat }))} aria-pressed={form.category === cat}
                          className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all ${form.category === cat ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300'}`}>
                          <Icon className={`w-5 h-5 ${form.category === cat ? 'text-brand-600' : 'text-ink-400'}`} />
                          <span className={`text-xs font-medium ${form.category === cat ? 'text-brand-600' : 'text-ink-500'}`}>{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label htmlFor="fb-subject" className={labelClass}>Subject <span className="text-error-500">*</span></label>
                  <input id="fb-subject" type="text" required maxLength={120} value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Brief summary of your ticket" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="fb-message" className={labelClass}>Message <span className="text-error-500">*</span></label>
                  <textarea id="fb-message" required rows={6} maxLength={2000} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Tell us what happened, what you expected, and any other details that might help." className={inputClass + ' resize-none'} />
                  <p className="text-xs text-ink-400 mt-1">{form.message.length}/2000</p>
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all duration-300 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100">
                  {submitting ? 'Submitting...' : <><Send className="w-5 h-5" /> Submit Ticket</>}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Ticket list */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-ink-700 mb-4">Your Tickets</h3>
          {ticketsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-ink-300 animate-spin" /></div>
          ) : ticketsError ? (
            <div className="bg-ink-50 rounded-2xl border border-ink-100 p-8 text-center">
              <AlertCircle className="w-8 h-8 text-ink-300 mx-auto mb-3" />
              <p className="text-sm text-ink-500">Couldn't load your tickets. Please try again.</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-ink-50 rounded-2xl border border-ink-100 p-8 text-center">
              <MessageSquare className="w-8 h-8 text-ink-300 mx-auto mb-3" />
              <p className="text-sm text-ink-500">You haven't submitted any tickets yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const meta = CATEGORY_META[ticket.category];
                const StatusIcon = ticket.status === 'open' ? Clock : XCircle;
                return (
                  <button key={ticket.id} onClick={() => openTicket(ticket)}
                    className="w-full text-left bg-white rounded-xl border border-ink-200/80 p-4 hover:border-brand-200 hover:shadow-soft transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}>
                        <meta.icon className="w-3 h-3" /> {meta.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ticket.status === 'open' ? 'bg-success-50 text-success-700' : 'bg-ink-100 text-ink-500'}`}>
                        <StatusIcon className="w-3 h-3" /> {ticket.status}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-ink-900 mb-1 group-hover:text-brand-600 transition-colors">{ticket.subject}</p>
                    <p className="text-xs text-ink-400 line-clamp-1">{ticket.message}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-ink-400">
                      {timeAgo(ticket.created_at)}
                      <ChevronRight className="w-3 h-3 ml-auto group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
