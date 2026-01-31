import { OPENAI_API_KEY } from '../constants';

// Configuration for the Realtime Session
const SESSION_CONFIG = {
    modalities: ['text', 'audio'], // We need text logic to trigger tools
    instructions: `You are a Translation Engine.
    INPUT: Any language (Chinese, German, etc.)
    OUTPUT: Call the tool 'print_translation' with the ENGLISH translation.
    
    You MUST call this tool for every single utterance.
    Do not chat. Do not speak. Just call the tool.`,
    voice: 'alloy',
    input_audio_transcription: {
        model: 'whisper-1',
    },
    tools: [
        {
            type: 'function',
            name: 'print_translation',
            description: 'Prints the English translation of the user speech.',
            parameters: {
                type: 'object',
                properties: {
                    english_text: {
                        type: 'string',
                        description: 'The translated text in English.'
                    }
                },
                required: ['english_text']
            }
        }
    ],
    tool_choice: 'required', // FORCE the tool call
    turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
    }
};

export class RealtimeWebRTCClient {
    private pc: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private audioElement: HTMLAudioElement | null = null;
    private localStream: MediaStream | null = null;

    private onMessage?: (event: any) => void;
    private onConnectionState?: (state: string) => void;

    constructor(
        onMessage?: (event: any) => void,
        onConnectionState?: (state: string) => void
    ) {
        this.onMessage = onMessage;
        this.onConnectionState = onConnectionState;
    }

    async connect() {
        if (!OPENAI_API_KEY) throw new Error("No API Key found");

        this.updateState('getting_token');

        try {
            // 1. Get Ephemeral Token
            // Warning: In production, fetch this from your backend to hide the main API Key!
            const tokenResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-4o-realtime-preview-2024-10-01",
                    ...SESSION_CONFIG
                }),
            });

            if (!tokenResponse.ok) {
                const err = await tokenResponse.text();
                throw new Error(`Failed to get session: ${err}`);
            }

            const data = await tokenResponse.json();
            const ephemeralKey = data.client_secret.value;

            this.updateState('connecting_webrtc');

            // 2. Initialize WebRTC
            this.pc = new RTCPeerConnection();

            // Set up Audio Output
            this.audioElement = document.createElement("audio");
            this.audioElement.autoplay = true;
            document.body.appendChild(this.audioElement); // Fix: Append to DOM for reliable playback

            this.pc.ontrack = (e) => {
                if (this.audioElement) {
                    this.audioElement.srcObject = e.streams[0];
                    this.audioElement.play().catch(e => console.error("Audio Play Error:", e));
                }
            };

            // Set up Data Channel for Events
            this.dataChannel = this.pc.createDataChannel("oai-events");

            this.dataChannel.onopen = () => {
                // Reinforce instructions immediately
                this.sendEvent('session.update', {
                    session: {
                        instructions: SESSION_CONFIG.instructions,
                        voice: 'alloy', // or onyx, shimmer
                    }
                });
            };

            this.dataChannel.onmessage = (e) => {
                try {
                    const event = JSON.parse(e.data);
                    if (this.onMessage) this.onMessage(event);
                } catch (err) {
                    console.error("Error parsing event:", err);
                }
            };

            // 3. Add Microphone Audio
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.pc.addTrack(this.localStream.getTracks()[0]);

            // 4. Create Offer & SDP Exchange
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);

            const baseUrl = "https://api.openai.com/v1/realtime";
            const model = "gpt-4o-realtime-preview-2024-10-01";

            const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
                method: "POST",
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${ephemeralKey}`,
                    "Content-Type": "application/sdp",
                },
            });

            if (!sdpResponse.ok) {
                throw new Error("SDP Exchange failed");
            }

            const answerSdp = await sdpResponse.text();

            const answer: RTCSessionDescriptionInit = {
                type: "answer",
                sdp: answerSdp,
            };

            await this.pc.setRemoteDescription(answer);

            this.updateState('connected');

        } catch (error) {
            console.error("Realtime Connection Error:", error);
            this.updateState('error');
            throw error;
        }
    }

    sendEvent(type: string, data: any = {}) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            const event = { type, ...data };
            this.dataChannel.send(JSON.stringify(event));
        }
    }

    // Force AI to generate a response (e.g. if VAD is too slow)
    createResponse() {
        this.sendEvent('response.create');
    }

    // Send a text message to test logic (ignoring audio)
    sendTextMessage(text: string) {
        // 1. Add User Message
        this.sendEvent('conversation.item.create', {
            item: {
                type: 'message',
                role: 'user',
                content: [
                    {
                        type: 'input_text',
                        text: text
                    }
                ]
            }
        });

        // 2. Force Response
        this.sendEvent('response.create');
    }

    disconnect() {
        this.updateState('disconnected');

        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        if (this.audioElement) {
            this.audioElement.srcObject = null;
            this.audioElement = null;
        }
    }

    private updateState(state: string) {
        if (this.onConnectionState) this.onConnectionState(state);
    }
}
