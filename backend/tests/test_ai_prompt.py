from app.ai.prompt import INDICATOR_TYPES, INSTRUCTIONS, OUTPUT_FORMAT, OUTPUT_SCHEMA, TOPICS


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


def test_schema_keys_match_analysis_result_plus_internal_fields() -> None:
    assert set(OUTPUT_SCHEMA["properties"]) == {
        "riskLevel", "summary", "explanation", "indicators", "topic", "maskedMessage",
    }
    item = OUTPUT_SCHEMA["properties"]["indicators"]["items"]
    assert set(item["properties"]) == {"type", "title", "description", "evidence"}


def test_risk_level_enum_excludes_undetermined() -> None:
    assert OUTPUT_SCHEMA["properties"]["riskLevel"]["enum"] == ["LOW", "MEDIUM", "HIGH"]


def test_indicator_type_enum_matches_documented_list() -> None:
    item = OUTPUT_SCHEMA["properties"]["indicators"]["items"]
    assert item["properties"]["type"]["enum"] == [
        "urgency", "personal_data_request", "suspicious_link", "impersonation",
        "writing_errors", "unrealistic_promise", "payment_request",
        "sender_mismatch", "failed_authentication", "deceptive_link", "dangerous_attachment",
        "lookalike_domain", "obfuscated_link",
    ]


def test_instructions_mention_every_indicator_type() -> None:
    for indicator_type in INDICATOR_TYPES:
        assert indicator_type in INSTRUCTIONS


# US-3.3: topic and masked message for shared critical messages.
def test_topic_enum_matches_documented_list() -> None:
    assert OUTPUT_SCHEMA["properties"]["topic"]["enum"] == [
        "family_money_request", "bank_impersonation", "credentials_request", "prize_or_giveaway",
        "package_delivery", "investment_offer", "job_offer", "other",
    ]
    assert OUTPUT_SCHEMA["properties"]["maskedMessage"] == {"type": "string"}


def test_instructions_mention_every_topic_and_masked_message() -> None:
    for topic in TOPICS:
        assert topic in INSTRUCTIONS
    assert "maskedMessage" in INSTRUCTIONS


# US-4.3: the prompt describes the email digest built by the backend.
def test_instructions_describe_the_email_digest() -> None:
    assert "Cuerpo:" in INSTRUCTIONS
    assert "use them only when the message is an email digest" in INSTRUCTIONS
    assert "For an email digest, return an empty string" in INSTRUCTIONS


# US-6.3: the prompt describes the URL digest built by the backend.
def test_instructions_describe_the_url_digest() -> None:
    assert "Enlace:" in INSTRUCTIONS
    assert "use them only when the message is a URL digest" in INSTRUCTIONS
    assert "For a URL digest, return an empty string" in INSTRUCTIONS


# US-6.3: the risk level follows the severity of the indicators, not their count.
def test_instructions_define_risk_level_by_severity() -> None:
    assert "based on how severe the indicators are, not on how many there are" in INSTRUCTIONS
    assert "One strong sign is enough for HIGH" in INSTRUCTIONS
    assert "never lower riskLevel to hedge" in INSTRUCTIONS
    for level in ("  - HIGH:", "  - MEDIUM:", "  - LOW:"):
        assert level in INSTRUCTIONS
