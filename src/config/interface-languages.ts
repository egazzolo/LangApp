import type { InterfaceLocale } from '@/domain/models';

export const interfaceLanguages: { code: InterfaceLocale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es-419', label: 'Español (Latinoamérica)' },
  { code: 'es-ES', label: 'Español (España)' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'tr', label: 'Türkçe' },
];
