# Ferson architecture

The mobile client is an Expo Router application organized around domain models, feature screens, reusable UI, limited persisted client state, and TanStack Query for server state. Supabase owns identity, durable data, realtime delivery, private media, and server-side orchestration.

The conversational path and learning path are deliberately separate. Sending a message persists it immediately; conversation generation only needs relationship context, retrieved memories, and recent messages. Language analysis and memory extraction can finish independently and attach results later. A failed educational provider therefore never loses or blocks a social message.

Ferson is a conversation-first practice product for independent intermediate and advanced learners, initially targeting approximately CEFR B1 and above. It is not currently designed as a true-beginner course or as primary instruction for A1-A2 learners. English must be completed and validated end to end before additional target languages are implemented. After English, languages will be added deliberately one at a time—beginning with Spanish—by adapting the complete conversation, Tutor, assessment, speech, pronunciation, progress, and native-speaker QA system rather than applying a superficial prompt translation.

AI capabilities are contracts: character generation, conversation, learning analysis, transcription, speech synthesis, and pronunciation assessment. Edge Functions select adapters and are the only layer allowed to read provider secrets. Structured output is schema constrained at the provider and validated again at the domain boundary before database mutation. Prompt modules are purpose-specific and versioned.

Character data is split into stable biography, evolving life state/events, and facts revealed to the learner. Memories are scoped by user and character, deduplicated, confidence-ranked, and optionally embedded. This prevents one character from knowing another character's private conversation.

Analytics events and AI usage are append-oriented facts. Business metrics are derived server-side rather than embedded in UI analytics calls. Entitlements expose central plan capabilities backed by verified Apple/Google store state.

Premium access is stored directly on each profile (`is_premium`, trial end, grace-period end, paid-period end, plan, source, store transaction/product identifiers, and last entitlement update). The mobile client may read these fields but cannot modify them. During development, an administrator may flip `is_premium` in the Supabase Table Editor or SQL Editor. In production, verified purchases and Apple App Store Server Notifications V2 or Google Play RTDN handlers update these fields with the service role when access starts, renews, enters grace, expires, is refunded, or is revoked.

Billing remains store-native: iOS uses `react-native-iap`; Android will use a custom native Kotlin `BillingClient` bridge. RevenueCat is not part of the architecture.

Security relies on Supabase Auth, RLS ownership policies, private storage paths prefixed by user ID, server-only service credentials, and explicit voice-processing consent. Account export/deletion should be implemented as authenticated jobs before launch.
