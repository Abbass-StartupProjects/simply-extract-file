import { useEffect, useState, type FormEvent } from 'react';
import {
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  Mail,
  Rocket,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { isDisposableEmail } from '@/lib/disposableEmail';

type Props = {
  onClose: () => void;
};

type Mode = 'sign-in' | 'sign-up' | 'reset';

const inputClass = 'mt-2 w-full rounded-xl border border-ink-200 bg-white px-4 py-3.5 text-sm text-ink-900 outline-none transition-all placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10';

export default function AuthModal({ onClose }: Props) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);

  const requestClose = () => setClosing(true);

  const isSignUp = mode === 'sign-up';
  const isReset = mode === 'reset';
  const passwordValid = password.length >= 8;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(onClose, 250);
    return () => clearTimeout(timer);
  }, [closing, onClose]);

  const confirmationValid = !isSignUp || password === confirmPassword;
const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (isReset) {
      if (!email.trim()) { setError('Please enter your email address.'); return; }
      setSubmitting(true);
      const msg = await resetPassword(email.trim());
      setSubmitting(false);
      if (msg) { setError(msg); return; }
      setMode('sign-in');
      setNotice('If an account exists for that email, a reset link has been sent.');
      setPassword('');
      return;
    }

    if (isSignUp && !passwordValid) {
      setError('Your password must be at least 8 characters.');
      return;
    }
    if (isSignUp && !confirmationValid) {
      setError('Your passwords do not match.');
      return;
    }
    if (isSignUp && isDisposableEmail(email.trim())) {
      setError('Disposable email addresses are not allowed. Please use a real email address.');
      return;
    }

    setSubmitting(true);
    if (isSignUp) {
      const result = await signUp(email.trim(), password);
      setSubmitting(false);
      if (result.error) { setError(result.error); return; }
      if (result.needsEmailConfirmation) {
        setNotice(`Almost there! We sent a confirmation link to ${email.trim()}. Click it to activate your account, then sign in.`);
        setPassword('');
        setConfirmPassword('');
        return;
      }
      requestClose();
      return;
    }
    const message = await signIn(email.trim(), password);
    setSubmitting(false);

    if (message) {
      setError(message);
      return;
    }
    requestClose();
  };

  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 z-[60] overflow-y-auto bg-ink-950/65 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        className={`flex min-h-full items-center justify-center ${closing ? 'animate-fade-out' : ''}`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) requestClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-title"
          className="relative my-auto w-full max-w-[440px] overflow-hidden rounded-3xl bg-white shadow-soft-lg animate-scale-in"
          onMouseDown={(event) => event.stopPropagation()}
          style={closing ? { animation: 'scale-out 0.25s ease-in forwards' } : undefined}
        >
        <div className="h-1.5 bg-gradient-to-r from-brand-600 via-accent-500 to-brand-600" />
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 text-white shadow-glow">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Launchrocket</p>
                <p className="mt-0.5 text-xs text-ink-400">Built for fair discovery</p>
              </div>
            </div>
            <button onClick={requestClose} aria-label="Close account dialog" className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-8">
            <div className="inline-flex rounded-xl bg-ink-100 p-1" role="tablist" aria-label="Account access">
              <button type="button" role="tab" aria-selected={!isSignUp && !isReset} onClick={() => switchMode('sign-in')} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${!isSignUp && !isReset ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-800'}`}>
                Sign in
              </button>
              <button type="button" role="tab" aria-selected={isSignUp} onClick={() => switchMode('sign-up')} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${isSignUp ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-800'}`}>
                Create account
              </button>
            </div>

            <h2 id="auth-title" className="mt-6 text-2xl font-bold tracking-tight text-ink-900">
              {isReset ? 'Reset your password' : isSignUp ? 'Join the founder community' : 'Welcome back'}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
              {isReset
                ? 'Enter your email and we will send you a link to reset your password.'
                : isSignUp
                ? 'Create a free account to support the startups and channels shaping what comes next.'
                : 'Sign in to vote, follow your favorites, and help great listings get discovered.'}
            </p>
          </div>

          {error && (
            <div role="alert" className="mt-5 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm font-medium text-error-700">
              {error}
            </div>
          )}

          {notice && (
            <div role="status" className="mt-5 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm font-medium text-success-700">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label htmlFor="auth-email" className="block text-sm font-semibold text-ink-700">
              Email address
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input id="auth-email" type="email" required autoFocus autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={`${inputClass} pl-10`} placeholder="you@example.com" />
              </span>
            </label>

            {!isReset && (
              <label htmlFor="auth-password" className="block text-sm font-semibold text-ink-700">
                Password
                <span className="relative block">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input id="auth-password" type={showPassword ? 'text' : 'password'} required minLength={isSignUp ? 8 : 1} autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} className={`${inputClass} px-10`} placeholder={isSignUp ? 'At least 8 characters' : 'Enter your password'} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 hover:text-ink-700">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
            )}

            {isSignUp && (
              <>
                <div className={`flex items-center gap-2 text-xs ${passwordValid ? 'text-success-700' : 'text-ink-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${passwordValid ? 'bg-success-500' : 'bg-ink-300'}`} /> Use at least 8 characters
                </div>
                <label htmlFor="auth-confirm-password" className="block text-sm font-semibold text-ink-700">
                  Confirm password
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input id="auth-confirm-password" type="password" required autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={`${inputClass} pl-10`} placeholder="Re-enter your password" />
                  </span>
                </label>
              </>
            )}

            {isReset ? (
              <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-3.5 font-semibold text-white shadow-glow transition-all hover:from-brand-700 hover:to-accent-700 hover:shadow-glow-lg disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? 'Sending…' : <><Mail className="h-4 w-4" /> Send Reset Link</>}
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-3.5 font-semibold text-white shadow-glow transition-all hover:from-brand-700 hover:to-accent-700 hover:shadow-glow-lg disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? 'Please wait…' : isSignUp ? <><UserPlus className="h-4 w-4" /> Create free account</> : <><LogIn className="h-4 w-4" /> Sign in securely</>}
              </button>
            )}
          </form>

          <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-ink-50 px-3.5 py-3 text-xs leading-relaxed text-ink-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
            <span>Your account helps keep voting fair. You can browse the directory without signing in.</span>
          </div>

          <div className="mt-6 space-y-3">
            {!isReset && (
              <p className="text-center text-sm text-ink-500">
                {isSignUp ? 'Already have an account?' : 'New to Launchrocket?'}{' '}
                <button type="button" onClick={() => switchMode(isSignUp ? 'sign-in' : 'sign-up')} className="font-semibold text-brand-600 hover:text-brand-700">
                  {isSignUp ? 'Sign in' : 'Create a free account'}
                </button>
              </p>
            )}
            <p className="text-center text-sm text-ink-500">
              {isReset ? (
                <button type="button" onClick={() => switchMode('sign-in')} className="font-semibold text-brand-600 hover:text-brand-700">
                  Back to sign in
                </button>
              ) : (
                <button type="button" onClick={() => switchMode('reset')} className="font-medium text-ink-500 hover:text-brand-600 transition-colors">
                  Forgot your password?
                </button>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
