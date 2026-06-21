#!/usr/bin/env python3
from __future__ import annotations
import argparse, datetime as dt, fnmatch, hashlib, json, os, re, subprocess, sys, uuid
from pathlib import Path

import yaml

ROLES = {"researcher", "pm", "architect", "dev", "qa", "reviewer"}
PROTECTED = [
    (r"\brm\s+-rf\s+/(?:\s|$)", "destructive root deletion"),
    (r"\bgit\s+push\b[^\n]*(?:--force|-f)\b", "force push"),
    (r"\bgit\s+push\s+(?:origin\s+)?(?:main|master)\b", "direct protected-branch push"),
    (r"\bgh\s+pr\s+merge\b", "pull-request merge"),
    (r"\bgh\s+repo\s+delete\b", "repository deletion"),
    (r"\bvercel\s+(?:--prod|deploy\s+--prod|promote)\b", "production deployment"),
    (r"\bwrangler\s+delete\b", "worker deletion"),
    (r"\b(?:cat|sed|awk|head|tail)\b[^\n]*(?:\.env|\.dev\.vars|credentials|private[_-]?key)", "secret-bearing file read"),
]
READ_ONLY_MUTATION = re.compile(r"(?:^|[;&|]\s*)(?:rm|mv|cp|mkdir|touch|truncate|install|chmod|chown|tee|sed\s+-i|git\s+(?:add|commit|push|reset|checkout|switch)|gh\s+pr\s+(?:create|edit|merge)|vercel\s+(?:deploy|promote))\b|(?:^|\s)(?:>|>>)(?:\s|$)", re.I)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def run_git(repo: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True, check=False)


def status_paths(repo: Path) -> set[str]:
    cp = run_git(repo, "status", "--porcelain", "-z", "--untracked-files=all")
    if cp.returncode != 0:
        raise RuntimeError(cp.stderr.strip() or "git status failed")
    raw = cp.stdout
    paths: set[str] = set()
    for entry in raw.split("\0"):
        if not entry:
            continue
        path = entry[3:] if len(entry) >= 4 else entry
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        paths.add(path)
    return paths


def matches(path: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(path, p) for p in patterns)


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        value = json.load(f)
    if not isinstance(value, dict):
        raise ValueError(f"expected object in {path}")
    return value


def load_agenteam_config(repo: Path) -> dict:
    config_path = repo / ".agenteam" / "config.yaml"
    with config_path.open("r", encoding="utf-8") as f:
        config = yaml.safe_load(f)
    if not isinstance(config, dict):
        raise SystemExit(f"invalid agenteam config: {config_path}")
    return config


def self_test() -> int:
    assert ROLES == {"researcher", "pm", "architect", "dev", "qa", "reviewer"}
    assert any("force push" == label for _, label in PROTECTED)
    print(json.dumps({"ok": True, "engine": "mellonelay-agenteam-runner-v1", "roles": sorted(ROLES)}))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--task")
    ap.add_argument("--role", choices=sorted(ROLES))
    ap.add_argument("--self-test", action="store_true")
    ns = ap.parse_args()
    if ns.self_test:
        return self_test()
    if not ns.task or not ns.role:
        ap.error("--task and --role are required")

    task_path = Path(ns.task).resolve()
    task = load_json(task_path)
    if task.get("schema") != "mellonelay.agenteam.task.v1":
        raise SystemExit("unsupported task schema")
    task_id = str(task.get("task_id", ""))
    if not re.fullmatch(r"[A-Za-z0-9._-]+", task_id):
        raise SystemExit("invalid task_id")
    repo = Path(str(task.get("working_directory", ""))).resolve()
    if not (repo / ".git").exists() and not (repo / ".git").is_file():
        raise SystemExit(f"not a git worktree: {repo}")
    config = load_agenteam_config(repo)
    role_cfg = config.get("roles", {}).get(ns.role)
    if not isinstance(role_cfg, dict):
        raise SystemExit(f"role not configured: {ns.role}")
    role_task = task.get("roles", {}).get(ns.role)
    if not isinstance(role_task, dict) or not isinstance(role_task.get("command"), str):
        raise SystemExit(f"task command missing for role: {ns.role}")
    command = role_task["command"].strip()
    if not command:
        raise SystemExit("empty command")

    auth = task.get("authorizations", {}) if isinstance(task.get("authorizations", {}), dict) else {}
    for pattern, label in PROTECTED:
        if re.search(pattern, command, re.I) and not auth.get(label.replace(" ", "_"), False):
            raise SystemExit(f"protected action blocked: {label}")
    can_write = bool(role_cfg.get("can_write"))
    if not can_write and READ_ONLY_MUTATION.search(command):
        raise SystemExit(f"read-only role attempted mutation: {ns.role}")

    before = status_paths(repo)
    if before and not bool(task.get("allow_dirty", False)):
        raise SystemExit(f"dirty worktree blocked ({len(before)} paths)")

    run_id = f"{dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex[:8]}"
    artifact_dir = Path("/root/runtime-audits/agenteam") / task_id / ns.role / run_id
    artifact_dir.mkdir(parents=True, exist_ok=False)
    started = dt.datetime.now(dt.timezone.utc)
    timeout = int(role_task.get("timeout", 900))
    try:
        cp = subprocess.run(command, cwd=repo, shell=True, executable="/bin/bash", capture_output=True, timeout=timeout)
        timed_out = False
    except subprocess.TimeoutExpired as exc:
        cp = subprocess.CompletedProcess(command, 124, exc.stdout or b"", exc.stderr or b"")
        timed_out = True
    stdout = cp.stdout if isinstance(cp.stdout, bytes) else str(cp.stdout).encode()
    stderr = cp.stderr if isinstance(cp.stderr, bytes) else str(cp.stderr).encode()
    (artifact_dir / "stdout.log").write_bytes(stdout)
    (artifact_dir / "stderr.log").write_bytes(stderr)
    after = status_paths(repo)
    new_paths = sorted(after - before)

    allowed = list(role_cfg.get("write_scope", [])) + list(role_task.get("allowed_paths", []))
    violations = []
    if new_paths:
        if not can_write:
            violations = new_paths
        else:
            violations = [p for p in new_paths if not matches(p, allowed)]

    status = "success" if cp.returncode == 0 and not violations and not timed_out else "failed"
    result = {
        "schema": "mellonelay.agenteam.result.v1",
        "task_id": task_id,
        "role": ns.role,
        "run_id": run_id,
        "status": status,
        "command": command,
        "return_code": cp.returncode,
        "started_at": started.isoformat(),
        "completed_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "stdout_sha256": sha256(stdout),
        "stderr_sha256": sha256(stderr),
        "stdout_path": str(artifact_dir / "stdout.log"),
        "stderr_path": str(artifact_dir / "stderr.log"),
        "artifact_dir": str(artifact_dir),
        "preexisting_dirty_paths": sorted(before),
        "changed_paths": new_paths,
        "scope_violations": violations,
        "timed_out": timed_out,
    }
    (artifact_dir / "result.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    return 0 if status == "success" else 1

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({"status": "failed", "error": f"{type(exc).__name__}: {exc}"}), file=sys.stderr)
        raise
