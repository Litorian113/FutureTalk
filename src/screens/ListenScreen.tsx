import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { THEME } from '../constants';
import { useRecorder } from '../hooks/useAudio';
import { summarizeText } from '../services/openai';
import ListenModeProcessor from '../services/ListenModeProcessor';

// Config
const CHUNK_DURATION_MS = 15000; // 15 seconds (longer chunks = less interruptions, better context)
const SUMMARY_INTERVAL_MS = 45000; // 45 seconds

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

    // Processor (No TTS in Listen Mode - just text!)
    const processorRef = useRef<ListenModeProcessor | null>(null);

    // Initialize Processor
    useEffect(() => {
        processorRef.current = new ListenModeProcessor(
            // onResult callback
            (result) => {
                console.log(`[ListenMode] Received result ${result.id}`);

                // Add to UI
                const newSegment: TranscriptSegment = {
                    id: result.id.toString(),
                    original: result.original,
                    german: result.german,
                    timestamp: result.timestamp,
                };

                setSegments(prev => [newSegment, ...prev]);
                setFullTranscript(prev => {
                    const updated = prev + " " + result.german;
                    console.log(`[ListenMode] fullTranscript updated. Length: ${updated.length}`);
                    return updated;
                });
                setStatus('Listening...');
            },
            // onContextUpdate callback
            (newContext) => {
                setLastTranscriptContext(newContext);
            }
        );

        return () => {
            processorRef.current?.clear();
        };
    }, []);


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

            // Generate final summary when stopping
            console.log('[ListenMode] Stopped. Generating final summary...');
            performSummary();

            setStatus('Stopped');
        } else {
            // START
            setIsListening(true);
            isListeningRef.current = true;
            setStatus('Listening...');

            // Start summary timer
            console.log('[ListenMode] Starting summary interval (every 30s)');
            summaryIntervalRef.current = setInterval(() => {
                console.log('[ListenMode] Summary interval fired!');
                performSummary();
            }, SUMMARY_INTERVAL_MS);

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

            // 5. Process the captured URI in background (via processor)
            if (uri) {
                console.log('[ListenMode] Adding chunk to processor');
                processorRef.current?.addChunk(uri, lastTranscriptContext);
                setStatus('Processing...');
            }

        } catch (e) {
            console.error("Loop Error", e);
            setIsListening(false);
        }
    };

    const performSummary = async () => {
        console.log('[ListenMode] performSummary called. Transcript length:', fullTranscript.length);
        console.log('[ListenMode] Transcript preview:', fullTranscript.substring(0, 100));

        if (!fullTranscript || fullTranscript.trim().length < 20) {
            console.log('[ListenMode] Not enough content for summary yet (need at least 20 chars)');
            return;
        }

        try {
            setStatus('Summarizing...');
            console.log('[ListenMode] Generating summary from', fullTranscript.length, 'characters...');

            // Use the FULL transcript for cumulative summary
            const newSummary = await summarizeText(fullTranscript);

            if (!newSummary || newSummary.trim().length === 0) {
                console.warn('[ListenMode] Summary returned empty!');
                setStatus('Listening...');
                return;
            }

            setSummary(newSummary); // REPLACE instead of append

            console.log('[ListenMode] Summary updated successfully:', newSummary.substring(0, 100) + '...');
            setStatus('Listening...');

            // Don't clear fullTranscript - we want cumulative context

        } catch (e) {
            console.error("[ListenMode] Summary Error:", e);
            setStatus('Listening...');
        }
    };


    // --- Render ---

    const handleClear = () => {
        if (activeTab === 'live') {
            setSegments([]);
            setFullTranscript('');
            setLastTranscriptContext('');
            console.log('[ListenMode] Live chat cleared');
        } else {
            setSummary('');
            console.log('[ListenMode] Summary cleared');
            // Test: Set a dummy summary to verify state works
            setTimeout(() => {
                setSummary('TEST: If you see this, the summary state is working! 🎉');
                console.log('[ListenMode] Test summary set');
            }, 1000);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>

            {/* Header Tabs */}
            <View style={styles.tabHeader}>
                <View style={styles.tabRow}>
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

                {/* Clear Button */}
                <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                    <Ionicons name="trash-outline" size={20} color={THEME.textSecondary} />
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
        marginBottom: 10,
    },
    tabRow: {
        flexDirection: 'row',
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
    clearBtn: {
        padding: 8,
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
