import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { THEME } from '../constants';
import { RealtimeWebRTCClient } from '../services/RealtimeWebRTC';
import { RealtimeIcon } from '../components/icons/RealtimeIcon';
import { translateText } from '../services/openai';

export default function RealtimeWebScreen() {
    const [status, setStatus] = useState<string>('disconnected');
    const [events, setEvents] = useState<any[]>([]);
    const [isTalking, setIsTalking] = useState(false);
    const clientRef = useRef<RealtimeWebRTCClient | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    // Initial Check
    if (Platform.OS !== 'web') {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>
                    Realtime Mode is currently only available on Web (Beta).
                    Please run `npm run web`.
                </Text>
            </View>
        );
    }

    const startSession = async () => {
        if (clientRef.current) return;

        const client = new RealtimeWebRTCClient(
            (event) => {
                // Log all events for debug
                // Filter some spammy ones
                if (event.type === 'response.audio_transcript.delta') {
                    // We could build a live transcript here
                    return;
                }

                // Handle Transcript Final (Audio)
                if (event.type === 'response.audio_transcript.done') {
                    addLog('Agent (Audio): ' + event.transcript, 'ai');
                }

                // Handle Text Response (Text Modality)
                if (event.type === 'response.text.done') {
                    addLog('Agent (Text): ' + event.text, 'ai');
                }

                // Handle Tool Output (The new reliable way)
                if (event.type === 'response.function_call_arguments.done') {
                    try {
                        const args = JSON.parse(event.arguments);
                        if (args.english_text) {
                            addLog('TRANSLATION: ' + args.english_text, 'ai');
                        }
                    } catch (e) {
                        console.warn('Failed to parse tool args', event.arguments);
                    }
                }

                if (event.type === 'conversation.item.input_audio_transcription.completed') {
                    const text = event.transcript;
                    addLog('Source: ' + text, 'user');

                    // HYBRID MODE: Trigger manual translation
                    // This is fail-safe if the Realtime Audio/Text output fails
                    translateText(text, "Auto", "English")
                        .then(translation => {
                            addLog('TRANSLATION: ' + translation, 'ai');
                        })
                        .catch(err => {
                            console.error("Translation fail:", err);
                            addLog('Error translating: ' + String(err), 'system');
                        });
                }

                // Handle Function calling or other events...
            },
            (connectionState) => {
                setStatus(connectionState);
            }
        );

        clientRef.current = client;

        try {
            await client.connect();
            addLog('System: Session Started', 'system');
        } catch (e) {
            setStatus('error');
            addLog('Error: ' + String(e), 'system');
            clientRef.current = null;
        }
    };

    const stopSession = () => {
        if (clientRef.current) {
            clientRef.current.disconnect();
            clientRef.current = null;
            addLog('System: Session Ended', 'system');
        }
    };

    const addLog = (text: string, type: 'user' | 'ai' | 'system') => {
        setEvents(prev => [...prev, { id: Date.now(), text, type }]);
        // Scroll to bottom
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Realtime ⚡</Text>
                <View style={[styles.badge, { backgroundColor: getStatusColor(status) }]}>
                    <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
                </View>
            </View>

            <ScrollView
                style={styles.logContainer}
                ref={scrollViewRef}
                contentContainerStyle={styles.logContent}
            >
                {events.length === 0 && (
                    <Text style={styles.placeholder}>
                        Click "Connect" and start talking. {"\n"}
                        Latency &lt; 500ms.
                    </Text>
                )}
                {events.map((e, i) => (
                    <View key={i} style={[
                        styles.msgRow,
                        e.type === 'user' ? styles.msgRowUser :
                            e.type === 'ai' ? styles.msgRowAi : styles.msgRowSystem
                    ]}>
                        <Text style={[
                            styles.msgText,
                            e.type === 'system' && styles.systemText
                        ]}>
                            {e.type === 'user' && '👤 '}
                            {e.type === 'ai' && '🤖 '}
                            {e.text}
                        </Text>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.controls}>
                {status === 'disconnected' || status === 'error' || status === 'disconnected' ? (
                    <TouchableOpacity style={styles.btnConnect} onPress={startSession}>
                        <RealtimeIcon color="#FFF" />
                        <Text style={styles.btnText}>Connect Realtime</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        <TouchableOpacity style={styles.btnDisconnect} onPress={stopSession}>
                            <Text style={styles.btnText}>Disconnect</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btnConnect, { marginTop: 10, backgroundColor: '#5856D6' }]}
                            onPress={() => clientRef.current?.sendTextMessage("Hello translate me")}
                        >
                            <Text style={styles.btnText}>Test: Send "Hello"</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'connected': return '#34C759'; // Green
        case 'connecting_webrtc': return '#FF9500'; // Orange
        case 'getting_token': return '#5856D6'; // Purple
        case 'error': return '#FF3B30'; // Red
        default: return '#8E8E93'; // Grey
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.bg,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    errorText: {
        fontSize: 16,
        color: '#FF3B30',
        textAlign: 'center'
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    logContainer: {
        flex: 1,
    },
    logContent: {
        padding: 20,
        gap: 12,
    },
    placeholder: {
        textAlign: 'center',
        color: '#8E8E93',
        marginTop: 50,
        fontSize: 16,
    },
    msgRow: {
        padding: 12,
        borderRadius: 16,
        maxWidth: '85%',
    },
    msgRowUser: {
        alignSelf: 'flex-end',
        backgroundColor: THEME.bubbleUser,
    },
    msgRowAi: {
        alignSelf: 'flex-start',
        backgroundColor: THEME.bubbleAI,
    },
    msgRowSystem: {
        alignSelf: 'center',
        backgroundColor: 'transparent',
    },
    msgText: {
        fontSize: 16,
        color: '#000',
    },
    systemText: {
        color: '#8E8E93',
        fontSize: 12,
        fontStyle: 'italic',
    },
    controls: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
        alignItems: 'center',
    },
    btnConnect: {
        backgroundColor: THEME.accent,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 30,
        paddingVertical: 16,
        borderRadius: 30,
        shadowColor: THEME.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    btnDisconnect: {
        backgroundColor: THEME.record,
        paddingHorizontal: 30,
        paddingVertical: 16,
        borderRadius: 30,
    },
    btnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
});
