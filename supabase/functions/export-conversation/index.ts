import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'unauthorized' }, 401);
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return json({ error: 'unauthorized' }, 401);
  const { data: allowed, error: entitlementError } = await client.rpc('can_export_conversations');
  if (entitlementError) return json({ error: 'entitlement_unavailable' }, 503);
  if (allowed !== true) return json({ error: 'premium_required' }, 403);
  // History currently lives on this user's device. Return a text-only export, never media URLs.
  const raw = await req.text();
  if (raw.length > 5_000_000) return json({ error: 'export_too_large' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'invalid_request' }, 400); }
  if (!Array.isArray(body.messages) || body.messages.length > 20000) return json({ error: 'invalid_request' }, 400);
  const now = new Date();
  const cutoff = new Date(now); cutoff.setUTCDate(1); cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
  cutoff.setUTCDate(Math.min(now.getUTCDate(), new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate()));
  const messages = [];
  for (const m of body.messages) {
    if (!m || !['user','character'].includes(m.sender) || typeof m.text !== 'string' || m.text.length > 20000 || typeof m.createdAt !== 'string' || !Number.isFinite(Date.parse(m.createdAt))) return json({ error: 'invalid_message' }, 400);
    if (Date.parse(m.createdAt) > cutoff.getTime() && Date.parse(m.createdAt) <= now.getTime()) messages.push({ sender: m.sender, text: m.text, createdAt: m.createdAt });
  }
  return json({ exportedAt: now.toISOString(), messages });
});
