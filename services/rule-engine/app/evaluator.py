from typing import Any

Fact = dict[str, Any]


def _describe(field: str, value: Any) -> str:
    return f"{field} = {value!r}"


def evaluate_condition(node: dict[str, Any], facts: Fact) -> tuple[bool, list[str]]:
    """Recursively evaluates a rule condition tree against structured patient-answer facts.

    Leaf node: {"field": str, "op": "eq"|"neq"|"gte"|"lte"|"present"|"missing", "value"?: Any}
    Group node: {"op": "AND"|"OR", "conditions": [node, ...]}

    Returns (matched, matched_fact_descriptions) so the caller can record exactly which
    patient answers triggered the rule (brief Module 4 requirement).
    """
    op = node.get("op")

    if op in ("AND", "OR"):
        results: list[tuple[bool, list[str]]] = [
            evaluate_condition(child, facts) for child in node.get("conditions", [])
        ]
        matched_flags = [r[0] for r in results]
        matched = all(matched_flags) if op == "AND" else any(matched_flags)
        contributing: list[str] = []
        for flag, descriptions in results:
            if flag:
                contributing.extend(descriptions)
        return matched, contributing

    field = node["field"]
    actual = facts.get(field)

    if op == "present":
        ok = actual is not None and actual != "" and actual is not False
        return ok, [_describe(field, actual)] if ok else (ok, [])
    if op == "missing":
        ok = actual is None or actual == ""
        return ok, [_describe(field, actual)] if ok else (ok, [])
    if op == "eq":
        ok = actual == node.get("value")
        return ok, [_describe(field, actual)] if ok else (ok, [])
    if op == "neq":
        ok = actual != node.get("value")
        return ok, [_describe(field, actual)] if ok else (ok, [])
    if op == "gte":
        ok = actual is not None and isinstance(actual, (int, float)) and actual >= node.get("value")
        return ok, [_describe(field, actual)] if ok else (ok, [])
    if op == "lte":
        ok = actual is not None and isinstance(actual, (int, float)) and actual <= node.get("value")
        return ok, [_describe(field, actual)] if ok else (ok, [])

    raise ValueError(f"Unsupported rule condition operator: {op}")
