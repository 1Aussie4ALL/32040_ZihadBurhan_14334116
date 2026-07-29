import logging
import sys

SENSITIVE_KEYS = {"password", "password_hash", "symptom_text", "free_text", "notes", "answer_text"}


class RedactSensitiveFilter(logging.Filter):
    """Prevents accidental logging of clinical free-text or credentials (brief NFR: no sensitive
    fields in debug logs)."""

    def filter(self, record: logging.LogRecord) -> bool:
        for key in SENSITIVE_KEYS:
            if hasattr(record, key):
                setattr(record, key, "[REDACTED]")
        return True


def configure_logging(service_name: str) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(RedactSensitiveFilter())
    formatter = logging.Formatter(
        f'{{"service": "{service_name}", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}}'
    )
    handler.setFormatter(formatter)
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)
