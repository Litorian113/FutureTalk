export interface ChatMessage {
    id: string;
    text: string;
    translation: string;
    side: 'user' | 'partner';
    originalLang: string;
    targetLang: string;
}

export interface Language {
    code: string;
    name: string;
    flag: string;
    voice: string; // OpenAI voice preset
}
