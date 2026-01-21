# AI Interview Studio (LiveKit + Tavus)

Real-time AI interview demo. Text in, AI avatar speaks in sync with audio/video.

## What It Does
- Frontend joins a LiveKit room and plays remote tracks.
- Backend calls LLM (OpenRouter), runs TTS, and publishes audio.
- If `USE_TAVUS=true`, Tavus renders the avatar and publishes audio+video tracks.
- If `USE_TAVUS=false`, only LiveKit audio is published (no avatar video).

## Flow (Simplified)

```
User input (browser)
  -> /api/say
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
