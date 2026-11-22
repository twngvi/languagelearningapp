import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://seenklndshnsbcjayovs.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_n4ZTXH72mRuY5s55cvWslQ_KAkIEct5';
export const PUBLIC_APP_URL = 'https://twngvi.github.io/languagelearningapp/';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
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

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    });
    if (!response.ok) {
      throw new Error(`Máy chủ Supabase trả về HTTP ${response.status}.`);
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Không kết nối được tới Supabase. URL hiện tại "${SUPABASE_URL}" có thể sai, dự án đã bị xóa hoặc đang không truy cập được.`);
    }
    throw error;
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: PUBLIC_APP_URL },
    });
    if (error) throw error;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Không kết nối được tới Supabase. URL hiện tại "${SUPABASE_URL}" có thể sai hoặc dự án đã bị xóa.`);
    }
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
