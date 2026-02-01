"""
Interview question generator service using LLM
"""
import logging
from anthropic import Anthropic
from ..config.settings import settings

logger = logging.getLogger(__name__)


class InterviewQuestionGenerator:
    """Generate interview questions based on job description"""
    
    def __init__(self):
        self.client = Anthropic(
            api_key=settings.anthropic_api_key,
            base_url=settings.anthropic_base_url if settings.anthropic_base_url else None
        )
        self.model = settings.anthropic_model
    
    async def generate_default_question(
        self,
        job_title: str,
        job_company: str,
        job_description: str,
        job_qualifications: list,
        job_responsibilities: list
    ) -> str:
        """
        Generate a default opening question for the job
        
        Returns:
            A single opening question string
        """
        
        quals_text = "\n".join([f"- {q}" for q in job_qualifications]) if job_qualifications else "Not specified"
        resp_text = "\n".join([f"- {r}" for r in job_responsibilities]) if job_responsibilities else "Not specified"
        
        prompt = f"""You are an experienced technical interviewer. Generate ONE excellent opening question for this job interview.

JOB DETAILS:
Position: {job_title} at {job_company}
Description: {job_description}

Required Qualifications:
{quals_text}

Key Responsibilities:
{resp_text}

Generate a single, engaging opening question that:
1. Is relevant to the role and company
2. Helps assess the candidate's genuine interest and understanding
3. Is open-ended and encourages detailed response
4. Is professional yet conversational

Return ONLY the question text, nothing else."""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=200,
                temperature=0.7,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Extract text from response
            question = ""
            for block in response.content:
                if block.type == 'text' and hasattr(block, 'text'):
                    question = block.text.strip()
                    break
            
            if not question:
                raise ValueError("No text content in API response")
            
            logger.info(f"Generated default question for {job_title}: {question[:50]}...")
            return question
            
        except Exception as e:
            logger.error(f"Error generating default question: {e}")
            # Fallback question
            return f"Can you tell me about your interest in this {job_title} position and what makes you a good fit?"


# Global instance
question_generator = InterviewQuestionGenerator()
