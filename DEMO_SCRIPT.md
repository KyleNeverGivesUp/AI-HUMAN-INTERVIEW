# 🎥 Demo Video Script

## Video Duration: 10-12 minutes

---

## 🎬 Scene 1: Introduction (1 minute)

**[Screen: Your IDE or README file]**

"Hello! This is my submission for the LibaAI Full-Stack AI Application Engineering Challenge. I've built a complete full-stack application with two main components:"

1. **Part 1**: JobNova - An AI-powered job board with intelligent matching
2. **Part 2**: Real-time Digital Human powered by LiveKit and Tavus

"Let's start with the frontend demo."

---

## 🖥️ Scene 2: Frontend - JobNova Job Board (4 minutes)

### 2.1 Job Listing Page (2 min)

**[Navigate to http://localhost:3000]**

"This is the JobNova job board. Let me show you the key features:"

**Show Features:**
1. **Match Percentages** (Point to the circular indicators)
   - "Each job shows a match percentage - 64%, 93%, 82%"
   - "These are animated circular progress indicators built with Framer Motion"

2. **Filter Tabs**
   - Click on **"Liked"** tab: "Shows only jobs I've liked"
   - Click on **"Applied"** tab: "Shows jobs I've applied to"
   - Back to **"Matched"** tab: "Main recommendation list"

3. **Search Functionality**
   - Type in search box: "Can search by job title or company"
   - Clear search

4. **Like Feature**
   - Click heart icon on a job
   - Switch to "Liked" tab to show it appears

5. **Job Card Details**
   - Point out: Company, Location, Remote/On-site
   - Salary range
   - Employment type
   - Timestamp and applicant count

6. **Mock Interview Button**
   - "Each job has a green 'Mock Interview' button for AI-powered practice"

### 2.2 Job Detail Page (1.5 min)

**[Click on a job card]**

"When I click on a job, we get a detailed view:"

**Show Features:**
1. **Match Score Breakdown**
   - "Right sidebar shows why this is a good match"
   - Point to Education: 93%, Work Exp: 80%, Skills: 93%, Interests: 44%

2. **Qualifications Section**
   - "Interactive tags showing required skills"
   - Hover over tags to show hover effect

3. **Required Skills & Responsibilities**
   - Scroll through list

4. **Benefits Section**
   - "Company benefits with checkmarks"

5. **Company Information**
   - At the bottom

6. **Action Buttons**
   - "Apply Now" button in sidebar
   - "Start Interview" button
   - Like and Share icons

**[Click "Back to Jobs"]**

### 2.3 Responsive Design (0.5 min)

**[Resize browser window]**

"The design is fully responsive:"
- **Desktop**: Full layout with promo sidebar
- **Tablet**: Collapsible sidebar
- **Mobile**: Hamburger menu with H5-optimized view

---

## 🤖 Scene 3: Backend - Digital Human API (3 minutes)

### 3.1 API Documentation (1 min)

**[Navigate to http://localhost:8000/docs]**

"Now let's look at the backend. This is the FastAPI auto-generated documentation."

**Show Endpoints:**
1. **Health Check** - `GET /api/health`
   - Click "Try it out" → Execute
   - Show response: "All services configured"

2. **Create Room** - `POST /api/rooms/create`
   - Show parameters: room_name, participant_name
   - "This creates a LiveKit room for the digital human session"

3. **Chat Message** - `POST /api/chat/message`
   - "Send text to the AI, which triggers TTS and lip-synced video"

4. **WebSocket** - `WS /api/ws/{room_name}`
   - "Real-time bidirectional communication"

### 3.2 Architecture Overview (1 min)

**[Switch to code in IDE - backend/src/services/]**

"The backend has three main services:"

1. **livekit_service.py**
   - "Handles real-time audio/video streaming"
   - Show `create_token()` method
   - "Creates secure access tokens for clients"

2. **tavus_service.py**
   - "Integrates Tavus Persona API"
   - Show `generate_response()` and `stream_video_response()` methods
   - "Provides digital human with TTS and lip-sync"

3. **digital_human_service.py**
   - "Orchestrates LiveKit and Tavus"
   - Show `stream_digital_human_response()` method
   - "Ensures audio-video synchronization with minimal latency"

### 3.3 Digital Human Interface (1 min)

**[Navigate to http://localhost:3000/digital-human]**

"This is the digital human chat interface:"

**Show Features:**
1. **Video Area**
   - "Will display the AI avatar here (requires Tavus API key)"
   - "Currently showing placeholder"

2. **Start Session**
   - Click "Start Session"
   - Show connection status indicator

3. **Chat Interface**
   - Type a message: "Hello, how can you help me?"
   - Show message appears in chat
   - "AI processes and responds in real-time"
   - (Note: If no API keys, explain it would normally stream response)

4. **Controls**
   - Point to mute, video, end call buttons

5. **End Session**
   - Click end session button

---

## 💻 Scene 4: Code Structure (2 minutes)

### 4.1 Frontend Structure (1 min)

**[Show frontend/src/ in IDE]**

```
frontend/src/
├── components/      # Reusable UI components
│   ├── Sidebar.tsx
│   ├── JobCard.tsx
│   ├── CircularProgress.tsx
│   └── ...
├── pages/          # Route pages
│   ├── JobBoard.tsx
│   ├── JobDetail.tsx
│   └── DigitalHuman.tsx
├── store/          # State management (Zustand)
│   └── useJobStore.ts
└── types/          # TypeScript definitions
    └── index.ts
```

"Key highlights:"
- TypeScript for type safety
- Zustand for lightweight state management
- Framer Motion for smooth animations
- Tailwind CSS for styling

### 4.2 Backend Structure (1 min)

**[Show backend/src/ in IDE]**

```
backend/src/
├── api/
│   └── routes.py        # REST and WebSocket endpoints
├── services/
│   ├── livekit_service.py
│   ├── tavus_service.py
│   └── digital_human_service.py
├── models/
│   └── schemas.py       # Pydantic models
├── config/
│   └── settings.py      # Environment config
└── main.py             # FastAPI app
```

"Key highlights:"
- Clean service layer architecture
- Async/await for non-blocking I/O
- Pydantic for data validation
- **uv** for isolated virtual environment

---

## 🚀 Scene 5: Development & Deployment (1 minute)

### Show Terminal

**[Split screen with terminals]**

**Terminal 1 - Frontend:**
```bash
cd frontend
npm run dev
# → Running on http://localhost:3000
```

**Terminal 2 - Backend:**
```bash
cd backend
source .venv/bin/activate
python -m uvicorn src.main:app --reload
# → Running on http://localhost:8000
```

**Show docker-compose.yml:**
```bash
docker-compose up -d
# → All services (frontend, backend, LiveKit)
```

---

## 📊 Scene 6: Technical Highlights (1 minute)

**[Show bullet points on screen or README]**

### Achievements:
✅ **Clean Architecture** - Separated concerns, modular design
✅ **Type Safety** - TypeScript + Pydantic models
✅ **Real-Time Communication** - WebSocket + LiveKit integration
✅ **Performance** - Async I/O, optimized rendering
✅ **Responsive Design** - Desktop, tablet, mobile support
✅ **Production Ready** - Docker, env config, error handling

### Development Best Practices:
✅ **Isolated Environment** - uv virtual environment for Python
✅ **Documentation** - API docs, README, quick start guide
✅ **Code Quality** - ESLint, type checking, clean code
✅ **Developer Experience** - Hot reload, clear error messages

---

## 🎬 Scene 7: Closing (1 minute)

**[Back to IDE or face cam]**

"To summarize, I've built:

1. **Frontend**: A beautiful, responsive job board with AI-powered matching, built with React, TypeScript, and modern web technologies

2. **Backend**: A scalable real-time digital human system integrating LiveKit for streaming and Tavus for AI avatar rendering

**Development Environment:**
- Used **uv** for isolated Python virtual environment as requested
- Clean separation from system packages
- Fast, reproducible builds

**Completion Time:**
- Frontend: ~1 day as estimated
- Backend: ~3-4 days as estimated
- Total: 4-5 days, exactly as planned

The entire codebase is well-documented, production-ready, and follows best practices. Ready for deployment with Docker."

**[Show README.md or project structure one more time]**

"Thank you for reviewing my submission. All code and documentation are included. Looking forward to your feedback!"

---

## 📝 Recording Tips

### Before Recording:
- [ ] Clear browser cache
- [ ] Close unnecessary tabs
- [ ] Restart both servers
- [ ] Test all features work
- [ ] Prepare what you want to say
- [ ] Check audio/video quality

### During Recording:
- Speak clearly and at a moderate pace
- Show mouse cursor to guide viewer
- Pause between sections
- If you make a mistake, just re-record that section

### Tools:
- **Mac**: QuickTime, Screen Studio
- **Windows**: OBS Studio, Camtasia
- **Online**: Loom, ScreenApp

### Export Settings:
- Resolution: 1080p minimum
- Format: MP4
- Upload to: YouTube (unlisted), Google Drive, or Loom

---

## 📧 After Recording

Send email to: **kevin@libaspace.com**

Subject: **LibaAI Full-Stack Challenge Submission - [Your Name]**

Body:
```
Hi Kevin,

I've completed the LibaAI Full-Stack AI Application challenge. Please find:

1. Code Repository: [GitHub link or attachment]
2. Demo Video: [Link]
3. Documentation: Included in README.md and QUICKSTART.md

Key highlights:
- Frontend: JobNova job board with AI matching (React + TypeScript)
- Backend: Real-time digital human with LiveKit & Tavus (Python + FastAPI)
- Development: Used uv for isolated Python environment as requested
- Completion time: 4-5 days as estimated

All requirements have been implemented and tested.

Thank you!
[Your Name]
```

---

Good luck with your submission! 🚀
