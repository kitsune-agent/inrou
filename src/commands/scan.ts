import { isGitRepo, getCommits, getCurrentBranch } from '../utils/git.js';
import { buildScanResult } from '../scoring/engine.js';
import { formatScanResult } from '../utils/format.js';
import path from 'path';

export interface ScanOptions {
  commits: number;
  json: boolean;
}

export async function scanCommand(repoPath: string, options: ScanOptions): Promise<void> {
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

  const result = buildScanResult(resolved, commits, branchName);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatScanResult(result));
  }
}
