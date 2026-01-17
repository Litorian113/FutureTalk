import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { Alert } from 'react-native';

export const useRecorder = () => {
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

    const startRecording = async (): Promise<boolean> => {
        try {
            const perm = await requestRecordingPermissionsAsync();
            if (!perm.granted) {
                Alert.alert('Permission needed', 'Microphone access is required.');
                return false;
            }

            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
                shouldPlayInBackground: false,
                interruptionModeIOS: 'doNotMix',
                interruptionModeAndroid: 'doNotMix',
            } as any);

            if (recorder.isRecording) {
                await recorder.stop();
            }

            // Fix: Always prepare before recording again
            if (!recorder.isRecording) {
                try {
                    await recorder.prepareToRecordAsync();
                } catch (e) {
                    // Might already be prepared or throw if busy
                    console.log('Prepare warning:', e);
                }
            }

            recorder.record();
            return true;
        } catch (err) {
            console.error('Start rec error:', err);
            // Try to reset via stop if getting stuck
            try { await recorder.stop(); } catch { }
            return false;
        }
    };

    const stopRecording = async (): Promise<string | null> => {
        try {
            if (recorder.isRecording) {
                await recorder.stop();
            }
            return recorder.uri ?? null;
        } catch (err) {
            console.error('Stop rec error:', err);
            return null;
        }
    };

    return {
        isRecording: recorder.isRecording,
        startRecording,
        stopRecording
    };
};
