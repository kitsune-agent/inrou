import { CommitData } from '../types.js';
import { agentProfiles } from '../scoring/profiles.js';

export function extractAgentSignatures(commits: CommitData[], branchName: string) {
  const knownCommitPatterns: Record<string, number> = {};
  const knownBranchPatterns: Record<string, number> = {};
  const trailerPatterns: Record<string, number> = {};

  for (const profile of agentProfiles) {
    // Count commit message pattern matches
    let commitMatches = 0;
    for (const commit of commits) {
      for (const pattern of profile.commitPatterns) {
        if (pattern.test(commit.message) || pattern.test(commit.body)) {
          commitMatches++;
          break;
        }
      }
    }
    knownCommitPatterns[profile.name] = commits.length > 0 ? commitMatches / commits.length : 0;

    // Branch pattern matches
    let branchMatch = 0;
    for (const pattern of profile.branchPatterns) {
      if (pattern.test(branchName)) {
        branchMatch = 1;
        break;
      }
    }
    knownBranchPatterns[profile.name] = branchMatch;

    // Trailer pattern matches
    let trailerMatches = 0;
    for (const commit of commits) {
      const fullMsg = commit.message + '\n' + commit.body;
      for (const pattern of profile.trailerPatterns) {
        if (pattern.test(fullMsg)) {
          trailerMatches++;
          break;
        }
      }
    }
    trailerPatterns[profile.name] = commits.length > 0 ? trailerMatches / commits.length : 0;
  }

  return {
    branchNamingPattern: detectBranchPattern(branchName),
    knownCommitPatterns,
    knownBranchPatterns,
    trailerPatterns,
  };
}

function detectBranchPattern(branch: string): string {
  if (/^devin\//.test(branch)) return 'devin/*';
  if (/^codex\//.test(branch)) return 'codex/*';
  if (/^feature\//.test(branch)) return 'feature/*';
  if (/^fix\//.test(branch)) return 'fix/*';
  if (/^(bug|hotfix)\//.test(branch)) return 'hotfix/*';
  if (/^issue-\d+/.test(branch)) return 'issue-*';
  if (/^(main|master|develop)$/.test(branch)) return 'default';
  return 'custom';
}
