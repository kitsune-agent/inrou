import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getCommits, isGitRepo, getCurrentBranch } from '../src/utils/git.js';
import { buildScanResult } from '../src/scoring/engine.js';

describe('integration: mock git repo', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inrou-test-'));

    // Initialize git repo
    execSync('git init', { cwd: tempDir });
    execSync('git config user.email "test@test.com"', { cwd: tempDir });
    execSync('git config user.name "Test User"', { cwd: tempDir });

    // Claude Code-style commits
    fs.writeFileSync(path.join(tempDir, 'auth.ts'), 'export function login() { return true; }');
    execSync('git add auth.ts', { cwd: tempDir });
    execSync(`git commit -m "feat: add user authentication flow" -m "Co-Authored-By: Claude <noreply@anthropic.com>"`, { cwd: tempDir });

    fs.writeFileSync(path.join(tempDir, 'auth.test.ts'), 'test("login works", () => {});');
    execSync('git add auth.test.ts', { cwd: tempDir });
    execSync(`git commit -m "test: add authentication tests" -m "Co-Authored-By: Claude <noreply@anthropic.com>"`, { cwd: tempDir });

    // Copilot-style commits
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Project');
    execSync('git add README.md', { cwd: tempDir });
    execSync('git commit -m "Update README.md"', { cwd: tempDir });

    // Aider-style commits
    fs.writeFileSync(path.join(tempDir, 'db.ts'), 'export const db = {};');
    execSync('git add db.ts', { cwd: tempDir });
    execSync(`git commit -m "aider: refactor database layer" -m "Co-authored-by: aider <aider@example.com>"`, { cwd: tempDir });

    // Human-style commit (irregular)
    fs.writeFileSync(path.join(tempDir, 'config.ts'), 'export const config = {};');
    execSync('git add config.ts', { cwd: tempDir });
    execSync('git commit -m "wip stuff"', { cwd: tempDir });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects git repo', async () => {
    expect(await isGitRepo(tempDir)).toBe(true);
    expect(await isGitRepo('/tmp/nonexistent-dir-12345')).toBe(false);
  });

  it('gets current branch', async () => {
    const branch = await getCurrentBranch(tempDir);
    expect(['main', 'master']).toContain(branch);
  });

  it('extracts commits', async () => {
    const commits = await getCommits(tempDir, 10);
    expect(commits.length).toBe(5);
    expect(commits[0].message).toBeTruthy();
    expect(commits[0].hash).toBeTruthy();
  });

  it('builds a scan result from real commits', async () => {
    const commits = await getCommits(tempDir, 10);
    const branch = await getCurrentBranch(tempDir);
    const result = buildScanResult(tempDir, commits, branch);

    expect(result.totalCommits).toBe(5);
    expect(result.attributions.length).toBe(5);
    expect(result.summary.length).toBeGreaterThan(0);

    // The Claude-style commits should be attributed to Claude Code
    const claudeCommit = result.attributions.find(a =>
      a.message.includes('feat: add user authentication')
    );
    expect(claudeCommit).toBeDefined();
    expect(claudeCommit!.bestMatch.agent).toBe('Claude Code');

    // The aider commit should be attributed to Aider
    const aiderCommit = result.attributions.find(a =>
      a.message.includes('aider:')
    );
    expect(aiderCommit).toBeDefined();
    expect(aiderCommit!.bestMatch.agent).toBe('Aider');
  });

  it('generates JSON output', async () => {
    const commits = await getCommits(tempDir, 10);
    const branch = await getCurrentBranch(tempDir);
    const result = buildScanResult(tempDir, commits, branch);

    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);
    expect(parsed.totalCommits).toBe(5);
    expect(parsed.attributions).toHaveLength(5);
  });
});
