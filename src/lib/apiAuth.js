import { supabase } from './supabase';

/**
 * Build fetch headers for calls to our Express backend, attaching the current
 * Supabase session JWT so the server can verify the caller (e.g. admin-only or
 * authenticated-only routes).
 *
 * Usage:
 *   const res = await fetch(url, { method: 'POST', headers: await authHeaders(), body });
 */
export async function authHeaders(extra = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}
