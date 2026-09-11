import type {
  Character,
  Correction,
  InterfaceLocale,
  LanguageAnnotation,
  Message,
  LearningLanguage,
} from "@/domain/models";
export interface CharacterDraft {
  name: string;
  gender: Character["gender"];
  age: number;
  location: string;
  occupation: string;
  avatarUrl?: string;
  relationship: Character["relationship"];
  personality: string[];
  knowledgeLevel?: Character["knowledgeLevel"];
  expertiseDomains?: string[];
  learningLanguage: LearningLanguage;
  languageVariant: Character["languageVariant"];
  countryCode?: string;
  voiceAccent?: Character["voiceAccent"];
}
export interface CharacterProvider {
  generate(input: CharacterDraft): Promise<Character>;
  regenerateField(
    character: Character,
    field: keyof Character,
  ): Promise<Character[keyof Character]>;
}
export interface ConversationProvider {
  reply(
    character: Character,
    recentMessages: Message[],
    interfaceLocale?: InterfaceLocale,
    includeAnnotations?: boolean,
  ): Promise<{
    text: string;
    kind: "text" | "voice";
    annotations: LanguageAnnotation[];
    deliveryId?: string;
    audioUrl?: string;
    audioPath?: string;
    durationSeconds?: number;
  }>;
}
export interface LearningProvider {
  analyze(
    text: string,
  ): Promise<{ corrections: Correction[]; proficiencySignals: string[] }>;
}
export interface TranscriptionProvider {
  transcribe(uri: string): Promise<{ text: string; confidence: number }>;
}
export interface PronunciationProvider {
  assess(
    uri: string,
    referenceText?: string,
  ): Promise<{
    pronunciation: number;
    fluency: number;
    intelligibility: number;
    phonemes: { ipa: string; score: number }[];
  }>;
}
export interface SpeechProvider {
  synthesize(
    text: string,
    voiceId: string,
  ): Promise<{ audioUrl: string; durationSeconds: number }>;
}
