#!/usr/bin/env python3
from __future__ import annotations
import argparse, datetime as dt, json, subprocess, sys, uuid
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("task")
    ap.add_argument("--continue-on-failure", action="store_true")
    ns = ap.parse_args()
    task_path = Path(ns.task).resolve()
    task = json.loads(task_path.read_text())
    repo = Path(task["working_directory"]).resolve()
    workflow = task.get("workflow", [])
    if not workflow:
        raise SystemExit("empty workflow")
    orchestration_id = f"{dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex[:8]}"
    results = []
    for role in workflow:
        cp = subprocess.run([
            sys.executable, str(repo / "scripts" / "agenteam_runner.py"),
            "--task", str(task_path), "--role", role
        ], cwd=repo, capture_output=True, text=True)
        parsed = None
        try:
            parsed = json.loads(cp.stdout)
        except Exception:
            parsed = {"status": "failed", "role": role, "stdout": cp.stdout, "stderr": cp.stderr, "return_code": cp.returncode}
        results.append(parsed)
        print(cp.stdout, end="")
        if cp.stderr:
            print(cp.stderr, file=sys.stderr, end="")
        if cp.returncode != 0 and not ns.continue_on_failure:
            break
    summary_dir = Path("/root/runtime-audits/agenteam") / task["task_id"] / "orchestrator" / orchestration_id
    summary_dir.mkdir(parents=True, exist_ok=False)
    ok = len(results) == len(workflow) and all(r.get("status") == "success" for r in results)
    summary = {
        "schema": "mellonelay.agenteam.orchestration-result.v1",
        "orchestration_id": orchestration_id,
        "task_id": task["task_id"],
        "status": "success" if ok else "failed",
        "workflow": workflow,
        "roles_completed": [r.get("role") for r in results],
        "results": results,
        "summary_path": str(summary_dir / "summary.json")
    }
    (summary_dir / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))
    return 0 if ok else 1

if __name__ == "__main__":
    raise SystemExit(main())
