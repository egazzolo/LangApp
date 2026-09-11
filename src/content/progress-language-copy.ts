import type { InterfaceLocale, LearningLanguage } from "@/domain/models";

const spanish: Record<InterfaceLocale,string> = {
  en:"Your Spanish lately","es-419":"Tu español últimamente","es-ES":"Tu español últimamente","pt-BR":"Seu espanhol ultimamente","zh-Hans":"你最近的西班牙语学习","ja":"最近のスペイン語学習","ko":"최근 스페인어 학습","vi":"Tiếng Tây Ban Nha của bạn gần đây","id":"Perkembangan bahasa Spanyolmu","ar":"تقدمك في الإسبانية مؤخرًا","fr":"Votre espagnol récemment","tr":"Son zamanlardaki İspanyolcan",
};

export const progressTitleFor = (locale: InterfaceLocale, language: LearningLanguage, englishTitle: string) => language === "es" ? spanish[locale] : englishTitle;
