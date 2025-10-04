from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json
from models import (
    AIReportRequest, AIReportResponse, AIReport,
)
from crews.report_generator import crew as report_crew
import time

app = FastAPI()

# CORS: allow dev clients (Expo Web/Native over LAN). For production, restrict to known origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: tighten in production
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint used as a basic health-check."""
    return {"message": "Hello from AI Journal Backend!", "status": "healthy"}


# Endpoint for generating AI journal reports
@app.post("/generate-report", response_model=AIReportResponse, tags=["AI Reports"])
async def generate_ai_report(request: AIReportRequest):
    """Generate an AI-powered journal analysis report using CrewAI."""
    start_time = time.time()
    
    try:
        # Prepare inputs for the CrewAI crew
        crew_inputs = {
            "prompt": request.prompt,
            "user_id": request.user_id,
            "date_range_days": request.date_range_days,
            "preferred_analysis_types": request.preferred_analysis_types or [],
            # unified crew: pass auth token for RLS (match_count decided dynamically by agent)
            "user_token": request.user_token,
        }
        
        # Run the CrewAI report generation crew
        result = report_crew.kickoff(inputs=crew_inputs)
        
        processing_time = time.time() - start_time
        
        # Prefer structured pydantic output when available
        try:
            ai_report = getattr(result, "pydantic", None)
        except Exception:
            ai_report = None

        if isinstance(ai_report, AIReport):
            return AIReportResponse(
                success=True,
                report=ai_report,
                processing_time_seconds=processing_time,
            )

        # Fallback: if result is already an AIReport object
        if isinstance(result, AIReport):
            return AIReportResponse(
                success=True,
                report=result,
                processing_time_seconds=processing_time,
            )

        # Attempt JSON/dict fallbacks for structured output
        try:
            result_json = getattr(result, "json_dict", None)
            if isinstance(result_json, dict):
                try:
                    parsed = AIReport.model_validate(result_json)
                except Exception:
                    parsed = AIReport(**result_json)
                return AIReportResponse(
                    success=True,
                    report=parsed,
                    processing_time_seconds=processing_time,
                )
        except Exception:
            pass

        # Try parsing raw JSON string (supports either direct string result or result.raw)
        try:
            raw_s = None
            if isinstance(result, str) and result.strip():
                raw_s = result.strip()
            else:
                raw_out = getattr(result, "raw", None)
                if isinstance(raw_out, str) and raw_out.strip():
                    raw_s = raw_out.strip()

            if raw_s:
                # Strip code fences if present
                if raw_s.startswith("```"):
                    # Remove leading fence with optional language tag
                    raw_s = raw_s.split("```", 1)[-1].strip()
                    if raw_s.startswith("json"):
                        raw_s = raw_s[len("json"):].strip()
                    # Remove trailing fence if present later
                    if "```" in raw_s:
                        raw_s = raw_s.split("```", 1)[0].strip()
                data = json.loads(raw_s)
                try:
                    parsed = AIReport.model_validate(data)
                except Exception:
                    parsed = AIReport(**data)
                return AIReportResponse(
                    success=True,
                    report=parsed,
                    processing_time_seconds=processing_time,
                )
        except Exception as parse_err:
            short = str(parse_err)
            if len(short) > 300:
                short = short[:300] + "..."
            return AIReportResponse(
                success=False,
                error_message=f"Failed to parse Crew output into AIReport: {short}",
                processing_time_seconds=processing_time,
            )

        # Otherwise, indicate an error with minimal details
        return AIReportResponse(
            success=False,
            error_message="Report crew did not return a structured AIReport",
            processing_time_seconds=processing_time,
        )
        
    except Exception as e:
        processing_time = time.time() - start_time
        return AIReportResponse(
            success=False,
            error_message=f"Failed to generate AI report: {str(e)}",
            processing_time_seconds=processing_time
        )


# Semantic search endpoint removed; unified within report generation crew.


def main() -> None:
    """Run the FastAPI application using uvicorn."""
    uvicorn.run("main:app", host="0.0.0.0", port=8082, reload=True)
""" 
uvicorn main:app --host 0.0.0.0 --port 8082
 
"""
if __name__ == "__main__":
    main()
