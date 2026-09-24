import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  /** False until the stored session has been read. */
  ready: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, ready: false });

export function AuthProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [state, setState] = useState<AuthState>({ session: null, ready: !enabled });
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        userIdRef.current = data.session?.user.id ?? null;
        if (mounted) setState({ session: data.session, ready: true });
      })
      .catch(() => {
        if (mounted) setState({ session: null, ready: true });
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // A different (or no) user must never see the previous user's cache.
      const userId = session?.user.id ?? null;
      if (userId !== userIdRef.current) queryClient.clear();
      userIdRef.current = userId;
      setState({ session, ready: true });
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [enabled]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
