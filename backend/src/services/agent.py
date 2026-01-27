import asyncio
import logging
import time
from typing import Optional

from .avatar import tavus_avatar_service
from .livekit_service import livekit_service
from .local_skills_registry import get_skill_by_id
from .openai_tts_service import openai_tts_service
from .openrouter_llm_service import generate_response
from ..config.settings import settings

logger = logging.getLogger(__name__)

FINISH_MESSAGE = "This interview is finished. Thank you for participating."


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
                "greeted": False,
                "question_count": 0,
                "turn_count": 0,
                "skill_id": None,
                "role_label": None,
                "role_prompted": False,
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
                    self.livekit.ensure_publisher(
                        room_name,
                        participant_name="tts-bot",
                        publish_video=False,
                    )
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
                "use_tavus": use_tavus,
            }

        except Exception as e:
            logger.error("Failed to create session: %s", e)
            raise

    async def process_message(self, room_name: str, message: str) -> dict:
        """Echo the text and publish TTS audio to LiveKit."""
        return await self.say_text(room_name=room_name, text=message)

    # async def say_text(self, room_name: str, text: str, t0_ms: float | None = None) -> dict:
    #     """Process text -> TTS streaming into LiveKit audio track."""
    #     try:
    #         session = self.active_sessions.get(room_name)
    #         if not session:
    #             raise ValueError(f"Session {room_name} not found")
    #
    #         turn_count = int(session.get("turn_count", 0)) + 1
    #         session["turn_count"] = turn_count
    #
    #         response_text = await self._generate_response(
    #             text=text,
    #             greeted=bool(session.get("greeted")),
    #             question_count=int(session.get("question_count", 0)),
    #             turn_count=turn_count,
    #         )
    #         logger.info("Say text for room=%s text=%s", room_name, response_text)
    #
    #         if not session.get("greeted"):
    #             session["greeted"] = True
    #         else:
    #             if response_text != FINISH_MESSAGE:
    #                 session["question_count"] = int(session.get("question_count", 0)) + 1
    #
    #         use_tavus = settings.use_tavus and self.tavus.enabled
    #         if use_tavus:
    #             try:
    #                 await self.tavus.ensure_avatar(room_name)
    #                 self.tavus.enqueue_text(room_name, response_text, t0_ms=t0_ms)
    #             except Exception as e:
    #                 logger.warning("Tavus enqueue failed; falling back to TTS: %s", e)
    #                 use_tavus = False
    #
    #         if not use_tavus:
    #             existing_task = session.get("tts_task")
    #             if existing_task and not existing_task.done():
    #                 existing_task.cancel()
    #
    #             tts_task = asyncio.create_task(
    #                 self._stream_tts_to_livekit(room_name, response_text, t0_ms=t0_ms)
    #             )
    #             self._track_task(room_name, tts_task, "tts_task")
    #
    #         return {
    #             "session_id": room_name,
    #             "response": response_text,
    #             "audio_url": None,
    #             "video_url": None,
    #         }
    #
    #     except Exception as e:
    #         logger.error("Failed to process message: %s", e)
    #         raise

    async def say_text(self, room_name: str, text: str, t0_ms: float | None = None) -> dict:
        """Process text via skill selection (Anthropic) or OpenRouter -> TTS streaming into LiveKit."""
        try:
            session = self.active_sessions.get(room_name)
            if not session:
                raise ValueError(f"Session {room_name} not found")

            turn_count = int(session.get("turn_count", 0)) + 1
            session["turn_count"] = turn_count

            used_skill = False
            if settings.use_skills:
                response_text, used_skill = await self._handle_skills_flow(session, text)
                if response_text is None:
                    response_text = await self._generate_response(
                        text=text,
                        greeted=bool(session.get("greeted")),
                        question_count=int(session.get("question_count", 0)),
                        turn_count=turn_count,
                    )
                    used_skill = False
            else:
                response_text = await self._generate_response(
                    text=text,
                    greeted=bool(session.get("greeted")),
                    question_count=int(session.get("question_count", 0)),
                    turn_count=turn_count,
                )

            logger.info("Say text for room=%s text=%s", room_name, response_text)

            logger.info(
                "Skills used=%s room=%s skill_id=%s",
                used_skill,
                room_name,
                session.get("skill_id"),
            )

            if not used_skill:
                if not session.get("greeted"):
                    session["greeted"] = True
                else:
                    if response_text != FINISH_MESSAGE:
                        session["question_count"] = int(session.get("question_count", 0)) + 1

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

    def _match_role_to_skill(self, text: str) -> tuple[str | None, str | None]:
        normalized = " ".join(text.lower().replace("/", " ").replace("-", " ").split())
        if "ai infra" in normalized or "ai infrastructure" in normalized or "infra" in normalized:
            return "ai-infra-interview", "AI Infra"
        if (
            "ml ai" in normalized
            or "ml/ai" in normalized
            or "machine learning" in normalized
            or "ml" in normalized
        ):
            return "ml-ai-interview", "ML/AI"
        if "fullstack" in normalized or "full stack" in normalized:
            return "fullstack-interview", "Fullstack"
        if "frontend" in normalized or "front end" in normalized or "front-end" in normalized:
            return "frontend-interview", "Frontend"
        if "backend" in normalized or "back end" in normalized or "back-end" in normalized:
            return "backend-interview", "Backend"
        if "devops" in normalized or "sre" in normalized or "site reliability" in normalized:
            return "devops-interview", "DevOps"
        return None, None

    async def _handle_skills_flow(self, session: dict, text: str) -> tuple[str | None, bool]:
        if not session.get("role_prompted"):
            session["role_prompted"] = True
            response = (
                "Hello, I'm your interviewer today. "
                "Which role are you interviewing for? "
                "Backend, Frontend, Fullstack, ML/AI, AI Infra, or DevOps?"
            )
            logger.info(
                "***SKILLS_GREETING sent room=%s response=%s***",
                session.get("room_name"),
                response,
            )
            return response, True

        skill_id = session.get("skill_id")
        if not skill_id:
            skill_id, role_label = self._match_role_to_skill(text)
            if not skill_id:
                response = (
                    "Sorry, I didn't catch the role. "
                    "Are you interviewing for Backend, Frontend, Fullstack, ML/AI, AI Infra, or DevOps?"
                )
                logger.info(
                    "***SKILLS_ROLE_REPROMPT room=%s response=%s***",
                    session.get("room_name"),
                    response,
                )
                return response, True
            session["skill_id"] = skill_id
            session["role_label"] = role_label
            skill = get_skill_by_id(skill_id)
            if not skill:
                logger.info("Skills selection id=%s missing locally", skill_id)
                return None, False
            prompt = f"The candidate is interviewing for {role_label}. Ask the first interview question."
            return generate_response(skill["body"], prompt, temperature=0.2), True

        skill = get_skill_by_id(skill_id)
        if not skill:
            logger.info("Skills selection id=%s missing locally", skill_id)
            return None, False
        return generate_response(skill["body"], text, temperature=0.2), True

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
        logger.info("TTS stream start room=%s text_len=%s", room_name, len(text))

        sample_rate = settings.openai_tts_sample_rate
        num_channels = settings.openai_tts_channels
        bytes_per_sample = 2
        frame_samples = int(sample_rate * settings.openai_tts_frame_ms / 1000)
        frame_bytes = frame_samples * num_channels * bytes_per_sample

        buffer = bytearray()
        samples_sent = 0
        start_time = asyncio.get_event_loop().time()

        first_frame = True
        first_chunk_logged = False
        async for chunk in self.tts.iter_pcm_bytes(text):
            if not chunk:
                continue
            if not first_chunk_logged:
                logger.info("TTS PCM chunk received room=%s bytes=%s", room_name, len(chunk))
                first_chunk_logged = True
            buffer.extend(chunk)

            while len(buffer) >= frame_bytes:
                frame = bytes(buffer[:frame_bytes])
                del buffer[:frame_bytes]
                if first_frame:
                    logger.info("Publishing first audio frame room=%s bytes=%s", room_name, len(frame))
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

        if samples_sent == 0:
            logger.warning("TTS stream ended without audio frames room=%s", room_name)

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

    async def _generate_response(
        self,
        text: str,
        greeted: bool,
        question_count: int,
        turn_count: int,
    ) -> str:
        max_turns = 7
        if turn_count >= max_turns:
            return FINISH_MESSAGE

        max_questions = 5

        if not greeted:
            system_content = (
                "You are an interview expert. You are an HR at a high-tech company interviewing a software engineer. "
                "Greet the candidate, introduce yourself as Amanda, say the interview starts now, and ask them to introduce themselves. "
                "Keep it within 20 words in English."
            )
        else:
            next_q_num = question_count + 1
            system_content = (
                "You are an interview expert. You are an HR at a high-tech company interviewing a software engineer. "
                f"Ask interview question #{next_q_num} of {max_questions}. Keep it within 20 words in English. "
                "Do not repeat the greeting or the introduction request."
            )
        user_content = f"User input: {text}\nRespond to the user's input."

        def _call_llm() -> str:
            return generate_response(system_content, user_content, temperature=0.2)

        return await asyncio.to_thread(_call_llm)

DigitalHumanService = AgentService
agent_service = AgentService()
