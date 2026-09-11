import type { VoiceAccent } from '../../supabase/functions/_shared/voice-accents';
export type InterfaceLocale =
  | "en"
  | "es-419"
  | "es-ES"
  | "pt-BR"
  | "zh-Hans"
  | "ja"
  | "ko"
  | "vi"
  | "id"
  | "ar"
  | "fr"
  | "tr";
export type CorrectionIntensity = "chill" | "balanced" | "intensive";
export type LearningLanguage = "en" | "es";
export type PronunciationTarget = "general-american" | "modern-british" | "latin-american-spanish" | "castilian-spanish";
export type CharacterGender = "woman" | "man";
export type KnowledgeLevel = "general" | "specialist";
export type RelationshipType =
  | "stranger"
  | "acquaintance"
  | "classmate"
  | "coworker"
  | "neighbor"
  | "friend"
  | "close_friend"
  | "professional_contact";

export interface Character {
  id: string;
  name: string;
  gender: CharacterGender;
  dateOfBirth: string;
  location: string;
  occupation: string;
  relationship: RelationshipType;
  personality: string[];
  bio: string;
  currentState: string;
  voiceId: string;
  voiceAccent?: VoiceAccent;
  avatarUrl?: string;
  knowledgeLevel?: KnowledgeLevel;
  expertiseDomains?: string[];
  learningLanguage?: LearningLanguage;
  languageVariant?: PronunciationTarget;
  countryCode?: string;
  aiDisclosure: true;
}
export interface Conversation {
  id: string;
  characterId: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
  tutorReviewedThroughMessageId?: string;
}
export interface Correction {
  id: string;
  original: string;
  improved: string;
  explanation?: string;
  category: "grammar" | "word_choice" | "naturalness" | "structure";
}
export interface LanguageAnnotation {
  text: string;
  meaning: string;
}
export interface Message {
  id: string;
  conversationId: string;
  sender: "user" | "character";
  kind: "text" | "voice";
  text: string;
  createdAt: string;
  status: "sending" | "sent" | "failed";
  durationSeconds?: number;
  audioUrl?: string;
  audioPath?: string;
  audioBucket?: 'voice-notes' | 'ferson-voice-replies';
  correction?: Correction;
  annotations?: LanguageAnnotation[];
}

export interface TutorCorrectionRecord {
  original: string;
  mistake: string;
  explanation: string;
  corrected: string;
  alternatives: string[];
}
export interface TutorReviewRecord {
  id: string;
  conversationId: string;
  throughMessageId: string;
  createdAt: string;
  correctPunctuation: boolean;
  acceptCasualTexting?: boolean;
  correctionIntensity?: CorrectionIntensity;
  corrections: TutorCorrectionRecord[];
  focusAreas?: LearningFocusArea[];
}
export interface LearningFocusArea { skillKey:string; category:"grammar"|"vocabulary"|"naturalness"|"pronunciation"|"fluency"|"other"; label:string; evidenceCount:number; confidence:number; }
