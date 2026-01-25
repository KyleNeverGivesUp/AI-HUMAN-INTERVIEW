import asyncio
from typing import Optional
from datetime import timedelta
try:
    from livekit import rtc
    from livekit.api import AccessToken, VideoGrants
    try:
        from livekit.api import RoomServiceClient
    except ImportError:
        RoomServiceClient = None
except ImportError:
    AccessToken = None
    VideoGrants = None
    RoomServiceClient = None
    rtc = None
import logging

from ..config.settings import settings

logger = logging.getLogger(__name__)


class LiveKitService:
    """Service for managing LiveKit connections and rooms"""
    
    def __init__(self):
        self.api_key = settings.livekit_api_key
        self.api_secret = settings.livekit_api_secret
        self.url = settings.livekit_url
        self.rooms: dict[str, rtc.Room] = {}
        self.publishers: dict[str, dict] = {}
        
    def create_token(
        self, 
        room_name: str, 
        participant_name: str,
        can_publish: bool = True,
        can_subscribe: bool = True
    ) -> str:
        """Create a LiveKit access token for a participant (simplified)"""
        try:
            # Simplified: return a mock token when keys are missing.
            if not self.api_key or not self.api_secret:
                logger.info(f"Using mock token for {participant_name} in room {room_name}")
                return f"mock_token_{room_name}_{participant_name}"
            
            # If API keys are configured, generate a real token.
            token = AccessToken(self.api_key, self.api_secret)
            token.with_identity(participant_name)
            token.with_name(participant_name)
            
            # Set video grants
            grants = VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=can_publish,
                can_subscribe=can_subscribe,
            )
            token.with_grants(grants)
            
            # Token valid for 6 hours (using timedelta)
            token.with_ttl(timedelta(hours=6))
            
            jwt_token = token.to_jwt()
            logger.info(
                "Created LiveKit token for participant=%s room=%s token=***%s***",
                participant_name,
                room_name,
                jwt_token,
            )
            return jwt_token
            
        except Exception as e:
            logger.error(f"Failed to create token: {e}")
            raise
    
    async def create_room(self, room_name: str) -> dict:
        """Create a new LiveKit room"""
        try:
            # Check if RoomServiceClient is available
            if RoomServiceClient is None:
                logger.warning(f"RoomServiceClient not available, skipping room creation for {room_name}")
                return {
                    "room_name": room_name,
                    "created": False,
                    "note": "Room creation skipped (client-side will auto-create)"
                }
            
            # Create room using LiveKit API
            room_client = RoomServiceClient(
                self.url,
                self.api_key,
                self.api_secret
            )
            
            # Try to create room (may fail if already exists, which is fine)
            try:
                from livekit.api import CreateRoomRequest
                room = await room_client.create_room(
                    CreateRoomRequest(name=room_name)
                )
                logger.info(f"Created room: {room_name}")
                return {
                    "room_name": room.name,
                    "created": True
                }
            except ImportError:
                logger.warning(f"CreateRoomRequest not available")
                return {
                    "room_name": room_name,
                    "created": False,
                    "note": "Room will be auto-created on join"
                }
            
        except Exception as e:
            logger.error(f"Failed to create room {room_name}: {e}")
            # Room might already exist, which is okay
            return {
                "room_name": room_name,
                "created": False,
                "error": str(e)
            }
    
    async def get_room_info(self, room_name: str) -> Optional[dict]:
        """Get information about a room"""
        try:
            if RoomServiceClient is None:
                logger.warning("RoomServiceClient not available")
                return None
                
            room_client = RoomServiceClient(
                self.url,
                self.api_key,
                self.api_secret
            )
            
            try:
                from livekit.api import ListRoomsRequest
                rooms = await room_client.list_rooms(
                    ListRoomsRequest()
                )
                
                for room in rooms.rooms:
                    if room.name == room_name:
                        return {
                            "name": room.name,
                            "num_participants": room.num_participants,
                            "creation_time": room.creation_time,
                        }
            except ImportError:
                logger.warning("ListRoomsRequest not available")
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get room info: {e}")
            return None
    
    async def delete_room(self, room_name: str) -> bool:
        """Delete a LiveKit room"""
        try:
            if RoomServiceClient is None:
                logger.warning("RoomServiceClient not available, skipping room deletion")
                return True
                
            room_client = RoomServiceClient(
                self.url,
                self.api_key,
                self.api_secret
            )
            
            try:
                from livekit.api import DeleteRoomRequest
                await room_client.delete_room(
                    DeleteRoomRequest(room=room_name)
                )
                logger.info(f"Deleted room: {room_name}")
                return True
            except ImportError:
                logger.warning("DeleteRoomRequest not available")
                return True
            
        except Exception as e:
            logger.error(f"Failed to delete room {room_name}: {e}")
            return False

    async def publish_audio_data(
        self,
        room_name: str,
        audio_data: bytes,
        sample_rate: int = 48000,
        num_channels: int = 1,
    ):
        """Publish raw PCM audio data to a room"""
        try:
            publisher = self.publishers.get(room_name)
            if not publisher:
                logger.warning(f"No LiveKit publisher for room {room_name}")
                return

            audio_source = publisher.get("audio_source")
            if audio_source is None:
                logger.warning(f"No audio source for room {room_name}")
                return

            bytes_per_sample = 2
            samples_per_channel = len(audio_data) // (bytes_per_sample * num_channels)
            if samples_per_channel <= 0:
                logger.warning(f"Invalid audio payload for room {room_name}")
                return

            frame = rtc.AudioFrame(
                data=audio_data,
                sample_rate=sample_rate,
                num_channels=num_channels,
                samples_per_channel=samples_per_channel,
            )
            result = audio_source.capture_frame(frame)
            if asyncio.iscoroutine(result):
                await result
            logger.debug(f"Published audio frame to room {room_name}")

        except Exception as e:
            logger.error(f"Failed to publish audio: {e}")
            raise
    
    async def ensure_publisher(
        self,
        room_name: str,
        participant_name: str = "DigitalHuman",
        connect_timeout_s: int = 5,
        publish_video: bool = True,
    ):
        """Ensure a participant is connected (matches minimal LiveKit example)."""
        if room_name in self.publishers:
            return self.publishers[room_name]

        if not self.api_key or not self.api_secret:
            logger.warning("LiveKit API keys missing; cannot publish audio/video")
            return None

        room = rtc.Room()
        token = self.create_token(
            room_name=room_name,
            participant_name=participant_name,
            can_publish=True,
            can_subscribe=True,
        )
        try:
            rtc_config = rtc.RtcConfiguration(
                ice_transport_type=rtc.IceTransportType.TRANSPORT_ALL,
            )
            options = rtc.RoomOptions(rtc_config=rtc_config, auto_subscribe=True)
            logger.info("Connecting to %s room=%s", self.url, room_name)
            await room.connect(self.url, token, options)
            logger.info(
                "Connected to room %s (local identity=%s)",
                room.name,
                room.local_participant.identity,
            )
        except Exception as e:
            try:
                await room.disconnect()
            except Exception:
                pass
            logger.exception(
                "LiveKit publish connect failed for %s: %s (%s)",
                room_name,
                e,
                e.__class__.__name__,
            )
            raise

        publisher = {
            "room": room,
        }
        audio_source = rtc.AudioSource(
            sample_rate=settings.openai_tts_sample_rate,
            num_channels=settings.openai_tts_channels,
        )
        audio_track = rtc.LocalAudioTrack.create_audio_track("ai-audio", audio_source)
        await room.local_participant.publish_track(audio_track)
        publisher["audio_source"] = audio_source
        publisher["audio_track"] = audio_track
        if publish_video:
            video_source = rtc.VideoSource(width=640, height=360)
            video_track = rtc.LocalVideoTrack.create_video_track("ai-video", video_source)
            await room.local_participant.publish_track(video_track)
            publisher["video_source"] = video_source
            publisher["video_track"] = video_track
        self.publishers[room_name] = publisher
        return publisher

    async def publish_audio_frame(
        self,
        room_name: str,
        pcm_data: bytes,
        sample_rate: int,
        num_channels: int,
        samples_per_channel: int,
    ):
        """Publish raw PCM audio into LiveKit."""
        publisher = self.publishers.get(room_name)
        if not publisher:
            logger.warning(f"No LiveKit publisher for room {room_name}")
            return

        audio_source = publisher.get("audio_source")
        if audio_source is None:
            logger.warning(f"No audio source for room {room_name}")
            return

        frame = rtc.AudioFrame(
            data=pcm_data,
            sample_rate=sample_rate,
            num_channels=num_channels,
            samples_per_channel=samples_per_channel,
        )
        if not publisher.get("_logged_audio_first_frame"):
            logger.info(
                "LiveKit audio first frame room=%s bytes=%s samples=%s",
                room_name,
                len(pcm_data),
                samples_per_channel,
            )
            publisher["_logged_audio_first_frame"] = True
        result = audio_source.capture_frame(frame)
        if asyncio.iscoroutine(result):
            await result

    async def publish_video_frame(
        self,
        room_name: str,
        width: int,
        height: int,
        buffer_type: int,
        data: bytes,
    ):
        """Publish raw video frame into LiveKit."""
        publisher = self.publishers.get(room_name)
        if not publisher:
            logger.warning(f"No LiveKit publisher for room {room_name}")
            return

        video_source = publisher.get("video_source")
        if video_source is None:
            logger.warning(f"No video source for room {room_name}")
            return

        frame = rtc.VideoFrame(width=width, height=height, type=buffer_type, data=data)
        result = video_source.capture_frame(frame)
        if asyncio.iscoroutine(result):
            await result

    async def close_publisher(self, room_name: str):
        publisher = self.publishers.pop(room_name, None)
        if not publisher:
            return

        room = publisher.get("room")
        if room:
            await room.disconnect()


# Global instance
livekit_service = LiveKitService()
