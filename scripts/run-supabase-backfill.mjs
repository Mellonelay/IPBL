#!/usr/bin/env node

function parseArgs(argv) {
  const out = {
    divisions: [],
    runKind: "last_30_days",
    limit: 6,
    maxCalls: 200,
    delayMs: 750,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--url") out.url = argv[++index];
    else if (arg === "--from") out.from = argv[++index];
    else if (arg === "--to") out.to = argv[++index];
    else if (arg === "--run-id") out.runId = argv[++index];
    else if (arg === "--run-kind") out.runKind = argv[++index];
    else if (arg === "--division") out.divisions.push(argv[++index]);
    else if (arg === "--limit") out.limit = Number(argv[++index]);
    else if (arg === "--max-calls") out.maxCalls = Number(argv[++index]);
    else if (arg === "--delay-ms") out.delayMs = Number(argv[++index]);
    else if (arg === "--status-only") out.statusOnly = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function required(value, label) {
  if (!value) throw new Error(`${label} is required`);
  return value;
}

const args = parseArgs(process.argv.slice(2));
const baseUrl = required(args.url ?? process.env.BACKFILL_URL, "BACKFILL_URL").replace(/\/$/, "");
const secret = required(process.env.CRON_SECRET, "CRON_SECRET");

async function request(action, body = undefined) {
  const url = new URL(`${baseUrl}/api/admin/supabase-backfill`);
  url.searchParams.set("action", action);
  if (action === "status" && body?.runId) url.searchParams.set("runId", body.runId);
  const response = await fetch(url, {
    method: action === "status" ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: action === "status" ? undefined : JSON.stringify(body ?? {}),
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${response.status}: non-JSON response`);
  }
  if (!response.ok || payload.ok === false) {
    throw new Error(`HTTP ${response.status}: ${payload.error ?? "backfill request failed"}`);
  }
  return payload;
}

function openSegments(status) {
  const segments = status?.segments ?? {};
  return Number(segments.pending ?? 0)
    + Number(segments.running ?? 0)
    + Number(segments.retryable_failure ?? 0);
}

function printSnapshot(call, claimed, status) {
  console.log(JSON.stringify({
    call,
    claimed,
    run: status.run,
    segments: status.segments,
    data: status.data,
  }));
}

let runId = args.runId;
if (!runId) {
  required(args.from, "--from");
  required(args.to, "--to");
  const started = await request("start", {
    runKind: args.runKind,
    from: args.from,
    to: args.to,
    divisionTags: args.divisions.length ? args.divisions : undefined,
  });
  runId = started.runId;
  printSnapshot(0, 0, started.status);
}

if (args.statusOnly) {
  const payload = await request("status", { runId });
  printSnapshot(0, 0, payload.status);
  process.exit(payload.status.run.status === "failed" ? 1 : 0);
}

for (let call = 1; call <= args.maxCalls; call += 1) {
  const payload = await request("work", {
    runId,
    limit: Math.max(1, Math.min(Math.floor(args.limit || 6), 6)),
  });
  printSnapshot(call, payload.claimed, payload.status);

  if (openSegments(payload.status) === 0) {
    const terminal = payload.status.run.status;
    process.exit(terminal === "verified" ? 0 : 2);
  }
  await new Promise((resolve) => setTimeout(resolve, Math.max(100, args.delayMs || 750)));
}

throw new Error(`Backfill did not reach terminal state after ${args.maxCalls} worker calls`);
