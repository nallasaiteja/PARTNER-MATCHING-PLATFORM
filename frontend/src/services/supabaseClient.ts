import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wykhtxwvstgbroztrlgm.supabase.co';
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

let supabaseClient: SupabaseClient | null = null;

if (supabaseUrl && supabasePublishableKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabasePublishableKey);
  } catch (err) {
    console.warn('[Supabase Frontend] Initialization error:', err);
  }
}

export function isSupabaseClientConfigured(): boolean {
  return Boolean(supabaseClient && supabasePublishableKey);
}

export function getSupabase(): SupabaseClient | null {
  return supabaseClient;
}

/**
 * Sign in using Supabase Auth (Email + Password)
 */
export async function supabaseSignInWithPassword(email: string, password: string) {
  if (!supabaseClient) {
    throw new Error('Supabase client not configured. Set VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env');
  }
  return supabaseClient.auth.signInWithPassword({ email, password });
}

/**
 * Sign up using Supabase Auth
 */
export async function supabaseSignUp(params: {
  email?: string;
  phone?: string;
  password?: string;
  options?: any;
}) {
  if (!supabaseClient) {
    throw new Error('Supabase client not configured. Set VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env');
  }
  if (params.email && params.password) {
    return supabaseClient.auth.signUp({
      email: params.email,
      password: params.password,
      options: params.options,
    });
  }
  throw new Error('Email and password required for signup');
}

/**
 * Send OTP via Supabase Auth
 */
export async function supabaseSendOtp(params: { email?: string; phone?: string }) {
  if (!supabaseClient) {
    throw new Error('Supabase client not configured');
  }
  return supabaseClient.auth.signInWithOtp(params as any);
}

/**
 * Verify OTP via Supabase Auth
 */
export async function supabaseVerifyOtp(params: {
  email?: string;
  phone?: string;
  token: string;
  type: 'sms' | 'email' | 'signup' | 'magiclink';
}) {
  if (!supabaseClient) {
    throw new Error('Supabase client not configured');
  }
  return supabaseClient.auth.verifyOtp(params as any);
}

/**
 * Sign out of Supabase Auth
 */
export async function supabaseSignOut() {
  if (!supabaseClient) return;
  return supabaseClient.auth.signOut();
}
