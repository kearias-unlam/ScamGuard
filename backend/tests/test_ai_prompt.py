from app.ai.prompt import INDICATOR_TYPES, INSTRUCTIONS, OUTPUT_FORMAT, OUTPUT_SCHEMA


def _objects(schema: dict) -> list[dict]:
    found = [schema] if schema.get("type") == "object" else []
    for child in schema.get("properties", {}).values():
        found += _objects(child)
    if "items" in schema:
        found += _objects(schema["items"])
    return found


def test_schema_is_strict_valid() -> None:
    objects = _objects(OUTPUT_SCHEMA)
    assert len(objects) == 2
    for obj in objects:
        assert obj["additionalProperties"] is False
        assert set(obj["required"]) == set(obj["properties"])
    assert OUTPUT_FORMAT["strict"] is True and OUTPUT_FORMAT["type"] == "json_schema"
    assert OUTPUT_FORMAT["schema"] is OUTPUT_SCHEMA


def test_schema_keys_match_analysis_result() -> None:
    assert set(OUTPUT_SCHEMA["properties"]) == {"riskLevel", "summary", "explanation", "indicators"}
    item = OUTPUT_SCHEMA["properties"]["indicators"]["items"]
    assert set(item["properties"]) == {"type", "title", "description", "evidence"}


def test_risk_level_enum_excludes_undetermined() -> None:
    assert OUTPUT_SCHEMA["properties"]["riskLevel"]["enum"] == ["LOW", "MEDIUM", "HIGH"]


def test_indicator_type_enum_matches_documented_list() -> None:
    item = OUTPUT_SCHEMA["properties"]["indicators"]["items"]
    assert item["properties"]["type"]["enum"] == [
        "urgency", "personal_data_request", "suspicious_link", "impersonation",
        "writing_errors", "unrealistic_promise", "payment_request",
    ]


def test_instructions_mention_every_indicator_type() -> None:
    for indicator_type in INDICATOR_TYPES:
        assert indicator_type in INSTRUCTIONS
