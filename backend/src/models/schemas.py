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
