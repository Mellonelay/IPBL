#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lib.security.zero_drift_kernel_v2 import (
    DriftScoringEngine,
    ZeroDriftViolation,
    enforce_vmrouter_create,
    lock_agent_create_contract,
    normalize_shell_exec_command,
)


REPO = Path(__file__).resolve().parents[1]


def run_runner(task: dict[str, object], role: str) -> subprocess.CompletedProcess[str]:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tmp:
        json.dump(task, tmp)
        tmp_path = Path(tmp.name)
    try:
        return subprocess.run(
            [sys.executable, str(REPO / "scripts" / "agenteam_runner.py"), "--task", str(tmp_path), "--role", role],
            cwd=REPO,
            capture_output=True,
            text=True,
            check=False,
        )
    finally:
        tmp_path.unlink(missing_ok=True)


def test_valid_vm_execution() -> dict[str, object]:
    task = {
        "schema": "mellonelay.agenteam.task.v1",
        "task_id": "zero-drift-kernel-v2-valid",
        "repository": "Mellonelay/IPBL",
        "working_directory": str(REPO),
        "objective": "Validate a single deterministic command.",
        "workflow": ["dev"],
        "allow_dirty": True,
        "authorizations": {},
        "roles": {
            "dev": {
                "command": "python3 -m py_compile scripts/agenteam_runner.py",
                "allowed_paths": [],
            }
        },
    }
    cp = run_runner(task, "dev")
    assert cp.returncode == 0, cp.stderr or cp.stdout
    payload = json.loads(cp.stdout)
    assert payload["status"] == "success"
    assert payload["drift_score"] == 100
    assert payload["drift_snapshot"]["drift_score"] == 100
    return payload


def test_rejected_multi_command_payloads() -> None:
    try:
        normalize_shell_exec_command("git status && git log")
    except ZeroDriftViolation:
        pass
    else:  # pragma: no cover
        raise AssertionError("multi-command payload was not rejected")

    try:
        enforce_vmrouter_create({"vm_command": "shell_exec", "cmd": "git status; git log"})
    except ZeroDriftViolation:
        pass
    else:  # pragma: no cover
        raise AssertionError("multi-command vmRouter create payload was not rejected")


def test_agent_contract_enforcement() -> None:
    locked = lock_agent_create_contract(
        {
            "agent_id": "agent-1",
            "topic": "zero-drift",
            "metadata": {"owner": "IPBL"},
        }
    )
    assert locked == {
        "agent_id": "agent-1",
        "topic": "zero-drift",
        "metadata": {"owner": "IPBL"},
    }

    try:
        lock_agent_create_contract(
            {
                "agent_id": "agent-1",
                "topic": "zero-drift",
                "metadata": {},
                "command": "echo drift",
            }
        )
    except ZeroDriftViolation:
        pass
    else:  # pragma: no cover
        raise AssertionError("agent contract accepted execution-related fields")


def test_drift_scoring_output() -> dict[str, int]:
    engine = DriftScoringEngine()
    baseline = engine.drift_score
    assert baseline == 100
    degraded = engine.record(vm_success=False, schema_violations=2, rejected_payloads=1)
    snapshot = engine.snapshot()
    assert 0 <= degraded <= 100
    assert degraded < baseline
    assert snapshot["drift_score"] == degraded
    return {"baseline": baseline, "degraded": degraded}


def main() -> int:
    valid = test_valid_vm_execution()
    test_rejected_multi_command_payloads()
    test_agent_contract_enforcement()
    drift = test_drift_scoring_output()
    print(
        json.dumps(
            {
                "status": "passed",
                "valid_run_id": valid.get("run_id"),
                "valid_drift_score": valid.get("drift_score"),
                "drift": drift,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
