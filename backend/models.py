from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

class AIReport(BaseModel):
    """Simplified AI-generated report for journal analysis"""
    
    title: str = Field(..., description="Report title")
    summary: str = Field(..., description="Brief overview of findings")
    key_insights: List[str] = Field(default_factory=list, description="Main patterns/themes discovered")
    recommendations: List[str] = Field(default_factory=list, description="Actionable growth suggestions")
    mood_analysis: Optional[str] = Field(None, description="Emotional patterns if applicable")
    keywords: Optional[List[str]] = Field(None, description="Important terms from entries")
    entries_analyzed: int = Field(default=0, description="Count of entries reviewed")
    confidence_score: float = Field(default=0.5, ge=0.1, le=1.0, description="Analysis confidence")
    prompt_used: str = Field(..., description="Original user prompt")
    
    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "title": "Weekly Personal Growth Analysis",
                "summary": "Analysis of 12 journal entries reveals patterns of career growth and improved stress management.",
                "key_insights": ["Increased career confidence", "Better stress coping strategies", "Stronger relationships"],
                "recommendations": ["Continue documenting daily wins", "Explore meditation practices", "Schedule regular reflection time"],
                "mood_analysis": "Generally optimistic with improving trend over the week",
                "keywords": ["promotion", "meditation", "exercise", "family", "goals"],
                "entries_analyzed": 12,
                "confidence_score": 0.82,
                "prompt_used": "Analyze my mood patterns and personal growth over the last week"
            }
        }

class AIReportRequest(BaseModel):
    """Request model for generating AI reports"""
    prompt: str = Field(..., description="User's analysis request", max_length=500)
    preferred_analysis_types: Optional[List[str]] = Field(None, description="Suggested analysis types (AI can generate others as needed)", max_items=3)
    date_range_days: Optional[int] = Field(30, ge=1, le=365, description="Number of days back to analyze")
    user_id: str = Field(..., description="User identifier")
    user_token: str = Field(..., description="User's Supabase JWT. Used so RLS restricts results to the user")
    match_count: Optional[int] = Field(10, ge=1, le=50, description="Number of semantic search matches to use (1-50)")
    
class AIReportResponse(BaseModel):
    """Response wrapper for AI report generation"""
    success: bool = Field(..., description="Whether the report generation was successful")
    report: Optional[AIReport] = Field(None, description="Generated report (if successful)")
    error_message: Optional[str] = Field(None, description="Error message (if unsuccessful)")
    processing_time_seconds: Optional[float] = Field(None, description="Time taken to generate the report")

# Note: Semantic search Pydantic models were removed. The functionality now lives within the
# unified report generation crew and the internal tool at `backend/tools/semantic_search.py`.
