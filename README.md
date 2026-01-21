# FutureTalk 🎙️✨

**FutureTalk** is a state-of-the-art AI-powered translation app designed to break language barriers effortlessly. Built with **React Native (Expo SDK 54)** and optimized for speed and context, it leverages **OpenAI's latest models** for real-time transcription, translation, and summarization.

---

## 🌟 Key Experience Modes

### 🏠 Home Screen
A modern, premium landing page that guides you through the app's capabilities. Features a sleek design with card-based navigation and a "Coming Soon" section for future-ready features like Offline mode.

### 🗣️ Translate Mode
Classic two-way voice translation. 
- **Voice-to-Voice**: Select your target language and speak. The app transcribes your voice (Whisper) and translates it (GPT-4o-mini).
- **Instant Playback**: Automatically reads the translation back using high-quality OpenAI TTS voices.
- **Bi-directional**: Switch between languages in a tap for fluid conversations.

### 🎧 Listen Mode (The Power Feature)
Need to follow a long lecture or an English video? Listen Mode is built for continuous, background-ready understanding.
- **Continuous 15s Recording**: Never miss a word. The app captures 15-second audio chunks in a seamless loop.
- **Background Processing Agent**: A dedicated agent handles transcription and translation while you keep recording the next segment.
- **Live German Transcript**: Displays the conversation in real-time, translated into German.
- **Context Awareness**: Each chunk uses the context from the previous sentence for superior sentence flow.
- **AI-Powered Summaries**: Automatically generates a beautifully formatted, bulleted summary of everything said—updated every 45 seconds or when you stop recording.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: [Expo SDK 54](https://expo.dev/) (React Native)
- **Audio Core**: `expo-audio` (Modern playback & recording)
- **AI Engine**: 
  - **Transcription**: OpenAI Whisper-1
  - **Intelligence**: GPT-4o-mini
  - **Voice**: OpenAI TTS (Model: `tts-1`, Voice: `alloy`)
- **UI & Icons**: Custom SVG Icon Components (Lucide-inspired) and Vanilla CSS-driven styling for a premium Swiss-style layout.
- **Multi-Agent Processing**: Custom `ListenModeProcessor` for parallelizing audio recording and AI analysis.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (Latest stable)
- Expo Go app on your mobile device
- An OpenAI API Key with access to Whisper and GPT-4o-mini

### Installation

1. **Clone & Enter**
   ```bash
   git clone https://github.com/Litorian113/FutureTalk.git
   cd FutureTalk
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_OPENAI_API_KEY=sk-your-api-key-here
   ```

4. **Run the App**
   ```bash
   npx expo start --clear
   ```
   Scan the QR code with **Expo Go** (Android) or the **Camera** app (iOS).

---

## 🛣️ Roadmap
- [x] Basic Voice Translation
- [x] Two-Way Conversation Support
- [x] Continuous Listen Mode
- [x] AI Cumulative Summaries
- [ ] Language Selection (Global support)
- [ ] Offline Translation support
- [ ] History & Conversation Export

---

By Franz Anhäupl

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to help us make communication universal.

## 🛡️ License
Licensed under the MIT License. Built with ❤️ for universal communication.
