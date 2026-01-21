# 🚀 Quick Start Guide

## Prerequisites Check
```bash
# Check Node.js
node --version  # Should be 18+

# Check Python
python3 --version  # Should be 3.10+

# Check uv (install if needed)
pip install uv
```

## Step 1: Setup Frontend (1 minute)
```bash
cd frontend
npm install
npm run dev
```
✅ Frontend running at: **http://localhost:3000**

## Step 2: Setup Backend (2 minutes)
```bash
cd backend

# Create virtual environment with uv
uv venv

# Install dependencies
uv pip install -e .

# Create .env file
cp env.example .env

# Edit .env and add your API keys:
# - LIVEKIT_API_KEY
# - LIVEKIT_API_SECRET  
# - TAVUS_API_KEY

# Run backend
source .venv/bin/activate
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```
✅ Backend running at: **http://localhost:8000**
✅ API Docs: **http://localhost:8000/docs**

## Step 3: Test the Application

### Test Frontend (JobNova)
1. Open http://localhost:3000
2. Browse job listings
3. Click on a job to see details
4. Test filtering (Matched/Liked/Applied)
5. Try responsive design (resize browser)

### Test Backend (Digital Human)
1. Navigate to http://localhost:3000/digital-human
2. Click "Start Session"
3. Type a message and send
4. Watch AI respond in real-time

Or use API directly:
```bash
# Create session
curl -X POST http://localhost:8000/api/rooms/create \
  -H "Content-Type: application/json" \
  -d '{"room_name": "test-room"}'

# Send message
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"room_name": "test-room", "message": "Hello!"}'
```

## 🎯 Project Features Checklist

### ✅ Part 1: Frontend (JobNova)
- [x] Job listing page with match percentages
- [x] Job detail page
- [x] Responsive design (mobile/tablet/desktop)
- [x] Interactive animations
- [x] Mock Interview promotion
- [x] Filtering and search
- [x] Circular progress indicators

### ✅ Part 2: Backend (Digital Human)
- [x] LiveKit integration
- [x] Tavus Persona API integration
- [x] Real-time WebSocket communication
- [x] Audio/video synchronization architecture
- [x] Session management
- [x] REST API endpoints
- [x] Error handling

## 🐳 Docker Deployment (Optional)

```bash
# Copy env file
cp backend/env.example backend/.env

# Edit backend/.env with your API keys

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop
docker-compose down
```

## 📝 API Keys Required

### LiveKit
1. Sign up at https://livekit.io
2. Create a project
3. Get API Key and Secret from dashboard

### Tavus
1. Sign up at https://tavus.io
2. Get API key from dashboard
3. Note: May need to request access

## ⚡ Troubleshooting

### Frontend won't start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend errors
```bash
cd backend
rm -rf .venv
uv venv
uv pip install -e .
source .venv/bin/activate
python -m uvicorn src.main:app --reload
```

### Port conflicts
- Frontend: Change port in `vite.config.ts`
- Backend: Change port in `backend/.env` or use `--port` flag

## 📧 Submission

When ready to submit:
1. Test all features thoroughly
2. Record a walkthrough video showing:
   - Frontend job board functionality
   - Responsive design
   - Backend API working
   - Digital human session (if API keys configured)
3. Send code + video to: **kevin@libaspace.com**

## 🎥 Video Recording Tips

Show in your video:
1. **Frontend Features** (3-4 min)
   - Job listing page
   - Filter tabs working
   - Job detail page
   - Responsive design (resize window)
   - Smooth animations

2. **Backend Features** (3-4 min)
   - API documentation at /docs
   - Create session endpoint
   - Send message endpoint
   - WebSocket connection
   - Digital human interface

3. **Code Structure** (2-3 min)
   - Project organization
   - Key files explanation
   - Configuration setup

## 🏆 Estimated Completion Time

- ✅ Part 1 (Frontend): **~1 day** ⏱️
- ✅ Part 2 (Backend): **~3-4 days** ⏱️
- **Total**: **~4-5 days** as planned

Good luck! 🚀
