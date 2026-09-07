import type { Plan } from '@/config/entitlements';
import { supabase } from '@/services/supabase/client';

export async function getCurrentPlan(): Promise<Plan> {
  if (!supabase) return 'free';
  const now = new Date().toISOString();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'free';
  const { data, error } = await supabase.from('profiles').select('is_premium,trial_ends_at,grace_period_ends_at,premium_expires_at,premium_plan').eq('id', user.id).maybeSingle();
  if (error) return 'free';
  const paid = data?.is_premium === true && (!data.premium_expires_at || data.premium_expires_at > now);
  const trial = Boolean(data?.trial_ends_at && data.trial_ends_at > now);
  const grace = Boolean(data?.grace_period_ends_at && data.grace_period_ends_at > now);
  if (!paid && !trial && !grace) return 'free';
  return data?.premium_plan === 'premium_annual' ? 'premium_annual' : 'premium_monthly';
}
