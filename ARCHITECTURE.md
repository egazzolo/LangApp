# LangApp architecture

The mobile client is an Expo Router application organized around domain models, feature screens, reusable UI, limited persisted client state, and TanStack Query for server state. Supabase owns identity, durable data, realtime delivery, private media, and server-side orchestration.

The conversational path and learning path are deliberately separate. Sending a message persists it immediately; conversation generation only needs relationship context, retrieved memories, and recent messages. Language analysis and memory extraction can finish independently and attach results later. A failed educational provider therefore never loses or blocks a social message.

AI capabilities are contracts: character generation, conversation, learning analysis, transcription, speech synthesis, and pronunciation assessment. Edge Functions select adapters and are the only layer allowed to read provider secrets. Structured output is schema constrained at the provider and validated again at the domain boundary before database mutation. Prompt modules are purpose-specific and versioned.

Character data is split into stable biography, evolving life state/events, and facts revealed to the learner. Memories are scoped by user and character, deduplicated, confidence-ranked, and optionally embedded. This prevents one character from knowing another character's private conversation.

Analytics events, store subscription events, and AI usage are append-oriented facts. Business metrics are derived server-side rather than embedded in UI analytics calls. Entitlements expose central plan capabilities and can later be backed by verified Apple/Google store state.

Security relies on Supabase Auth, RLS ownership policies, private storage paths prefixed by user ID, server-only service credentials, and explicit voice-processing consent. Account export/deletion should be implemented as authenticated jobs before launch.
