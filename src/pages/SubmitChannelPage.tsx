import { useState } from 'react';
import { Megaphone, CheckCircle2, AlertCircle, ArrowLeft, LockKeyhole } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { useCategories, useRegions } from '@/lib/hooks';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { useAuth } from '@/lib/auth';

export default function SubmitChannelPage() {
  const { navigate } = useRouter();
  const { session, openAuthModal } = useAuth();
  const { categories } = useCategories();
  const { regions } = useRegions();
  const scrollRef = useScrollReveal<HTMLDivElement>();

  const [form, setForm] = useState({
    name: '', description: '', url: '', audience_size: '', cost: 'Free',
    category_id: '', region_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.url) { setError('Please fill in all required fields.'); return; }
    try { const u = new URL(form.url); if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error(); }
    catch { setError('Please enter a valid website URL starting with http:// or https://'); return; }
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from('channels').insert({
      name: form.name, slug: slugify(form.name) + '-' + Date.now().toString(36),
      description: form.description, url: form.url, audience_size: form.audience_size || 'Unknown',
      cost: form.cost, category_id: form.category_id || null, region_id: form.region_id || null,
    });
    setSubmitting(false);
    if (insertError) {
      const msg = insertError.message.toLowerCase();
      if (msg.includes('unique_channels_name') || msg.includes('unique_channels_url')) {
        setError('A channel with this name or URL has already been listed.');
      } else {
        setError('Something went wrong submitting your channel. Please try again.');
      }
      return;
    }
    setSuccess(true);
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300 transition-all';
  const labelClass = 'block text-sm font-semibold text-ink-700 mb-1.5';
  const selectClass = 'w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300 transition-all cursor-pointer';

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-success-100 flex items-center justify-center mx-auto mb-6 animate-scale-in">
            <CheckCircle2 className="w-8 h-8 text-success-600" />
          </div>
          <h1 className="text-3xl font-bold text-ink-900 mb-3">Channel submitted!</h1>
          <p className="text-ink-600 mb-8 max-w-md mx-auto">
            {form.name} has been submitted for review. It will appear in the channels directory once approved, usually within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('channels')} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all duration-300 hover:scale-[1.02]">
              View Channels
            </button>
            <button
              onClick={() => { setSuccess(false); setForm({ name: '', description: '', url: '', audience_size: '', cost: 'Free', category_id: '', region_id: '' }); }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-ink-700 bg-ink-100 hover:bg-ink-200 transition-all"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div ref={scrollRef} className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-6">
            <LockKeyhole className="w-8 h-8 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-ink-900 mb-3">Sign in to submit a channel</h1>
          <p className="text-ink-600 mb-8 max-w-md mx-auto">
            You need an account to submit a channel. This keeps the directory authentic and prevents duplicate listings.
          </p>
          <button onClick={() => openAuthModal()} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all duration-300 hover:scale-[1.02]">
            <Megaphone className="w-4 h-4" /> Sign in or create account
          </button>
          <div className="mt-4">
            <button onClick={() => navigate('channels')} className="text-sm text-ink-500 hover:text-ink-900 transition-colors">
              Back to channels
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button onClick={() => navigate('channels')} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to channels
      </button>
      <div className="flex items-center gap-3 mb-2 reveal">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center shadow-glow">
          <Megaphone className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-ink-900">Submit a Growth Channel</h1>
      </div>
      <p className="text-ink-600 mb-8 reveal">Know a great place for founders to find customers? Share it with the community.</p>

      {error && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-error-50 border border-error-100 text-error-700 text-sm animate-slide-down">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="reveal">
          <label htmlFor="ch-name" className={labelClass}>Channel Name <span className="text-error-500">*</span></label>
          <input id="ch-name" type="text" required maxLength={100} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Product Hunt" className={inputClass} />
        </div>
        <div className="reveal">
          <label htmlFor="ch-description" className={labelClass}>Description <span className="text-error-500">*</span></label>
          <textarea id="ch-description" required rows={4} maxLength={500} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe the channel, who it reaches, and why it's great for founders." className={inputClass + ' resize-none'} />
          <p className="text-xs text-ink-400 mt-1">{form.description.length}/500</p>
        </div>
        <div className="reveal">
          <label htmlFor="ch-url" className={labelClass}>URL <span className="text-error-500">*</span></label>
          <input id="ch-url" type="url" required value={form.url} onChange={(e) => update('url', e.target.value)} placeholder="https://example.com" className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 reveal">
          <div>
            <label htmlFor="ch-audience" className={labelClass}>Audience Size</label>
            <input id="ch-audience" type="text" value={form.audience_size} onChange={(e) => update('audience_size', e.target.value)} placeholder="e.g. 5M+ monthly visitors" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} id="ch-cost-label">Cost</label>
            <div className="flex gap-2" role="group" aria-labelledby="ch-cost-label">
              {['Free', 'Freemium', 'Paid'].map((cost) => (
                <button key={cost} type="button" onClick={() => update('cost', cost)} aria-pressed={form.cost === cost}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${form.cost === cost ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}>
                  {cost}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 reveal">
          <div>
            <label htmlFor="ch-category" className={labelClass}>Category</label>
            <select id="ch-category" value={form.category_id} onChange={(e) => update('category_id', e.target.value)} className={selectClass}>
              <option value="">Select a category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ch-region" className={labelClass}>Region</label>
            <select id="ch-region" value={form.region_id} onChange={(e) => update('region_id', e.target.value)} className={selectClass}>
              <option value="">Select a region</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all duration-300 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100">
          {submitting ? 'Submitting...' : <><Megaphone className="w-5 h-5" /> Submit Channel</>}
        </button>
      </form>
    </div>
  );
}
