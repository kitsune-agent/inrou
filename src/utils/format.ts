import chalk from 'chalk';
import { AgentSummary, CommitAttribution, ScanResult, BlameSection } from '../types.js';

const AGENT_COLORS: Record<string, (s: string) => string> = {
  'Claude Code': chalk.magenta,
  'Copilot': chalk.blue,
  'Codex': chalk.green,
  'Cursor': chalk.cyan,
  'Devin': chalk.yellow,
  'Windsurf': chalk.red,
  'Aider': chalk.white,
  'Human': chalk.gray,
  'Unknown': chalk.dim,
};

function colorAgent(agent: string): string {
  const colorFn = AGENT_COLORS[agent] || chalk.white;
  return colorFn(agent);
}

function padRight(str: string, len: number): string {
  // Strip ANSI for length calculation
  const stripped = str.replace(/\u001b\[[0-9;]*m/g, '');
  const pad = Math.max(0, len - stripped.length);
  return str + ' '.repeat(pad);
}

function padLeft(str: string, len: number): string {
  const stripped = str.replace(/\u001b\[[0-9;]*m/g, '');
  const pad = Math.max(0, len - stripped.length);
  return ' '.repeat(pad) + str;
}

export function formatScanResult(result: ScanResult): string {
  const lines: string[] = [];

  lines.push(chalk.bold('inrou — Agent Fingerprint Analysis'));
  lines.push(`Repository: ${chalk.cyan(result.repoPath)}`);
  const days = Math.ceil((result.dateRange.to.getTime() - result.dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
  lines.push(`Commits analyzed: ${result.totalCommits} (last ${days} days)`);
  lines.push('');

  // Summary table
  lines.push(chalk.bold('Agent Attribution Summary'));
  const header = `┌${'─'.repeat(15)}┬${'─'.repeat(14)}┬${'─'.repeat(12)}┬${'─'.repeat(35)}┐`;
  const headerRow = `│${padRight(' Agent', 15)}│${padRight(' Commits', 14)}│${padRight(' Confidence', 12)}│${padRight(' Key Signals', 35)}│`;
  const separator = `├${'─'.repeat(15)}┼${'─'.repeat(14)}┼${'─'.repeat(12)}┼${'─'.repeat(35)}┤`;
  const footer = `└${'─'.repeat(15)}┴${'─'.repeat(14)}┴${'─'.repeat(12)}┴${'─'.repeat(35)}┘`;

  lines.push(header);
  lines.push(headerRow);
  lines.push(separator);

  for (const summary of result.summary) {
    const agent = padRight(` ${colorAgent(summary.agent)}`, 15);
    const commits = padRight(` ${summary.commits} (${summary.percentage}%)`, 14);
    const conf = summary.avgConfidence < 0.3
      ? padRight(` <0.30`, 12)
      : padRight(` ${summary.avgConfidence.toFixed(2)}`, 12);
    const signals = padRight(` ${summary.keySignals.slice(0, 2).join(', ')}`, 35);
    lines.push(`│${agent}│${commits}│${conf}│${signals}│`);
  }

  lines.push(footer);
  lines.push('');

  // Recent commits
  lines.push(chalk.bold('Most Recent Commits:'));
  const recent = result.attributions.slice(0, 10);
  for (const attr of recent) {
    const hash = chalk.dim(attr.shortHash);
    const agent = padRight(colorAgent(attr.bestMatch.agent), 12);
    const conf = chalk.dim(`(${attr.bestMatch.confidence.toFixed(2)})`);
    const msg = attr.message.slice(0, 50);
    lines.push(`  ${hash}  ${agent} ${conf}  ${msg}`);
  }

  return lines.join('\n');
}

export function formatBlame(sections: BlameSection[], fileContent: string): string {
  const lines = fileContent.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const section = sections.find(s => lineNum >= s.startLine && lineNum <= s.endLine);
    const lineNumStr = padLeft(String(lineNum), 4);

    if (section) {
      const colorFn = AGENT_COLORS[section.agent] || chalk.white;
      const agentTag = colorFn(`[${section.agent}]`);
      const confStr = chalk.dim(`(${section.confidence.toFixed(2)})`);
      const hashStr = chalk.dim(section.commitHash.slice(0, 7));

      if (lineNum === section.startLine) {
        result.push(`${lineNumStr} ${agentTag} ${confStr} ${hashStr} │ ${lines[i]}`);
      } else {
        result.push(`${lineNumStr} ${' '.repeat(section.agent.length + 2)} ${' '.repeat(6)} ${' '.repeat(7)} │ ${lines[i]}`);
      }
    } else {
      result.push(`${lineNumStr} ${' '.repeat(15)} │ ${lines[i]}`);
    }
  }

  return result.join('\n');
}

export function formatProfile(features: Record<string, number>, repoPath: string): string {
  const lines: string[] = [];
  lines.push(chalk.bold('inrou — Repository Fingerprint Profile'));
  lines.push(`Repository: ${chalk.cyan(repoPath)}`);
  lines.push('');

  const categories: Record<string, string[]> = {
    'Commit Messages': [
      'avgCommitMsgLength', 'multilineCommitRatio', 'conventionalCommitRatio',
      'imperativeMoodRatio', 'emojiCommitRatio', 'bulletListRatio',
      'coAuthoredRatio', 'signedOffRatio',
    ],
    'Change Patterns': [
      'filesPerCommitAvg', 'filesPerCommitStd', 'insertionsPerCommitAvg',
      'deletionsPerCommitAvg', 'changeConcentrationGini', 'singleFileCommitRatio',
    ],
    'Behavioral': [
      'commitFrequency', 'burstPattern', 'sessionDuration', 'fileTypeDiversity',
      'testFileRatio', 'newFileRatio',
    ],
  };

  for (const [category, keys] of Object.entries(categories)) {
    lines.push(chalk.bold.underline(category));
    for (const key of keys) {
      const value = features[key];
      if (value === undefined) continue;
      const label = padRight(`  ${key}`, 30);
      const bar = renderBar(value, key);
      lines.push(`${label} ${bar} ${chalk.dim(formatValue(value, key))}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderBar(value: number, key: string): string {
  const maxWidth = 20;
  // Normalize based on key type
  let normalized: number;
  if (key.includes('Ratio') || key.includes('ratio')) {
    normalized = value;
  } else if (key === 'avgCommitMsgLength') {
    normalized = Math.min(value / 200, 1);
  } else if (key.includes('Avg') || key.includes('avg')) {
    normalized = Math.min(value / 50, 1);
  } else if (key.includes('Std') || key.includes('std')) {
    normalized = Math.min(value / 20, 1);
  } else if (key === 'commitFrequency') {
    normalized = Math.min(value / 10, 1);
  } else if (key === 'sessionDuration') {
    normalized = Math.min(value / 24, 1);
  } else {
    normalized = Math.min(value, 1);
  }

  const filled = Math.round(normalized * maxWidth);
  const empty = maxWidth - filled;
  return chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

function formatValue(value: number, key: string): string {
  if (key.includes('Ratio') || key.includes('ratio') || key === 'changeConcentrationGini' || key === 'fileTypeDiversity') {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (key === 'sessionDuration') {
    return `${value.toFixed(1)}h`;
  }
  if (key === 'commitFrequency') {
    return `${value.toFixed(1)}/h`;
  }
  return value.toFixed(1);
}

export function formatAgentList(agents: Array<{ name: string; description: string; keySignals: string[] }>): string {
  const lines: string[] = [];
  lines.push(chalk.bold('inrou — Known AI Agent Signatures'));
  lines.push(chalk.dim('Based on arXiv:2601.17406 — Fingerprinting AI Coding Agents on GitHub'));
  lines.push('');

  for (const agent of agents) {
    lines.push(`${colorAgent(agent.name)}`);
    lines.push(`  ${chalk.dim(agent.description)}`);
    lines.push(`  Key signals: ${agent.keySignals.join(', ')}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function formatCompare(
  profile1: { path: string; features: Record<string, number> },
  profile2: { path: string; features: Record<string, number> },
): string {
  const lines: string[] = [];
  lines.push(chalk.bold('inrou — Fingerprint Comparison'));
  lines.push(`${chalk.cyan(profile1.path)} vs ${chalk.cyan(profile2.path)}`);
  lines.push('');

  const allKeys = new Set([...Object.keys(profile1.features), ...Object.keys(profile2.features)]);
  const header = `  ${padRight('Feature', 30)} ${padRight('Repo 1', 12)} ${padRight('Repo 2', 12)} ${padRight('Diff', 10)}`;
  lines.push(chalk.bold(header));
  lines.push('  ' + '─'.repeat(64));

  for (const key of allKeys) {
    if (key === 'knownCommitPatterns' || key === 'knownBranchPatterns' || key === 'trailerPatterns' || key === 'branchNamingPattern') continue;
    const v1 = profile1.features[key] ?? 0;
    const v2 = profile2.features[key] ?? 0;
    const diff = v2 - v1;
    const diffStr = diff > 0 ? chalk.green(`+${diff.toFixed(2)}`) : diff < 0 ? chalk.red(diff.toFixed(2)) : chalk.dim('0.00');
    lines.push(`  ${padRight(key, 30)} ${padRight(v1.toFixed(2), 12)} ${padRight(v2.toFixed(2), 12)} ${diffStr}`);
  }

  return lines.join('\n');
}
