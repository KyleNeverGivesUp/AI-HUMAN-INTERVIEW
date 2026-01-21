"""Minimal LiveKit connectivity check using rtc.Room.connect."""
import asyncio
import logging
import os

from livekit import rtc
from livekit.api import AccessToken, VideoGrants


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("livekit-connect-test")


LIVEKIT_URL = os.environ.get("LIVEKIT_URL", "ws://localhost:7880")
API_KEY = os.environ.get("LIVEKIT_API_KEY", "")
API_SECRET = os.environ.get("LIVEKIT_API_SECRET", "")


async def main():
    room_name = "connect-test"
    identity = "connect-tester"

    if not API_KEY or not API_SECRET:
        raise RuntimeError("LIVEKIT_API_KEY/SECRET not set")

    # Build token
    token = AccessToken(API_KEY, API_SECRET)
    token.with_identity(identity)
    token.with_name(identity)
    token.with_grants(VideoGrants(room_join=True, room=room_name, can_publish=False, can_subscribe=True))
    jwt = token.to_jwt()
    logger.info("Generated token=***%s***", jwt)

    room = rtc.Room()

    @room.on("participant_connected")
    def on_participant_connected(participant: rtc.RemoteParticipant):
        logger.info("participant connected: %s %s", participant.sid, participant.identity)

    @room.on("track_subscribed")
    def on_track_subscribed(track: rtc.Track, publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant):
        logger.info("track subscribed: %s from %s", publication.sid, participant.identity)

    # Try to connect; autoSubscribe=True by default
    config = rtc.RtcConfiguration(ice_transport_type=rtc.IceTransportType.TRANSPORT_ALL)
    options = rtc.RoomOptions(rtc_config=config, auto_subscribe=True)
    logger.info("Connecting to %s room=%s", LIVEKIT_URL, room_name)
    await room.connect(LIVEKIT_URL, jwt, options)
    logger.info("Connected to room %s (local identity=%s)", room.name, room.local_participant.identity)

    # Keep the connection for a short window to observe events
    await asyncio.sleep(10)
    await room.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
