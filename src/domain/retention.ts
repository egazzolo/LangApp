import type { Character, Conversation, Message, Correction } from './models';

export function sixMonthsAgo(now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setUTCDate(1);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
  const last = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate();
  cutoff.setUTCDate(Math.min(now.getUTCDate(), last));
  return cutoff;
}
export function isRetained(createdAt: string, now = new Date()): boolean {
  return new Date(createdAt).getTime() > sixMonthsAgo(now).getTime();
}
export interface ArchivedLearning {
  language: 'en' | 'es'; learnerMessages: number; voiceMessages: number; corrections: Correction[];
}
interface RetentionState {
  characters: Character[]; conversations: Conversation[]; messages: Record<string, Message[]>;
  deletedConversations: { conversation: Conversation; messages: Message[]; deletedAt: string }[];
  archivedLearning: Record<string, ArchivedLearning>; pendingAudioDeletes: string[];
}
export function pruneHistory(state: RetentionState, now = new Date()) {
  const archivedLearning = { ...state.archivedLearning };
  const pendingAudioDeletes = new Set(state.pendingAudioDeletes);
  const prune = (conversation: Conversation, messages: Message[], discardAll = false) => {
    const expired = messages.filter(m => discardAll || !isRetained(m.createdAt, now));
    const previous = archivedLearning[conversation.id] ?? {
      language: state.characters.find(c => c.id === conversation.characterId)?.learningLanguage ?? 'en',
      learnerMessages: 0, voiceMessages: 0, corrections: [],
    };
    if (expired.length) archivedLearning[conversation.id] = {
      ...previous,
      learnerMessages: previous.learnerMessages + expired.filter(m => m.sender === 'user').length,
      voiceMessages: previous.voiceMessages + expired.filter(m => m.sender === 'user' && m.kind === 'voice').length,
      corrections: [...previous.corrections, ...expired.flatMap(m => m.correction ? [m.correction] : [])],
    };
    for (const m of expired) if (m.audioUrl?.startsWith('file://')) pendingAudioDeletes.add(m.audioUrl);
    return messages.filter(m => !discardAll && isRetained(m.createdAt, now));
  };
  const messages: Record<string, Message[]> = {};
  const conversations = state.conversations.flatMap(c => {
    const kept = prune(c, state.messages[c.id] ?? []);
    if (!kept.length && !isRetained(c.updatedAt, now)) return [];
    messages[c.id] = kept;
    return [{ ...c, lastMessage: kept.at(-1)?.text ?? '' }];
  });
  const deletedConversations = state.deletedConversations.flatMap(item => {
    const recycleExpired = now.getTime() - new Date(item.deletedAt).getTime() >= 7 * 86400000;
    const kept = prune(item.conversation, item.messages, recycleExpired);
    if (recycleExpired || (!kept.length && !isRetained(item.conversation.updatedAt, now))) return [];
    return [{ ...item, messages: kept, conversation: { ...item.conversation, lastMessage: kept.at(-1)?.text ?? '' } }];
  });
  return { messages, conversations, deletedConversations, archivedLearning, pendingAudioDeletes: [...pendingAudioDeletes] };
}
