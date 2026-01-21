import asyncio
import hashlib
import logging
from pathlib import Path

import aiofiles
import edge_tts
from imageio_ffmpeg import get_ffmpeg_exe

from ..config.settings import settings

logger = logging.getLogger(__name__)


class EdgeTTSService:
    def __init__(self) -> None:
        base_dir = Path(__file__).resolve().parents[2]
        self._static_dir = base_dir / settings.static_dir
        self._cache_dir = base_dir / settings.tts_cache_dir
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        self._static_dir.mkdir(parents=True, exist_ok=True)
        self._ffmpeg_path = get_ffmpeg_exe()

    def _build_cache_key(self, text: str) -> str:
        key = "|".join(
            [
                settings.edge_tts_voice,
                settings.edge_tts_rate,
                settings.edge_tts_volume,
                settings.edge_tts_pitch,
                text.strip(),
            ]
        )
        return hashlib.sha256(key.encode("utf-8")).hexdigest()

    def _build_filename(self, text: str) -> str:
        return f"{self._build_cache_key(text)}.mp3"

    def _build_audio_url(self, filename: str) -> str:
        rel_path = None
        try:
            rel_path = (self._cache_dir / filename).resolve().relative_to(self._static_dir.resolve())
        except ValueError:
            rel_path = Path("audio") / filename
        return f"{settings.static_url_path}/{rel_path.as_posix()}"

    async def iter_pcm_bytes(self, text: str):
        filename = self._build_filename(text)
        file_path = self._cache_dir / filename

        if file_path.exists():
            logger.info("Using cached TTS audio: %s", filename)
            async for chunk in self._yield_pcm_from_mp3(file_path):
                yield chunk
            return

        try:
            async for chunk in self._stream_pcm_from_edge_tts(text, file_path):
                yield chunk
        except Exception:
            if file_path.exists():
                file_path.unlink()
            raise
        else:
            logger.info("Generated TTS audio: %s", filename)

    async def _stream_pcm_from_edge_tts(self, text: str, file_path: Path):
        cmd = [
            self._ffmpeg_path,
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            "pipe:0",
            "-f",
            "s16le",
            "-acodec",
            "pcm_s16le",
            "-ar",
            str(settings.openai_tts_sample_rate),
            "-ac",
            str(settings.openai_tts_channels),
            "pipe:1",
        ]
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        assert process.stdin is not None
        assert process.stdout is not None

        communicate = edge_tts.Communicate(
            text,
            settings.edge_tts_voice,
            rate=settings.edge_tts_rate,
            volume=settings.edge_tts_volume,
            pitch=settings.edge_tts_pitch,
        )

        async def _feed_stdin():
            async with aiofiles.open(file_path, "wb") as handle:
                async for message in communicate.stream():
                    if message.get("type") != "audio":
                        continue
                    data = message["data"]
                    await handle.write(data)
                    process.stdin.write(data)
                    await process.stdin.drain()
            process.stdin.close()

        feed_task = asyncio.create_task(_feed_stdin())
        feed_error = None
        try:
            while True:
                chunk = await process.stdout.read(settings.openai_tts_chunk_bytes)
                if not chunk:
                    break
                yield chunk
        finally:
            if not feed_task.done():
                feed_task.cancel()
            try:
                await feed_task
            except asyncio.CancelledError:
                pass
            except Exception as exc:
                feed_error = exc
            if process.stdin and not process.stdin.is_closing():
                process.stdin.close()
            stderr_output = b""
            if process.stderr:
                stderr_output = await process.stderr.read()
            returncode = await process.wait()
            if returncode != 0:
                logger.error("ffmpeg decode failed (%s): %s", returncode, stderr_output.decode())
            if feed_error:
                raise feed_error

    async def _yield_pcm_from_mp3(self, file_path: Path):
        cmd = [
            self._ffmpeg_path,
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(file_path),
            "-f",
            "s16le",
            "-acodec",
            "pcm_s16le",
            "-ar",
            str(settings.openai_tts_sample_rate),
            "-ac",
            str(settings.openai_tts_channels),
            "pipe:1",
        ]
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            assert process.stdout is not None
            while True:
                chunk = await process.stdout.read(settings.openai_tts_chunk_bytes)
                if not chunk:
                    break
                yield chunk
        finally:
            stderr_output = b""
            if process.stderr:
                stderr_output = await process.stderr.read()
            returncode = await process.wait()
            if returncode != 0:
                logger.error("ffmpeg decode failed (%s): %s", returncode, stderr_output.decode())


openai_tts_service = EdgeTTSService()
