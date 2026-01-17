import { Language } from '../types';

export const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export const THEME = {
    bg: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    accent: '#2D55FF', // International Blue
    accentSecondary: '#F2F2F7',
    record: '#FF3B30', // Recording Red
    bubbleUser: '#F2F2F7',
    bubbleAI: '#2D55FF',
};

export const LANGUAGES: Language[] = [
    { code: 'de', name: 'German', flag: '🇩🇪', voice: 'onyx' },
    { code: 'en', name: 'English', flag: '🇺🇸', voice: 'alloy' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸', voice: 'shimmer' },
    { code: 'fr', name: 'French', flag: '🇫🇷', voice: 'echo' },
    { code: 'it', name: 'Italian', flag: '🇮🇹', voice: 'fable' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵', voice: 'nova' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺', voice: 'onyx' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳', voice: 'alloy' },
];
