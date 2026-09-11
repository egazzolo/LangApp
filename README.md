# Ferson

A production-oriented Expo/React Native foundation for a language-learning social circle of clearly disclosed fictional AI people. The UI behaves like a warm messaging app; learning analysis remains quiet and contextual.

## Run locally

1. Install Node.js 22+ and run `npm install`.
2. Copy `.env.example` to `.env` and add a Supabase project URL and anonymous key. Without them the app uses local mock providers and persisted demo data.
3. Run `npm start`, then open iOS, Android, or web from Expo.
4. Run `npm test` and `npm run typecheck` before committing.

## Supabase

Install the Supabase CLI, run `supabase start`, then `supabase db reset`. The migration creates normalized character, conversation, memory, learning, speech, billing, analytics, cost, and notification data with RLS and a private `voice-notes` bucket. Deploy functions with `supabase functions deploy ai-orchestrator` and set `OPENAI_API_KEY` plus `OPENAI_TEXT_MODEL` as function secrets. Azure Speech transcription/pronunciation and OpenAI TTS adapters fit the interfaces in `src/services/ai/contracts.ts`; credentials must only exist server-side.

## Localization

All screen copy uses i18next keys. Resources are in `src/i18n/resources.ts`; locale, support language, and target language are distinct profile fields. Add an interface locale by adding the resource, the `InterfaceLocale` value, and its onboarding selector entry. Arabic enables RTL. Target-language-specific phonemes, prompts, and learner profiles use `target_language`; adding another target later does not require changing interface locale handling.

## Architecture and deployment

See `ARCHITECTURE.md`. EAS profiles are in `eas.json`. Native Apple/Google billing should implement the internal entitlement interface and send signed store events to a server endpoint for verification—RevenueCat is intentionally not used. Push scheduling, subscription webhooks, data export/deletion jobs, and production provider adapters require platform credentials before store release.

## Retention and conversation export

Audio drops to lower quality after 15 days. Audio and conversation messages expire after six calendar months for every plan; academic records have no automatic expiry. Conversation export requires Premium. See [the worker runbook](workers/audio-retention/README.md) for deployment, tests, scheduler configuration, and mobile rollout requirements.
