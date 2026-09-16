from datetime import datetime, timedelta, timezone
from typing import Any

# Synthetic doctor roster and availability for the academic prototype's dummy booking UI.
# No persistence, no double-booking/exclusivity logic — this is a soft scheduling preference
# captured for staff visibility, not a real scheduling system.

DOCTORS: list[dict[str, str]] = [
    {"id": "dr-lee", "name": "Dr. Amara Lee", "specialty": "General Practice", "bio": "General GP consultations for everyday health concerns."},
    {"id": "dr-wilson", "name": "Dr. James Wilson", "specialty": "General Practice", "bio": "General GP consultations, with a focus on preventative care."},
    {"id": "dr-osei", "name": "Dr. Kwame Osei", "specialty": "Cardiology", "bio": "Heart and chest-related concerns, including palpitations and chest discomfort."},
    {"id": "dr-nguyen", "name": "Dr. Mai Nguyen", "specialty": "Respiratory Medicine", "bio": "Breathing difficulties, persistent cough, and chest infections."},
    {"id": "dr-patel", "name": "Dr. Ravi Patel", "specialty": "Gastroenterology", "bio": "Digestive symptoms including abdominal pain, nausea, and reflux."},
    {"id": "dr-brown", "name": "Dr. Sarah Brown", "specialty": "Musculoskeletal Medicine", "bio": "Injuries, joint pain, and musculoskeletal concerns."},
    {"id": "dr-khan", "name": "Dr. Imran Khan", "specialty": "Mental Health", "bio": "Mental health and wellbeing consultations."},
    {"id": "dr-garcia", "name": "Dr. Elena Garcia", "specialty": "Dermatology", "bio": "Skin conditions, rashes, and related concerns."},
]

SLOT_TIMES: list[tuple[int, int]] = [(9, 0), (11, 0), (14, 0)]

# Maps the patient-facing symptom category to specialties best suited to it, most relevant
# first. This is a simple, transparent matching rule for the prototype — not a clinical
# triage decision; the deterministic safety rules and mandatory human review are unaffected.
CATEGORY_TO_SPECIALTIES: dict[str, list[str]] = {
    "General / unwell": ["General Practice"],
    "Respiratory (breathing, cough)": ["Respiratory Medicine", "General Practice"],
    "Cardiac / chest": ["Cardiology", "General Practice"],
    "Digestive": ["Gastroenterology", "General Practice"],
    "Musculoskeletal / injury": ["Musculoskeletal Medicine", "General Practice"],
    "Mental health": ["Mental Health", "General Practice"],
    "Skin": ["Dermatology", "General Practice"],
    "Other": ["General Practice"],
}

URGENT_PRIORITIES = {"Immediate Human Review", "Priority Review"}


def generate_time_slots(days_ahead: int = 5) -> list[dict[str, Any]]:
    slots: list[dict[str, Any]] = []
    today = datetime.now(timezone.utc).date()
    collected_days = 0
    offset = 1
    while collected_days < days_ahead:
        candidate = today + timedelta(days=offset)
        offset += 1
        if candidate.weekday() >= 5:  # skip weekends
            continue
        collected_days += 1
        for hour, minute in SLOT_TIMES:
            slot_dt = datetime(candidate.year, candidate.month, candidate.day, hour, minute, tzinfo=timezone.utc)
            slots.append(
                {
                    "datetime_iso": slot_dt.isoformat(),
                    "label": slot_dt.strftime("%a %d %b, %I:%M %p"),
                }
            )
    return slots


def suggest_doctors(symptom_category: str, facts: dict[str, Any], limit: int = 3) -> list[dict[str, str]]:
    """Ranks the dummy roster by specialty relevance to the reported category, boosting
    Cardiology if the patient has reported chest discomfort regardless of category."""
    preferred = list(CATEGORY_TO_SPECIALTIES.get(symptom_category, ["General Practice"]))
    if facts.get("chest_discomfort") and "Cardiology" not in preferred:
        preferred.insert(0, "Cardiology")

    def rank(doctor: dict[str, str]) -> int:
        return preferred.index(doctor["specialty"]) if doctor["specialty"] in preferred else len(preferred)

    ranked = sorted(DOCTORS, key=rank)
    return ranked[:limit]


def suggest_time_slot(priority: str | None, slots: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not slots:
        return None
    if priority in URGENT_PRIORITIES:
        return slots[0]
    return slots[min(3, len(slots) - 1)]


def time_suggestion_reason(priority: str | None) -> str:
    if priority in URGENT_PRIORITIES:
        return "Based on what you've told us, we'd like to see you as soon as possible — this is our earliest available time."
    return "This is our next standard appointment time based on your description."
