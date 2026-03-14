import simpleGit, { SimpleGit } from 'simple-git';
import { CommitData, FileChange } from '../types.js';

export function createGit(path: string): SimpleGit {
  return simpleGit(path);
}

export async function isGitRepo(path: string): Promise<boolean> {
  try {
    const git = createGit(path);
    return await git.checkIsRepo();
  } catch {
    return false;
  }
}

export async function getCommits(path: string, count: number): Promise<CommitData[]> {
  const git = createGit(path);
  const log = await git.log({
    maxCount: count,
    '--stat': null,
    '--stat-width': '1000',
  } as any);

  const commits: CommitData[] = [];

  for (const entry of log.all) {
    const filesChanged = parseStatFiles(entry.diff?.files || []);
    const insertions = entry.diff?.insertions ?? 0;
    const deletions = entry.diff?.deletions ?? 0;

    // Get the full commit message body
    let body = '';
    try {
      body = await git.raw(['log', '-1', '--format=%b', entry.hash]);
      body = body.trim();
    } catch {
      // ignore
    }

    commits.push({
      hash: entry.hash,
      message: entry.message,
      body,
      author: entry.author_name,
      authorEmail: entry.author_email,
      date: new Date(entry.date),
      filesChanged,
      insertions,
      deletions,
    });
  }

  return commits;
}

function parseStatFiles(files: any[]): FileChange[] {
  return files.map((f: any) => ({
    file: f.file,
    insertions: f.insertions ?? 0,
    deletions: f.deletions ?? 0,
    binary: f.binary ?? false,
  }));
}

export async function getCurrentBranch(path: string): Promise<string> {
  const git = createGit(path);
  try {
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim();
  } catch {
    return 'unknown';
  }
}

export async function getBlameData(path: string, file: string): Promise<Array<{ hash: string; author: string; line: number; content: string }>> {
  const git = createGit(path);
  const raw = await git.raw(['blame', '--porcelain', file]);
  const lines = raw.split('\n');

  const result: Array<{ hash: string; author: string; line: number; content: string }> = [];
  let currentHash = '';
  let currentAuthor = '';
  let currentLine = 0;

  for (const line of lines) {
    const headerMatch = line.match(/^([0-9a-f]{40})\s+\d+\s+(\d+)/);
    if (headerMatch) {
      currentHash = headerMatch[1];
      currentLine = parseInt(headerMatch[2], 10);
      continue;
    }

    if (line.startsWith('author ')) {
      currentAuthor = line.slice(7);
      continue;
    }

    if (line.startsWith('\t')) {
      result.push({
        hash: currentHash,
        author: currentAuthor,
        line: currentLine,
        content: line.slice(1),
      });
    }
  }

  return result;
}
