from fastapi import FastAPI, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import logging
import uvicorn

from .config.settings import settings
from .api.routes import router
from .services.agent import agent_service
from .services.avatar import tavus_avatar_service

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="LibaAI - Digital Human API",
    description="Real-time digital human powered by LiveKit",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Serve cached audio files
static_dir = Path(__file__).resolve().parents[1] / settings.static_dir
static_dir.mkdir(parents=True, exist_ok=True)
app.mount(settings.static_url_path, StaticFiles(directory=static_dir), name="static")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(router, prefix="/api")


@app.get("/.well-known/oauth-authorization-server")
@app.get("/.well-known/oauth-authorization-server/sse")
@app.get("/sse/.well-known/oauth-authorization-server")
@app.get("/sse")
@app.post("/sse")
def ignore_sse_probe():
    return Response(status_code=204)


@app.on_event("startup")
async def startup_event():
    """Application startup"""
    logger.info("Starting LibaAI Digital Human API")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"LiveKit URL: {settings.livekit_url}")
    
    # Verify configuration
    if not settings.livekit_api_key:
        logger.warning("LiveKit API key not configured")
    if settings.use_tavus:
        await tavus_avatar_service.start()
        await tavus_avatar_service.start()


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown"""
    logger.info("Shutting down LibaAI Digital Human API")
    rooms = list(agent_service.active_sessions.keys())
    for room_name in rooms:
        try:
            await agent_service.end_session(room_name)
        except Exception as e:
            logger.error("Failed to clean LiveKit room %s on shutdown: %s", room_name, e)
    if settings.use_tavus:
        await tavus_avatar_service.stop()
        await tavus_avatar_service.stop()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "LibaAI Digital Human API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/api/health"
    }


def main():
    """Run the application"""
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )


if __name__ == "__main__":
    main()
