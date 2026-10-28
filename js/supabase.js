import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://seenklndshnsbcjayovs.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_n4ZTXH72mRuY5s55cvWslQ_KAkIEct5';
export const PUBLIC_APP_URL = 'https://twngvi.github.io/languagelearningapp/#settings';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError') throw error;
  return data.user || null;
}

export async function requestMagicLink(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new TypeError('Hãy nhập email hợp lệ.');
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: PUBLIC_APP_URL },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
