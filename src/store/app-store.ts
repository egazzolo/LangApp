import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Character, Conversation, CorrectionIntensity, InterfaceLocale, LanguageAnnotation, Message, PronunciationTarget, TutorReviewRecord } from '@/domain/models';

const legacyWomen = new Set(['maya','priya','camille','elena','sofia','aisha','nina','grace','clara','zoe','leila','anika','valerie','mina','isabel','fatima','mei','nora','chloe','amara','sarah']);
const legacyGender = (name: string): Character['gender'] => legacyWomen.has(name.trim().toLocaleLowerCase()) ? 'woman' : 'man';

const RECYCLE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export interface DeletedConversation { conversation: Conversation; messages: Message[]; deletedAt: string; }
interface AppState {
  onboarded: boolean; locale: InterfaceLocale; correctionIntensity: CorrectionIntensity; pronunciationTarget: PronunciationTarget;
  characters: Character[]; conversations: Conversation[]; messages: Record<string, Message[]>;
  deletedConversations: DeletedConversation[]; hideDeleteChatWarning: boolean; correctTutorPunctuation: boolean; tutorReviews: Record<string, TutorReviewRecord[]>;
  completeOnboarding: () => void; setLocale: (locale: InterfaceLocale) => void; setCorrectionIntensity: (value: CorrectionIntensity) => void;
  addCharacter: (character: Character, conversation: Conversation, firstMessage?: Message) => void;
  addMessage: (conversationId: string, message: Message) => void; setMessageAnnotations: (conversationId: string, messageId: string, annotations: LanguageAnnotation[]) => void; markRead: (conversationId: string) => void; markTutorReviewed: (conversationId: string, messageId: string) => void;
  deleteConversation: (conversationId: string) => void; restoreConversation: (conversationId: string) => void;
  permanentlyDeleteConversation: (conversationId: string) => void; purgeExpiredConversations: () => void;
  setHideDeleteChatWarning: (value: boolean) => void; setCorrectTutorPunctuation: (value: boolean) => void; addTutorReview: (review: TutorReviewRecord) => void;
}
const notExpired = (item: DeletedConversation) => Date.now() - new Date(item.deletedAt).getTime() < RECYCLE_RETENTION_MS;
export const useAppStore = create<AppState>()(persist((set) => ({
  onboarded: false, locale: 'en', correctionIntensity: 'balanced', pronunciationTarget: 'general-american', characters: [], conversations: [], messages: {}, deletedConversations: [], hideDeleteChatWarning: false, correctTutorPunctuation: false, tutorReviews: {},
  completeOnboarding: () => set({ onboarded: true }), setLocale: (locale) => set({ locale }), setCorrectionIntensity: (correctionIntensity) => set({ correctionIntensity }),
  addCharacter: (character, conversation, firstMessage) => set((state) => ({ characters: [...state.characters, character], conversations: [conversation, ...state.conversations], messages: { ...state.messages, [conversation.id]: firstMessage ? [firstMessage] : [] } })),
  addMessage: (conversationId, message) => set((state) => ({ messages: { ...state.messages, [conversationId]: [...(state.messages[conversationId] ?? []), message] }, conversations: state.conversations.map((item) => item.id === conversationId ? { ...item, lastMessage: message.text, updatedAt: message.createdAt } : item) })),
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
  permanentlyDeleteConversation: (conversationId) => set((state) => ({ deletedConversations: state.deletedConversations.filter((item) => item.conversation.id !== conversationId) })),
  purgeExpiredConversations: () => set((state) => ({ deletedConversations: state.deletedConversations.filter(notExpired) })),
  setHideDeleteChatWarning: (hideDeleteChatWarning) => set({ hideDeleteChatWarning }),
  setCorrectTutorPunctuation: (correctTutorPunctuation) => set({ correctTutorPunctuation }),
  addTutorReview: (review) => set((state) => ({ tutorReviews: { ...state.tutorReviews, [review.conversationId]: [review, ...(state.tutorReviews[review.conversationId] ?? [])] } })),
}), { name: 'langapp-state-v1', version: 5, storage: createJSONStorage(() => AsyncStorage), migrate: (persisted) => { const saved = persisted as Partial<AppState>; return { ...saved, characters: (saved.characters ?? []).map((character) => ({ ...character, gender: character.gender ?? legacyGender(character.name) })) }; }, partialize: (state) => ({ onboarded: state.onboarded, locale: state.locale, correctionIntensity: state.correctionIntensity, pronunciationTarget: state.pronunciationTarget, characters: state.characters, conversations: state.conversations, messages: state.messages, deletedConversations: state.deletedConversations, hideDeleteChatWarning: state.hideDeleteChatWarning, correctTutorPunctuation: state.correctTutorPunctuation, tutorReviews: state.tutorReviews }) }));




