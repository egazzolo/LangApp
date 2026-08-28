export type AnalyticsEventName = 'onboarding_completed' | 'character_created' | 'message_sent' | 'voice_note_sent' | 'correction_opened' | 'report_viewed' | 'subscription_started';
export interface AnalyticsEvent { name: AnalyticsEventName; occurredAt: string; properties: Record<string, string | number | boolean | null>; }
export interface AnalyticsSink { track(event: AnalyticsEvent): Promise<void>; }
class ConsoleSink implements AnalyticsSink { async track(event: AnalyticsEvent) { if (__DEV__) console.info('[analytics]', event); } }
let sink: AnalyticsSink = new ConsoleSink();
export const configureAnalytics = (next: AnalyticsSink) => { sink = next; };
export const track = (name: AnalyticsEventName, properties: AnalyticsEvent['properties'] = {}) => sink.track({ name, occurredAt: new Date().toISOString(), properties });
