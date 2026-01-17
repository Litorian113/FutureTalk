import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Animated, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

const { width, height } = Dimensions.get('window');

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

interface TranslationResult {
  original: string;
  translated: string;
  sourceLanguage: string;
}

export default function App() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingPulse = useRef(new Animated.Value(1)).current;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Bereit');

  useEffect(() => {
    // Fade and slide animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for the connection indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Recording pulse animation
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingPulse, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(recordingPulse, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      recordingPulse.setValue(1);
    }
  }, [isRecording]);

  const requestPermissions = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      setError('Mikrofon-Berechtigung wurde nicht erteilt');
      return false;
    }
    return true;
  };

  const startRecording = async () => {
    try {
      setError(null);
      setTranslationResult(null);

      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      setStatus('Bereite Aufnahme vor...');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setStatus('🎤 Aufnahme läuft...');
    } catch (err) {
      console.error('Failed to start recording', err);
      setError('Aufnahme konnte nicht gestartet werden');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      setIsProcessing(true);
      setStatus('Verarbeite Audio...');

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        await processAudio(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      setError('Aufnahme konnte nicht gestoppt werden');
      setIsProcessing(false);
    }
  };

  const processAudio = async (audioUri: string) => {
    try {
      setStatus('Transkribiere Sprache...');

      // Step 1: Transcribe audio using Whisper
      const transcription = await transcribeAudio(audioUri);

      if (!transcription) {
        setError('Keine Sprache erkannt');
        setIsProcessing(false);
        setStatus('Bereit');
        return;
      }

      setStatus('Übersetze ins Deutsche...');

      // Step 2: Translate to German using GPT
      const translation = await translateText(transcription);

      setTranslationResult({
        original: transcription,
        translated: translation.translatedText,
        sourceLanguage: translation.detectedLanguage,
      });

      setStatus('Spiele Übersetzung ab...');

      // Step 3: Speak the translation in German
      await speakText(translation.translatedText);

      setStatus('Fertig ✓');

    } catch (err) {
      console.error('Processing failed', err);
      setError('Verarbeitung fehlgeschlagen: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const transcribeAudio = async (audioUri: string): Promise<string> => {
    const formData = new FormData();

    // Get the audio file
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Transcription failed');
    }

    const data = await response.json();
    return data.text;
  };

  const translateText = async (text: string): Promise<{ translatedText: string; detectedLanguage: string }> => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Du bist ein professioneller Übersetzer. Übersetze den folgenden Text ins Deutsche. 
                      Wenn der Text bereits auf Deutsch ist, verbessere ihn grammatikalisch falls nötig.
                      Antworte NUR mit einem JSON-Objekt im Format: 
                      {"translatedText": "die deutsche Übersetzung", "detectedLanguage": "erkannte Sprache"}`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Translation failed');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    try {
      return JSON.parse(content);
    } catch {
      // If JSON parsing fails, return the content as is
      return { translatedText: content, detectedLanguage: 'Unbekannt' };
    }
  };

  const speakText = async (text: string) => {
    return new Promise<void>((resolve) => {
      Speech.speak(text, {
        language: 'de-DE',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => resolve(),
        onError: () => resolve(),
      });
    });
  };

  const handleRecordButtonPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar style="light" />

      {/* Decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <View style={styles.decorCircle3} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Logo/Icon Area */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#e94560', '#ff6b6b']}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoText}>FT</Text>
            </LinearGradient>
          </View>

          {/* App Title */}
          <Text style={styles.title}>FutureTalk</Text>
          <Text style={styles.subtitle}>Echtzeit-Sprachübersetzer</Text>

          {/* Status Indicator */}
          <View style={[
            styles.statusContainer,
            isRecording && styles.statusRecording,
            isProcessing && styles.statusProcessing,
          ]}>
            <Animated.View
              style={[
                styles.statusDot,
                isRecording && styles.statusDotRecording,
                isProcessing && styles.statusDotProcessing,
                { transform: [{ scale: isRecording ? recordingPulse : pulseAnim }] },
              ]}
            />
            <Text style={[
              styles.statusText,
              isRecording && styles.statusTextRecording,
              isProcessing && styles.statusTextProcessing,
            ]}>
              {status}
            </Text>
          </View>

          {/* Record Button */}
          <TouchableOpacity
            onPress={handleRecordButtonPress}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <Animated.View style={[
              isRecording && { transform: [{ scale: recordingPulse }] }
            ]}>
              <LinearGradient
                colors={isRecording ? ['#ff4757', '#ff6b81'] : ['#e94560', '#ff6b6b']}
                style={[
                  styles.recordButton,
                  isProcessing && styles.recordButtonDisabled,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.recordButtonIcon}>
                  {isProcessing ? '⏳' : isRecording ? '⏹️' : '🎤'}
                </Text>
                <Text style={styles.recordButtonText}>
                  {isProcessing ? 'Verarbeite...' : isRecording ? 'Stoppen' : 'Aufnehmen'}
                </Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>

          {/* Instructions */}
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>📋 Anleitung</Text>
            <Text style={styles.instructionText}>
              1. Tippe auf "Aufnehmen" und sprich{'\n'}
              2. Die Sprache wird automatisch erkannt{'\n'}
              3. Übersetzung wird auf Deutsch abgespielt
            </Text>
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>❌ {error}</Text>
            </View>
          )}

          {/* Translation Result */}
          {translationResult && (
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>
                🗣️ Original ({translationResult.sourceLanguage}):
              </Text>
              <Text style={styles.resultOriginal}>{translationResult.original}</Text>

              <View style={styles.resultDivider} />

              <Text style={styles.resultLabel}>🇩🇪 Deutsche Übersetzung:</Text>
              <Text style={styles.resultTranslated}>{translationResult.translated}</Text>

              {/* Replay Button */}
              <TouchableOpacity
                onPress={() => speakText(translationResult.translated)}
                style={styles.replayButton}
              >
                <Text style={styles.replayButtonText}>🔊 Nochmal abspielen</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Version Info */}
          <Text style={styles.version}>Version 1.0.0 • Powered by OpenAI</Text>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 40,
  },
  decorCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
    top: -100,
    right: -100,
  },
  decorCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(233, 69, 96, 0.08)',
    bottom: 100,
    left: -80,
  },
  decorCircle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    top: height * 0.4,
    right: -50,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 25,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 30,
  },
  statusRecording: {
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
  },
  statusProcessing: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00ff88',
    marginRight: 10,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  statusDotRecording: {
    backgroundColor: '#ff4757',
    shadowColor: '#ff4757',
  },
  statusDotProcessing: {
    backgroundColor: '#ffc107',
    shadowColor: '#ffc107',
  },
  statusText: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statusTextRecording: {
    color: '#ff4757',
  },
  statusTextProcessing: {
    color: '#ffc107',
  },
  recordButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
    marginBottom: 30,
  },
  recordButtonDisabled: {
    opacity: 0.6,
  },
  recordButtonIcon: {
    fontSize: 50,
    marginBottom: 8,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  instructionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
  },
  errorCard: {
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
    borderRadius: 12,
    padding: 15,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.3)',
  },
  errorText: {
    color: '#ff6b81',
    fontSize: 14,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  resultOriginal: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  resultDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 15,
  },
  resultTranslated: {
    fontSize: 18,
    color: '#00ff88',
    fontWeight: '600',
    lineHeight: 26,
  },
  replayButton: {
    marginTop: 15,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
  },
  replayButtonText: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: '600',
  },
  version: {
    marginTop: 20,
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
