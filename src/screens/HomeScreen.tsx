import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.content}>
                <Text style={styles.title}>FutureTalk</Text>
                <Text style={styles.subtitle}>Break language barriers.</Text>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>How to use</Text>
                    <Text style={styles.cardText}>1. Go to Translate tab</Text>
                    <Text style={styles.cardText}>2. Select languages</Text>
                    <Text style={styles.cardText}>3. Tap to speak</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.bg,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    title: {
        fontSize: 40,
        fontWeight: '800',
        color: THEME.accent,
        marginBottom: 10,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 24,
        color: THEME.textSecondary,
        marginBottom: 40,
        fontWeight: '300',
    },
    card: {
        padding: 24,
        backgroundColor: '#F2F2F7',
        borderRadius: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: THEME.text,
    },
    cardText: {
        fontSize: 16,
        color: THEME.textSecondary,
        marginBottom: 8,
        lineHeight: 24,
    },
});
