import { CommitData, FeatureVector } from '../types.js';
import { extractCommitMessageFeatures } from './commit-message.js';
import { extractChangePatterns } from './change-patterns.js';
import { extractBehavioralFeatures } from './behavioral.js';
import { extractAgentSignatures } from './agent-signatures.js';

export function extractFeatures(commits: CommitData[], branchName: string): FeatureVector {
  const commitMsg = extractCommitMessageFeatures(commits);
  const changes = extractChangePatterns(commits);
  const behavioral = extractBehavioralFeatures(commits);
  const signatures = extractAgentSignatures(commits, branchName);

  return {
    ...commitMsg,
    ...changes,
    ...behavioral,
    ...signatures,
  };
}

export { extractCommitMessageFeatures } from './commit-message.js';
export { extractChangePatterns } from './change-patterns.js';
export { extractBehavioralFeatures } from './behavioral.js';
export { extractAgentSignatures } from './agent-signatures.js';
