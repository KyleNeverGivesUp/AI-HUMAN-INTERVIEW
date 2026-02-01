"""
Interview evaluation service using LLM
"""
import logging
from anthropic import Anthropic
from ..config.settings import settings

logger = logging.getLogger(__name__)


class InterviewEvaluator:
    """Service to evaluate interview performance using LLM"""
    
    def __init__(self):
        self.client = Anthropic(
            api_key=settings.anthropic_api_key,
            base_url=settings.anthropic_base_url if settings.anthropic_base_url else None
        )
        self.model = settings.anthropic_model_sonnet4
    
    async def evaluate_interview(
        self,
        conversation_history: list,
        job_title: str = None,
        job_company: str = None,
        job_description: str = None
    ) -> dict:
        """
        Evaluate interview performance based on conversation history
        
        Returns:
        {
            "overallScore": 85,
            "technicalScore": 88,
            "communicationScore": 82,
            "problemSolvingScore": 86,
            "strengths": ["Clear explanations", "Good examples"],
            "areasForImprovement": ["More technical depth", "Be more concise"],
            "detailedFeedback": "Overall...",
            "recommendations": ["Practice system design", "Work on conciseness"]
        }
        """
        
        # Build context
        job_context = ""
        if job_title and job_company:
            job_context = f"\n\nINTERVIEW CONTEXT:\n- Position: {job_title} at {job_company}"
            if job_description:
                job_context += f"\n- Job Focus: {job_description[:200]}..."
        
        # Format conversation
        conversation_text = self._format_conversation(conversation_history)
        
        # Build evaluation prompt
        prompt = f"""You are an experienced technical interviewer evaluating a candidate's interview performance.

{job_context}

CONVERSATION TRANSCRIPT:
{conversation_text}

TASK: Evaluate the candidate's performance across three dimensions:

1. **Technical Knowledge** (0-100): Understanding of technical concepts, accuracy of answers, depth of knowledge
2. **Communication Skills** (0-100): Clarity of expression, structure of answers, listening skills, professionalism
3. **Problem-Solving Approach** (0-100): Logical thinking, methodology, handling of complex questions, creativity

Provide your evaluation in JSON format:
{{
  "overallScore": <average of 3 dimensions, 0-100>,
  "technicalScore": <0-100>,
  "communicationScore": <0-100>,
  "problemSolvingScore": <0-100>,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areasForImprovement": ["area 1", "area 2", "area 3"],
  "detailedFeedback": "<2-3 paragraph detailed analysis>",
  "recommendations": ["actionable advice 1", "actionable advice 2", "actionable advice 3"]
}}

Be constructive, specific, and actionable in your feedback. Consider the interview context if provided.
Return ONLY the JSON object, no other text."""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Extract text from response
            response_text = ""
            for block in response.content:
                if block.type == 'text' and hasattr(block, 'text'):
                    response_text = block.text.strip()
                    break
            
            # Parse JSON
            import json
            
            # Find JSON in response
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                evaluation = json.loads(json_str)
                
                logger.info(f"Interview evaluation completed: overall={evaluation.get('overallScore', 0)}")
                return evaluation
            else:
                raise ValueError("No JSON found in response")
                
        except Exception as e:
            logger.error(f"Failed to evaluate interview: {e}")
            # Return default evaluation on error
            return {
                "overallScore": 0,
                "technicalScore": 0,
                "communicationScore": 0,
                "problemSolvingScore": 0,
                "strengths": ["Unable to evaluate"],
                "areasForImprovement": ["Evaluation failed"],
                "detailedFeedback": f"Failed to generate evaluation: {str(e)}",
                "recommendations": ["Please try again later"]
            }
    
    def _format_conversation(self, conversation_history: list) -> str:
        """Format conversation history for evaluation"""
        formatted = []
        
        for msg in conversation_history:
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')
            
            if role == 'interviewer':
                formatted.append(f"INTERVIEWER: {content}")
            elif role == 'candidate':
                formatted.append(f"CANDIDATE: {content}")
            else:
                formatted.append(f"{role.upper()}: {content}")
        
        return "\n\n".join(formatted)


# Singleton instance
interview_evaluator = InterviewEvaluator()
