"""
CrewAI crew for generating personalized journal analysis reports.
This crew takes user prompts and journal entries to create insightful AI-powered reports.
"""

from crewai import Agent, Task, Crew, Process
from llms import llama_70b, llama_maverick, llama_scout
from models import AIReport
from tools.semantic_search import SemanticSearchJournalTool

# Semantic search tool-driven agent (first step)
search_tool = SemanticSearchJournalTool()

search_agent = Agent(
    role="Journal Semantic Searcher",
    goal=(
        "Use the semantic search tool to fetch the most relevant journal entries for the user, "
        "returning ONLY the tool's raw JSON output."
    ),
    backstory=(
        "You specialize in retrieving relevant entries using semantic search. Always call the tool with "
        "the provided inputs and return ONLY the tool's JSON output."
    ),
    tools=[search_tool],
    llm=llama_scout,
    verbose=True,
    allow_delegation=False,
)

# Report Synthesis Specialist Agent
report_synthesizer = Agent(
    role="Insight Synthesis & Report Generation Specialist",
    goal="Transform raw analysis findings into structured, actionable, and inspiring personal development reports.",
    backstory="""You are an expert in translating complex psychological and behavioral insights into clear, actionable, and motivating reports. You specialize in:
    
    - Creating compelling report narratives that resonate with individuals
    - Structuring insights in order of importance and relevance
    - Generating specific, achievable recommendations for personal growth
    - Balancing honest feedback with encouraging and supportive language
    - Highlighting progress, strengths, and positive patterns
    - Identifying areas for improvement without being judgmental
    - Making complex psychological concepts accessible and practical
    - Ensuring reports feel personal, relevant, and empowering
    
    You understand that people seek self-knowledge to grow and improve, so you craft reports that inspire action while acknowledging current realities.""",
    llm=llama_70b,
    verbose=True,
    allow_delegation=False,
)

# Step 1: Semantic search task using the tool
search_task = Task(
    description=(
        "Call the tool 'Semantic Search Journal Entries' with EXACTLY these inputs and return ONLY the tool's raw JSON string. No extra text.\n"
        "query={prompt}\n"
        "match_count={match_count}\n"
        "user_token={user_token}"
    ),
    expected_output=(
        "Exactly the tool's JSON string, e.g. {\"results\": [{\"id\": ..., \"client_id\": ..., \"title\": ..., \"date\": ..., \"similarity\": ...}]}"
        " or {\"error\": \"...\"}"
    ),
    agent=search_agent,
)

# Step 2: Report generation and synthesis task
generate_report_task = Task(
    description="""RETURN FORMAT: Return ONLY one JSON object (no code fences, no extra text) that matches the AIReport Pydantic schema exactly.

    Inputs:
    - USER PROMPT: {prompt}
    - SEARCH RESULTS (JSON string from previous task)
    - PREFERRED ANALYSIS TYPES: {preferred_analysis_types}

    Requirements:
    - Produce a concise, actionable report grounded in the prompt and any valid search results.
    - Keys must be exactly:
      title, summary, analysis_type, key_insights, recommendations, mood_patterns (optional),
      themes_identified (optional), keywords (optional), entries_analyzed, date_range_start (optional),
      date_range_end (optional), confidence_score, prompt_used, user_focus_areas (optional).
    
    NESTED OBJECT SCHEMAS (CRITICAL - use exact field names):
    - key_insights: Array of objects with exact structure:
      {"title": "Brief insight title", "description": "Detailed explanation", "confidence": 0.8}
      DO NOT use "insight" - must be "title" and "description"
    - recommendations: Array of objects with exact structure:
      {"action": "Specific action to take", "priority": "medium", "rationale": "Why this is suggested"}
      DO NOT use "text" - must be "action" and "rationale"
    - mood_patterns (optional): Array of objects:
      {"dominant_mood": "optimistic", "trend": "improving", "frequency": 5}
    
    - ENUM RULES (strict):
      - recommendation.priority must be one of: "high", "medium", "low" (lowercase only).
      - mood_patterns[].trend must be one of: "improving", "declining", "stable", "mixed" (lowercase only).
    - If unsure, default to: recommendation.priority="medium" and mood_patterns[].trend="mixed".

    Fallback rules:
    - If SEARCH RESULTS has an "error" field or is not valid JSON: still produce a valid AIReport using only the USER PROMPT and PREFERRED ANALYSIS TYPES.
    - In fallback: set entries_analyzed=0, confidence_score in [0.3, 0.6], and omit date_range_start/date_range_end.

    Style:
    - Personalized, actionable, balanced, and supportive. Keep the summary under 1000 characters.
    """,

    expected_output=(
        "A single JSON object strictly conforming to AIReport with clear title, concise summary, 1-5 analysis types, "
        "3-10 key insights (with confidence), 0-8 actionable recommendations, optional patterns/themes/keywords, "
        "accurate metadata (entries_analyzed, confidence_score), and the original prompt captured in prompt_used."
    ),

    agent=report_synthesizer,
    context=[search_task],  # Uses output from the semantic search task
)

# CrewAI crew for journal report generation (single crew)
crew = Crew(
    agents=[search_agent, report_synthesizer],
    tasks=[search_task, generate_report_task],
    verbose=True,
    process=Process.sequential,  # Tasks run in order: search then generate report
)