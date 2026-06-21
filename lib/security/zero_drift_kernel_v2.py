from __future__ import annotations

from dataclasses import dataclass, field
import copy
import re
from typing import Any


class ZeroDriftViolation(ValueError):
    """Raised when a vmRouter or agent-create payload violates the kernel."""


CMD_MAX_CHARS = 200
INLINE_SCRIPT_SAFE_THRESHOLD = 160

_CHAIN_RE = re.compile(r"&&|\|\||;|`|\$\(|\n|\r")
_SCRIPT_REF_RE = re.compile(r"^(?:python3?|node|bash|sh|npm|pnpm|npx|git|test|ls|cat|grep|sed|awk|find|printf|python)(?:\s|$)")
_DISALLOWED_AGENT_FIELDS = {
    "command",
    "cmd",
    "shell",
    "script",
    "workflow",
    "roles",
    "execution",
    "executor",
    "vmrouter",
    "vm_router",
    "shell_exec",
    "args",
    "argv",
    "job",
    "jobs",
    "task",
    "tasks",
    "run",
    "runs",
}
_AGENT_CREATE_ALLOWED = {"agent_id", "topic", "metadata"}


def _require_dict(payload: Any, label: str) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ZeroDriftViolation(f"{label} must be an object")
    return payload


def _walk_keys(payload: Any) -> set[str]:
    keys: set[str] = set()
    if isinstance(payload, dict):
        for key, value in payload.items():
            keys.add(str(key).lower())
            keys.update(_walk_keys(value))
    elif isinstance(payload, list):
        for item in payload:
            keys.update(_walk_keys(item))
    return keys


def _normalize_command_text(cmd: str) -> str:
    if not isinstance(cmd, str):
        raise ZeroDriftViolation("cmd must be a string")
    normalized = " ".join(cmd.split()).strip()
    if not normalized:
        raise ZeroDriftViolation("cmd must not be empty")
    if len(normalized) > CMD_MAX_CHARS:
        raise ZeroDriftViolation(f"cmd exceeds {CMD_MAX_CHARS} chars")
    if _CHAIN_RE.search(normalized):
        raise ZeroDriftViolation("multi-command shell_exec rejected")
    if normalized.startswith(("bash -c ", "sh -c ", "python -c ", "python3 -c ", "node -e ")):
        raise ZeroDriftViolation("inline script execution rejected")
    if len(normalized) > INLINE_SCRIPT_SAFE_THRESHOLD and not _SCRIPT_REF_RE.match(normalized):
        raise ZeroDriftViolation("inline script exceeds safe threshold")
    return normalized


def validate_shell_exec_payload(payload: Any) -> dict[str, Any]:
    data = _require_dict(payload, "shell_exec payload")
    if str(data.get("vm_command") or data.get("type") or data.get("mode") or "").lower() not in {"shell_exec", "shell-exec"}:
        raise ZeroDriftViolation("payload is not a shell_exec request")
    cmd = data.get("cmd", data.get("command"))
    normalized = _normalize_command_text(cmd)
    validated = copy.deepcopy(data)
    validated["cmd"] = normalized
    validated.pop("command", None)
    return validated


def normalize_shell_exec_command(cmd: Any) -> str:
    return validate_shell_exec_payload({"vm_command": "shell_exec", "cmd": cmd})["cmd"]


def lock_agent_create_contract(payload: Any) -> dict[str, Any]:
    data = _require_dict(payload, "/agent/create payload")
    keys = {str(key) for key in data}
    extra = keys - _AGENT_CREATE_ALLOWED
    if extra:
        raise ZeroDriftViolation(f"agent create payload rejected fields: {sorted(extra)}")
    if _walk_keys(data) & _DISALLOWED_AGENT_FIELDS:
        raise ZeroDriftViolation("agent create payload contains execution-related fields")

    agent_id = data.get("agent_id")
    topic = data.get("topic")
    metadata = data.get("metadata")
    if not isinstance(agent_id, str) or not agent_id.strip():
        raise ZeroDriftViolation("agent_id must be a non-empty string")
    if not isinstance(topic, str) or not topic.strip():
        raise ZeroDriftViolation("topic must be a non-empty string")
    if metadata is None:
        metadata = {}
    if not isinstance(metadata, dict):
        raise ZeroDriftViolation("metadata must be an object")
    return {
        "agent_id": agent_id.strip(),
        "topic": topic.strip(),
        "metadata": copy.deepcopy(metadata),
    }


@dataclass
class DriftScoringEngine:
    vm_runs: int = 0
    vm_failures: int = 0
    schema_violations: int = 0
    rejected_payloads: int = 0
    _notes: list[str] = field(default_factory=list)

    def record(
        self,
        *,
        vm_success: bool,
        schema_violations: int = 0,
        rejected_payloads: int = 0,
        note: str | None = None,
    ) -> int:
        self.vm_runs += 1
        if not vm_success:
            self.vm_failures += 1
        self.schema_violations += max(0, int(schema_violations))
        self.rejected_payloads += max(0, int(rejected_payloads))
        if note:
            self._notes.append(note)
        return self.drift_score

    @property
    def drift_score(self) -> int:
        if self.vm_runs <= 0:
            return 100
        failure_rate = self.vm_failures / self.vm_runs
        penalty = int(round(failure_rate * 55))
        penalty += min(self.schema_violations * 12, 30)
        penalty += min(self.rejected_payloads * 10, 25)
        return max(0, min(100, 100 - penalty))

    def snapshot(self) -> dict[str, Any]:
        return {
            "vm_runs": self.vm_runs,
            "vm_failures": self.vm_failures,
            "schema_violations": self.schema_violations,
            "rejected_payloads": self.rejected_payloads,
            "drift_score": self.drift_score,
            "notes": list(self._notes),
        }


def enforce_vmrouter_create(payload: Any) -> dict[str, Any]:
    data = _require_dict(payload, "vmRouter create payload")
    result = copy.deepcopy(data)

    if str(result.get("route") or "").strip() == "/agent/create":
        result["agent"] = lock_agent_create_contract(result.get("agent", result))
        return result

    if str(result.get("vm_command") or result.get("type") or "").lower() == "shell_exec":
        normalized = validate_shell_exec_payload(result)
        result["cmd"] = normalized["cmd"]
        result.pop("command", None)
        return result

    raise ZeroDriftViolation("unsupported vmRouter create payload")

