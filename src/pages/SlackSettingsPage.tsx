import { useState, useEffect } from 'react';
import {
import PageHero from '@/components/PageHero';
  Bell, CheckCircle2, AlertCircle, Loader2, Slack, Save, ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function SlackSettingsPage() {
  const { session, openAuthModal } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-settings`;
    fetch(apiUrl, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).then(async (res) => {
      if (cancelled) return;
      if (res.status === 403) { setForbidden(true); setLoading(false); return; }
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || typeof json.configured !== 'boolean') {
        setLoadError('Could not load Slack settings. Please try again.');
        setLoading(false);
        return;
      }
      setWebhookUrl(json.webhook_url ?? '');
      setEnabled(Boolean(json.enabled));
      setLoading(false);
    }).catch(() => {
      if (!cancelled) { setLoadError('Could not load Slack settings. Please try again.'); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [session]);

  const save = async (withTest: boolean) => {
    if (!session) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    setTestResult(null);
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-settings`;
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ webhook_url: webhookUrl.trim(), enabled, test: withTest }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setSaveError(json?.error ?? 'Could not save settings. Please try again.');
        setSaving(false);
        return;
      }
      setSaved(true);
      if (withTest) {
        setTestResult(
          json.testSent === true
            ? { ok: true, message: 'Test message sent. Check your Slack channel.' }
            : { ok: false, message: 'Slack rejected the test message. Double-check the webhook URL.' }
        );
      }
    } catch {
      setSaveError('Could not reach the server. Please try again.');
    }
    setSaving(false);
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300 transition-all font-mono';
  const labelClass = 'block text-sm font-semibold text-ink-700 mb-1.5';

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-6">
          <Bell className="w-8 h-8 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-ink-900 mb-3">Sign in to manage notifications</h1>
        <p className="text-ink-600 mb-8">
          Notification settings are only available to the site owner.
        </p>
        <button onClick={openAuthModal} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all">
          Sign in
        </button>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-ink-100 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-ink-400" />
        </div>
        <h1 className="text-2xl font-bold text-ink-900 mb-3">Owner only</h1>
        <p className="text-ink-600">
          Only the first account created on this site can manage Slack notifications.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <PageHero icon={Bell} eyebrow="Settings" title={'Notifications'} subtitle={'Get a Slack message the moment something happens that needs your attention.'} />

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-ink-300 animate-spin" /></div>
      ) : loadError ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error-50 border border-error-100 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {loadError}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink-200/80 p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-brand-50 border border-brand-100">
            <Slack className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-brand-800 leading-relaxed">
              <p className="font-semibold mb-1">You'll be notified about:</p>
              <ul className="list-disc list-inside space-y-0.5 text-brand-700">
                <li>New startup submissions</li>
                <li>New channel submissions</li>
                <li>New boost orders (paid features)</li>
                <li>New support tickets</li>
              </ul>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="slack-webhook">Slack webhook URL</label>
            <input
              id="slack-webhook"
              type="url"
              value={webhookUrl}
              onChange={(e) => { setWebhookUrl(e.target.value); setSaved(false); setTestResult(null); }}
              placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
              className={inputClass}
            />
            <a
              href="https://my.slack.com/apps/A0F7XDUAZ-incoming-webhooks"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-1.5 transition-colors"
            >
              Create a webhook in Slack <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => { setEnabled(!enabled); setSaved(false); setTestResult(null); }}
              className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-success-500' : 'bg-ink-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm font-medium text-ink-700">
              {enabled ? 'Notifications on' : 'Notifications off'}
            </span>
          </label>

          {saveError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error-50 border border-error-100 text-error-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {saveError}
            </div>
          )}
          {saved && !saveError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success-50 border border-success-100 text-success-700 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Settings saved.
            </div>
          )}
          {testResult && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${testResult.ok ? 'bg-success-50 border-success-100 text-success-700' : 'bg-error-50 border-error-100 text-error-700'}`}>
              {testResult.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />} {testResult.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving || !enabled || !webhookUrl.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-ink-700 bg-ink-100 hover:bg-ink-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & Send Test Message
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
