from abc import ABC, abstractmethod
from typing import Any

from careprior_shared.schemas import AIInterpretationOutput


class AIProvider(ABC):
    """Provider interface so the application can switch AI backends without touching
    domain logic (brief section 14). Implementations must never return a diagnosis
    field and must always populate model_version/prompt_version for audit traceability."""

    @abstractmethod
    def interpret(self, free_text: str, structured_answers: dict[str, Any]) -> AIInterpretationOutput: ...
