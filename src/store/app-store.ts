import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pruneHistory, isRetained, type ArchivedLearning } from '@/domain/retention';
import type { Character, Conversation, CorrectionIntensity, InterfaceLocale, LanguageAnnotation, LearningLanguage, Message, PronunciationTarget, TutorReviewRecord } from '@/domain/models';

const legacyWomen = new Set(['maya','priya','camille','elena','sofia','aisha','nina','grace','clara','zoe','leila','anika','valerie','mina','isabel','fatima','mei','nora','chloe','amara','sarah']);
const legacyGender = (name: string): Character['gender'] => legacyWomen.has(name.trim().toLocaleLowerCase()) ? 'woman' : 'man';

const RECYCLE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export interface DeletedConversation { conversation: Conversation; messages: Message[]; deletedAt: string; }
interface AppState {
  archivedLearning: Record<string, ArchivedLearning>; pendingAudioDeletes: string[];
  setMessageAudio: (conversationId: string, messageId: string, audioPath: string) => void;
  acknowledgeAudioDelete: (uri: string) => void;
  onboarded: boolean; locale: InterfaceLocale; hasSelectedInterfaceLanguage: boolean; learningLanguage: LearningLanguage; correctionIntensity: CorrectionIntensity; pronunciationTarget: PronunciationTarget; interests: string[];
  characters: Character[]; conversations: Conversation[]; messages: Record<string, Message[]>;
  deletedConversations: DeletedConversation[]; hideDeleteChatWarning: boolean; correctTutorPunctuation: boolean; acceptCasualTexting: boolean; focusedPracticeEnabled:boolean; showLanguageHighlights: boolean; notificationsEnabled: boolean; voiceEnabled: boolean; tutorReviews: Record<string, TutorReviewRecord[]>;
  completeOnboarding: () => void; setLocale: (locale: InterfaceLocale) => void; confirmInterfaceLanguage: () => void; setLearningLanguage: (value: LearningLanguage) => void; setCorrectionIntensity: (value: CorrectionIntensity) => void; setPronunciationTarget: (value: PronunciationTarget) => void; setInterests: (value: string[]) => void;
  addCharacter: (character: Character, conversation: Conversation, firstMessage?: Message) => void;
  addMessage: (conversationId: string, message: Message) => void; setMessageAnnotations: (conversationId: string, messageId: string, annotations: LanguageAnnotation[]) => void; markRead: (conversationId: string) => void; markTutorReviewed: (conversationId: string, messageId: string) => void;
  deleteConversation: (conversationId: string) => void; restoreConversation: (conversationId: string) => void;
  permanentlyDeleteConversation: (conversationId: string) => void; purgeExpiredConversations: () => void;
  setHideDeleteChatWarning: (value: boolean) => void; setCorrectTutorPunctuation: (value: boolean) => void; setAcceptCasualTexting: (value: boolean) => void; setFocusedPracticeEnabled:(value:boolean)=>void; setShowLanguageHighlights: (value: boolean) => void; setNotificationsEnabled: (value: boolean) => void; setVoiceEnabled: (value: boolean) => void; addTutorReview: (review: TutorReviewRecord) => void;
  resetForSignOut: () => void;
}
const notExpired = (item: DeletedConversation) => Date.now() - new Date(item.deletedAt).getTime() < RECYCLE_RETENTION_MS;
export const useAppStore = create<AppState>()(persist((set) => ({
  archivedLearning: {}, pendingAudioDeletes: [],
  acknowledgeAudioDelete: (uri) => set(state => ({ pendingAudioDeletes: state.pendingAudioDeletes.filter(item => item !== uri) })),
  setMessageAudio: (conversationId, messageId, audioPath) => set(state => {
    const update = (items: Message[]) => items.map(m => m.id === messageId ? { ...m, audioPath, audioUrl: undefined } : m);
    const original = (state.messages[conversationId] ?? []).find(m => m.id === messageId)
      ?? state.deletedConversations.find(c => c.conversation.id === conversationId)?.messages.find(m => m.id === messageId);
    return { messages: { ...state.messages, ...(state.messages[conversationId] ? { [conversationId]: update(state.messages[conversationId]) } : {}) },
      deletedConversations: state.deletedConversations.map(c => c.conversation.id === conversationId ? { ...c, messages: update(c.messages) } : c),
      pendingAudioDeletes: original?.audioUrl?.startsWith('file://') ? [...new Set([...state.pendingAudioDeletes, original.audioUrl])] : state.pendingAudioDeletes };
  }),
  onboarded: false, locale: 'en', hasSelectedInterfaceLanguage: false, learningLanguage: 'en', correctionIntensity: 'balanced', pronunciationTarget: 'general-american', interests: [], characters: [], conversations: [], messages: {}, deletedConversations: [], hideDeleteChatWarning: false, correctTutorPunctuation: false, acceptCasualTexting: false, focusedPracticeEnabled:false, showLanguageHighlights: true, notificationsEnabled: true, voiceEnabled: true, tutorReviews: {},
  completeOnboarding: () => set({ onboarded: true }), setLocale: (locale) => set({ locale }), confirmInterfaceLanguage: () => set({ hasSelectedInterfaceLanguage: true }), setLearningLanguage: (learningLanguage) => set({ learningLanguage, pronunciationTarget: learningLanguage === 'es' ? 'latin-american-spanish' : 'general-american' }), setCorrectionIntensity: (correctionIntensity) => set({ correctionIntensity }), setPronunciationTarget: (pronunciationTarget) => set({ pronunciationTarget }), setInterests: (interests) => set({ interests }),
  addCharacter: (character, conversation, firstMessage) => set((state) => ({ characters: [...state.characters, character], conversations: [conversation, ...state.conversations], messages: { ...state.messages, [conversation.id]: firstMessage ? [firstMessage] : [] } })),
  addMessage: (conversationId, message) => set((state) => { if (!isRetained(message.createdAt) || !state.conversations.some(c => c.id === conversationId)) return state; const existing=state.messages[conversationId]??[]; if(existing.some(item=>item.id===message.id))return state; return { messages: { ...state.messages, [conversationId]: [...existing, message] }, conversations: state.conversations.map((item) => item.id === conversationId ? { ...item, lastMessage: message.text, updatedAt: message.createdAt, unreadCount: message.sender === 'character' ? item.unreadCount + 1 : item.unreadCount } : item) }; }),
  setMessageAnnotations: (conversationId, messageId, annotations) => set((state) => ({ messages: { ...state.messages, [conversationId]: (state.messages[conversationId] ?? []).map((message) => message.id === messageId ? { ...message, annotations } : message) } })),
  markRead: (conversationId) => set((state) => ({ conversations: state.conversations.map((item) => item.id === conversationId ? { ...item, unreadCount: 0 } : item) })),
  markTutorReviewed: (conversationId, messageId) => set((state) => ({ conversations: state.conversations.map((item) => item.id === conversationId ? { ...item, tutorReviewedThroughMessageId: messageId } : item) })),
  deleteConversation: (conversationId) => set((state) => {
    const conversation = state.conversations.find((item) => item.id === conversationId); if (!conversation) return state;
    const nextMessages = { ...state.messages }; const conversationMessages = nextMessages[conversationId] ?? []; delete nextMessages[conversationId];
    return { conversations: state.conversations.filter((item) => item.id !== conversationId), messages: nextMessages, deletedConversations: [{ conversation, messages: conversationMessages, deletedAt: new Date().toISOString() }, ...state.deletedConversations.filter((item) => item.conversation.id !== conversationId && notExpired(item))] };
  }),
  restoreConversation: (conversationId) => set((state) => {
    const deleted = state.deletedConversations.find((item) => item.conversation.id === conversationId);
    if (!deleted || !notExpired(deleted)) return { deletedConversations: state.deletedConversations.filter(notExpired) };
    return { conversations: [deleted.conversation, ...state.conversations], messages: { ...state.messages, [conversationId]: deleted.messages }, deletedConversations: state.deletedConversations.filter((item) => item.conversation.id !== conversationId && notExpired(item)) };
  }),
  permanentlyDeleteConversation: (conversationId) => set((state) => pruneHistory({ ...state, deletedConversations: state.deletedConversations.map(item => item.conversation.id === conversationId ? { ...item, deletedAt: '1970-01-01T00:00:00Z' } : item) })),
  purgeExpiredConversations: () => set((state) => pruneHistory(state)),
  setHideDeleteChatWarning: (hideDeleteChatWarning) => set({ hideDeleteChatWarning }),
  setCorrectTutorPunctuation: (correctTutorPunctuation) => set({ correctTutorPunctuation }),
  setAcceptCasualTexting: (acceptCasualTexting) => set({ acceptCasualTexting }),
  setFocusedPracticeEnabled:(focusedPracticeEnabled)=>set({focusedPracticeEnabled}),
  setShowLanguageHighlights: (showLanguageHighlights) => set({ showLanguageHighlights }),
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
  setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
  addTutorReview: (review) => set((state) => ({ tutorReviews: { ...state.tutorReviews, [review.conversationId]: [review, ...(state.tutorReviews[review.conversationId] ?? [])] } })),
  resetForSignOut: () => set({ hasSelectedInterfaceLanguage: false, archivedLearning: {}, pendingAudioDeletes: [], onboarded: false, characters: [], conversations: [], messages: {}, deletedConversations: [], tutorReviews: {}, acceptCasualTexting: false }),
}), { name: 'langapp-state-v1', version: 13, storage: createJSONStorage(() => AsyncStorage), onRehydrateStorage: () => (state) => { state?.purgeExpiredConversations(); }, migrate: (persisted) => { const saved = persisted as Partial<AppState>; return { ...saved, archivedLearning: saved.archivedLearning ?? {}, pendingAudioDeletes: saved.pendingAudioDeletes ?? [], learningLanguage: saved.learningLanguage ?? 'en', interests: saved.interests ?? [], hasSelectedInterfaceLanguage: saved.hasSelectedInterfaceLanguage ?? false, notificationsEnabled: saved.notificationsEnabled ?? true, voiceEnabled: saved.voiceEnabled ?? true, acceptCasualTexting: false, focusedPracticeEnabled:saved.focusedPracticeEnabled??false, characters: (saved.characters ?? []).map((character) => ({ ...character, gender: character.gender ?? legacyGender(character.name), learningLanguage: character.learningLanguage ?? 'en' })) }; }, partialize: (state) => ({ archivedLearning: state.archivedLearning, pendingAudioDeletes: state.pendingAudioDeletes, onboarded: state.onboarded, locale: state.locale, learningLanguage: state.learningLanguage, interests: state.interests, hasSelectedInterfaceLanguage: state.hasSelectedInterfaceLanguage, correctionIntensity: state.correctionIntensity, pronunciationTarget: state.pronunciationTarget, characters: state.characters, conversations: state.conversations, messages: state.messages, deletedConversations: state.deletedConversations, hideDeleteChatWarning: state.hideDeleteChatWarning, correctTutorPunctuation: state.correctTutorPunctuation, focusedPracticeEnabled:state.focusedPracticeEnabled, showLanguageHighlights: state.showLanguageHighlights, notificationsEnabled: state.notificationsEnabled, voiceEnabled: state.voiceEnabled, tutorReviews: state.tutorReviews }) }));





