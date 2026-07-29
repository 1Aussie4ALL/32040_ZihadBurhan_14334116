import os

from .base import AIProvider
from .mock_provider import MockAIProvider


def get_provider() -> AIProvider:
    provider_name = os.environ.get("AI_PROVIDER", "mock").lower()
    if provider_name == "mock":
        return MockAIProvider()
    # Real adapters (Anthropic, OpenAI-compatible) are deferred beyond this prototype
    # pass, per the provider-abstraction requirement in brief section 14/28 — adding one
    # here would only require implementing AIProvider.interpret(), no domain-logic changes.
    raise ValueError(f"Unsupported AI_PROVIDER '{provider_name}' in this build; only 'mock' is implemented.")
