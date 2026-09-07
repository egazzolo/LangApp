import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/services/supabase/client';

export type SocialProvider = 'google' | 'apple';
export const AUTH_REDIRECT_URL = 'ferson://auth/callback';
export const ACCOUNT_ALREADY_EXISTS_MESSAGE = 'An account already exists with this email. Sign in instead.';
WebBrowser.maybeCompleteAuthSession();
const client = () => { if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED'); return supabase; };

function isAlreadyRegisteredError(error: { message?: string; code?: string }) {
  const value = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return value.includes('user_already_exists') || value.includes('already registered') || value.includes('already been registered');
}

export async function registerWithEmail(email: string, password: string) {
  const auth = client().auth; const { data: { session } } = await auth.getSession(); const emailRedirectTo = AUTH_REDIRECT_URL;
  if (session?.user.is_anonymous) {
    const { data, error } = await auth.updateUser({ email, password }, { emailRedirectTo });
    if (error) {
      if (isAlreadyRegisteredError(error)) throw new Error(ACCOUNT_ALREADY_EXISTS_MESSAGE);
      throw error;
    }
    return { needsEmailConfirmation: !data.user.email_confirmed_at };
  }
  const { data, error } = await auth.signUp({ email, password, options: { emailRedirectTo } });
  if (error) {
    if (isAlreadyRegisteredError(error)) throw new Error(ACCOUNT_ALREADY_EXISTS_MESSAGE);
    throw error;
  }
  return { needsEmailConfirmation: !data.session };
}
export async function signInWithEmail(email: string, password: string) { const { error } = await client().auth.signInWithPassword({ email, password }); if (error) throw error; }
export async function verifyEmailCode(email: string, token: string) {
  const { data, error } = await client().auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
  if (!data.session) throw new Error('Could not verify this code. Please try again.');
}
export async function resendSignupCode(email: string) {
  const { error } = await client().auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: AUTH_REDIRECT_URL },
  });
  if (error) throw error;
}
export async function continueWithSocial(provider: SocialProvider) {
  const auth = client().auth; const redirectTo = AUTH_REDIRECT_URL; const { data: { session } } = await auth.getSession();
  const result = session?.user.is_anonymous ? await auth.linkIdentity({ provider, options: { redirectTo, skipBrowserRedirect: true } }) : await auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
  if (result.error) throw result.error; if (!result.data.url) throw new Error('OAUTH_URL_UNAVAILABLE');
  const browser = await WebBrowser.openAuthSessionAsync(result.data.url, redirectTo); if (browser.type !== 'success') return false; await completeAuthFromUrl(browser.url); return true;
}
export async function completeAuthFromUrl(url: string) {
  const parsed = new URL(url); const query = parsed.searchParams; const fragment = new URLSearchParams(parsed.hash.slice(1));
  const code = query.get('code'); if (code) { const { error } = await client().auth.exchangeCodeForSession(code); if (error) throw error; return true; }
  const accessToken = fragment.get('access_token') ?? query.get('access_token'); const refreshToken = fragment.get('refresh_token') ?? query.get('refresh_token');
  if (!accessToken || !refreshToken) return false; const { error } = await client().auth.setSession({ access_token: accessToken, refresh_token: refreshToken }); if (error) throw error; return true;
}
