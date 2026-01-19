import { View, Text, StyleSheet, ImageBackground, ScrollView } from 'react-native';
import { THEME } from '../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
    const insets = useSafeAreaInsets();

    return (
        <ImageBackground
            source={require('../../assets/background-images/background-home.png')}
            style={styles.container}
            resizeMode="cover"
        >
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40, paddingBottom: 100 }]}
            >
                {/* Hero Section */}
                <View style={styles.hero}>
                    <Text style={styles.title}>FutureTalk</Text>
                    <Text style={styles.subtitle}>Break barriers.</Text>
                </View>

                {/* Features Grid */}
                <View style={styles.featuresSection}>
                    <FeatureCard
                        icon="language"
                        title="Real-time Translation"
                        description="Speak naturally, get instant translations"
                    />
                    <FeatureCard
                        icon="mic"
                        title="Listen Mode"
                        description="Continuous transcription & summaries"
                    />
                    <FeatureCard
                        icon="volume-high"
                        title="Voice Playback"
                        description="Hear translations in natural voices"
                    />
                </View>

                {/* Coming Soon Section */}
                <View style={styles.comingSoonSection}>
                    <Text style={styles.sectionTitle}>Coming Soon</Text>
                    <View style={styles.updateCard}>
                        <View style={styles.updateIcon}>
                            <Ionicons name="sparkles" size={20} color={THEME.accent} />
                        </View>
                        <View style={styles.updateText}>
                            <Text style={styles.updateTitle}>Offline Mode</Text>
                            <Text style={styles.updateDesc}>Translate without internet</Text>
                        </View>
                    </View>
                    <View style={styles.updateCard}>
                        <View style={styles.updateIcon}>
                            <Ionicons name="share-social" size={20} color={THEME.accent} />
                        </View>
                        <View style={styles.updateText}>
                            <Text style={styles.updateTitle}>Export Conversations</Text>
                            <Text style={styles.updateDesc}>Save & share your chats</Text>
                        </View>
                    </View>
                </View>

                {/* Footer Note */}
                <Text style={styles.footerNote}>
                    Powered by OpenAI • Made with ❤️
                </Text>
            </ScrollView>
        </ImageBackground>
    );
}

// Feature Card Component
const FeatureCard = ({ icon, title, description }: { icon: any, title: string, description: string }) => (
    <View style={styles.featureCard}>
        <View style={styles.featureIconContainer}>
            <Ionicons name={icon} size={24} color={THEME.accent} />
        </View>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{description}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.bg,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    hero: {
        marginBottom: 48,
    },
    title: {
        fontSize: 48,
        fontWeight: '900',
        color: '#000', // Black as requested
        marginBottom: 8,
        letterSpacing: -1.5,
    },
    subtitle: {
        fontSize: 28,
        color: '#000', // Black as requested
        fontWeight: '600',
        letterSpacing: -0.5,
    },
    featuresSection: {
        marginBottom: 48,
    },
    featureCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 20,
        borderRadius: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    featureIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: `${THEME.accent}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        marginBottom: 6,
    },
    featureDesc: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    comingSoonSection: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#000',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    updateCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    updateIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: `${THEME.accent}10`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    updateText: {
        flex: 1,
    },
    updateTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    updateDesc: {
        fontSize: 13,
        color: '#888',
    },
    footerNote: {
        textAlign: 'center',
        fontSize: 12,
        color: 'rgba(0,0,0,0.4)',
        marginTop: 16,
    },
});
