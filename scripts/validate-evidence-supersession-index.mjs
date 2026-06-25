#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ROOT_REAL = fs.realpathSync(ROOT);
const INDEX_PATH = path.join(ROOT, "artifacts/evidence/evidence-supersession-index.json");
const ALLOWED_STATUSES = new Set([
  "complete",
  "complete_verified",
  "seeded_read_only",
  "support_ready",
]);
const ALLOWED_RELATIONSHIPS = new Set([
  "feeds",
  "governs",
  "materializes",
  "normalizes",
  "proves",
  "proves source freshness inputs",
  "reconciles",
  "seeds",
]);

function fail(message) {
  throw new Error(message);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    fail(`${path.relative(ROOT, filePath)}: invalid JSON (${err.message})`);
  }
}

function assertFileExists(relPath, label) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    fail(`${label} missing: ${relPath}`);
  }
}

function assertString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${label} must be a non-empty string`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must be a non-empty array`);
  }
}

function assertIsoTimestamp(value, label) {
  assertString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) {
    fail(`${label} must be an ISO 8601 UTC timestamp: ${value}`);
  }

  if (Number.isNaN(Date.parse(value))) {
    fail(`${label} is not a valid timestamp: ${value}`);
  }
}

function normalizeRepoRelativePath(relPath, label) {
  assertString(relPath, label);

  const normalized = path.normalize(relPath);
  if (path.isAbsolute(relPath) || path.isAbsolute(normalized)) {
    fail(`${label} must be repository-relative: ${relPath}`);
  }

  if (normalized === "." || normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
    fail(`${label} must not traverse outside the repository: ${relPath}`);
  }

  return normalized;
}

function assertRepoPath(relPath, label) {
  const normalized = normalizeRepoRelativePath(relPath, label);
  const absPath = path.resolve(ROOT, normalized);

  if (!fs.existsSync(absPath)) {
    fail(`${label} missing: ${normalized}`);
  }

  const realPath = fs.realpathSync(absPath);
  if (realPath !== ROOT_REAL && !realPath.startsWith(`${ROOT_REAL}${path.sep}`)) {
    fail(`${label} escapes the repository root via symlink: ${normalized}`);
  }

  return normalized;
}

const index = readJson(INDEX_PATH);

if (index.schemaVersion !== "ipbl.evidence-supersession-index.v1") {
  fail(`schemaVersion mismatch: ${index.schemaVersion}`);
}

assertIsoTimestamp(index.generatedAt, "generatedAt");
assertArray(index.sourcesScanned, "sourcesScanned");
assertArray(index.evidenceFamilies, "evidenceFamilies");

const seenFamilies = new Set();
const seenArtifacts = new Set();
const seenSources = new Set();

for (const source of index.sourcesScanned) {
  const normalized = assertRepoPath(source, "sourcesScanned entry");
  if (seenSources.has(normalized)) {
    fail(`sourcesScanned contains a duplicate path: ${normalized}`);
  }
  seenSources.add(normalized);
}

for (const family of index.evidenceFamilies) {
  if (!family || typeof family !== "object" || Array.isArray(family)) {
    fail("each evidence family must be an object");
  }

  assertString(family.family, "family.family");
  assertString(family.canonicalArtifact, `${family.family}.canonicalArtifact`);
  assertString(family.status, `${family.family}.status`);
  assertString(family.supersessionReason, `${family.family}.supersessionReason`);
  assertArray(family.supersedes, `${family.family}.supersedes`);
  assertArray(family.evidence, `${family.family}.evidence`);
  assertArray(family.proofGateTests, `${family.family}.proofGateTests`);
  assertArray(family.evidenceLineage, `${family.family}.evidenceLineage`);

  if (!ALLOWED_STATUSES.has(family.status)) {
    fail(`unsupported status for ${family.family}: ${family.status}`);
  }

  if (seenFamilies.has(family.family)) {
    fail(`duplicate evidence family: ${family.family}`);
  }
  seenFamilies.add(family.family);

  if (seenArtifacts.has(family.canonicalArtifact)) {
    fail(`duplicate canonical artifact: ${family.canonicalArtifact}`);
  }
  seenArtifacts.add(family.canonicalArtifact);

  const canonicalArtifact = assertRepoPath(family.canonicalArtifact, `${family.family}.canonicalArtifact`);
  const supersedes = new Set();
  const evidence = new Set();
  const lineageEdges = new Set();

  for (const relPath of family.supersedes) {
    const normalized = assertRepoPath(relPath, `${family.family}.supersedes entry`);
    if (normalized === canonicalArtifact) {
      fail(`${family.family}.supersedes must not include the canonical artifact: ${normalized}`);
    }
    if (supersedes.has(normalized)) {
      fail(`${family.family}.supersedes contains a duplicate path: ${normalized}`);
    }
    supersedes.add(normalized);
  }

  for (const relPath of family.evidence) {
    const normalized = assertRepoPath(relPath, `${family.family}.evidence entry`);
    if (evidence.has(normalized)) {
      fail(`${family.family}.evidence contains a duplicate path: ${normalized}`);
    }
    evidence.add(normalized);
  }

  for (const command of family.proofGateTests) {
    assertString(command, `${family.family}.proofGateTests entry`);
  }

  for (const edge of family.evidenceLineage) {
    if (!edge || typeof edge !== "object" || Array.isArray(edge)) {
      fail(`${family.family}.evidenceLineage entry must be an object`);
    }
    assertString(edge.from, `${family.family}.evidenceLineage.from`);
    assertString(edge.to, `${family.family}.evidenceLineage.to`);
    assertString(edge.relationship, `${family.family}.evidenceLineage.relationship`);

    const from = assertRepoPath(edge.from, `${family.family}.evidenceLineage.from`);
    const to = assertRepoPath(edge.to, `${family.family}.evidenceLineage.to`);

    if (!ALLOWED_RELATIONSHIPS.has(edge.relationship)) {
      fail(`unsupported relationship for ${family.family}: ${edge.relationship}`);
    }

    if (to !== canonicalArtifact) {
      fail(`${family.family}.evidenceLineage.to must match canonicalArtifact: ${to}`);
    }

    if (!supersedes.has(from) && !evidence.has(from)) {
      fail(`${family.family}.evidenceLineage.from must reference declared supersedes or evidence: ${from}`);
    }

    const key = `${from} -> ${to} :: ${edge.relationship}`;
    if (lineageEdges.has(key)) {
      fail(`${family.family}.evidenceLineage contains a duplicate edge: ${key}`);
    }
    lineageEdges.add(key);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      validator: "validate-evidence-supersession-index",
      index: path.relative(ROOT, INDEX_PATH),
      families: index.evidenceFamilies.length,
      validatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
