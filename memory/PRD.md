# Game Insight HUD - PRD

## Original Problem Statement
Build an app that can view the user's screen in real time while playing various games, and provide info to help win whatever game they are playing.

## User Choices
- Both browser-based screen sharing (WebRTC) AND desktop app option
- GPT-5.2 for best vision analysis
- Support all types of games
- All features: real-time overlay suggestions, voice tips (TTS), chat Q&A
- Clean, easy on eyes, non-distracting dark theme

## Architecture
- **Frontend**: React + Tailwind CSS + Framer Motion
- **Backend**: FastAPI + MongoDB
- **AI**: GPT-5.2 Vision (via Emergent Integrations)
- **TTS**: OpenAI TTS (via Emergent Integrations)
- **Screen Capture**: WebRTC getDisplayMedia API

## User Personas
1. **Casual Gamers**: Want quick tips without complex setup
2. **Competitive Players**: Need real-time strategic analysis
3. **Streamers**: Want voice tips while gaming

## Core Requirements (Static)
- Real-time screen capture and preview
- AI game analysis with actionable tips
- Text-to-speech for voice tips
- Chat Q&A about game state
- Non-distracting HUD aesthetic

## What's Been Implemented (Jan 2026)
- [x] Landing page with capture method selection
- [x] Dashboard with screen preview
- [x] GPT-5.2 vision analysis integration
- [x] Real-time tips generation
- [x] Chat Q&A with session history
- [x] OpenAI TTS for voice tips
- [x] Settings modal (auto-analyze, voice selection)
- [x] Cyberpunk/HUD dark theme design
- [x] MongoDB persistence for sessions/chat

## Prioritized Backlog

### P0 (Critical) - DONE
- Screen capture and preview
- AI analysis endpoint
- Chat functionality
- Voice tips

### P1 (High)
- Desktop app with Electron (currently browser-only fallback)
- Game-specific tip templates
- Hotkey controls for hands-free operation

### P2 (Medium)
- User accounts and session history
- Custom tip profiles per game
- Analysis history and replay
- Multi-language support

### P3 (Nice to Have)
- Overlay mode (floating HUD)
- Discord/streaming integration
- Community tip sharing

## Next Tasks
1. Implement Electron desktop app for native capture
2. Add hotkey support (analyze on keypress)
3. Create game-specific prompts for popular games
4. Add user authentication
