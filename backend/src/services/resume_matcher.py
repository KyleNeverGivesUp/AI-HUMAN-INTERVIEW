"""
Resume to Job matching service using LLM with caching and multi-model support
"""
import json
import logging
import hashlib
from typing import Dict, Optional, Literal
from anthropic import Anthropic
from cachetools import TTLCache

from ..config.settings import settings

logger = logging.getLogger(__name__)

# Model type definition
ModelType = Literal["sonnet4"]

# TTL Cache: 24 hours, max 1000 entries
_match_cache = TTLCache(maxsize=1000, ttl=86400)


class ResumeMatcher:
    """Service for matching resumes to job descriptions using LLM with intelligent caching"""
    
    # Model configurations - Only Sonnet 4 works with proxy
    MODEL_CONFIGS = {
        "sonnet4": {
            "name": settings.anthropic_model_sonnet4,
            "max_tokens": 1500,
            "temperature": 0.3,
            "thinking_budget": 0,  # Disable thinking for speed
            "speed": "🚀",
            "description": "Claude Sonnet 4 (3-5s, with cache < 50ms)"
        }
    }
    
    def __init__(self, default_model: Optional[ModelType] = None):
        self.client = Anthropic(
            api_key=settings.anthropic_api_key,
            base_url=settings.anthropic_base_url if settings.anthropic_base_url else None
        )
        self.default_model = default_model or settings.anthropic_model_default
        logger.info(f"ResumeMatcher initialized with default model: {self.default_model}")
    
    def _get_cache_key(
        self, 
        resume_text: str, 
        job_id: str,
        model: str
    ) -> str:
        """
        Generate cache key based on resume content hash + job_id + model
        If resume content changes, hash changes -> cache miss
        """
        content_hash = hashlib.md5(resume_text.encode()).hexdigest()[:16]
        return f"match:{content_hash}:{job_id}:{model}"
    
    def _extract_resume_key_info(self, resume_text: str) -> str:
        """
        Extract key information from resume to reduce prompt size (Optimization 4)
        Focus on: skills, experience, education, projects
        """
        # For now, truncate very long resumes
        # TODO: Use NLP to extract structured info
        MAX_RESUME_LENGTH = 3000
        if len(resume_text) > MAX_RESUME_LENGTH:
            logger.info(f"Truncating resume from {len(resume_text)} to {MAX_RESUME_LENGTH} chars")
            return resume_text[:MAX_RESUME_LENGTH] + "\n... (truncated)"
        return resume_text
    
    async def analyze_match(
        self, 
        resume_text: str, 
        job_id: str,
        job_title: str,
        job_company: str,
        job_description: str,
        job_qualifications: list,
        job_responsibilities: list,
        model: Optional[ModelType] = None
    ) -> Dict:
        """
        Analyze resume-job match using LLM with intelligent caching
        
        Args:
            resume_text: Full resume content
            job_id: Unique job identifier
            job_title: Job title
            job_company: Company name
            job_description: Job description
            job_qualifications: List of qualifications
            job_responsibilities: List of responsibilities
            model: Model to use ('haiku' or 'sonnet4'), defaults to configured default
        
        Returns:
            {
                'matchScore': 85,
                'matchedSkills': ['Python', 'React'],
                'missingSkills': ['Kubernetes'],
                'strengths': ['Strong backend experience'],
                'gaps': ['Limited cloud experience'],
                'recommendations': ['Learn Kubernetes'],
                'cached': True/False,
                'model': 'haiku'
            }
        """
        # Select model
        selected_model = model or self.default_model
        if selected_model not in self.MODEL_CONFIGS:
            logger.warning(f"Unknown model {selected_model}, falling back to {self.default_model}")
            selected_model = self.default_model
        
        model_config = self.MODEL_CONFIGS[selected_model]
        
        # Check cache first (Optimization 5)
        cache_key = self._get_cache_key(resume_text, job_id, selected_model)
        
        if cache_key in _match_cache:
            logger.info(f"✅ Cache HIT for {job_id} with model {selected_model}")
            cached_result = _match_cache[cache_key]
            cached_result['cached'] = True
            cached_result['model'] = selected_model
            return cached_result
        
        logger.info(f"❌ Cache MISS for {job_id}, calling LLM with model {selected_model}")
        
        # Optimize resume content (Optimization 4)
        optimized_resume = self._extract_resume_key_info(resume_text)
        
        # Prepare qualifications and responsibilities text
        quals_text = "\n".join([f"- {q}" for q in job_qualifications]) if job_qualifications else "Not specified"
        resp_text = "\n".join([f"- {r}" for r in job_responsibilities]) if job_responsibilities else "Not specified"
        
        # Optimized prompt (shorter, more focused)
        prompt = f"""Analyze resume-job match and return JSON only.

RESUME:
{optimized_resume}

JOB:
{job_title} at {job_company}
{job_description}

QUALIFICATIONS:
{quals_text}

RESPONSIBILITIES:
{resp_text}

Return JSON:
{{
    "matchScore": <0-100>,
    "matchedSkills": [<matching skills>],
    "missingSkills": [<missing required skills>],
    "strengths": [<2-3 specific strengths>],
    "gaps": [<1-2 gaps>],
    "recommendations": [<1-2 actionable tips>]
}}"""

        try:
            # Call LLM with optimized parameters (Optimizations 1, 2, 3)
            response = self.client.messages.create(
                model=model_config["name"],
                max_tokens=model_config["max_tokens"],  # Optimization 3: Reduced from 2000
                temperature=model_config["temperature"],
                thinking={
                    "type": "enabled",
                    "budget_tokens": model_config["thinking_budget"]  # Optimization 2: Disable thinking
                },
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Extract JSON from response - handle both TextBlock and ThinkingBlock
            response_text = ""
            for block in response.content:
                if block.type == 'text' and hasattr(block, 'text'):
                    response_text = block.text.strip()
                    break
            
            if not response_text:
                raise ValueError("No text content found in API response")
            
            # Try to parse JSON
            try:
                result = json.loads(response_text)
            except json.JSONDecodeError:
                # If response has markdown code blocks, extract JSON
                if "```json" in response_text:
                    json_start = response_text.find("```json") + 7
                    json_end = response_text.find("```", json_start)
                    result = json.loads(response_text[json_start:json_end].strip())
                elif "```" in response_text:
                    json_start = response_text.find("```") + 3
                    json_end = response_text.find("```", json_start)
                    result = json.loads(response_text[json_start:json_end].strip())
                else:
                    raise
            
            # Add metadata
            result['cached'] = False
            result['model'] = selected_model
            
            # Store in cache (Optimization 5)
            _match_cache[cache_key] = result
            
            logger.info(
                f"✅ Match analysis completed: {result.get('matchScore')}% match "
                f"(model: {selected_model}, cached for 24h)"
            )
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing match with {selected_model}: {e}")
            # Return fallback result
            return {
                'matchScore': 0,
                'matchedSkills': [],
                'missingSkills': [],
                'strengths': ['Unable to analyze - please try again'],
                'gaps': [],
                'recommendations': [],
                'error': str(e),
                'cached': False,
                'model': selected_model
            }
    
    async def batch_analyze(
        self,
        resume_text: str,
        jobs: list,
        model: Optional[ModelType] = None
    ) -> list:
        """
        Analyze resume against multiple jobs with caching
        
        Args:
            resume_text: The resume content
            jobs: List of job dictionaries
            model: Model to use ('haiku' or 'sonnet4')
            
        Returns:
            List of match results for each job
        """
        results = []
        
        for job in jobs:
            match_result = await self.analyze_match(
                resume_text=resume_text,
                job_id=job['id'],
                job_title=job['title'],
                job_company=job['company'],
                job_description=job.get('description', ''),
                job_qualifications=job.get('qualifications', []),
                job_responsibilities=job.get('responsibilities', []),
                model=model
            )
            
            results.append({
                'jobId': job['id'],
                'jobTitle': job['title'],
                'jobCompany': job['company'],
                **match_result
            })
        
        return results
    
    @staticmethod
    def get_available_models() -> Dict[str, Dict]:
        """Get available models and their configurations"""
        return ResumeMatcher.MODEL_CONFIGS
    
    @staticmethod
    def clear_cache():
        """Clear the entire cache (for testing/debugging)"""
        _match_cache.clear()
        logger.info("Cache cleared")


# Global instance with default model
resume_matcher = ResumeMatcher()
