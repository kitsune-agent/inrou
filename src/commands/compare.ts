import { isGitRepo, getCommits, getCurrentBranch } from '../utils/git.js';
import { extractFeatures } from '../extractors/index.js';
import { formatCompare } from '../utils/format.js';
import path from 'path';

export interface CompareOptions {
  commits: number;
  json: boolean;
}

export async function compareCommand(repo1: string, repo2: string, options: CompareOptions): Promise<void> {
  const resolved1 = path.resolve(repo1);
  const resolved2 = path.resolve(repo2);

  for (const p of [resolved1, resolved2]) {
    if (!(await isGitRepo(p))) {
      console.error(`Error: ${p} is not a git repository.`);
      process.exit(1);
    }
  }

  const [branch1, branch2] = await Promise.all([
    getCurrentBranch(resolved1),
    getCurrentBranch(resolved2),
  ]);

  const [commits1, commits2] = await Promise.all([
    getCommits(resolved1, options.commits),
    getCommits(resolved2, options.commits),
  ]);

  const features1 = extractFeatures(commits1, branch1);
  const features2 = extractFeatures(commits2, branch2);

  const numericFeatures = (f: any) => {
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(f)) {
      if (typeof v === 'number') result[k] = v;
    }
    return result;
  };

  const profile1 = { path: resolved1, features: numericFeatures(features1) };
  const profile2 = { path: resolved2, features: numericFeatures(features2) };

  if (options.json) {
    console.log(JSON.stringify({ repo1: profile1, repo2: profile2 }, null, 2));
  } else {
    console.log(formatCompare(profile1, profile2));
  }
}
