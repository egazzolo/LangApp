import { PostHog } from 'posthog-react-native';
import { env } from '@/config/env';
import { supabase } from '@/services/supabase/client';

export type AnalyticsEventName = 'onboarding_completed' | 'character_created' | 'message_sent' | 'voice_note_sent' | 'correction_opened' | 'report_viewed' | 'subscription_started';
type AnalyticsValue = string | number | boolean | null;
export interface AnalyticsEvent { name: AnalyticsEventName; occurredAt: string; properties: Record<string, AnalyticsValue>; }
export interface AnalyticsSink { track(event: AnalyticsEvent): Promise<void>; }

const allowedProperties: Record<AnalyticsEventName, ReadonlySet<string>> = {
  onboarding_completed: new Set(['interface_locale', 'target_language']),
  character_created: new Set(['mode', 'starter']),
  message_sent: new Set(['kind', 'has_correction']),
  voice_note_sent: new Set(['direction', 'duration_bucket']),
  correction_opened: new Set(['category']),
  report_viewed: new Set(['report_number']),
  subscription_started: new Set(['plan', 'store']),
};
const blockedKey = /(text|message|transcript|prompt|response|content|name|email|phone|token|secret|auth|address|url|uri)/i;
const safeString = /^[a-z0-9_.:-]{1,64}$/i;

export function sanitizeAnalyticsProperties(name: AnalyticsEventName, properties: AnalyticsEvent['properties']) {
  const allowed = allowedProperties[name];
  return Object.fromEntries(Object.entries(properties).filter(([key, value]) => {
    if (!allowed.has(key) || blockedKey.test(key)) return false;
    if (value === null || typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    return safeString.test(value);
  }));
}

class SupabaseSink implements AnalyticsSink {
  async track(event: AnalyticsEvent) {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user.id) return;
    const { error } = await supabase.from('analytics_events').insert({
      user_id: session.user.id,
      event_name: event.name,
      properties: event.properties,
      occurred_at: event.occurredAt,
    });
    if (error && __DEV__) console.warn('[analytics] Supabase persistence failed', error.code);
  }
}

class PostHogSink implements AnalyticsSink {
  private client = env.EXPO_PUBLIC_POSTHOG_KEY ? new PostHog(env.EXPO_PUBLIC_POSTHOG_KEY, {
    host: env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    captureAppLifecycleEvents: false,
  }) : null;
  async track(event: AnalyticsEvent) { this.client?.capture(event.name, event.properties); }
}

class CompositeSink implements AnalyticsSink {
  constructor(private readonly sinks: AnalyticsSink[]) {}
  async track(event: AnalyticsEvent) { await Promise.allSettled(this.sinks.map((sink) => sink.track(event))); }
}

let sink: AnalyticsSink = new CompositeSink([new SupabaseSink(), new PostHogSink()]);
export const configureAnalytics = (next: AnalyticsSink) => { sink = next; };
export const track = (name: AnalyticsEventName, properties: AnalyticsEvent['properties'] = {}) => sink.track({
  name,
  occurredAt: new Date().toISOString(),
  properties: sanitizeAnalyticsProperties(name, properties),
});
