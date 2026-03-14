import { Command } from 'commander';
import { scanCommand } from './commands/scan.js';
import { blameCommand } from './commands/blame.js';
import { compareCommand } from './commands/compare.js';
import { profileCommand } from './commands/profile.js';
import { agentsCommand } from './commands/agents.js';

const program = new Command();

program
  .name('inrou')
  .description('Detect which AI coding agent wrote your code. No AI required.')
  .version('1.0.0');

program
  .command('scan')
  .description('Scan a git repo and produce a fingerprint report')
  .argument('[path]', 'Path to git repository', '.')
  .option('-n, --commits <number>', 'Number of commits to analyze', '100')
  .option('--json', 'Output as JSON', false)
  .action(async (repoPath: string, options: { commits: string; json: boolean }) => {
    await scanCommand(repoPath, {
      commits: parseInt(options.commits, 10),
      json: options.json,
    });
  });

program
  .command('blame')
  .description('Show which agent likely wrote each section of a file')
  .argument('<file>', 'File to analyze')
  .option('-n, --commits <number>', 'Number of commits to analyze for context', '100')
  .action(async (filePath: string, options: { commits: string }) => {
    await blameCommand(filePath, {
      commits: parseInt(options.commits, 10),
    });
  });

program
  .command('compare')
  .description('Compare fingerprint profiles between two repos')
  .argument('<repo1>', 'First repository path')
  .argument('<repo2>', 'Second repository path')
  .option('-n, --commits <number>', 'Number of commits to analyze', '100')
  .option('--json', 'Output as JSON', false)
  .action(async (repo1: string, repo2: string, options: { commits: string; json: boolean }) => {
    await compareCommand(repo1, repo2, {
      commits: parseInt(options.commits, 10),
      json: options.json,
    });
  });

program
  .command('profile')
  .description('Show the fingerprint profile of the current repo')
  .argument('[path]', 'Path to git repository', '.')
  .option('-n, --commits <number>', 'Number of commits to analyze', '100')
  .option('--json', 'Output as JSON', false)
  .action(async (repoPath: string, options: { commits: string; json: boolean }) => {
    await profileCommand(repoPath, {
      commits: parseInt(options.commits, 10),
      json: options.json,
    });
  });

program
  .command('agents')
  .description('List known agent signatures and their key identifying features')
  .option('--json', 'Output as JSON', false)
  .action(async (options: { json: boolean }) => {
    await agentsCommand(options);
  });

program.parse();
