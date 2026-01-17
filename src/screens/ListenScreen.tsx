import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants';

export default function ListenScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.icon}>🎧</Text>
            <Text style={styles.text}>Listen Mode</Text>
            <Text style={styles.sub}>Coming soon...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.bg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: 64,
        marginBottom: 20,
    },
    text: {
        fontSize: 24,
        fontWeight: '600',
        color: THEME.text,
    },
    sub: {
        fontSize: 16,
        color: THEME.textSecondary,
        marginTop: 10,
    },
});
