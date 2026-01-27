# AI Avatar Interview Studio

Real-time multi-modal AI interview application. Text in, AI avatar speaks in sync with audio/video.

This repository is a challenge covering both the frontend job board and the backend real‑time digital human tasks.

## What It Does
- Frontend joins a LiveKit room and plays remote tracks.
- Local Skills layer selects role-specific interview prompts from `backend/skills/`.
- Backend calls LLM (OpenRouter), runs TTS, and publishes audio.
- If `USE_TAVUS=true`, Tavus renders the avatar and publishes audio+video tracks.
- If `USE_TAVUS=false`, only LiveKit audio is published (no avatar video).

## Flow (Simplified)

```
User input (browser)
  -> /api/say
  -> [USE_SKILLS=true] Role prompt + local Skills selection
  -> LLM (OpenRouter lama-3.3-70b)
  -> TTS (Edge)
  -> [USE_TAVUS=true] Tavus AvatarSession -> LiveKit A/V tracks
     [USE_TAVUS=false] LiveKit audio track only
  -> Frontend plays LiveKit tracks
```

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open: http://localhost:3000/digital-human

### Backend
```bash
cd backend
uv venv
uv pip install -e .
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```
API docs: http://localhost:8000/docs

## Configuration (`backend/.env`)

Required:
```env
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...

OPENROUTER_API_KEY=...
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

USE_TAVUS=true
TAVUS_API_KEY=...
TAVUS_API_URL=https://tavusapi.com/v2
TAVUS_REPLICA_ID=...
TAVUS_PERSONA_ID=...
TAVUS_AVATAR_NAME=tavus-avatar-agent
USE_SKILLS=false
```

Optional:
```env
EDGE_TTS_VOICE=en-US-JennyNeural
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
```

## API
- `POST /api/rooms/create` Create a room (returns LiveKit URL + token).
- `POST /api/say` Send text to the AI (LLM -> TTS -> publish).
- `DELETE /api/rooms/{room_name}` End a room.
- `GET /api/health` Health check.

## Skills (Local)
- Local Skills live in `backend/skills/<role>/SKILL.md`.
- When `USE_SKILLS=true`, the backend asks for a role on session start and uses the matching SKILL.md as the system prompt.
- The flow remains: user input -> role selection -> OpenRouter -> TTS -> LiveKit.

## Demo Checklist
- Open `/digital-human`.
- Start a session (room joins).
- Enter a sentence.
- If `USE_TAVUS=true`, avatar speaks with audio+video.
- Logs show t0/t1 latency entries.

## Key Files
- `backend/src/services/agent.py` LLM + TTS + publish flow.
- `backend/src/services/avatar.py` Tavus AvatarSession.
- `backend/src/api/routes.py` `/api/rooms/create`, `/api/say`.
- `frontend/src/pages/DigitalHuman.tsx` LiveKit UI.

---

## 1) Frontend Engineering

### Scope (Job Board + Recommendation Page)
- Implemented the job board and recommendation experience based on the provided Figma.
- Added small JS interaction enhancements for usability (chat input, smooth scrolling, etc.).

### Responsive Design (iPhone / iPad)
Responsive design is implemented with a **mobile‑first** approach:
- Uses **Tailwind CSS** breakpoints (`sm`, `lg`) to adapt layout and typography.
- On iPhone: reduced padding and font sizes, allowed wrapping of nav/status rows, capped bubble width with word‑break, and stacked input controls vertically for better touch targets.
- On iPad: keeps a two‑column layout with larger spacing while keeping the chat panel and video area readable.

### Frontend Stack
- **React + TypeScript + Vite**
- **Tailwind CSS** for utility‑first responsive styling
- **Zustand** for lightweight shared state where needed

## 2) Backend Engineering

### LiveKit Integration
- Creates rooms and tokens, connects a publisher (`tts-bot`) and streams PCM audio frames.

### Tavus Persona API Integration
- When `USE_TAVUS=true`, Tavus renders the avatar and publishes synchronized video+audio tracks.
- When `USE_TAVUS=false`, the system runs **audio‑only** mode via LiveKit.

### Real‑Time Synchronization
- TTS is **streamed** as PCM chunks, framed, paced, and published to LiveKit in real time.
- The frontend subscribes to LiveKit tracks and plays audio/video as they arrive.

## Expected Outcome
**A working prototype of real‑time digital human interaction:**  
- Text input in, AI avatar speaks in real time with no obvious delay.  
- Pipeline: **text → LLM → TTS → LiveKit → Tavus → frontend**.

## Notes
- LLM output is non‑streaming; **TTS + LiveKit** is real‑time streaming.
- Audio/video sync is driven by the audio stream with paced frame publishing.
