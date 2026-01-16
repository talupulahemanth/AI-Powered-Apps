
export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface VoiceOption {
  id: VoiceName;
  name: string;
  gender: 'male' | 'female';
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'Puck', name: 'Puck (Playful)', gender: 'male' },
  { id: 'Charon', name: 'Charon (Deep)', gender: 'male' },
  { id: 'Kore', name: 'Kore (Soft)', gender: 'female' },
  { id: 'Fenrir', name: 'Fenrir (Strong)', gender: 'male' },
  { id: 'Zephyr', name: 'Zephyr (Bright)', gender: 'female' },
];

export interface TranslationLanguage {
  code: string;
  name: string;
}

export const LANGUAGES: TranslationLanguage[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
];

export interface TranscriptionEntry {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
