import { isGitRepo, getCommits, getCurrentBranch } from '../utils/git.js';
import { extractFeatures } from '../extractors/index.js';
import { formatProfile } from '../utils/format.js';
import path from 'path';

export interface ProfileOptions {
  commits: number;
  json: boolean;
}

export async function profileCommand(repoPath: string, options: ProfileOptions): Promise<void> {
  const resolved = path.resolve(repoPath);

  if (!(await isGitRepo(resolved))) {
    console.error(`Error: ${resolved} is not a git repository.`);
    process.exit(1);
  }

  const branchName = await getCurrentBranch(resolved);
  const commits = await getCommits(resolved, options.commits);

  if (commits.length === 0) {
    console.log('No commits found in this repository.');
    return;
  }

  const features = extractFeatures(commits, branchName);

  if (options.json) {
    console.log(JSON.stringify(features, null, 2));
  } else {
    const numericFeatures: Record<string, number> = {};
    for (const [k, v] of Object.entries(features)) {
      if (typeof v === 'number') numericFeatures[k] = v;
    }
    console.log(formatProfile(numericFeatures, resolved));
  }
}
