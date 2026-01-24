import asyncio
import logging
import time
from typing import Optional

from openai import OpenAI

from .avatar import tavus_avatar_service
from .livekit_service import livekit_service
from .openai_tts_service import openai_tts_service
from ..config.settings import settings

logger = logging.getLogger(__name__)

_llm_client: OpenAI | None = None


def _get_llm_client() -> OpenAI:
    global _llm_client
    if _llm_client is None:
        api_key = settings.openrouter_api_key
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not set")
        _llm_client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": settings.app_origin,
                "X-Title": settings.app_name,
            },
        )
    return _llm_client


class AgentService:
    """Text -> (echo) -> streaming TTS -> LiveKit audio track."""

    def __init__(self) -> None:
        self.active_sessions: dict[str, dict] = {}
        self.livekit = livekit_service
        self.tts = openai_tts_service
        self.tavus = tavus_avatar_service

    def _track_task(self, session_id: str, task: asyncio.Task, label: str) -> None:
        session = self.active_sessions.get(session_id)
        if session is not None:
            session[label] = task

        def _done(done_task: asyncio.Task) -> None:
            try:
                done_task.result()
            except asyncio.CancelledError:
                logger.info("Background task cancelled: %s session=%s", label, session_id)
            except Exception:
                logger.exception("Background task failed: %s session=%s", label, session_id)

        task.add_done_callback(_done)

    async def create_session(
        self,
        room_name: str,
        participant_name: str = "User",
    ) -> dict:
        """Create a new LiveKit session for the client."""
        try:
            logger.info("Creating LiveKit room: %s", room_name)
            await self.livekit.create_room(room_name)
            token = self.livekit.create_token(room_name, participant_name)

            session_id = room_name
            self.active_sessions[session_id] = {
                "room_name": room_name,
                "participant_name": participant_name,
                "created_at": asyncio.get_event_loop().time(),
                "client_ws": None,
                "tts_task": None,
                "publisher_task": None,
            }

            use_tavus = settings.use_tavus and self.tavus.enabled
            if settings.use_tavus and not self.tavus.enabled:
                logger.warning("Tavus enabled but missing configuration; falling back to TTS.")

            if use_tavus:
                try:
                    await self.tavus.ensure_avatar(room_name)
                except Exception as e:
                    logger.warning("Tavus avatar start failed; falling back to TTS: %s", e)
                    use_tavus = False

            if not use_tavus:
                publisher_task = asyncio.create_task(
                    self.livekit.ensure_publisher(room_name, participant_name="tts-bot")
                )
                self._track_task(session_id, publisher_task, "publisher_task")

            logger.info("Session created: %s", session_id)
            logger.info(
                "LiveKit session ready: room=%s url=%s token_set=%s",
                room_name,
                self.livekit.url,
                bool(token),
            )

            return {
                "session_id": session_id,
                "token": token,
                "room_name": room_name,
                "livekit_url": self.livekit.url,
            }

        except Exception as e:
            logger.error("Failed to create session: %s", e)
            raise

    async def process_message(self, room_name: str, message: str) -> dict:
        """Echo the text and publish TTS audio to LiveKit."""
        return await self.say_text(room_name=room_name, text=message)

    async def say_text(self, room_name: str, text: str, t0_ms: float | None = None) -> dict:
        """Process text -> TTS streaming into LiveKit audio track."""
        try:
            session = self.active_sessions.get(room_name)
            if not session:
                raise ValueError(f"Session {room_name} not found")

            response_text = await self._generate_response(text)
            logger.info("Say text for room=%s text=%s", room_name, response_text)

            use_tavus = settings.use_tavus and self.tavus.enabled
            if use_tavus:
                try:
                    await self.tavus.ensure_avatar(room_name)
                    self.tavus.enqueue_text(room_name, response_text, t0_ms=t0_ms)
                except Exception as e:
                    logger.warning("Tavus enqueue failed; falling back to TTS: %s", e)
                    use_tavus = False

            if not use_tavus:
                existing_task = session.get("tts_task")
                if existing_task and not existing_task.done():
                    existing_task.cancel()

                tts_task = asyncio.create_task(
                    self._stream_tts_to_livekit(room_name, response_text, t0_ms=t0_ms)
                )
                self._track_task(room_name, tts_task, "tts_task")

            return {
                "session_id": room_name,
                "response": response_text,
                "audio_url": None,
                "video_url": None,
            }

        except Exception as e:
            logger.error("Failed to process message: %s", e)
            raise

    async def register_client_ws(self, room_name: str, websocket) -> None:
        session = self.active_sessions.get(room_name)
        if not session:
            return
        session["client_ws"] = websocket

    async def unregister_client_ws(self, room_name: str, websocket) -> None:
        session = self.active_sessions.get(room_name)
        if not session:
            return
        if session.get("client_ws") is websocket:
            session["client_ws"] = None

    async def end_session(self, room_name: str) -> bool:
        """End a digital human session and delete the LiveKit room."""
        try:
            session = self.active_sessions.get(room_name)
            if not session:
                return False

            for task_name in ("tts_task", "publisher_task"):
                task = session.get(task_name)
                if task and not task.done():
                    task.cancel()

            if settings.use_tavus and self.tavus.enabled:
                self.tavus.close_room(room_name)

            try:
                await self.livekit.delete_room(room_name)
                logger.info("Deleted LiveKit room: %s", room_name)
            except Exception as e:
                logger.warning("Failed to delete LiveKit room: %s", e)

            try:
                await self.livekit.close_publisher(room_name)
            except Exception as e:
                logger.warning("Failed to close LiveKit publisher: %s", e)

            del self.active_sessions[room_name]
            logger.info("Ended session: %s", room_name)
            return True

        except Exception as e:
            logger.error("Failed to end session: %s", e)
            return False

    def get_session_status(self, room_name: str) -> Optional[dict]:
        """Get status of a session."""
        return self.active_sessions.get(room_name)

    async def _stream_tts_to_livekit(
        self, room_name: str, text: str, t0_ms: float | None = None
    ) -> None:
        publisher = await self.livekit.ensure_publisher(room_name, participant_name="tts-bot")
        if not publisher:
            logger.warning("LiveKit publisher unavailable for room %s", room_name)
            return

        sample_rate = settings.openai_tts_sample_rate
        num_channels = settings.openai_tts_channels
        bytes_per_sample = 2
        frame_samples = int(sample_rate * settings.openai_tts_frame_ms / 1000)
        frame_bytes = frame_samples * num_channels * bytes_per_sample

        buffer = bytearray()
        samples_sent = 0
        start_time = asyncio.get_event_loop().time()

        first_frame = True
        async for chunk in self.tts.iter_pcm_bytes(text):
            if not chunk:
                continue
            buffer.extend(chunk)

            while len(buffer) >= frame_bytes:
                frame = bytes(buffer[:frame_bytes])
                del buffer[:frame_bytes]
                await self.livekit.publish_audio_frame(
                    room_name=room_name,
                    pcm_data=frame,
                    sample_rate=sample_rate,
                    num_channels=num_channels,
                    samples_per_channel=frame_samples,
                )
                if first_frame and t0_ms is not None:
                    t1_ms = time.time() * 1000
                    logger.info(
                        "TTS first frame published room=%s latency_ms=%.0f",
                        room_name,
                        t1_ms - t0_ms,
                    )
                    first_frame = False
                samples_sent += frame_samples
                await self._pace_audio(samples_sent, sample_rate, start_time)

        if buffer:
            remainder = len(buffer) - (len(buffer) % (bytes_per_sample * num_channels))
            if remainder > 0:
                frame = bytes(buffer[:remainder])
                samples = remainder // (bytes_per_sample * num_channels)
                await self.livekit.publish_audio_frame(
                    room_name=room_name,
                    pcm_data=frame,
                    sample_rate=sample_rate,
                    num_channels=num_channels,
                    samples_per_channel=samples,
                )
                if first_frame and t0_ms is not None:
                    t1_ms = time.time() * 1000
                    logger.info(
                        "TTS first frame published room=%s latency_ms=%.0f",
                        room_name,
                        t1_ms - t0_ms,
                    )
                    first_frame = False
                samples_sent += samples
                await self._pace_audio(samples_sent, sample_rate, start_time)

    async def _pace_audio(self, samples_sent: int, sample_rate: int, start_time: float) -> None:
        expected = samples_sent / sample_rate
        elapsed = asyncio.get_event_loop().time() - start_time
        if expected > elapsed:
            await asyncio.sleep(expected - elapsed)

    async def _generate_response(self, text: str) -> str:
        system_content = (
            "You are an interview expert. You are an HR at a high-tech company interviewing a software engineer. "
            "First response: greet the candidate, introduce yourself as Amanda, reminder candidate you will start the interview session right now, and require candidate would he to introduce himself firstly"
            "From the second response onward, ask common software engineering interview questions.  "
            "Keep each response within 20 words in English."
            "End the interview in 3 questions and say thanks to the candidate."
        )
        user_content = f"User input: {text}\nRespond to the user's input."
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content},
        ]
        model = settings.openrouter_model
        if not model:
            raise RuntimeError("OPENROUTER_MODEL is not set")

        def _call_llm() -> str:
            client_llm = _get_llm_client()
            response = client_llm.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.2,
            )
            content = None
            data = None
            if hasattr(response, "model_dump"):
                try:
                    data = response.model_dump()
                except Exception:
                    data = None

            choices = getattr(response, "choices", None)
            if not choices and isinstance(data, dict):
                choices = data.get("choices")

            if choices:
                first = choices[0]
                message = None
                if isinstance(first, dict):
                    message = first.get("message")
                else:
                    message = getattr(first, "message", None)

                if isinstance(message, dict):
                    content = message.get("content")
                else:
                    content = getattr(message, "content", None)

            if not content and isinstance(data, dict):
                content = data.get("output_text")

            if not content:
                logger.error("LLM returned empty content; response=%s", data or response)
                raise RuntimeError("LLM returned empty content")

            return content

        return await asyncio.to_thread(_call_llm)


DigitalHumanService = AgentService
agent_service = AgentService()
