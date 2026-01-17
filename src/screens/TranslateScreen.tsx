import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { ChatMessage, Language } from '../types';
import { LANGUAGES, THEME } from '../constants';
import { useRecorder } from '../hooks/useAudio';
import { transcribeAudio, translateText } from '../services/openai';

import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { ControlPanel } from '../components/ControlPanel';

export default function TranslateScreen() {
    const insets = useSafeAreaInsets();

    // State
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [userLang, setUserLang] = useState<Language>(LANGUAGES[0]);
    const [partnerLang, setPartnerLang] = useState<Language>(LANGUAGES[1]);

    // activeSide tracks who is CURRENTLY recording
    const [activeSide, setActiveSide] = useState<'user' | 'partner' | null>(null);
    const [processingStatus, setProcessingStatus] = useState<string | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);
    const { startRecording, stopRecording, isRecording } = useRecorder();

    // Auto-scroll
    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [history]);

    // Unified Toggle Handler
    const handleToggleRecord = async (side: 'user' | 'partner') => {
        // 1. If we are recording...
        if (activeSide) {
            // If user tapped the OTHER button while recording, ignore or stop current first.
            // For simplicity: If activeSide matches, we STOP. If not, we ignore (must stop first).
            if (activeSide === side) {
                await performStop();
            }
            return;
        }

        // 2. If we are NOT recording, START.
        if (processingStatus) return; // Busy

        // Explicitly set side immediately for UI feedback
        setActiveSide(side);

        const success = await startRecording();
        if (!success) {
            setActiveSide(null); // Revert if failed
        }
    };

    const performStop = async () => {
        if (!activeSide) return;

        setProcessingStatus('Thinking...');
        const side = activeSide;
        setActiveSide(null); // Turn off button immediately

        const uri = await stopRecording();

        if (uri) {
            await processAudio(uri, side);
        } else {
            setProcessingStatus(null);
        }
    };

    const processAudio = async (uri: string, side: 'user' | 'partner') => {
        try {
            // 1. Transcribe
            const text = await transcribeAudio(uri);

            if (!text || text.trim().length === 0) {
                setProcessingStatus(null);
                return;
            }

            // 2. Translate
            const sourceLang = side === 'user' ? userLang : partnerLang;
            const targetLang = side === 'user' ? partnerLang : userLang;

            setProcessingStatus(`Translating to ${targetLang.name}...`);
            const translation = await translateText(text, sourceLang.name, targetLang.name);

            // 3. Update UI
            const newMessage: ChatMessage = {
                id: Date.now().toString(),
                text: text,
                translation: translation,
                side: side,
                originalLang: sourceLang.name,
                targetLang: targetLang.name,
            };
            setHistory(prev => [...prev, newMessage]);

        } catch (err) {
            console.error(err);
            // Alert.alert('Error', 'Translation failed'); // Optional
        } finally {
            setProcessingStatus(null);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: 80 }]}>
            <StatusBar style="dark" />

            {/* HEADER */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Translate</Text>
                <TouchableOpacity onPress={() => setHistory([])}>
                    <Ionicons name="trash-outline" size={20} color={THEME.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* CHAT LIST */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
            >
                {history.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🎙️</Text>
                        <Text style={styles.emptyText}>Tap to speak</Text>
                        <Text style={styles.emptySub}>Conversation will appear here</Text>
                    </View>
                )}

                {history.map((msg) => (
                    <ChatMessageBubble
                        key={msg.id}
                        message={msg}
                        language={msg.side === 'user' ? partnerLang : userLang}
                        autoPlay={true}
                    />
                ))}

                {processingStatus && (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator color={THEME.textSecondary} />
                        <Text style={styles.loaderText}>{processingStatus}</Text>
                    </View>
                )}
            </ScrollView>

            {/* CONTROLS */}
            <ControlPanel
                userLang={userLang}
                partnerLang={partnerLang}
                onUserLangChange={setUserLang}
                onPartnerLangChange={setPartnerLang}
                onToggleRecord={handleToggleRecord}
                activeSide={activeSide}
                isRecording={isRecording}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.bg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.5,
        color: THEME.text,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    emptyState: {
        marginTop: 60,
        alignItems: 'center',
        opacity: 0.5,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME.text,
    },
    emptySub: {
        fontSize: 14,
        color: THEME.textSecondary,
        marginTop: 5,
    },
    loaderContainer: {
        padding: 20,
        alignItems: 'center',
    },
    loaderText: {
        marginTop: 10,
        fontSize: 12,
        color: THEME.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});
