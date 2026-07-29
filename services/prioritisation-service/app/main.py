import sys

sys.path.insert(0, "/app/shared")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from careprior_shared.logging_config import configure_logging
from careprior_shared.schemas import PrioritisationRecommendation

from .pipeline import generate_recommendation

configure_logging("prioritisation-service")

app = FastAPI(title="CarePrior Prioritisation Service", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "prioritisation-service"}


class PrioritiseRequest(BaseModel):
    request_id: str
    free_text: str
    facts: dict = {}


@app.post("/internal/prioritise", response_model=PrioritisationRecommendation)
async def prioritise(payload: PrioritiseRequest) -> PrioritisationRecommendation:
    return await generate_recommendation(payload.request_id, payload.free_text, payload.facts)
