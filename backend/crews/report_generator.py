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
    role="Journal Search Specialist",
    goal="Retrieve relevant journal entries via semantic search.",
    backstory="""Use the semantic search tool and set dates appropriately.
Always use the exact JWT token from crew inputs.

QUERY POLICY (do not paraphrase):
1) Month/year summary → DATE-ONLY: query=null; start_date=first day; end_date=last day.
2) 'Latest'/'recent' → RECENCY: keyword like 'goals'|'goal'|'objective'|'OKR'; date window last 1–3 months.
3) 'When did I <do X>' → No dates unless provided; compact action/topic + synonyms: deploy|deployed|deployment|launch|released + relevant terms (e.g., python, kids app).
4) Keep queries ≤ 4 words; concrete; prefer nouns/verbs; drop filler.
5) If results are sparse, try one targeted variant. Do not change authentication or use placeholders.
""",
    tools=[search_tool],
    llm=llama_scout,
    verbose=True,
    allow_delegation=True,
    max_iter=5,
)

# Report Synthesis Specialist Agent
report_synthesizer = Agent(
    role="Report Analysis Specialist",
    goal="Create structured AIReport from search results with clear insights and recommendations.",
    backstory="Analyze search results and produce the AIReport with clear, actionable insights. No delegation.",
    llm=llama_70b,
    verbose=True,
    allow_delegation=False,
    max_iter=3,
)

# Step 1: Adaptive semantic search task
search_task = Task(
    description="""Search entries for '{prompt}'. Build an effective query (do not paraphrase).

DECISION RULES:
- Month summary: DATE-ONLY → query=null; start_date/end_date=month bounds.
- Latest/recency: concise keyword ('goals'|'goal'|'objective'|'OKR'); 1–3 month window.
- Event lookup: no date unless provided; focused keywords + synonyms (deploy|deployed|deployment|launch|released + 'python', 'kids app').
- Keep ≤4 words; prefer nouns/verbs; drop filler. If few results, try one variant.

MANDATORY TOOL PARAMS:
- query: phrase or null (not 'None' or '')
- user_token: EXACT '{user_token}'
- match_count: 10–15 (<=50)
- start_date/end_date: when time context exists

EXAMPLES:
- Month summary: {"query": null, "user_token": "{user_token}", "start_date": "2024-11-01", "end_date": "2024-11-30", "match_count": 15}
- Latest goals: {"query": "goals", "user_token": "{user_token}", "start_date": "<today-2mo>", "end_date": "<today>", "match_count": 15}
- Event lookup: {"query": "deploy python kids app", "user_token": "{user_token}", "match_count": 15}

Return JSON results (deduplicated) + brief strategy note.""",
    expected_output=(
        "JSON with deduplicated search results and strategy summary explaining search approach used."
    ),
    agent=search_agent,
)

# Step 2: Intelligent analysis and report synthesis task
generate_report_task = Task(
    description="""Create the final AIReport for '{prompt}' from search results. Do not delegate.

Output JSON with fields:
- title (str)
- summary (str)
- key_insights ([str])
- recommendations ([str])
- mood_analysis (str|null)
- confidence_score (float, 0.1–1.0)
- entries_analyzed (int)
- prompt_used (str: '{prompt}')
- keywords ([str]|null)

Return structured JSON only.""",

    expected_output="Structured AIReport with comprehensive analysis and actionable insights.",

    agent=report_synthesizer,
    context=[search_task],
    output_pydantic=AIReport,
)

# CrewAI crew for journal report generation (single crew)
crew = Crew(
    agents=[search_agent, report_synthesizer],
    tasks=[search_task, generate_report_task],
    verbose=True,
    process=Process.sequential,  # Tasks run in order: search then generate report
)