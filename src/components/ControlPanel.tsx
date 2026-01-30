import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Language } from '../types';
import { THEME, LANGUAGES } from '../constants';

interface Props {
    userLang: Language;
    partnerLang: Language;
    onUserLangChange: (l: Language) => void;
    onPartnerLangChange: (l: Language) => void;
    onToggleRecord: (side: 'user' | 'partner') => void; // Changed from start/stop
    activeSide: 'user' | 'partner' | null;
    isRecording: boolean;
    className?: object;
}


const LangPicker = ({ current, onChange }: { current: Language, onChange: (l: Language) => void }) => (
    <TouchableOpacity
        style={styles.langButton}
        onPress={() => {
            const idx = LANGUAGES.findIndex(l => l.code === current.code);
            const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
            onChange(next);
        }}
    >
        <Text style={styles.langFlag}>{current.flag}</Text>
        <Text style={styles.langCode}>{current.code.toUpperCase()}</Text>
        <Ionicons name="chevron-down" size={12} color={THEME.textSecondary} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
);

export const ControlPanel = ({
    userLang, partnerLang,
    onUserLangChange, onPartnerLangChange,
    onToggleRecord,
    activeSide
}: Props) => {
    return (
        <View style={styles.controls}>
            {/* Language Row */}
            <View style={styles.langRow}>
                <LangPicker current={userLang} onChange={onUserLangChange} />
                <Ionicons name="swap-horizontal" size={16} color={THEME.textSecondary} />
                <LangPicker current={partnerLang} onChange={onPartnerLangChange} />
            </View>

            {/* Mic Row */}
            <View style={styles.micRow}>
                {/* User Button */}
                <TouchableOpacity
                    style={[styles.micBtn, activeSide === 'partner' && { opacity: 0.3 }]}
                    disabled={activeSide === 'partner'}
                    onPress={() => onToggleRecord('user')} // Tap to toggle
                >
                    <View style={[
                        styles.micCircle,
                        activeSide === 'user' ? { backgroundColor: THEME.record, transform: [{ scale: 1.1 }] } : { backgroundColor: THEME.accentSecondary }
                    ]}>
                        <Ionicons
                            name={activeSide === 'user' ? "stop" : "mic"} // Show stop icon when recording
                            size={28}
                            color={activeSide === 'user' ? '#FFF' : THEME.text}
                        />
                    </View>
                    <Text style={styles.micLabel}>
                        {activeSide === 'user' ? 'Stop' : userLang.name}
                    </Text>
                </TouchableOpacity>

                {/* Partner Button */}
                <TouchableOpacity
                    style={[styles.micBtn, activeSide === 'user' && { opacity: 0.3 }]}
                    disabled={activeSide === 'user'}
                    onPress={() => onToggleRecord('partner')} // Tap to toggle
                >
                    <View style={[
                        styles.micCircle,
                        activeSide === 'partner' ? { backgroundColor: THEME.record, transform: [{ scale: 1.1 }] } : { backgroundColor: THEME.accentSecondary }
                    ]}>
                        <Ionicons
                            name={activeSide === 'partner' ? "stop" : "mic"}
                            size={28}
                            color={activeSide === 'partner' ? '#FFF' : THEME.text}
                        />
                    </View>
                    <Text style={styles.micLabel}>
                        {activeSide === 'partner' ? 'Stop' : partnerLang.name}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    controls: {
        padding: 20,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
    },
    langRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    langButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 100,
    },
    langFlag: {
        fontSize: 16,
        marginRight: 6,
    },
    langCode: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME.text,
    },
    micRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    micBtn: {
        alignItems: 'center',
        width: 100,
    },
    micCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    micLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: THEME.textSecondary,
    },
});
