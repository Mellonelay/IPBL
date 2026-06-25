import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const VALIDATOR = path.resolve("scripts/validate-evidence-supersession-index.mjs");
const NODE = process.execPath;

function mkTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ipbl-supersession-validator-"));
}

function writeFile(root, relPath, content = "fixture\n") {
  const absPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content);
}

function writeValidFixture(root) {
  writeFile(root, "docs/source.md");
  writeFile(root, "docs/previous.md");
  writeFile(root, "docs/other.md");
  writeFile(root, "artifacts/evidence/canonical.json", JSON.stringify({ ok: true }, null, 2));

  const index = {
    schemaVersion: "ipbl.evidence-supersession-index.v1",
    generatedAt: "2026-06-24T00:00:00Z",
    sourcesScanned: ["docs/source.md"],
    evidenceFamilies: [
      {
        family: "valid_family",
        canonicalArtifact: "artifacts/evidence/canonical.json",
        status: "complete",
        supersedes: ["docs/previous.md"],
        supersessionReason: "Normalizes the checkpoint into a durable family.",
        proofGateTests: ["node ./scripts/validate-evidence-supersession-index.mjs"],
        evidenceLineage: [
          {
            from: "docs/previous.md",
            to: "artifacts/evidence/canonical.json",
            relationship: "normalizes",
          },
        ],
        evidence: ["docs/source.md"],
      },
    ],
    validationCommands: ["node ./scripts/validate-evidence-supersession-index.mjs"],
  };

  writeFile(root, "artifacts/evidence/evidence-supersession-index.json", `${JSON.stringify(index, null, 2)}\n`);
  return index;
}

function saveFixture(root, index) {
  fs.writeFileSync(
    path.join(root, "artifacts/evidence/evidence-supersession-index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
}

function runValidator(root) {
  return spawnSync(NODE, [VALIDATOR], {
    cwd: root,
    encoding: "utf8",
  });
}

function expectCase(name, root, expectedExitCode, expectedSnippet) {
  const result = runValidator(root);
  const combined = `${result.stdout || ""}${result.stderr || ""}`;
  const exitCode = result.status ?? 0;

  console.log(`CASE ${name}`);
  console.log(`  command: ${NODE} ${VALIDATOR}`);
  console.log(`  cwd: ${root}`);
  console.log(`  exit: ${exitCode}`);

  if (expectedSnippet) {
    console.log(`  snippet: ${expectedSnippet}`);
  }

  if (exitCode !== expectedExitCode) {
    console.log(combined);
    throw new Error(`${name} expected exit ${expectedExitCode} but got ${exitCode}`);
  }

  if (expectedSnippet && !combined.includes(expectedSnippet)) {
    console.log(combined);
    throw new Error(`${name} did not include expected snippet: ${expectedSnippet}`);
  }

  return exitCode;
}

function withFixture(name, mutate, expectedExitCode, expectedSnippet) {
  const root = mkTempRoot();
  try {
    mutate(root);
    const exitCode = expectCase(name, root, expectedExitCode, expectedSnippet);
    console.log(`  verified-exit: ${exitCode}`);
    return exitCode;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const cases = [
  {
    name: "valid index",
    exit: 0,
    mutate(root) {
      writeValidFixture(root);
    },
  },
  {
    name: "lineage source in evidence",
    exit: 0,
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].evidenceLineage[0].from = "docs/source.md";
      saveFixture(root, index);
    },
  },
  {
    name: "every allowed status: complete",
    exit: 0,
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].status = "complete";
      saveFixture(root, index);
    },
  },
  {
    name: "every allowed status: complete_verified",
    exit: 0,
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].status = "complete_verified";
      saveFixture(root, index);
    },
  },
  {
    name: "every allowed status: seeded_read_only",
    exit: 0,
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].status = "seeded_read_only";
      saveFixture(root, index);
    },
  },
  {
    name: "every allowed status: support_ready",
    exit: 0,
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].status = "support_ready";
      saveFixture(root, index);
    },
  },
  {
    name: "every allowed relationship: feeds",
    exit: 0,
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].evidenceLineage[0].relationship = "feeds";
      saveFixture(root, index);
    },
  },
  {
    name: "every allowed relationship: governs",
    exit: 0,
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].evidenceLineage[0].relationship = "governs";
      saveFixture(root, index);
    },
  },
  {
    name: "every allowed relationship: materializes",
    exit: 0,
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].evidenceLineage[0].relationship = "materializes";
      saveFixture(root, index);
    },
  },
  {
    name: "every allowed relationship: normalizes",
    exit: 0,
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].evidenceLineage[0].relationship = "normalizes";
      saveFixture(root, index);
    },
  },
  {
    name: "every allowed relationship: proves",
    exit: 0,
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].evidenceLineage[0].relationship = "proves";
      saveFixture(root, index);
    },
  },
  {
    name: "every allowed relationship: proves source freshness inputs",
    exit: 0,
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].evidenceLineage[0].relationship = "proves source freshness inputs";
      saveFixture(root, index);
    },
  },
  {
    name: "every allowed relationship: reconciles",
    exit: 0,
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].evidenceLineage[0].relationship = "reconciles";
      saveFixture(root, index);
    },
  },
  {
    name: "every allowed relationship: seeds",
    exit: 0,
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].evidenceLineage[0].relationship = "seeds";
      saveFixture(root, index);
    },
  },
  {
    name: "missing artifact",
    exit: 1,
    snippet: "missing",
    mutate(root) {
      writeValidFixture(root);
      fs.rmSync(path.join(root, "artifacts/evidence/canonical.json"));
    },
  },
  {
    name: "duplicate sourcesScanned entry",
    exit: 1,
    snippet: "sourcesScanned contains a duplicate path",
    mutate(root) {
      const index = writeValidFixture(root);
      index.sourcesScanned = ["docs/source.md", "docs/source.md"];
      saveFixture(root, index);
    },
  },
  {
    name: "duplicate family",
    exit: 1,
    snippet: "duplicate evidence family",
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies.push({
        ...index.evidenceFamilies[0],
        canonicalArtifact: "artifacts/evidence/canonical-2.json",
      });
      writeFile(root, "artifacts/evidence/canonical-2.json", JSON.stringify({ ok: true }, null, 2));
      saveFixture(root, index);
    },
  },
  {
    name: "duplicate canonical artifact",
    exit: 1,
    snippet: "duplicate canonical artifact",
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies.push({
        ...index.evidenceFamilies[0],
        family: "duplicate_canonical_family",
      });
      saveFixture(root, index);
    },
  },
  {
    name: "duplicate supersedes entry",
    exit: 1,
    snippet: "supersedes contains a duplicate path",
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].supersedes = ["docs/previous.md", "docs/previous.md"];
      saveFixture(root, index);
    },
  },
  {
    name: "duplicate evidence entry",
    exit: 1,
    snippet: "evidence contains a duplicate path",
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].evidence = ["docs/source.md", "docs/source.md"];
      saveFixture(root, index);
    },
  },
  {
    name: "duplicate lineage edge",
    exit: 1,
    snippet: "evidenceLineage contains a duplicate edge",
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].evidenceLineage.push({ ...index.evidenceFamilies[0].evidenceLineage[0] });
      saveFixture(root, index);
    },
  },
  {
    name: "traversal path",
    exit: 1,
    snippet: "must not traverse outside the repository",
    mutate(root) {
      const index = writeValidFixture(root);
      index.sourcesScanned = ["../escape.md"];
      saveFixture(root, index);
    },
  },
  {
    name: "absolute path",
    exit: 1,
    snippet: "must be repository-relative",
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].supersedes = ["/etc/passwd"];
      saveFixture(root, index);
    },
  },
  {
    name: "symlink escape",
    exit: 1,
    snippet: "escapes the repository root via symlink",
    mutate(root) {
      const outsideFile = path.join(os.tmpdir(), `ipbl-supersession-outside-${process.pid}.json`);
      fs.writeFileSync(outsideFile, JSON.stringify({ outside: true }, null, 2));
      writeValidFixture(root);
      fs.unlinkSync(path.join(root, "artifacts/evidence/canonical.json"));
      fs.symlinkSync(outsideFile, path.join(root, "artifacts/evidence/canonical.json"));
    },
  },
  {
    name: "invalid timestamp",
    exit: 1,
    snippet: "must be an ISO 8601 UTC timestamp",
    mutate(root) {
      const index = writeValidFixture(root);
      index.generatedAt = "2026-06-24 00:00:00Z";
      saveFixture(root, index);
    },
  },
  {
    name: "unsupported status",
    exit: 1,
    snippet: "unsupported status",
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].status = "experimental";
      saveFixture(root, index);
    },
  },
  {
    name: "unsupported relationship",
    exit: 1,
    snippet: "unsupported relationship",
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].evidenceLineage[0].relationship = "teleports";
      saveFixture(root, index);
    },
  },
  {
    name: "canonical artifact listed as superseded",
    exit: 1,
    snippet: "must not include the canonical artifact",
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].supersedes.push("artifacts/evidence/canonical.json");
      saveFixture(root, index);
    },
  },
  {
    name: "lineage source only in sourcesScanned",
    exit: 1,
    snippet: "must reference declared supersedes or evidence",
    mutate(root) {
      const index = writeValidFixture(root);
      index.evidenceFamilies[0].evidence = ["docs/other.md"];
      index.evidenceFamilies[0].evidenceLineage[0].from = "docs/source.md";
      saveFixture(root, index);
    },
  },
];

let passed = 0;
for (const testCase of cases) {
  const exitCode = withFixture(testCase.name, testCase.mutate, testCase.exit, testCase.snippet);
  passed += 1;
}

console.log(JSON.stringify({ ok: true, cases: passed }, null, 2));
