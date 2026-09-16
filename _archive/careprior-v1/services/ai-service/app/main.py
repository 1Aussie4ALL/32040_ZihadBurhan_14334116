import sys

sys.path.insert(0, "/app/shared")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError

from careprior_shared.logging_config import configure_logging
from careprior_shared.schemas import AIInterpretationOutput

from .providers.factory import get_provider

configure_logging("ai-service")

app = FastAPI(title="CarePrior AI Interpretation Service", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "ai-service"}


class InterpretRequest(BaseModel):
    request_id: str
    free_text: str
    structured_answers: dict = {}


@app.post("/internal/interpret", response_model=AIInterpretationOutput)
def interpret(payload: InterpretRequest) -> AIInterpretationOutput:
    provider = get_provider()
    try:
        result = provider.interpret(payload.free_text, payload.structured_answers)
    except ValidationError as exc:
        # Strict schema validation failure — reject rather than pass through (brief Module 3).
        raise HTTPException(status_code=502, detail=f"AI output failed schema validation: {exc}") from exc
    except Exception as exc:  # noqa: BLE001 - any provider failure must surface as a clean 502
        raise HTTPException(status_code=502, detail=f"AI provider unavailable: {exc}") from exc
    return result
