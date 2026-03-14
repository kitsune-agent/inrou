import { isGitRepo, getBlameData, getCommits, getCurrentBranch } from '../utils/git.js';
import { buildScanResult } from '../scoring/engine.js';
import { formatBlame } from '../utils/format.js';
import { BlameSection } from '../types.js';
import fs from 'fs';
import path from 'path';

export interface BlameOptions {
  commits: number;
}

export async function blameCommand(filePath: string, options: BlameOptions): Promise<void> {
  const resolved = path.resolve(filePath);
  const repoRoot = path.dirname(resolved);

  // Walk up to find the git repo root
  let gitRoot = repoRoot;
  while (gitRoot !== '/') {
    if (await isGitRepo(gitRoot)) break;
    gitRoot = path.dirname(gitRoot);
  }

  if (!(await isGitRepo(gitRoot))) {
    console.error(`Error: ${resolved} is not in a git repository.`);
    process.exit(1);
  }

  if (!fs.existsSync(resolved)) {
    console.error(`Error: File ${resolved} does not exist.`);
    process.exit(1);
  }

  const relativePath = path.relative(gitRoot, resolved);
  const fileContent = fs.readFileSync(resolved, 'utf-8');

  // Get blame data
  const blameData = await getBlameData(gitRoot, relativePath);

  // Get commits and build scan result for scoring
  const branchName = await getCurrentBranch(gitRoot);
  const commits = await getCommits(gitRoot, options.commits);
  const scanResult = buildScanResult(gitRoot, commits, branchName);

  // Map blame hashes to agent attributions
  const hashToAgent = new Map<string, { agent: string; confidence: number }>();
  for (const attr of scanResult.attributions) {
    hashToAgent.set(attr.hash, {
      agent: attr.bestMatch.agent,
      confidence: attr.bestMatch.confidence,
    });
  }

  // Build blame sections
  const sections: BlameSection[] = [];
  let currentSection: BlameSection | null = null;

  for (const line of blameData) {
    const agentInfo = hashToAgent.get(line.hash) || { agent: 'Unknown', confidence: 0 };

    if (currentSection && currentSection.commitHash === line.hash) {
      currentSection.endLine = line.line;
    } else {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        startLine: line.line,
        endLine: line.line,
        agent: agentInfo.agent,
        confidence: agentInfo.confidence,
        commitHash: line.hash,
        author: line.author,
      };
    }
  }
  if (currentSection) sections.push(currentSection);

  console.log(formatBlame(sections, fileContent));
}
