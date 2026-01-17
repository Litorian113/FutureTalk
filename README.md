# FutureTalk 🎙️

**FutureTalk** is a real-time voice translation app designed to break down language barriers. Built with **React Native (Expo)** and powered by **OpenAI**, it listens to your speech, transcribes it, and translates it instantly—playing the result back through your headphones.

> **Current Status**: Transforms spoken input into German in real-time. (Multi-language support coming soon!)

## ✨ Features

- **Real-Time Voice Capture**: Seamlessly records audio using your device's microphone or connected AirPods.
- **Smart Transcription**: Utilizes **OpenAI Whisper** for high-accuracy speech-to-text.
- **AI Translation**: Powered by **GPT-4o-mini** to provide context-aware translations.
- **Text-to-Speech**: Automatically reads out the translated text for a fluid conversation experience.
- **Modern UI**: A beautiful, dark-themed interface with smooth animations and visual feedback.

## 🛠️ Tech Stack

- **Framework**: [Expo](https://expo.dev/) (React Native)
- **Audio Recording**: `expo-av`
- **Speech Synthesis**: `expo-speech`
- **AI Engine**: OpenAI API (Whisper & GPT-4o-mini)
- **Styling**: StyleSheet & Linear Gradient

## 🚀 Getting Started

### Prerequisites

- Node.js installed
- Expo Go app on your phone (iOS/Android)
- An OpenAI API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Litorian113/FutureTalk.git
   cd FutureTalk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory and add your OpenAI Key:
   ```env
   EXPO_PUBLIC_OPENAI_API_KEY=sk-your-api-key-here
   ```

4. **Start the App**
   ```bash
   npx expo start
   ```
   Scan the QR code with your phone to start translating!

## 🛣️ Roadmap

- [x] Basic Voice-to-Voice Translation (to German)
- [ ] Language Selector (Support for any language)
- [ ] Conversation Mode (Two-way translation)
- [ ] History & Favorites
- [ ] Offline Mode support

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to help us make communication universal.

## 📄 License

This project is licensed under the MIT License.
