import { CommitData } from '../types.js';
import { mean, stddev, giniCoefficient, shannonEntropy, ratio } from '../utils/math.js';

export function extractChangePatterns(commits: CommitData[]) {
  if (commits.length === 0) {
    return {
      filesPerCommitAvg: 0,
      filesPerCommitStd: 0,
      insertionsPerCommitAvg: 0,
      deletionsPerCommitAvg: 0,
      changeConcentrationGini: 0,
      singleFileCommitRatio: 0,
      testFileRatio: 0,
      newFileRatio: 0,
      fileTypeDiversity: 0,
    };
  }

  const fileCounts = commits.map(c => c.filesChanged.length);
  const insertions = commits.map(c => c.insertions);
  const deletions = commits.map(c => c.deletions);

  // Gini coefficient of changes across files
  const fileChangeCounts: Record<string, number> = {};
  for (const commit of commits) {
    for (const file of commit.filesChanged) {
      fileChangeCounts[file.file] = (fileChangeCounts[file.file] || 0) + file.insertions + file.deletions;
    }
  }
  const changeValues = Object.values(fileChangeCounts);

  // Single file commits
  const singleFile = commits.filter(c => c.filesChanged.length === 1);

  // Test file ratio
  const allFiles = new Set<string>();
  const testFiles = new Set<string>();
  for (const commit of commits) {
    for (const file of commit.filesChanged) {
      allFiles.add(file.file);
      if (isTestFile(file.file)) {
        testFiles.add(file.file);
      }
    }
  }

  // File type diversity (Shannon entropy of extensions)
  const extCounts: Record<string, number> = {};
  for (const file of allFiles) {
    const ext = getExtension(file);
    extCounts[ext] = (extCounts[ext] || 0) + 1;
  }
  const extValues = Object.values(extCounts);

  return {
    filesPerCommitAvg: mean(fileCounts),
    filesPerCommitStd: stddev(fileCounts),
    insertionsPerCommitAvg: mean(insertions),
    deletionsPerCommitAvg: mean(deletions),
    changeConcentrationGini: giniCoefficient(changeValues),
    singleFileCommitRatio: ratio(singleFile.length, commits.length),
    testFileRatio: ratio(testFiles.size, allFiles.size),
    newFileRatio: 0, // Would need diff --name-status to detect, default to 0
    fileTypeDiversity: shannonEntropy(extValues),
  };
}

function isTestFile(path: string): boolean {
  return /\.(test|spec|_test|_spec)\.[^.]+$/.test(path) ||
    /^tests?\//.test(path) ||
    /\/__tests__\//.test(path) ||
    /\.stories\.[^.]+$/.test(path);
}

function getExtension(path: string): string {
  const match = path.match(/\.([^.]+)$/);
  return match ? match[1] : 'none';
}
