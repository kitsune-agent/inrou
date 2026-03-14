import { describe, it, expect } from 'vitest';
import { scoreCommit, identifyAgent, buildScanResult } from '../src/scoring/engine.js';
import { extractFeatures } from '../src/extractors/index.js';
import { CommitData, FeatureVector } from '../src/types.js';

function makeCommit(overrides: Partial<CommitData> = {}): CommitData {
  return {
    hash: 'abc123def456789012345678901234567890abcd',
    message: 'test commit',
    body: '',
    author: 'Test User',
    authorEmail: 'test@test.com',
    date: new Date('2024-01-15T10:00:00Z'),
    filesChanged: [{ file: 'src/index.ts', insertions: 10, deletions: 5, binary: false }],
    insertions: 10,
    deletions: 5,
    ...overrides,
  };
}

describe('scoreCommit', () => {
  it('scores a Claude Code-style commit highly for Claude Code', () => {
    const commit = makeCommit({
      message: 'feat: add user authentication flow',
      body: 'Co-Authored-By: Claude <noreply@anthropic.com>',
    });
    const features = extractFeatures([commit], 'feature/auth');
    const scores = scoreCommit(commit, features);

    const claudeScore = scores.find(s => s.agent === 'Claude Code');
    expect(claudeScore).toBeDefined();
    expect(claudeScore!.confidence).toBeGreaterThan(0.3);
    expect(claudeScore!.matchedFeatures).toContain('trailerMatch');
  });

  it('scores an Aider-style commit highly for Aider', () => {
    const commit = makeCommit({
      message: 'aider: refactor database layer',
      body: 'Co-authored-by: aider <aider@example.com>',
    });
    const features = extractFeatures([commit], 'main');
    const scores = scoreCommit(commit, features);

    const aiderScore = scores.find(s => s.agent === 'Aider');
    expect(aiderScore).toBeDefined();
    expect(aiderScore!.confidence).toBeGreaterThan(0.3);
  });

  it('scores a Copilot-style commit higher for Copilot', () => {
    const commit = makeCommit({
      message: 'Update README.md',
      body: '',
      filesChanged: [{ file: 'README.md', insertions: 2, deletions: 1, binary: false }],
    });
    const features = extractFeatures([commit], 'patch-1');
    const scores = scoreCommit(commit, features);

    const copilotScore = scores.find(s => s.agent === 'Copilot');
    expect(copilotScore).toBeDefined();
    expect(copilotScore!.confidence).toBeGreaterThan(0);
  });

  it('returns scores for all known agents', () => {
    const commit = makeCommit();
    const features = extractFeatures([commit], 'main');
    const scores = scoreCommit(commit, features);

    expect(scores.length).toBeGreaterThanOrEqual(7);
    const agentNames = scores.map(s => s.agent);
    expect(agentNames).toContain('Claude Code');
    expect(agentNames).toContain('Copilot');
    expect(agentNames).toContain('Codex');
    expect(agentNames).toContain('Devin');
    expect(agentNames).toContain('Cursor');
    expect(agentNames).toContain('Aider');
    expect(agentNames).toContain('Windsurf');
  });
});

describe('identifyAgent', () => {
  it('returns Human/Unknown for low confidence', () => {
    const scores = [
      { agent: 'Claude Code', confidence: 0.1, matchedFeatures: [], distinctiveFeatures: [] },
    ];
    const result = identifyAgent(scores);
    expect(result.agent).toBe('Human');
  });

  it('returns top agent for high confidence', () => {
    const scores = [
      { agent: 'Claude Code', confidence: 0.85, matchedFeatures: ['conv'], distinctiveFeatures: ['conv'] },
      { agent: 'Copilot', confidence: 0.3, matchedFeatures: [], distinctiveFeatures: [] },
    ];
    const result = identifyAgent(scores);
    expect(result.agent).toBe('Claude Code');
    expect(result.confidence).toBe(0.85);
  });

  it('reduces confidence when top two are close', () => {
    const scores = [
      { agent: 'Claude Code', confidence: 0.6, matchedFeatures: [], distinctiveFeatures: [] },
      { agent: 'Windsurf', confidence: 0.58, matchedFeatures: [], distinctiveFeatures: [] },
    ];
    const result = identifyAgent(scores);
    expect(result.confidence).toBeLessThan(0.6);
  });
});

describe('buildScanResult', () => {
  it('handles empty commits', () => {
    const result = buildScanResult('/tmp/test', [], 'main');
    expect(result.totalCommits).toBe(0);
    expect(result.attributions).toHaveLength(0);
    expect(result.summary).toHaveLength(0);
  });

  it('builds a scan result with attributions', () => {
    const commits = [
      makeCommit({
        hash: 'aaa111',
        message: 'feat: add auth',
        body: 'Co-Authored-By: Claude <noreply@anthropic.com>',
      }),
      makeCommit({
        hash: 'bbb222',
        message: 'Update README.md',
        date: new Date('2024-01-15T10:05:00Z'),
      }),
      makeCommit({
        hash: 'ccc333',
        message: 'aider: fix bug',
        body: 'Co-authored-by: aider <aider@example.com>',
        date: new Date('2024-01-15T10:10:00Z'),
      }),
    ];

    const result = buildScanResult('/tmp/test', commits, 'feature/auth');

    expect(result.totalCommits).toBe(3);
    expect(result.attributions).toHaveLength(3);
    expect(result.summary.length).toBeGreaterThan(0);

    // Each attribution should have a best match
    for (const attr of result.attributions) {
      expect(attr.bestMatch).toBeDefined();
      expect(attr.bestMatch.agent).toBeTruthy();
    }
  });

  it('generates summary with percentages', () => {
    const commits = Array.from({ length: 5 }, (_, i) =>
      makeCommit({
        hash: `hash${i}`,
        message: 'feat: add feature',
        body: 'Co-Authored-By: Claude <noreply@anthropic.com>',
        date: new Date(`2024-01-15T1${i}:00:00Z`),
      }),
    );

    const result = buildScanResult('/tmp/test', commits, 'main');

    const totalPercent = result.summary.reduce((sum, s) => sum + s.percentage, 0);
    // Percentages should roughly add up to 100 (rounding may cause slight differences)
    expect(totalPercent).toBeGreaterThanOrEqual(95);
    expect(totalPercent).toBeLessThanOrEqual(105);
  });
});
