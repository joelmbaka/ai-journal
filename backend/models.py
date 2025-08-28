from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

class KeyInsight(BaseModel):
    """Individual insight or finding from the analysis"""
    title: str = Field(..., description="Brief title for the insight", max_length=100)
    description: str = Field(..., description="Detailed explanation of the insight", max_length=500)
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score for this insight (0-1)")
    
class Recommendation(BaseModel):
    """Actionable recommendation based on analysis"""
    action: str = Field(..., description="Specific action to take", max_length=200)
    priority: Literal["high", "medium", "low"] = Field(..., description="Priority level of the recommendation")
    rationale: str = Field(..., description="Why this recommendation is suggested", max_length=300)

class MoodPattern(BaseModel):
    """Mood pattern analysis"""
    dominant_mood: str = Field(..., description="Most prevalent mood identified", max_length=50)
    trend: Literal["improving", "declining", "stable", "mixed"] = Field(..., description="Overall mood trend")
    frequency: int = Field(..., ge=0, description="Number of entries with this mood pattern")

class AIReport(BaseModel):
    """Structured AI-generated report for journal analysis"""
    
    # Core Report Information
    title: str = Field(..., description="Report title (auto-generated based on analysis)", max_length=150)
    summary: str = Field(..., description="Executive summary of the analysis", max_length=1000)
    analysis_type: List[str] = Field(..., description="Types of analysis performed (AI-generated categories like 'mood patterns', 'emotional intelligence', 'goal tracking', 'stress analysis', 'productivity insights', etc.)", min_items=1, max_items=5)
    
    # Analysis Results
    key_insights: List[KeyInsight] = Field(..., description="Main insights discovered", min_items=1, max_items=10)
    recommendations: List[Recommendation] = Field(..., description="Actionable recommendations", min_items=0, max_items=8)
    
    # Specific Analysis Types
    mood_patterns: Optional[List[MoodPattern]] = Field(None, description="Mood analysis results (if applicable)")
    themes_identified: Optional[List[str]] = Field(None, description="Major themes found in writing", max_items=15)
    keywords: Optional[List[str]] = Field(None, description="Important keywords/topics", max_items=20)
    
    # Metadata
    entries_analyzed: int = Field(..., ge=0, description="Number of journal entries analyzed")
    date_range_start: Optional[str] = Field(None, description="Start date of analysis period (ISO format)")
    date_range_end: Optional[str] = Field(None, description="End date of analysis period (ISO format)")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Overall confidence in the analysis")
    
    # User Context
    prompt_used: str = Field(..., description="Original user prompt that triggered this analysis", max_length=500)
    user_focus_areas: Optional[List[str]] = Field(None, description="Areas user specifically wanted to focus on", max_items=10)
    
    class Config:
        """Pydantic configuration"""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        json_schema_extra = {
            "example": {
                "title": "Weekly Mood Analysis - Personal Growth Trends",
                "summary": "Analysis of 12 journal entries from the past week reveals strong patterns of personal growth and increasing emotional awareness. Key themes include career development, relationship improvements, and stress management strategies.",
                "analysis_type": ["mood patterns", "personal growth", "emotional intelligence"],
                "key_insights": [
                    {
                        "title": "Positive Career Momentum",
                        "description": "Your journal entries show increasing confidence and satisfaction with career decisions over the past week.",
                        "confidence": 0.85
                    },
                    {
                        "title": "Improved Stress Management",
                        "description": "Evidence of more effective coping strategies when dealing with challenging situations.",
                        "confidence": 0.78
                    }
                ],
                "recommendations": [
                    {
                        "action": "Continue documenting daily wins and progress",
                        "priority": "high",
                        "rationale": "This practice is clearly contributing to increased confidence and motivation"
                    },
                    {
                        "action": "Explore deeper reflection on stress triggers",
                        "priority": "medium",
                        "rationale": "Understanding triggers could further improve your stress management abilities"
                    }
                ],
                "mood_patterns": [
                    {
                        "dominant_mood": "optimistic",
                        "trend": "improving",
                        "frequency": 8
                    }
                ],
                "themes_identified": ["career growth", "personal development", "stress management", "relationships"],
                "keywords": ["promotion", "meditation", "exercise", "family", "goals"],
                "entries_analyzed": 12,
                "date_range_start": "2025-08-18T00:00:00",
                "date_range_end": "2025-08-25T00:00:00",
                "confidence_score": 0.82,
                "prompt_used": "Analyze my mood patterns and personal growth over the last week",
                "user_focus_areas": ["mood", "personal growth", "stress management"]
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
