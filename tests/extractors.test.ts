import { describe, it, expect } from 'vitest';
import { extractCommitMessageFeatures } from '../src/extractors/commit-message.js';
import { extractChangePatterns } from '../src/extractors/change-patterns.js';
import { extractBehavioralFeatures } from '../src/extractors/behavioral.js';
import { CommitData } from '../src/types.js';

function makeCommit(overrides: Partial<CommitData> = {}): CommitData {
  return {
    hash: 'abc123def456',
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

describe('extractCommitMessageFeatures', () => {
  it('returns zeros for empty commits', () => {
    const result = extractCommitMessageFeatures([]);
    expect(result.avgCommitMsgLength).toBe(0);
    expect(result.multilineCommitRatio).toBe(0);
    expect(result.conventionalCommitRatio).toBe(0);
  });

  it('detects conventional commits', () => {
    const commits = [
      makeCommit({ message: 'feat: add new feature' }),
      makeCommit({ message: 'fix(auth): fix login bug' }),
      makeCommit({ message: 'just a regular commit' }),
    ];
    const result = extractCommitMessageFeatures(commits);
    expect(result.conventionalCommitRatio).toBeCloseTo(2 / 3);
  });

  it('detects multiline commits', () => {
    const commits = [
      makeCommit({ message: 'short', body: 'This has a body\nwith details' }),
      makeCommit({ message: 'also short', body: '' }),
    ];
    const result = extractCommitMessageFeatures(commits);
    expect(result.multilineCommitRatio).toBe(0.5);
  });

  it('detects imperative mood', () => {
    const commits = [
      makeCommit({ message: 'add new feature' }),
      makeCommit({ message: 'fix bug in auth' }),
      makeCommit({ message: 'Updated the README' }),
    ];
    const result = extractCommitMessageFeatures(commits);
    expect(result.imperativeMoodRatio).toBeCloseTo(2 / 3);
  });

  it('detects emoji commits', () => {
    const commits = [
      makeCommit({ message: '🎉 initial commit' }),
      makeCommit({ message: 'regular commit' }),
    ];
    const result = extractCommitMessageFeatures(commits);
    expect(result.emojiCommitRatio).toBe(0.5);
  });

  it('detects bullet lists', () => {
    const commits = [
      makeCommit({ message: 'update', body: '- item 1\n- item 2' }),
      makeCommit({ message: 'update', body: '* point 1\n* point 2' }),
      makeCommit({ message: 'update', body: 'no bullets here' }),
    ];
    const result = extractCommitMessageFeatures(commits);
    expect(result.bulletListRatio).toBeCloseTo(2 / 3);
  });

  it('detects co-authored commits', () => {
    const commits = [
      makeCommit({ message: 'feat: add auth', body: 'Co-Authored-By: Claude <claude@anthropic.com>' }),
      makeCommit({ message: 'fix: typo', body: '' }),
    ];
    const result = extractCommitMessageFeatures(commits);
    expect(result.coAuthoredRatio).toBe(0.5);
  });

  it('detects signed-off commits', () => {
    const commits = [
      makeCommit({ message: 'feat: add auth', body: 'Signed-off-by: Dev <dev@example.com>' }),
      makeCommit({ message: 'fix: typo', body: '' }),
    ];
    const result = extractCommitMessageFeatures(commits);
    expect(result.signedOffRatio).toBe(0.5);
  });

  it('calculates average message length', () => {
    const commits = [
      makeCommit({ message: '1234567890', body: '' }), // 10
      makeCommit({ message: '12345678901234567890', body: '' }), // 20
    ];
    const result = extractCommitMessageFeatures(commits);
    expect(result.avgCommitMsgLength).toBe(15);
  });
});

describe('extractChangePatterns', () => {
  it('returns zeros for empty commits', () => {
    const result = extractChangePatterns([]);
    expect(result.filesPerCommitAvg).toBe(0);
  });

  it('calculates files per commit', () => {
    const commits = [
      makeCommit({ filesChanged: [
        { file: 'a.ts', insertions: 5, deletions: 0, binary: false },
        { file: 'b.ts', insertions: 3, deletions: 1, binary: false },
      ]}),
      makeCommit({ filesChanged: [
        { file: 'c.ts', insertions: 10, deletions: 2, binary: false },
      ]}),
    ];
    const result = extractChangePatterns(commits);
    expect(result.filesPerCommitAvg).toBe(1.5);
  });

  it('calculates single file commit ratio', () => {
    const commits = [
      makeCommit({ filesChanged: [{ file: 'a.ts', insertions: 5, deletions: 0, binary: false }] }),
      makeCommit({ filesChanged: [
        { file: 'b.ts', insertions: 3, deletions: 1, binary: false },
        { file: 'c.ts', insertions: 2, deletions: 0, binary: false },
      ]}),
    ];
    const result = extractChangePatterns(commits);
    expect(result.singleFileCommitRatio).toBe(0.5);
  });

  it('detects test files', () => {
    const commits = [
      makeCommit({ filesChanged: [
        { file: 'src/index.ts', insertions: 5, deletions: 0, binary: false },
        { file: 'tests/index.test.ts', insertions: 10, deletions: 0, binary: false },
        { file: 'src/__tests__/foo.ts', insertions: 3, deletions: 0, binary: false },
        { file: 'src/app.ts', insertions: 2, deletions: 0, binary: false },
      ]}),
    ];
    const result = extractChangePatterns(commits);
    expect(result.testFileRatio).toBe(0.5); // 2 test files out of 4
  });

  it('calculates file type diversity', () => {
    const commits = [
      makeCommit({ filesChanged: [
        { file: 'a.ts', insertions: 5, deletions: 0, binary: false },
        { file: 'b.ts', insertions: 3, deletions: 0, binary: false },
      ]}),
    ];
    const result = extractChangePatterns(commits);
    // Only one extension type, so entropy is 0
    expect(result.fileTypeDiversity).toBe(0);
  });

  it('has higher diversity with multiple file types', () => {
    const commits = [
      makeCommit({ filesChanged: [
        { file: 'a.ts', insertions: 5, deletions: 0, binary: false },
        { file: 'b.js', insertions: 3, deletions: 0, binary: false },
        { file: 'c.py', insertions: 2, deletions: 0, binary: false },
      ]}),
    ];
    const result = extractChangePatterns(commits);
    expect(result.fileTypeDiversity).toBeGreaterThan(1);
  });
});

describe('extractBehavioralFeatures', () => {
  it('returns zeros for empty commits', () => {
    const result = extractBehavioralFeatures([]);
    expect(result.commitFrequency).toBe(0);
    expect(result.burstPattern).toBe(0);
  });

  it('calculates session duration', () => {
    const commits = [
      makeCommit({ date: new Date('2024-01-15T10:00:00Z') }),
      makeCommit({ date: new Date('2024-01-15T12:00:00Z') }),
    ];
    const result = extractBehavioralFeatures(commits);
    expect(result.sessionDuration).toBe(2); // 2 hours
  });

  it('detects burst patterns', () => {
    const commits = [
      makeCommit({ date: new Date('2024-01-15T10:00:00Z') }),
      makeCommit({ date: new Date('2024-01-15T10:00:30Z') }), // 30s gap - burst
      makeCommit({ date: new Date('2024-01-15T10:00:45Z') }), // 15s gap - burst
      makeCommit({ date: new Date('2024-01-15T10:05:00Z') }), // 4+ min gap - not burst
    ];
    const result = extractBehavioralFeatures(commits);
    expect(result.burstPattern).toBeCloseTo(2 / 3); // 2 out of 3 gaps are bursts
  });

  it('calculates commit frequency', () => {
    const commits = [
      makeCommit({ date: new Date('2024-01-15T10:00:00Z') }),
      makeCommit({ date: new Date('2024-01-15T11:00:00Z') }),
      makeCommit({ date: new Date('2024-01-15T12:00:00Z') }),
    ];
    const result = extractBehavioralFeatures(commits);
    expect(result.commitFrequency).toBeCloseTo(1.5); // 3 commits in 2 hours
  });
});
