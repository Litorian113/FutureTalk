import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { ChatMessage, Language } from '../types';
import { THEME } from '../constants';
import { generateTTS } from '../services/openai';

interface Props {
    message: ChatMessage;
    language: Language;
    autoPlay?: boolean;
}

export const ChatMessageBubble = ({ message, language, autoPlay = false }: Props) => {
    const isUser = message.side === 'user';
    const [replacing, setReplacing] = useState(false);
    const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

    // Initialize player
    const player = useAudioPlayer(null);

    // Auto-Play Effect
    useEffect(() => {
        if (autoPlay && !hasAutoPlayed && message.translation) {
            setHasAutoPlayed(true);
            handlePlay();
        }
    }, [autoPlay, hasAutoPlayed, message.translation]);

    const handlePlay = async () => {
        try {
            if (player.playing) {
                player.pause();
                return;
            }

            setReplacing(true);

            // Force Speaker Output: Disable recording mode temporarily
            // This switches AVAudioSession category to Playback, which uses the main speaker
            // instead of the receiver (earpiece).
            await setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
            });

            // Generate audio URL
            const uri = await generateTTS(message.translation, language.voice);

            if (uri) {
                player.replace({ uri });
                player.play();
            }
        } catch (e) {
            console.error('Play error', e);
        } finally {
            setReplacing(false);
        }
    };

    return (
        <View style={[
            styles.bubbleRow,
            isUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
        ]}>
            <View style={[
                styles.bubble,
                isUser ? styles.bubbleUser : styles.bubblePartner
            ]}>
                {/* Original Text */}
                <Text style={[
                    styles.msgOriginal,
                    isUser ? { color: THEME.textSecondary } : { color: 'rgba(255,255,255,0.7)' }
                ]}>
                    {message.text}
                </Text>

                {/* Translated Text */}
                <Text style={[
                    styles.msgTranslated,
                    isUser ? { color: THEME.text } : { color: '#FFF' }
                ]}>
                    {message.translation}
                </Text>

                {/* Replay Button */}
                <TouchableOpacity
                    onPress={handlePlay}
                    style={styles.replayBtn}
                    disabled={replacing}
                >
                    {replacing ? (
                        <ActivityIndicator size="small" color={isUser ? THEME.accent : '#FFF'} />
                    ) : (
                        <Ionicons
                            name={player.playing ? "pause" : "volume-high"}
                            size={16}
                            color={isUser ? THEME.accent : '#FFF'}
                        />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    bubbleRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    bubble: {
        maxWidth: '85%',
        padding: 16,
        borderRadius: 20,
    },
    bubbleUser: {
        backgroundColor: THEME.bubbleUser,
        borderBottomRightRadius: 4,
    },
    bubblePartner: {
        backgroundColor: THEME.bubbleAI,
        borderBottomLeftRadius: 4,
    },
    msgOriginal: {
        fontSize: 13,
        marginBottom: 4,
    },
    msgTranslated: {
        fontSize: 17,
        fontWeight: '600',
        lineHeight: 22,
    },
    replayBtn: {
        marginTop: 8,
        alignSelf: 'flex-start',
        width: 30,
    },
});
