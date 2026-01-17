// Use Legacy API to avoid deprecation errors until full migration to new File API
import * as FileSystem from 'expo-file-system/legacy';
import { OPENAI_API_KEY } from '../constants';

export const transcribeAudio = async (uri: string): Promise<string> => {
    const formData = new FormData();

    const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;

    formData.append('file', {
        uri: fileUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
    } as any);

    formData.append('model', 'whisper-1');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
    });

    if (!res.ok) {
        const errorBody = await res.text();
        console.error('OpenAI Transcribe Error:', errorBody);
        throw new Error(`Transcription API error: ${res.status}`);
    }

    const data = await res.json();
    return data.text;
};

export const translateText = async (text: string, source: string, target: string): Promise<string> => {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a professional interpreter. Translate the following text from ${source} to ${target}. Output ONLY the translation, nothing else.`
                },
                { role: 'user', content: text }
            ],
        }),
    });

    if (!res.ok) throw new Error('Translation failed');

    const data = await res.json();
    return data.choices[0]?.message?.content || "";
};

export const generateTTS = async (text: string, voice: string): Promise<string | null> => {
    try {
        const res = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: voice,
                response_format: 'mp3',
            }),
        });

        if (!res.ok) {
            console.error('TTS API Error', await res.text());
            throw new Error('TTS failed');
        }

        const blob = await res.blob();
        const reader = new FileReader();

        return new Promise((resolve) => {
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];

                // Use Legacy API
                const directory = FileSystem.cacheDirectory;

                if (!directory) {
                    console.error('Legacy FS: No cache directory');
                    resolve(null);
                    return;
                }

                const fileUri = directory + `tts_${Date.now()}.mp3`;

                await FileSystem.writeAsStringAsync(fileUri, base64, {
                    // Use string literal for encoding to be safe
                    encoding: 'base64',
                });
                resolve(fileUri);
            };

            reader.onerror = () => {
                console.error('FileReader error');
                resolve(null);
            };

            reader.readAsDataURL(blob);
        });

    } catch (err) {
        console.error('TTS Error:', err);
        return null;
    }
};
