#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function exists(path) {
  return fs.existsSync(path);
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function cmd(name, args) {
  try {
    return execFileSync(name, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    return null;
  }
}

const packageJson = exists('package.json') ? readJson('package.json') : null;
const lockfiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb'].filter(exists);
const vercelJson = exists('vercel.json') ? readJson('vercel.json') : null;
const nvmrc = exists('.nvmrc') ? fs.readFileSync('.nvmrc', 'utf8').trim() : null;
const gitSha = cmd('git', ['rev-parse', 'HEAD']);
const gitBranch = cmd('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
const status = cmd('git', ['status', '--short']);

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  git: {
    branch: gitBranch,
    sha: gitSha,
    clean: status === '',
  },
  packageManager: packageJson?.packageManager ?? null,
  lockfiles,
  scripts: packageJson?.scripts ? Object.keys(packageJson.scripts).sort() : [],
  node: {
    nvmrc,
    engines: packageJson?.engines ?? null,
  },
  vercel: {
    hasVercelJson: Boolean(vercelJson),
    framework: vercelJson?.framework ?? null,
    buildCommand: vercelJson?.buildCommand ?? null,
    installCommand: vercelJson?.installCommand ?? null,
    outputDirectory: vercelJson?.outputDirectory ?? null,
    devCommand: vercelJson?.devCommand ?? null,
  },
  policy: {
    productionDeployRequiresGate: true,
    productionPromoteRequiresSeparateGate: true,
    routeMutationRequiresSeparateGate: true,
    doNotPrintSecrets: true,
  },
};

console.log(JSON.stringify(report, null, 2));
