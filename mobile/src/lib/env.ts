/** Ortam değişkenlerinden Supabase bağlantı bilgilerini okur. */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** .env dosyası doldurulmuşsa gerçek bulut modu, aksi halde demo modu. */
export const isSupabaseConfigured =
  /^https:\/\/.+\.supabase\.(co|in)$/.test(url.trim()) && anonKey.trim().length > 40;

export const SUPABASE_URL = url.trim();
export const SUPABASE_ANON_KEY = anonKey.trim();
