import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './env';
import { AppError } from './utils';

let client: SupabaseClient | null = null;

/**
 * Supabase istemcisi yalnızca .env doldurulduğunda oluşturulur.
 * Anonim üye girişi de bu istemci üzerinden yapılır.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void client?.auth.startAutoRefresh();
      else void client?.auth.stopAutoRefresh();
    });
  }
  return client;
}

/** Supabase ayarlı değilse uygulamayı demo modunda tutar. */
export function requireSupabase(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase) throw new AppError('SUPABASE_NOT_CONFIGURED');
  return supabase;
}
