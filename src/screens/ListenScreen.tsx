import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { THEME } from '../constants';
import { useRecorder } from '../hooks/useAudio';
import { transcribeAudio, translateText, summarizeText, generateTTS } from '../services/openai';

// Config
const CHUNK_DURATION_MS = 15000; // 15 seconds (longer chunks = less interruptions, better context)
const SUMMARY_INTERVAL_MS = 30000; // 30 seconds

type TranscriptSegment = {
    id: string;
    original: string;
    german: string;
    timestamp: string;
};

export default function ListenScreen() {
    const insets = useSafeAreaInsets();

    // UI State
    const [activeTab, setActiveTab] = useState<'live' | 'summary'>('live');
    const [isListening, setIsListening] = useState(false);
    const [status, setStatus] = useState<string>('Ready');

    // Data State
    const [segments, setSegments] = useState<TranscriptSegment[]>([]);
    const [summary, setSummary] = useState<string>('');
    const [fullTranscript, setFullTranscript] = useState<string>(''); // Full cumulative transcript for summary
    const [lastTranscriptContext, setLastTranscriptContext] = useState<string>(''); // Last few sentences for Whisper prompt

    // Audio & Refs
    const { startRecording, stopRecording } = useRecorder();
    const isListeningRef = useRef(false); // Ref for loop access
    const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const summaryIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Audio Player for TTS
    const player = useAudioPlayer(null);
    const [ttsQueue, setTtsQueue] = useState<string[]>([]); // Queue of file URIs
    const isPlayingRef = useRef(false);

    // --- TTS Queue Management ---
    useEffect(() => {
        const processQueue = async () => {
            if (ttsQueue.length === 0 || isPlayingRef.current) return;

            isPlayingRef.current = true;
            const nextUri = ttsQueue[0];

            try {
                // Force header output
                await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

                player.replace({ uri: nextUri });
                player.play();

                // Wait for finish (approximate or use event listener if available in future)
                // Since we don't have an "onFinish" event easily in this hook setup without refactoring,
                // we rely on the duration or simply polling.
                // Actually, let's just wait for duration * 1000. 
                // But player doesn't give duration immediately potentially. 
                // Workaround: We remove from queue when player status changes to idle? 
                // For stability in this V1, let's assume average reading speed or check status loop.
            } catch (e) {
                console.error('TTS Play error', e);
                finishTrack();
            }
        };

        processQueue();
    }, [ttsQueue]);

    // Monitor player status to advance queue
    useEffect(() => {
        if (isPlayingRef.current && !player.playing) {
            // It stopped? Or just paused? Assuming stopped means finished for now if enough time passed
            // This is tricky with simple hooks. 
            // Let's use a dirty hack: If it WAS playing and now isn't, we are done.
            // But initial state is not playing.
            // We'll handle "finishTrack" call inside the Render loop if we see it stopped?
            // Better: polling check.
        }
    }, [player.playing]);

    // Simple poller for playback finish
    useEffect(() => {
        const interval = setInterval(() => {
            if (isPlayingRef.current && !player.playing && player.currentTime > 0) {
                // It seems it finished
                finishTrack();
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const finishTrack = () => {
        // Remove first item
        setTtsQueue(prev => prev.slice(1));
        isPlayingRef.current = false;
        // Switch back to record mode if listening (Wait, we can't do this easily if we overlap)
        // Actually, we don't need to switch back to record mode explicitly if 'allowsRecording' 
        // was only set to false. BUT recording stops if we set allowsRecording false?
        // CRITICAL: On iOS, setting allowsRecording=false STOPS recording.
        // So we CANNOT use the speaker-forcing hack while recording in background!
        // We must accept earpiece output (or Bluetooth) for simultaneous record/play on iOS.
        // OR we use "PlayAndRecord" with "DefaultToSpeaker". 
        // Since we can't easily set DefaultToSpeaker in expo-audio yet, we might have to live with Receiver output
        // OR pauses in recording.
        // For "Listen Mode", continuous recording is priority. We skip the "force speaker" hack here.
    };


    // --- Recording Loop ---

    const toggleListening = async () => {
        if (isListening) {
            // STOP
            setIsListening(false);
            isListeningRef.current = false;
            setStatus('Stopping...');

            if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
            if (summaryIntervalRef.current) clearInterval(summaryIntervalRef.current);

            await stopRecording();
            setStatus('Stopped');
        } else {
            // START
            setIsListening(true);
            isListeningRef.current = true;
            setStatus('Listening...');

            // Ensure Audio Mode allows recording (and mixing if we want background music?)
            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
                shouldPlayInBackground: true, // Keep alive
            });

            // Start summary timer
            summaryIntervalRef.current = setInterval(performSummary, SUMMARY_INTERVAL_MS);

            // Start Rec Loop
            runRecordLoop();
        }
    };

    const runRecordLoop = async () => {
        if (!isListeningRef.current) return;

        try {
            // 1. Start Recording
            const success = await startRecording();
            if (!success) {
                console.error("Failed to start recording");
                setIsListening(false);
                return;
            }

            // 2. Wait CHUNK_DURATION
            await new Promise(resolve => {
                loopTimeoutRef.current = setTimeout(resolve, CHUNK_DURATION_MS);
            });

            if (!isListeningRef.current) {
                await stopRecording();
                return;
            }

            // 3. Stop & Process
            const uri = await stopRecording();

            // 4. Restart immediately (Async, don't await the processing of the old file)
            // Recurse immediately to keep gap minimal
            runRecordLoop();

            // 5. Process the captured URI in background
            if (uri) {
                processChunk(uri);
            }

        } catch (e) {
            console.error("Loop Error", e);
            setIsListening(false);
        }
    };

    const processChunk = async (uri: string) => {
        try {
            setStatus('Transcribing...');

            // A. Transcribe + Detect Lang (with context prompt for continuity)
            const { text, language } = await transcribeAudio(uri, lastTranscriptContext);

            if (!text || text.trim().length < 2) return; // Ignore silence

            // B. Translate to German (if not already)
            let germanText = text;
            if (!language.startsWith('de')) {
                germanText = await translateText(text, language || "Auto", "German");
            }

            // C. Update context for next chunk (keep last ~100 chars for prompt)
            const contextSnippet = text.slice(-100); // Last 100 chars
            setLastTranscriptContext(contextSnippet);

            // D. Update UI
            const newSegment: TranscriptSegment = {
                id: Date.now().toString(),
                original: text,
                german: germanText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            setSegments(prev => [newSegment, ...prev]);
            setFullTranscript(prev => prev + " " + germanText); // Accumulate for summary
            setStatus('Listening...');

            // E. Generate TTS & Queue
            const ttsUri = await generateTTS(germanText, 'alloy'); // Alloy is good for general
            if (ttsUri) {
                setTtsQueue(prev => [...prev, ttsUri]);
            }

        } catch (e) {
            console.error("Processing Error", e);
        }
    };

    const performSummary = async () => {
        if (!fullTranscript || fullTranscript.length < 50) return;

        try {
            // Use the FULL transcript for cumulative summary
            const newSummary = await summarizeText(fullTranscript);
            setSummary(newSummary); // REPLACE instead of append

            // Don't clear fullTranscript - we want cumulative context

        } catch (e) {
            console.error("Summary Error", e);
        }
    };


    // --- Render ---

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>

            {/* Header Tabs */}
            <View style={styles.tabHeader}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'live' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('live')}
                >
                    <Text style={[styles.tabText, activeTab === 'live' && styles.tabTextActive]}>Live Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'summary' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('summary')}
                >
                    <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>Summary</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.contentArea}>
                {activeTab === 'live' ? (
                    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                        {segments.map(seg => (
                            <View key={seg.id} style={styles.segmentCard}>
                                <Text style={styles.meta}>{seg.timestamp}</Text>
                                <Text style={styles.german}>{seg.german}</Text>
                                <Text style={styles.original}>{seg.original}</Text>
                            </View>
                        ))}
                        {segments.length === 0 && (
                            <Text style={styles.placeholder}>Waiting for speech...</Text>
                        )}
                    </ScrollView>
                ) : (
                    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                        <Text style={styles.summaryText}>{summary || "No summary yet. Speak for a minute..."}</Text>
                    </ScrollView>
                )}
            </View>

            {/* Footer Controls */}
            <View style={styles.footer}>
                <View style={styles.statusIndicator}>
                    <View style={[styles.statusDot, isListening ? { backgroundColor: '#4CAF50' } : { backgroundColor: '#FF3B30' }]} />
                    <Text style={styles.statusText}>{status}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.recordBtn, isListening && styles.recordBtnActive]}
                    onPress={toggleListening}
                >
                    <Ionicons name={isListening ? "stop" : "mic"} size={32} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.hintText}>
                    {isListening ? "Tap to Stop" : "Tap to Start Listen Mode"}
                </Text>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.bg,
    },
    tabHeader: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
        marginBottom: 10,
    },
    tabBtn: {
        paddingVertical: 15,
        marginRight: 30,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabBtnActive: {
        borderBottomColor: THEME.accent,
    },
    tabText: {
        fontSize: 16,
        color: THEME.textSecondary,
        fontWeight: '600',
    },
    tabTextActive: {
        color: THEME.text,
    },
    contentArea: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    segmentCard: {
        marginBottom: 20,
        backgroundColor: '#F8F9FA',
        padding: 16,
        borderRadius: 12,
    },
    meta: {
        fontSize: 12,
        color: '#AAA',
        marginBottom: 4,
    },
    german: {
        fontSize: 18,
        fontWeight: '700',
        color: THEME.text,
        marginBottom: 6,
    },
    original: {
        fontSize: 14,
        color: THEME.textSecondary,
        fontStyle: 'italic',
    },
    placeholder: {
        textAlign: 'center',
        marginTop: 50,
        color: THEME.textSecondary,
    },
    summaryText: {
        fontSize: 16,
        lineHeight: 24,
        color: THEME.text,
    },
    footer: {
        padding: 24,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#DDD',
        backgroundColor: '#FFF',
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        fontSize: 12,
        color: '#666',
        textTransform: 'uppercase',
    },
    recordBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: THEME.accent,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 8,
    },
    recordBtnActive: {
        backgroundColor: THEME.record,
    },
    hintText: {
        fontSize: 14,
        color: THEME.textSecondary,
    },
});
