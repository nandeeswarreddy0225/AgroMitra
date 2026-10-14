import { en } from './locales/en';
import { te } from './locales/te';
import { hi } from './locales/hi';
import { kn } from './locales/kn';
import { ta } from './locales/ta';
import { mr } from './locales/mr';

export type SupportedLanguage = 'en' | 'te' | 'hi' | 'kn' | 'ta' | 'mr';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeName: 'English', flag: '🌐' },
  { code: 'te', label: 'Telugu', nativeName: 'తెలుగు', flag: '🌾' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🌱' },
  { code: 'ta', label: 'Tamil', nativeName: 'தமிழ்', flag: '🌿' },
  { code: 'mr', label: 'Marathi', nativeName: 'मराठी', flag: '🚜' },
];

export const translations: Record<SupportedLanguage, Record<string, string>> = {
  en,
  te,
  hi,
  kn,
  ta,
  mr,
};
