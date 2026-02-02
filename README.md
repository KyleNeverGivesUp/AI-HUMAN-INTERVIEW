# CareerBoost AI

Full-stack job board, resume matching, and AI interview platform with real-time avatar audio/video.

## What it does
- Resume manager: upload/list/download/delete, PDF text extraction stored in SQLite.
- Job board: browse, search, like, apply/unapply; seed jobs.
- JD match analysis: per-job and batch matching using Anthropic Sonnet 4 with caching.
- Mock interview: LiveKit room + LLM-driven interviewer, optional Tavus avatar video.
- Interview persistence and evaluation: save sessions, async scoring, feedback dashboard.
- Skills system: role-specific interview guides in backend/skills, plus /api/skills endpoints.

## Core flows
### Resume and JD matching
User uploads resume -> parsed text -> /api/jobs/match/{resume_id} (batch) or /api/jobs/{job_id}/match-analysis/{resume_id} (detail) -> UI renders score, strengths, gaps, recommendations.

### Interview
User selects job + resume -> /api/rooms/create -> LiveKit session -> /api/say -> LLM generates question -> Edge TTS streams PCM -> LiveKit audio -> Tavus video (optional) -> frontend plays tracks -> /api/interviews/{session_id}/save -> /api/interviews/{session_id}/evaluate.

## Tech stack
Frontend: React, TypeScript, Vite, Tailwind, Zustand, Framer Motion, LiveKit client.
Backend: FastAPI, SQLAlchemy + SQLite, LiveKit server SDK, Anthropic, Edge TTS + ffmpeg, Tavus (optional), PyPDF.

## API (high level)
- Health: GET /api/health
- LiveKit sessions: POST /api/rooms/create, POST /api/say, GET /api/rooms/{room}/status, DELETE /api/rooms/{room}
- Metrics: POST /api/metrics/latency
- Resumes: POST /api/resumes/upload, GET /api/resumes, GET /api/resumes/{id}, GET /api/resumes/{id}/download, DELETE /api/resumes/{id}
- Jobs: GET /api/jobs, GET /api/jobs/{id}, POST /api/jobs/{id}/like, POST /api/jobs/{id}/apply, POST /api/jobs/{id}/unapply
- Matching: POST /api/jobs/match/{resume_id}, GET /api/jobs/{job_id}/match-analysis/{resume_id}
- Interview sessions: GET /api/interviews, GET /api/interviews/{id}, POST /api/interviews/{id}/save, POST /api/interviews/{id}/evaluate, DELETE /api/interviews/{id}
- Skills: GET /api/skills/metadata, POST /api/skills/execute
- WebSocket chat: /api/ws/{room_name}

## Quick start (local)
### Backend
```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -e .
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000

### Docker (frontend + backend + livekit)
```bash
docker compose up --build
```

## Configuration
Copy `backend/env.example` to `backend/.env` and set:
- LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
- ANTHROPIC_API_KEY (used for matching, interview questions, evaluations)
- USE_TAVUS + TAVUS_* to enable avatar video
- EDGE_TTS_* for voice settings
- USE_SKILLS to enable role-based SKILL.md prompts

Notes:
- SQLite data lives in `backend/resumes.db`.
- Resume files are stored in `backend/storage/resumes`.
- If LiveKit keys are missing, tokens are mocked and real audio publishing will not work.
