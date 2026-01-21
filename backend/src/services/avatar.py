import asyncio
import logging
import queue
import threading
import time
import uuid
from dataclasses import dataclass

from livekit import rtc
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, JobExecutorType
from livekit.agents.voice import room_io
from livekit.plugins import tavus
from livekit.protocol import models

from ..config.settings import settings
from .openai_tts_service import openai_tts_service

logger = logging.getLogger(__name__)


@dataclass
class _RoomState:
    queue: "queue.Queue[object]"
    ready: threading.Event
    started: bool = False


class TavusAvatarService:
    def __init__(self) -> None:
        self._enabled = bool(
            settings.tavus_api_key
            and settings.tavus_replica_id
            and settings.tavus_persona_id
        )
        self._lock = threading.Lock()
        self._room_states: dict[str, _RoomState] = {}
        self._server_started = asyncio.Event()
        self._server_task: asyncio.Task | None = None

        self._server = AgentServer(
            ws_url=settings.livekit_url,
            api_key=settings.livekit_api_key,
            api_secret=settings.livekit_api_secret,
            job_executor_type=JobExecutorType.THREAD,
            num_idle_processes=0,
        )
        self._server.rtc_session(self._agent_entrypoint, on_session_end=self._on_session_end)
        self._server.on("worker_started", lambda: self._server_started.set())

    @property
    def enabled(self) -> bool:
        return self._enabled

    async def start(self) -> None:
        if not self._enabled or self._server_task:
            return

        self._server_task = asyncio.create_task(
            self._server.run(devmode=settings.debug, unregistered=True),
            name="tavus_agent_server",
        )
        self._server_task.add_done_callback(self._log_task_failure)
        await self._server_started.wait()
        logger.info("Tavus agent server started")

    async def stop(self) -> None:
        if not self._server_task:
            return
        await self._server.aclose()
        self._server_task = None
        logger.info("Tavus agent server stopped")

    async def ensure_avatar(self, room_name: str) -> None:
        if not self._enabled:
            return
        await self._server_started.wait()

        with self._lock:
            state = self._room_states.get(room_name)
            if state is None:
                state = _RoomState(queue=queue.Queue(), ready=threading.Event())
                self._room_states[room_name] = state
            if state.started:
                return
            state.started = True

        room_info = models.Room(name=room_name, sid=f"RM_{uuid.uuid4().hex}")
        try:
            await self._server.simulate_job(
                room=room_name,
                fake_job=False,
                agent_identity=f"tavus-agent-{room_name}",
                room_info=room_info,
            )
        except Exception:
            with self._lock:
                state.started = False
            raise

    def enqueue_text(self, room_name: str, text: str, t0_ms: float | None = None) -> None:
        if not self._enabled:
            return

        with self._lock:
            state = self._room_states.get(room_name)
        if not state:
            logger.warning("Tavus room state missing for %s", room_name)
            return

        state.queue.put((text, t0_ms))

    def close_room(self, room_name: str) -> None:
        with self._lock:
            state = self._room_states.get(room_name)
        if not state:
            return
        state.queue.put(None)

    async def _agent_entrypoint(self, ctx: JobContext) -> None:
        room_name = ctx.room.name
        logger.info("Tavus agent starting for room %s", room_name)

        with self._lock:
            state = self._room_states.get(room_name)
            if state is None:
                state = _RoomState(queue=queue.Queue(), ready=threading.Event())
                self._room_states[room_name] = state

        session = AgentSession()
        agent = Agent(instructions="You are a Tavus avatar relay.")
        avatar = tavus.AvatarSession(
            replica_id=settings.tavus_replica_id,
            persona_id=settings.tavus_persona_id,
            api_key=settings.tavus_api_key,
            api_url=settings.tavus_api_url,
            avatar_participant_name=settings.tavus_avatar_name,
        )

        await avatar.start(
            session,
            room=ctx.room,
            livekit_url=settings.livekit_url,
            livekit_api_key=settings.livekit_api_key,
            livekit_api_secret=settings.livekit_api_secret,
        )
        await session.start(
            agent,
            room=ctx.room,
            room_options=room_io.RoomOptions(
                audio_input=False,
                text_input=False,
                text_output=False,
                video_input=False,
            ),
        )
        state.ready.set()

        closed = asyncio.Event()

        def _on_close(_: object) -> None:
            closed.set()

        session.on("close", _on_close)

        current_handle = None
        while True:
            get_task = asyncio.get_running_loop().run_in_executor(None, state.queue.get)
            close_task = asyncio.create_task(closed.wait())
            done, _ = await asyncio.wait(
                {get_task, close_task}, return_when=asyncio.FIRST_COMPLETED
            )

            if close_task in done:
                get_task.cancel()
                break

            payload = get_task.result()
            close_task.cancel()
            if payload is None:
                ctx.shutdown("client_closed")
                break
            if isinstance(payload, tuple):
                text, t0_ms = payload
            else:
                text = payload
                t0_ms = None

            if current_handle and not current_handle.done():
                current_handle.interrupt(force=True)

            audio_stream = self._pcm_frames(room_name, text, t0_ms=t0_ms)
            current_handle = session.say(text, audio=audio_stream, add_to_chat_ctx=False)

        logger.info("Tavus agent stopped for room %s", room_name)

    async def _pcm_frames(self, room_name: str, text: str, t0_ms: float | None = None):
        sample_rate = settings.openai_tts_sample_rate
        num_channels = settings.openai_tts_channels
        bytes_per_sample = 2
        frame_samples = int(sample_rate * settings.openai_tts_frame_ms / 1000)
        frame_bytes = frame_samples * num_channels * bytes_per_sample

        buffer = bytearray()
        samples_sent = 0
        start_time = asyncio.get_running_loop().time()
        first_frame = True

        try:
            async for chunk in openai_tts_service.iter_pcm_bytes(text):
                if not chunk:
                    continue
                buffer.extend(chunk)

                while len(buffer) >= frame_bytes:
                    frame_data = bytes(buffer[:frame_bytes])
                    del buffer[:frame_bytes]
                    frame = rtc.AudioFrame(
                        data=frame_data,
                        sample_rate=sample_rate,
                        num_channels=num_channels,
                        samples_per_channel=frame_samples,
                    )
                    if first_frame and t0_ms is not None:
                        t1_ms = time.time() * 1000
                        logger.info(
                            "Tavus first frame published room=%s latency_ms=%.0f",
                            room_name,
                            t1_ms - t0_ms,
                        )
                        first_frame = False
                    samples_sent += frame_samples
                    yield frame
                    await self._pace_audio(samples_sent, sample_rate, start_time)
        except asyncio.CancelledError:
            return

        if buffer:
            remainder = len(buffer) - (len(buffer) % (bytes_per_sample * num_channels))
            if remainder > 0:
                frame_data = bytes(buffer[:remainder])
                samples = remainder // (bytes_per_sample * num_channels)
                frame = rtc.AudioFrame(
                    data=frame_data,
                    sample_rate=sample_rate,
                    num_channels=num_channels,
                    samples_per_channel=samples,
                )
                if first_frame and t0_ms is not None:
                    t1_ms = time.time() * 1000
                    logger.info(
                        "Tavus first frame published room=%s latency_ms=%.0f",
                        room_name,
                        t1_ms - t0_ms,
                    )
                    first_frame = False
                samples_sent += samples
                yield frame
                await self._pace_audio(samples_sent, sample_rate, start_time)

    async def _pace_audio(self, samples_sent: int, sample_rate: int, start_time: float) -> None:
        expected = samples_sent / sample_rate
        elapsed = asyncio.get_running_loop().time() - start_time
        if expected > elapsed:
            await asyncio.sleep(expected - elapsed)

    def _on_session_end(self, ctx: JobContext) -> None:
        room_name = ctx.room.name
        with self._lock:
            self._room_states.pop(room_name, None)

    def _log_task_failure(self, task: asyncio.Task) -> None:
        if task.cancelled():
            return
        exc = task.exception()
        if exc:
            logger.exception("Tavus agent server task failed", exc_info=exc)


TavusAgentService = TavusAvatarService
tavus_avatar_service = TavusAvatarService()
