import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

/**
 * There is no sign-in screen: every device gets a Supabase anonymous user on
 * first launch. The session is persisted, so the same user (and data) comes
 * back on every launch. RLS works unchanged because anonymous users have the
 * `authenticated` role with their own auth.uid().
 */
interface AuthState {
  session: Session | null;
  status: 'loading' | 'ready' | 'error';
  /** Retry creating the anonymous user after a failure (e.g. offline). */
  retry: () => void;
}

const AuthContext = createContext<AuthState>({ session: null, status: 'loading', retry: () => {} });

export function AuthProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthState['status']>(enabled ? 'loading' : 'ready');
  const userIdRef = useRef<string | null>(null);
  const signingIn = useRef(false);

  const ensureUser = useCallback(async () => {
    if (signingIn.current) return;
    signingIn.current = true;
    setStatus('loading');
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      // onAuthStateChange delivers the new session.
    } catch (e) {
      console.warn('[auth] anonymous sign-in failed', e);
      setStatus('error');
    } finally {
      signingIn.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      // A different user (e.g. after "delete my data") must never see the previous cache.
      const userId = next?.user.id ?? null;
      if (userId !== userIdRef.current) queryClient.clear();
      userIdRef.current = userId;
      setSession(next);
      if (next) {
        setStatus('ready');
      } else {
        // No stored session yet, or it was removed: start a fresh anonymous user.
        // Deferred so it doesn't run inside the auth callback.
        setTimeout(() => void ensureUser(), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [enabled, ensureUser]);

  return (
    <AuthContext.Provider value={{ session, status, retry: () => void ensureUser() }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
