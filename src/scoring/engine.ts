import { CommitData, FeatureVector, AgentScore, CommitAttribution, AgentSummary, ScanResult } from '../types.js';
import { agentProfiles } from './profiles.js';
import { extractFeatures } from '../extractors/index.js';
import { extractCommitMessageFeatures } from '../extractors/commit-message.js';
import { extractChangePatterns } from '../extractors/change-patterns.js';
import { extractBehavioralFeatures } from '../extractors/behavioral.js';
import { ratio } from '../utils/math.js';

export function scoreCommit(commit: CommitData, globalFeatures: FeatureVector): AgentScore[] {
  const scores: AgentScore[] = [];

  // Extract per-commit features (using single-commit arrays)
  const commitMsgFeatures = extractCommitMessageFeatures([commit]);
  const changeFeatures = extractChangePatterns([commit]);

  for (const profile of agentProfiles) {
    let totalScore = 0;
    let totalWeight = 0;
    const matchedFeatures: string[] = [];
    const distinctiveFeatures: string[] = [];

    // Score numeric feature weights
    for (const [featureKey, config] of Object.entries(profile.weights)) {
      const key = featureKey as keyof FeatureVector;
      const value = getFeatureValue(key, commitMsgFeatures, changeFeatures, globalFeatures);

      if (value === undefined || typeof config.expected === 'string') continue;

      const tolerance = config.tolerance ?? 0.2;
      const distance = Math.abs(value - config.expected);
      const normalizedDistance = distance / (tolerance + Math.abs(config.expected) + 0.001);
      const match = Math.max(0, 1 - normalizedDistance);

      totalScore += match * config.weight;
      totalWeight += config.weight;

      if (match > 0.5) {
        matchedFeatures.push(featureKey);
        if (match > 0.8) {
          distinctiveFeatures.push(featureKey);
        }
      }
    }

    // Score commit pattern matches (strong signal)
    for (const pattern of profile.commitPatterns) {
      if (pattern.test(commit.message) || pattern.test(commit.body)) {
        totalScore += 0.15;
        totalWeight += 0.15;
        matchedFeatures.push('commitPattern');
        break;
      }
    }

    // Score trailer matches (very strong signal)
    const fullMsg = commit.message + '\n' + commit.body;
    for (const pattern of profile.trailerPatterns) {
      if (pattern.test(fullMsg)) {
        totalScore += 0.2;
        totalWeight += 0.2;
        matchedFeatures.push('trailerMatch');
        distinctiveFeatures.push('trailerMatch');
        break;
      }
    }

    // Score branch pattern match from global features
    const branchScore = globalFeatures.knownBranchPatterns[profile.name] ?? 0;
    if (branchScore > 0) {
      totalScore += 0.1;
      totalWeight += 0.1;
      matchedFeatures.push('branchPattern');
      distinctiveFeatures.push('branchPattern');
    }

    const confidence = totalWeight > 0 ? totalScore / totalWeight : 0;

    scores.push({
      agent: profile.displayName,
      confidence: Math.min(confidence, 1),
      matchedFeatures: [...new Set(matchedFeatures)],
      distinctiveFeatures: [...new Set(distinctiveFeatures)],
    });
  }

  // Sort by confidence descending
  scores.sort((a, b) => b.confidence - a.confidence);

  return scores;
}

function getFeatureValue(
  key: keyof FeatureVector,
  commitMsg: ReturnType<typeof extractCommitMessageFeatures>,
  changes: ReturnType<typeof extractChangePatterns>,
  global: FeatureVector,
): number | undefined {
  if (key in commitMsg) return (commitMsg as any)[key];
  if (key in changes) return (changes as any)[key];
  if (key in global && typeof (global as any)[key] === 'number') return (global as any)[key];
  return undefined;
}

export function identifyAgent(scores: AgentScore[]): AgentScore {
  if (scores.length === 0 || scores[0].confidence < 0.3) {
    return {
      agent: scores[0]?.confidence < 0.15 ? 'Human' : 'Unknown',
      confidence: scores[0]?.confidence ?? 0,
      matchedFeatures: [],
      distinctiveFeatures: [],
    };
  }

  // If top two agents are very close, mark as uncertain
  if (scores.length >= 2 && scores[0].confidence - scores[1].confidence < 0.05) {
    return {
      ...scores[0],
      confidence: scores[0].confidence * 0.8, // Reduce confidence when ambiguous
    };
  }

  return scores[0];
}

export function buildScanResult(
  repoPath: string,
  commits: CommitData[],
  branchName: string,
): ScanResult {
  if (commits.length === 0) {
    return {
      repoPath,
      totalCommits: 0,
      dateRange: { from: new Date(), to: new Date() },
      features: extractFeatures([], branchName),
      attributions: [],
      summary: [],
    };
  }

  const features = extractFeatures(commits, branchName);
  const attributions: CommitAttribution[] = [];

  for (const commit of commits) {
    const scores = scoreCommit(commit, features);
    const bestMatch = identifyAgent(scores);

    attributions.push({
      hash: commit.hash,
      shortHash: commit.hash.slice(0, 7),
      message: commit.message,
      date: commit.date,
      author: commit.author,
      scores,
      bestMatch,
    });
  }

  // Build summary
  const agentCounts: Record<string, { commits: number; totalConf: number; signals: Set<string> }> = {};
  for (const attr of attributions) {
    const agent = attr.bestMatch.agent;
    if (!agentCounts[agent]) {
      agentCounts[agent] = { commits: 0, totalConf: 0, signals: new Set() };
    }
    agentCounts[agent].commits++;
    agentCounts[agent].totalConf += attr.bestMatch.confidence;
    for (const f of attr.bestMatch.matchedFeatures) {
      agentCounts[agent].signals.add(f);
    }
  }

  const summary: AgentSummary[] = Object.entries(agentCounts)
    .map(([agent, data]) => ({
      agent,
      commits: data.commits,
      percentage: Math.round((data.commits / commits.length) * 100),
      avgConfidence: data.totalConf / data.commits,
      keySignals: [...data.signals].slice(0, 5),
    }))
    .sort((a, b) => b.commits - a.commits);

  const dates = commits.map(c => c.date);

  return {
    repoPath,
    totalCommits: commits.length,
    dateRange: {
      from: new Date(Math.min(...dates.map(d => d.getTime()))),
      to: new Date(Math.max(...dates.map(d => d.getTime()))),
    },
    features,
    attributions,
    summary,
  };
}
