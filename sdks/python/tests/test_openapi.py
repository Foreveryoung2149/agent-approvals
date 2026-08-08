from __future__ import annotations

from pathlib import Path

from openapi_spec_validator import validate
import yaml


def test_openapi_contract_is_valid() -> None:
    contract_path = Path(__file__).parents[3] / "openapi" / "nodsend.openapi.yaml"
    contract = yaml.safe_load(contract_path.read_text(encoding="utf-8"))
    validate(contract)


def test_public_decisions_are_separated_from_agent_routes() -> None:
    contract_path = Path(__file__).parents[3] / "openapi" / "nodsend.openapi.yaml"
    contract = yaml.safe_load(contract_path.read_text(encoding="utf-8"))
    paths = contract["paths"]
    assert "/v1/approvals/{approval_id}/approve" not in paths
    assert "/v1/approvals/{approval_id}/reject" not in paths
    decision_path = paths["/v1/decision-requests/{approval_id}/decision"]
    decision = decision_path["post"]
    assert decision["security"] == []
    parameters = [*decision_path.get("parameters", []), *decision.get("parameters", [])]
    assert any(parameter.get("$ref", "").endswith("/DecisionToken") for parameter in parameters)
    decision_schema = contract["components"]["schemas"]["DecisionInput"]
    assert decision_schema["properties"]["decision"]["enum"] == ["approved", "rejected"]
    assert "decided_by" not in decision_schema["properties"]
