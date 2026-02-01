import asyncio
import logging
import time
from typing import Optional

from .avatar import tavus_avatar_service
from .livekit_service import livekit_service
from .local_skills_registry import get_skill_by_id
from .openai_tts_service import openai_tts_service
from .anthropic_skills_service import generate_response
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
        job_id: Optional[str] = None,
        resume_id: Optional[str] = None,
    ) -> dict:
        """Create a new LiveKit session for the client."""
        try:
            logger.info("Creating LiveKit room: %s", room_name)
            await self.livekit.create_room(room_name)
            token = self.livekit.create_token(room_name, participant_name)

            # Load interview context if provided
            job_context = None
            resume_context = None
            default_question = None
            skill_id = None
            skill_body = None
            
            if job_id and resume_id:
                # Import here to avoid circular dependency
                from ..database import get_db
                from ..models.job import Job
                from ..models.resume import Resume
                
                db = next(get_db())
                
                # Get job
                job = db.query(Job).filter(Job.id == job_id).first()
                if job:
                    job_dict = job.to_dict()
                    job_context = {
                        "title": job_dict['title'],
                        "company": job_dict['company'],
                        "description": job_dict['description'],
                        "qualifications": job_dict['qualifications'],
                        "responsibilities": job_dict['responsibilities']
                    }
                    
                    # Auto-match skill based on job title
                    skill_id, role_label = self._match_role_to_skill(job_dict['title'])
                    if skill_id:
                        skill = get_skill_by_id(skill_id)
                        if skill:
                            skill_body = skill['body']
                            logger.info(f"Auto-matched skill: {skill_id} ({role_label}) for job: {job_dict['title']}")
                        else:
                            logger.warning(f"Skill {skill_id} not found in registry")
                    else:
                        logger.warning(f"Could not auto-match skill for job title: {job_dict['title']}")
                    
                    default_question = job.default_question
                    
                    # Generate default question if not exists
                    if not default_question:
                        from ..services.interview_question_generator import question_generator
                        default_question = await question_generator.generate_default_question(
                            job_title=job_dict['title'],
                            job_company=job_dict['company'],
                            job_description=job_dict['description'],
                            job_qualifications=job_dict['qualifications'],
                            job_responsibilities=job_dict['responsibilities']
                        )
                        job.default_question = default_question
                        db.commit()
                    
                    logger.info(f"Loaded job context for interview: {job_dict['title']} at {job_dict['company']}")
                
                # Get resume
                resume = db.query(Resume).filter(Resume.id == resume_id).first()
                if resume and resume.parsed_data:
                    resume_context = resume.parsed_data
                    logger.info(f"Loaded resume context for interview: {len(resume_context)} chars")
            
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
                "skill_id": skill_id,  # Auto-matched skill
                "role_label": None,
                "role_prompted": False,
                "job_context": job_context,  # JD context for interview
                "resume_context": resume_context,  # Resume context for interview
                "default_question": default_question,  # First question from cache
                "skill_body": skill_body,  # Skill content for context
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
        """Process text via skill selection and Anthropic LLM -> TTS streaming into LiveKit."""
        try:
            session = self.active_sessions.get(room_name)
            if not session:
                raise ValueError(f"Session {room_name} not found")

            turn_count = int(session.get("turn_count", 0)) + 1
            session["turn_count"] = turn_count

            # Handle first greeting with interview context
            if not session.get("greeted") and session.get("job_context"):
                session["greeted"] = True
                job_title = session["job_context"]["title"]
                company = session["job_context"]["company"]
                
                # Generate JD-matched first question using skill context
                if session.get("skill_body") and session.get("resume_context"):
                    # Generate skill-based JD match question
                    first_question = await self._generate_jd_match_question(session)
                    greeting = f"Hello {session['participant_name']}, welcome to your interview for the {job_title} position at {company}. Let's get started. {first_question}"
                elif session.get("default_question"):
                    # Fallback to cached default question
                    greeting = f"Hello {session['participant_name']}, welcome to your interview for the {job_title} position at {company}. Let's get started. {session['default_question']}"
                else:
                    # Fallback to simple greeting
                    greeting = f"Hello {session['participant_name']}, welcome to your interview for the {job_title} position at {company}. Please introduce yourself."
                
                session["question_count"] = 1
                
                logger.info("Sending interview greeting with JD-matched question: %s", greeting[:100])
                
                # Stream to audio
                use_tavus = settings.use_tavus and self.tavus.enabled
                if use_tavus:
                    try:
                        await self.tavus.ensure_avatar(room_name)
                        self.tavus.enqueue_text(room_name, greeting, t0_ms=t0_ms)
                    except Exception as e:
                        logger.warning("Tavus enqueue failed; falling back to TTS: %s", e)
                        use_tavus = False
                
                if not use_tavus:
                    existing_task = session.get("tts_task")
                    if existing_task and not existing_task.done():
                        existing_task.cancel()
                    
                    tts_task = asyncio.create_task(
                        self._stream_tts_to_livekit(room_name, greeting, t0_ms=t0_ms)
                    )
                    self._track_task(room_name, tts_task, "tts_task")
                
                return {
                    "session_id": room_name,
                    "response": greeting,
                    "audio_url": None,
                    "video_url": None,
                }

            used_skill = False
            
            # If interview context exists, skip skills selection and use JD+Resume directly
            if session.get("job_context") and session.get("resume_context"):
                response_text = await self._generate_response(
                    session=session,
                    text=text,
                    greeted=bool(session.get("greeted")),
                    question_count=int(session.get("question_count", 0)),
                    turn_count=turn_count,
                )
                used_skill = False
            elif settings.use_skills:
                response_text, used_skill = await self._handle_skills_flow(session, text)
                if response_text is None:
                    response_text = await self._generate_response(
                        session=session,
                        text=text,
                        greeted=bool(session.get("greeted")),
                        question_count=int(session.get("question_count", 0)),
                        turn_count=turn_count,
                    )
                    used_skill = False
            else:
                response_text = await self._generate_response(
                    session=session,
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
        if "product owner" in normalized or "product manager" in normalized or "pm" in normalized:
            return "product-interview", "Product"
        if "fullstack" in normalized or "full stack" in normalized:
            return "fullstack-interview", "Fullstack"
        if "frontend" in normalized or "front end" in normalized or "front-end" in normalized:
            return "frontend-interview", "Frontend"
        if "backend" in normalized or "back end" in normalized or "back-end" in normalized:
            return "backend-interview", "Backend"
        if "software engineer" in normalized or "swe" in normalized:
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
    
    async def _generate_jd_match_question(self, session: dict) -> str:
        """Generate a JD-matched first question using skill context."""
        job_ctx = session.get("job_context")
        resume_ctx = session.get("resume_context")
        skill_body = session.get("skill_body")
        
        if not (job_ctx and resume_ctx and skill_body):
            return session.get("default_question", "Please introduce yourself and your background.")
        
        # Extract key requirements from JD
        jd_summary = f"{job_ctx['title']} at {job_ctx['company']}"
        jd_description = job_ctx.get('description', '')[:200]
        jd_qualifications = ', '.join(job_ctx.get('qualifications', [])[:3])
        
        # Extract key points from resume (first 600 chars)
        resume_summary = resume_ctx[:600]
        
        # System prompt to generate JD-matched question based on skill template
        system_content = f"""You are an experienced interviewer following this interview guide:

{skill_body}

JOB DETAILS:
- Position: {jd_summary}
- Description: {jd_description}...
- Key Requirements: {jd_qualifications}

CANDIDATE RESUME (Summary):
{resume_summary}...

TASK:
Based on the "JD Match Question" template in the interview guide above, generate ONE specific opening question (max 30 words) that:
1. Connects a specific skill/experience from the candidate's resume to a specific requirement from the job description
2. Follows the style and focus areas defined in the interview guide
3. Is conversational and engaging
4. Shows you've read their resume carefully

Return ONLY the question, nothing else."""

        user_content = "Generate the first JD-matched interview question."
        
        def _call_llm() -> str:
            return generate_response(system_content, user_content, temperature=0.3)
        
        try:
            question = await asyncio.to_thread(_call_llm)
            logger.info(f"Generated JD-matched question: {question[:80]}...")
            return question.strip()
        except Exception as e:
            logger.error(f"Failed to generate JD-matched question: {e}")
            return session.get("default_question", "Can you tell me about your relevant experience for this role?")

    async def _generate_response(
        self,
        session: dict,
        text: str,
        greeted: bool,
        question_count: int,
        turn_count: int,
    ) -> str:
        max_turns = 7
        if turn_count >= max_turns:
            return FINISH_MESSAGE

        max_questions = 5
        
        # Check if we have interview context
        has_interview_context = session.get("job_context") and session.get("resume_context")

        if not greeted:
            if has_interview_context:
                # Should not reach here if default question is used
                system_content = (
                    "You are an interview expert. You are an HR at a high-tech company. "
                    "Greet the candidate, introduce yourself as Amanda, say the interview starts now. "
                    "Keep it within 15 words in English."
                )
            else:
                system_content = (
                    "You are an interview expert. You are an HR at a high-tech company interviewing a software engineer. "
                    "Greet the candidate, introduce yourself as Amanda, say the interview starts now, and ask them to introduce themselves. "
                    "Keep it within 20 words in English."
                )
        else:
            next_q_num = question_count + 1
            
            if has_interview_context:
                # Generate question based on Skill + JD + Resume + previous answers
                job_ctx = session["job_context"]
                resume_ctx = session["resume_context"]
                skill_body = session.get("skill_body", "")
                
                # Build context-aware system prompt with skill guide
                system_content = f"""You are an experienced technical interviewer conducting a job interview."""
                
                # Add skill context if available
                if skill_body:
                    system_content += f"""

INTERVIEW GUIDE:
{skill_body}

Follow the interview style, focus areas, and question types defined in the guide above."""
                
                system_content += f"""

JOB DETAILS:
- Position: {job_ctx['title']} at {job_ctx['company']}
- Description: {job_ctx['description'][:300]}...
- Key Qualifications: {', '.join(job_ctx['qualifications'][:5]) if job_ctx['qualifications'] else 'N/A'}

CANDIDATE RESUME (Summary):
{resume_ctx[:800]}...

INSTRUCTIONS:
- You are asking question #{next_q_num} of {max_questions}
- Base your question on the job requirements and candidate's background
- Follow the interview focus areas from the guide
- Ask ONE specific, relevant question (max 25 words)
- Focus on technical skills, experience, or problem-solving
- Be conversational and professional
- DO NOT repeat previous questions
- Respond in English only"""
            else:
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
