from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
import time
import logging

from ..models.schemas import (
    RoomCreateRequest,
    RoomCreateResponse,
    SayRequest,
    SayResponse,
    StreamStatus,
    HealthResponse,
    LatencyReportRequest,
)

from ..models.schemas import SkillMetadata, SkillExecuteRequest, SkillExecuteResponse
from ..services.anthropic_skills_service import (
    list_skills_metadata,
    select_skill_for_query,
    generate_response,
)
from ..services.local_skills_registry import get_skill_by_id

from ..services.agent import agent_service
from ..services.livekit_service import livekit_service
from ..config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        services={
            "livekit": "configured" if livekit_service.api_key else "not_configured",
            "openai_tts": "configured" if settings.openai_api_key else "not_configured",
            "tavus": "configured"
            if (settings.tavus_api_key and settings.tavus_replica_id and settings.tavus_persona_id)
            else "not_configured",
        }
    )


@router.post("/rooms/create", response_model=RoomCreateResponse)
async def create_room(request: RoomCreateRequest):
    """
    Create a new LiveKit room for digital human interaction.
    Returns access token for the client to connect.
    """
    try:
        session = await agent_service.create_session(
            room_name=request.room_name,
            participant_name=request.participant_name,
            job_id=request.job_id,
            resume_id=request.resume_id,
        )

        logger.info(
            "Room created via API: room=%s url=%s token_set=%s",
            session.get("room_name"),
            session.get("livekit_url"),
            bool(session.get("token")),
        )
        logger.info(
            "***USER_TOKEN_ISSUED room=%s participant=%s***",
            session.get("room_name"),
            request.participant_name,
        )
        
        return RoomCreateResponse(
            token=session["token"],
            room_name=session["room_name"],
            url=session["livekit_url"],
            use_tavus=session.get("use_tavus", False),
        )
        
    except Exception as e:
        logger.error(f"Failed to create room: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/say", response_model=SayResponse)
async def say_text(request: SayRequest):
    """
    Receive text and publish TTS audio into the LiveKit room.
    """
    try:
        t0_ms = time.time() * 1000
        logger.info("Say request received room=%s text=%s", request.room_name, request.text)
        result = await agent_service.say_text(
            room_name=request.room_name,
            text=request.text,
            t0_ms=t0_ms,
        )
        return SayResponse(
            room_name=request.room_name,
            response=result.get("response", ""),
            t0_ms=t0_ms,
        )
    except Exception as e:
        logger.error(f"Failed to say text: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rooms/{room_name}/status", response_model=StreamStatus)
async def get_room_status(room_name: str):
    """Get status of a room/session"""
    try:
        session = agent_service.get_session_status(room_name)
        
        if not session:
            raise HTTPException(status_code=404, detail="Room not found")
        
        room_info = await livekit_service.get_room_info(room_name)
        
        return StreamStatus(
            room_name=room_name,
            status="active",
            participants=room_info.get("num_participants", 0) if room_info else 0,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get room status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/rooms/{room_name}")
async def end_room(room_name: str):
    """End a room/session"""
    try:
        success = await agent_service.end_session(room_name)
        
        if not success:
            raise HTTPException(status_code=404, detail="Room not found")
        
        return {"status": "success", "message": f"Room {room_name} ended"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to end room: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws/{room_name}")
async def websocket_endpoint(websocket: WebSocket, room_name: str):
    """
    WebSocket endpoint for real-time communication.
    Handles text input and streams back audio/video responses.
    """
    await websocket.accept()
    logger.info(f"WebSocket connected for room: {room_name}")
    await agent_service.register_client_ws(room_name, websocket)
    
    try:
        # Check if session exists
        session = agent_service.get_session_status(room_name)
        if not session:
            await websocket.send_json({
                "type": "error",
                "message": "Room not found. Please create a room first."
            })
            await websocket.close()
            return
        
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "room_name": room_name,
            "message": "Connected to digital human"
        })
        
        # Listen for messages
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "message":
                user_message = data.get("message", "")
                logger.info("***WebSocket message received for room=%s***", room_name)
                
                # Send acknowledgment
                await websocket.send_json({
                    "type": "processing",
                    "message": "Digital human is thinking..."
                })
                
                try:
                    # Process message and get response
                    response = await agent_service.process_message(
                        room_name=room_name,
                        message=user_message
                    )
                    
                    # Send response
                    await websocket.send_json({
                        "type": "response",
                        "message": response.get("response", ""),
                        "audio_url": response.get("audio_url"),
                        "video_url": response.get("video_url"),
                    })
                    
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Failed to process message: {str(e)}"
                    })
            
            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for room: {room_name}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass
    finally:
        await agent_service.unregister_client_ws(room_name, websocket)
        try:
            await websocket.close()
        except:
            pass


@router.get("/.well-known/oauth-authorization-server")
@router.get("/.well-known/oauth-authorization-server/sse")
@router.get("/sse/.well-known/oauth-authorization-server")
async def oauth_probe_stub():
    return {"status": "ok"}


@router.post("/sse")
async def sse_probe_stub():
    return {"status": "ok"}


@router.post("/metrics/latency")
async def report_latency(request: LatencyReportRequest):
    latency_ms = request.latency_ms
    if latency_ms is None and request.client_t0_ms and request.client_t1_ms:
        latency_ms = request.client_t1_ms - request.client_t0_ms
    logger.info(
        "***LATENCY_REPORT room=%s status=%s latency_ms=%s t0=%s t1=%s***",
        request.room_name,
        request.status,
        latency_ms,
        request.client_t0_ms,
        request.client_t1_ms,
    )
    return {"status": "ok", "latency_ms": latency_ms}

@router.get("/skills/metadata", response_model=list[SkillMetadata])
async def skills_metadata():
    return list_skills_metadata()


@router.post("/skills/execute", response_model=SkillExecuteResponse)
async def skills_execute(request: SkillExecuteRequest):
    selected = None
    reason = None

    if request.skill_id:
        selected = next(
            (s for s in list_skills_metadata() if s["id"] == request.skill_id),
            None,
        )
        reason = "explicit_skill_id"
    else:
        selected, reason = select_skill_for_query(request.query)

    if selected:
        skill = get_skill_by_id(selected["id"])
        if skill:
            text = generate_response(skill["body"], request.query, temperature=0.2)
        else:
            text = generate_response(None, request.query, temperature=0.2)
        return SkillExecuteResponse(
            response=text,
            selected_skill=SkillMetadata(**selected),
            selection_reason=reason,
        )

    text = generate_response(None, request.query, temperature=0.2)
    return SkillExecuteResponse(
        response=text,
        selected_skill=None,
        selection_reason=reason,
    )
