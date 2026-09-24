import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from './env';
import { storage } from './storage';

// A placeholder URL keeps createClient from throwing when unconfigured; the
// root layout shows a setup screen instead of making requests in that case.
export const supabase = createClient<Database>(
  isSupabaseConfigured ? supabaseUrl : 'http://localhost:54321',
  isSupabaseConfigured ? supabaseKey : 'unconfigured',
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

export type AppSupabaseClient = typeof supabase;

// Only refresh tokens while the app is in the foreground (Supabase guidance).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
