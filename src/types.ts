export interface CommitData {
  hash: string;
  message: string;
  body: string;
  author: string;
  authorEmail: string;
  date: Date;
  filesChanged: FileChange[];
  insertions: number;
  deletions: number;
}

export interface FileChange {
  file: string;
  insertions: number;
  deletions: number;
  binary: boolean;
}

export interface FeatureVector {
  // Commit message features
  avgCommitMsgLength: number;
  multilineCommitRatio: number;
  conventionalCommitRatio: number;
  imperativeMoodRatio: number;
  emojiCommitRatio: number;
  bulletListRatio: number;
  coAuthoredRatio: number;
  signedOffRatio: number;

  // PR/Branch structure features
  branchNamingPattern: string;
  filesPerCommitAvg: number;
  filesPerCommitStd: number;
  insertionsPerCommitAvg: number;
  deletionsPerCommitAvg: number;
  changeConcentrationGini: number;
  singleFileCommitRatio: number;

  // Code characteristics
  testFileRatio: number;
  newFileRatio: number;

  // Behavioral patterns
  commitFrequency: number;
  burstPattern: number;
  sessionDuration: number;
  fileTypeDiversity: number;

  // Agent-specific signatures
  knownCommitPatterns: Record<string, number>;
  knownBranchPatterns: Record<string, number>;
  trailerPatterns: Record<string, number>;
}

export interface AgentProfile {
  name: string;
  displayName: string;
  description: string;
  weights: Partial<Record<keyof FeatureVector, { expected: number | string; weight: number; tolerance?: number }>>;
  commitPatterns: RegExp[];
  branchPatterns: RegExp[];
  trailerPatterns: RegExp[];
  keySignals: string[];
}

export interface AgentScore {
  agent: string;
  confidence: number;
  matchedFeatures: string[];
  distinctiveFeatures: string[];
}

export interface CommitAttribution {
  hash: string;
  shortHash: string;
  message: string;
  date: Date;
  author: string;
  scores: AgentScore[];
  bestMatch: AgentScore;
}

export interface ScanResult {
  repoPath: string;
  totalCommits: number;
  dateRange: { from: Date; to: Date };
  features: FeatureVector;
  attributions: CommitAttribution[];
  summary: AgentSummary[];
}

export interface AgentSummary {
  agent: string;
  commits: number;
  percentage: number;
  avgConfidence: number;
  keySignals: string[];
}

export interface BlameSection {
  startLine: number;
  endLine: number;
  agent: string;
  confidence: number;
  commitHash: string;
  author: string;
}
