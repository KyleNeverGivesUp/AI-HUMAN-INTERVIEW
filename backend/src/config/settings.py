from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    
    # LiveKit Configuration
    livekit_url: str = "ws://localhost:7880"
    livekit_api_key: str = ""
    livekit_api_secret: str = ""
    
    # OpenAI TTS Configuration
    openai_api_key: str = ""
    openai_tts_endpoint: str = "https://api.openai.com/v1/audio/speech"
    openai_tts_model: str = "gpt-4o-mini-tts"
    openai_tts_voice: str = "alloy"
    openai_tts_format: str = "pcm"
    openai_tts_sample_rate: int = 24000
    openai_tts_channels: int = 1
    openai_tts_frame_ms: int = 20
    openai_tts_chunk_bytes: int = 8192

    # Edge TTS Configuration
    edge_tts_voice: str = "zh-CN-XiaoxiaoNeural"
    edge_tts_rate: str = "+0%"
    edge_tts_volume: str = "+0%"
    edge_tts_pitch: str = "+0Hz"

    # OpenRouter LLM Configuration
    openrouter_api_key: str = ""
    openrouter_model: str = ""
    app_origin: str = "http://localhost:8000"
    app_name: str = "My-FastAPI-App"

    # Tavus Configuration
    tavus_api_key: str = ""
    tavus_api_url: str = "https://tavusapi.com"
    tavus_replica_id: str = ""
    tavus_persona_id: str = ""
    tavus_avatar_name: str = "tavus-avatar-agent"
    use_tavus: bool = True

    # Static files
    static_dir: str = "static"
    static_url_path: str = "/static"
    tts_cache_dir: str = "static/audio"

    # CORS Configuration
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
