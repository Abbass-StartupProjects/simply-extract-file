import { useState } from 'react';
import { Rocket, CheckCircle2, AlertCircle, ArrowLeft, Sparkles, LockKeyhole } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { useCategories, useRegions } from '@/lib/hooks';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { useAuth } from '@/lib/auth';
import BoostModal from '@/components/BoostModal';
import PageHero from '@/components/PageHero';

export default function SubmitStartupPage() {
  const { navigate } = useRouter();
  const { session, openAuthModal } = useAuth();
  const { categories } = useCategories();
  const { regions } = useRegions();
  const scrollRef = useScrollReveal<HTMLDivElement>();

  const [form, setForm] = useState({
    name: '', tagline: '', description: '', url: '', logo_url: '',
    category_id: '', region_id: '', stage: 'Idea',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [boostOpen, setBoostOpen] = useState(false);

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.tagline || !form.description || !form.url) {
      setError('Please fill in all required fields.');
      return;
    }
    try { const u = new URL(form.url); if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error(); }
    catch { setError('Please enter a valid website URL starting with http:// or https://'); return; }
    if (form.logo_url) {
      try { const u = new URL(form.logo_url); if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error(); }
      catch { setError('Logo URL must start with http:// or https://'); return; }
    }
    setSubmitting(true);
    setError(null);
    const { data: insertData, error: insertError } = await supabase.from('startups').insert({
      name: form.name, slug: slugify(form.name) + '-' + Date.now().toString(36),
      tagline: form.tagline, description: form.description, url: form.url,
      logo_url: form.logo_url || null, category_id: form.category_id || null,
      region_id: form.region_id || null, stage: form.stage,
    }).select('id').maybeSingle();
    setSubmitting(false);
    if (insertError) {
      const msg = insertError.message.toLowerCase();
      if (msg.includes('unique_startups_name') || msg.includes('unique_startups_url')) {
        setError('A startup with this name or URL has already been listed.');
      } else {
        setError('Something went wrong submitting your startup. Please try again.');
      }
      return;
    }
    if (!insertData) { setError('Something went wrong submitting your startup. Please try again.'); return; }
    setSubmittedId(insertData.id);
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
          <h1 className="text-3xl font-bold text-ink-900 mb-3">Your startup is submitted!</h1>
          <p className="text-ink-600 mb-8 max-w-md mx-auto">
            {form.name} has been submitted for review. It will appear in the directory once approved, usually within 24 hours.
          </p>
          <div className="mb-8 mx-auto max-w-md p-5 rounded-2xl bg-gradient-to-r from-warning-50 to-warning-100 border border-warning-200/60">
            <div className="flex items-center gap-2 mb-2 justify-center">
              <Sparkles className="w-5 h-5 text-warning-600" />
              <p className="font-bold text-ink-900">Want more visibility?</p>
            </div>
            <p className="text-sm text-ink-600 mb-4 text-center">
              Boost your startup to the top of the directory with a featured badge.
              Pay with crypto — starting at $49 for 7 days.
            </p>
            <button
              onClick={() => setBoostOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-warning-500 to-warning-600 hover:from-warning-600 hover:to-warning-700 shadow-soft-lg shadow-warning-500/20 transition-all duration-300 hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              Boost Your Startup
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('startups')} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all duration-300 hover:scale-[1.02]">
              View in Directory
            </button>
            <button
              onClick={() => { setSuccess(false); setSubmittedId(null); setForm({ name: '', tagline: '', description: '', url: '', logo_url: '', category_id: '', region_id: '', stage: 'Idea' }); }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-ink-700 bg-ink-100 hover:bg-ink-200 transition-all"
            >
              Submit Another
            </button>
          </div>
        </div>
        {boostOpen && submittedId && <BoostModal startupId={submittedId} startupName={form.name} onClose={() => setBoostOpen(false)} />}
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
          <h1 className="text-2xl font-bold text-ink-900 mb-3">Sign in to list your startup</h1>
          <p className="text-ink-600 mb-8 max-w-md mx-auto">
            You need an account to submit a startup. This keeps the directory authentic and prevents duplicate listings.
          </p>
          <button onClick={() => openAuthModal()} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all duration-300 hover:scale-[1.02]">
            <Rocket className="w-4 h-4" /> Sign in or create account
          </button>
          <div className="mt-4">
            <button onClick={() => navigate('startups')} className="text-sm text-ink-500 hover:text-ink-900 transition-colors">
              Back to directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <PageHero icon={Rocket} eyebrow="Submit" title={'List Your Startup'} subtitle={"Get discovered by early adopters and customers from around the world. It's free."} back={{ label: 'Back to directory', onClick: () => navigate('startups') }} />

      {error && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-error-50 border border-error-100 text-error-700 text-sm animate-slide-down">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="reveal">
          <label htmlFor="su-name" className={labelClass}>Startup Name <span className="text-error-500">*</span></label>
          <input id="su-name" type="text" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. NimbusDeploy" className={inputClass} />
        </div>
        <div className="reveal">
          <label htmlFor="su-tagline" className={labelClass}>Tagline <span className="text-error-500">*</span></label>
          <input id="su-tagline" type="text" required maxLength={100} value={form.tagline} onChange={(e) => update('tagline', e.target.value)} placeholder="A one-line pitch for your startup" className={inputClass} />
          <p className="text-xs text-ink-400 mt-1">{form.tagline.length}/100</p>
        </div>
        <div className="reveal">
          <label htmlFor="su-description" className={labelClass}>Description <span className="text-error-500">*</span></label>
          <textarea id="su-description" required rows={4} maxLength={500} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe what your startup does, who it's for, and what problem it solves." className={inputClass + ' resize-none'} />
          <p className="text-xs text-ink-400 mt-1">{form.description.length}/500</p>
        </div>
        <div className="reveal">
          <label htmlFor="su-url" className={labelClass}>Website URL <span className="text-error-500">*</span></label>
          <input id="su-url" type="url" required value={form.url} onChange={(e) => update('url', e.target.value)} placeholder="https://yourstartup.com" className={inputClass} />
        </div>
        <div className="reveal">
          <label htmlFor="su-logo" className={labelClass}>Logo URL <span className="text-ink-400 font-normal">(optional)</span></label>
          <input id="su-logo" type="url" value={form.logo_url} onChange={(e) => update('logo_url', e.target.value)} placeholder="https://yourstartup.com/logo.png" className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 reveal">
          <div>
            <label htmlFor="su-category" className={labelClass}>Category</label>
            <select id="su-category" value={form.category_id} onChange={(e) => update('category_id', e.target.value)} className={selectClass}>
              <option value="">Select a category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="su-region" className={labelClass}>Region</label>
            <select id="su-region" value={form.region_id} onChange={(e) => update('region_id', e.target.value)} className={selectClass}>
              <option value="">Select a region</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
        <div className="reveal">
          <label className={labelClass} id="su-stage-label">Stage</label>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="su-stage-label">
            {['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Growth'].map((stage) => (
              <button key={stage} type="button" onClick={() => update('stage', stage)} aria-pressed={form.stage === stage}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${form.stage === stage ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}>
                {stage}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all duration-300 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100">
          {submitting ? 'Submitting...' : <><Rocket className="w-5 h-5" /> Launch Startup</>}
        </button>
      </form>
    </div>
  );
}
