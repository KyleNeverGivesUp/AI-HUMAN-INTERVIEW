from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class RoomCreateRequest(BaseModel):
    """Request to create a LiveKit room"""
    room_name: str = Field(..., description="Unique room identifier")
    participant_name: str = Field(default="User", description="Participant display name")


class RoomCreateResponse(BaseModel):
    """Response with room token"""
    token: str = Field(..., description="LiveKit access token")
    room_name: str = Field(..., description="Room name")
    url: str = Field(..., description="LiveKit server URL")
    use_tavus: bool = Field(..., description="Whether avatar video is enabled for this session")


class SayRequest(BaseModel):
    """Request to send text and trigger TTS playback in a room."""
    room_name: str = Field(..., description="Target LiveKit room name")
    text: str = Field(..., description="Text to speak")


class SayResponse(BaseModel):
    """Response after the text is queued for playback."""
    room_name: str
    response: str
    t0_ms: float | None = None


class StreamStatus(BaseModel):
    """Stream status information"""
    room_name: str
    status: Literal["active", "inactive", "error"]
    participants: int = 0
    created_at: Optional[datetime] = None
    error_message: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = "healthy"
    version: str = "0.1.0"
    services: dict[str, str] = {}


class LatencyReportRequest(BaseModel):
    """Latency report from client."""
    room_name: Optional[str] = None
    latency_ms: Optional[float] = None
    status: Optional[str] = None
    client_t0_ms: Optional[float] = None
    client_t1_ms: Optional[float] = None

class SkillMetadata(BaseModel):
    id: str
    title: str
    source: str
    version: Optional[str] = None
    description: Optional[str] = None


class SkillExecuteRequest(BaseModel):
    query: str
    skill_id: Optional[str] = None


class SkillExecuteResponse(BaseModel):
    response: str
    selected_skill: Optional[SkillMetadata] = None
    selection_reason: Optional[str] = None
