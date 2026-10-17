import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  openAuthModal: () => void;
};

export type SignUpResult = {
  error: string | null;
  needsEmailConfirmation: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      (async () => {
        setSession(nextSession);
        setLoading(false);
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        return 'Please confirm your email address first — check your inbox for the confirmation link.';
      }
      if (error.status === 429 || error.message.toLowerCase().includes('too many requests')) {
        return 'Too many attempts. Please wait a moment and try again.';
      }
      return 'The email or password you entered is incorrect.';
    }
    return null;
  };

  const signUp = async (email: string, password: string): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return {
        error: "We couldn't create your account. Please check your details and try again.",
        needsEmailConfirmation: false,
      };
    }
    // With email confirmation enabled, sign-up succeeds without a session —
    // the user must click the link in their inbox before they are signed in.
    if (!data.session) {
      return { error: null, needsEmailConfirmation: true };
    }
    return { error: null, needsEmailConfirmation: false };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      return "We couldn't send a reset link. Please try again later.";
    }
    return null;
  };

  const openAuthModal = () => setAuthOpen(true);

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut, resetPassword, openAuthModal }}>
      {children}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
