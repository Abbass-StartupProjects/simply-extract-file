import { useState, useEffect } from 'react';
import {
  X, Copy, Check, Rocket, AlertCircle, CheckCircle2, Sparkles,
  Bitcoin, Coins, Gem, ArrowRight, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useSiteSettings } from '@/lib/hooks';
import {
  BOOST_TIERS, CURRENCY_INFO, getWalletAddress, getTierPrice,
  usdToCrypto, type CryptoCurrency, type BoostTier,
} from '@/lib/crypto';

type Props = { startupId: string; startupName: string; onClose: () => void; };
type Step = 'select' | 'pay' | 'confirm' | 'done';

export default function BoostModal({ startupId, startupName, onClose }: Props) {
  const { settings, loading: settingsLoading, error: settingsError } = useSiteSettings();
  const { session, openAuthModal } = useAuth();
  const [step, setStep] = useState<Step>('select');
  const [tier, setTier] = useState<BoostTier>(BOOST_TIERS[1]);
  const [currency, setCurrency] = useState<CryptoCurrency>('USDT');
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const requestClose = () => setClosing(true);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && requestClose();
    const previousOverflow = document.body.style.overflow;
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(onClose, 250);
    return () => clearTimeout(timer);
  }, [closing, onClose]);

  const walletAddress = settings ? getWalletAddress(settings, currency) : '';
  const priceUSD = settings ? getTierPrice(settings, tier.days) : tier.priceUSD;
  const cryptoAmount = usdToCrypto(priceUSD, currency);

  const copyAddress = async () => {
    try { await navigator.clipboard.writeText(walletAddress); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  const handleConfirm = async () => {
    if (!session) { openAuthModal(); return; }
    if (!txHash.trim()) { setError('Please enter your transaction hash.'); return; }
    setSubmitting(true); setError(null);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + tier.days * 24 * 60 * 60 * 1000);
    const { data: orderData, error: orderError } = await supabase.from('featured_orders').insert({
      startup_id: startupId, tier_days: tier.days, currency, amount_usd: priceUSD,
      tx_hash: txHash.trim(), expires_at: expiresAt.toISOString(),
      plan: tier.label, payment_method: currency, payment_reference: txHash.trim(),
      contact_email: session.user?.email ?? null,
    }).select('id').maybeSingle();
    if (orderError || !orderData) { setSubmitting(false); setError('Failed to submit order. Please try again.'); return; }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-boost`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ orderId: orderData.id }),
      });
      if (res.ok) {
        setSubmitting(false);
        setStep('done');
        return;
      }
      // Order was saved but review could not be requested — tell the user
      // instead of showing a false success.
      setSubmitting(false);
      setError('Your order was saved, but we could not request review. Please contact support.');
      return;
    } catch {
      // Order is still saved, will be verified manually
    }
    setSubmitting(false);
    setError('Your order was saved, but we could not reach the review service. Please contact support.');
  };

  const currencyIcons: Record<CryptoCurrency, typeof Bitcoin> = { USDT: Coins, BTC: Bitcoin, ETH: Gem };

  return (
    <div data-lenis-prevent className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={`absolute inset-0 bg-ink-950/60 backdrop-blur-sm ${closing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={requestClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="boost-title" className="relative w-full max-w-lg bg-white rounded-3xl shadow-soft-lg max-h-[90vh] overflow-y-auto animate-scale-in" style={closing ? { animation: 'scale-out 0.25s ease-in forwards' } : undefined}>
        <div className="sticky top-0 glass border-b border-ink-200/60 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-warning-400 to-warning-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h2 id="boost-title" className="font-bold text-ink-900">Boost Your Startup</h2>
          </div>
          <button onClick={requestClose} aria-label="Close boost dialog" className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="mb-5 px-4 py-3 rounded-xl bg-ink-50 border border-ink-100">
            <p className="text-xs text-ink-500 mb-0.5">Boosting</p>
            <p className="font-semibold text-ink-900">{startupName}</p>
          </div>

          {settingsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-ink-300 animate-spin" /></div>
          ) : settingsError || !settings ? (
            <div className="py-8 text-center">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 text-error-500" />
              <p className="font-semibold text-ink-900">Boosting is temporarily unavailable</p>
              <p className="mt-1 text-sm text-ink-500">Payment details could not be loaded. Please try again later.</p>
              <button type="button" onClick={requestClose} className="mt-5 rounded-xl bg-ink-100 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-200">Close</button>
            </div>
          ) : (
            <>
              {step === 'select' && (
                <div className="animate-fade-in">
                  <h3 className="text-sm font-semibold text-ink-700 mb-3">Choose a boost duration</h3>
                  <div className="space-y-3">
                    {BOOST_TIERS.map((t) => {
                      const price = settings ? getTierPrice(settings, t.days) : t.priceUSD;
                      return (
                        <button key={t.days} onClick={() => setTier(t)}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${tier.days === t.days ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${tier.days === t.days ? 'border-brand-500 bg-brand-500' : 'border-ink-300'}`}>
                              {tier.days === t.days && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-ink-900">{t.label}</p>
                              <p className="text-xs text-ink-500">Featured placement + badge</p>
                            </div>
                            {t.popular && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-warning-100 text-warning-700">Popular</span>}
                          </div>
                          <p className="font-bold text-ink-900">${price}</p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-ink-700 mb-3">Select payment currency</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {(Object.keys(CURRENCY_INFO) as CryptoCurrency[]).map((curr) => {
                        const Icon = currencyIcons[curr];
                        return (
                          <button key={curr} onClick={() => setCurrency(curr)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${currency === curr ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300'}`}>
                            <Icon className={`w-6 h-6 ${currency === curr ? 'text-brand-600' : 'text-ink-400'}`} />
                            <span className={`text-sm font-semibold ${currency === curr ? 'text-brand-600' : 'text-ink-600'}`}>{CURRENCY_INFO[curr].label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button onClick={() => setStep('pay')}
                    className="w-full mt-6 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all duration-300 hover:scale-[1.01]">
                    Continue to Payment <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {step === 'pay' && (
                <div className="animate-fade-in">
                  <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-warning-50 to-warning-100 border border-warning-100 mb-5">
                    <div className="flex items-center justify-between">
                      <div><p className="text-xs text-warning-700">Amount Due</p><p className="text-2xl font-bold text-ink-900">${priceUSD}</p></div>
                      <div className="text-right"><p className="text-xs text-warning-700">In {CURRENCY_INFO[currency].label}</p><p className="text-2xl font-bold text-ink-900">{cryptoAmount} {CURRENCY_INFO[currency].symbol}</p></div>
                    </div>
                  </div>
                  <div className="mb-5">
                    <p className="text-xs text-ink-500 mb-2">Send to this {CURRENCY_INFO[currency].label} address ({CURRENCY_INFO[currency].network})</p>
                    <div className="flex items-stretch gap-2">
                      <code className="flex-1 px-4 py-3 rounded-xl bg-ink-950 text-ink-100 text-sm font-mono break-all">{walletAddress}</code>
                      <button onClick={copyAddress} className="px-4 rounded-xl bg-ink-100 hover:bg-ink-200 transition-colors flex items-center" title="Copy address">
                        {copied ? <Check className="w-4 h-4 text-success-600" /> : <Copy className="w-4 h-4 text-ink-600" />}
                      </button>
                    </div>
                    {copied && <p className="text-xs text-success-600 mt-1.5">Copied to clipboard!</p>}
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-brand-50 border border-brand-100 mb-5">
                    <p className="text-xs text-brand-700 leading-relaxed">
                      Send exactly <strong>{cryptoAmount} {CURRENCY_INFO[currency].label}</strong> to the address above.
                      After sending, copy your transaction hash and paste it below. Your listing will be reviewed
                      and featured for {tier.label} once your payment is confirmed.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep('select')} className="px-4 py-3.5 rounded-xl font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200 transition-all">Back</button>
                    <button onClick={() => setStep('confirm')}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all duration-300 hover:scale-[1.01]">
                      I've Sent the Payment <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {step === 'confirm' && (
                <div className="animate-fade-in">
                  <h3 className="text-sm font-semibold text-ink-700 mb-2">Enter your transaction hash</h3>
                  <p className="text-xs text-ink-500 mb-4">Paste the transaction hash from your crypto wallet. This verifies your payment.</p>
                  <input type="text" maxLength={128} value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x... or transaction ID"
                    className="w-full px-4 py-3 rounded-xl border border-ink-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300 transition-all" />
                  {error && (
                    <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-error-50 border border-error-100 text-error-700 text-sm animate-slide-down">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                    </div>
                  )}
                  <div className="mt-5 px-4 py-3 rounded-xl bg-ink-50 border border-ink-100">
                    <div className="flex items-center justify-between text-sm"><span className="text-ink-500">Plan</span><span className="font-semibold text-ink-900">{tier.label} — ${priceUSD}</span></div>
                    <div className="flex items-center justify-between text-sm mt-2"><span className="text-ink-500">Currency</span><span className="font-semibold text-ink-900">{CURRENCY_INFO[currency].label}</span></div>
                    <div className="flex items-center justify-between text-sm mt-2"><span className="text-ink-500">Amount</span><span className="font-semibold text-ink-900">{cryptoAmount} {CURRENCY_INFO[currency].symbol}</span></div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setStep('pay')} className="px-4 py-3.5 rounded-xl font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200 transition-all">Back</button>
                    <button onClick={handleConfirm} disabled={submitting}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-success-600 to-success-700 hover:from-success-700 hover:to-success-800 shadow-soft-lg shadow-success-500/20 transition-all disabled:opacity-60">
                      {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Rocket className="w-4 h-4" /> Submit for Review</>}
                    </button>
                  </div>
                </div>
              )}

              {step === 'done' && (
                <div className="text-center py-6 animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-success-100 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-8 h-8 text-success-600" />
                  </div>
                  <h3 className="text-xl font-bold text-ink-900 mb-2">Boost request submitted</h3>
                  <p className="text-ink-600 mb-6 max-w-sm mx-auto">
                    Your payment details for {startupName} were submitted for review. Your listing will receive the featured badge after payment is verified.
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-warning-50 border border-warning-100 text-warning-700 text-sm font-medium mb-6">
                    <Sparkles className="w-4 h-4" /> Review requested for {tier.label}
                  </div>
                  {error ? (
                    <button onClick={requestClose}
                      className="w-full px-6 py-3.5 rounded-xl font-semibold text-ink-700 bg-ink-100 hover:bg-ink-200 transition-all">
                      Close
                    </button>
                  ) : (
                    <button onClick={requestClose}
                      className="w-full px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all duration-300 hover:scale-[1.01]">
                      Close
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
