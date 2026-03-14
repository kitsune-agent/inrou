import { CommitData } from '../types.js';
import { mean, ratio } from '../utils/math.js';

const CONVENTIONAL_REGEX = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?:/;
const IMPERATIVE_VERBS = [
  'add', 'fix', 'update', 'remove', 'change', 'create', 'delete', 'implement',
  'refactor', 'improve', 'move', 'rename', 'merge', 'revert', 'release', 'bump',
  'set', 'use', 'make', 'handle', 'enable', 'disable', 'allow', 'prevent',
  'convert', 'replace', 'extract', 'simplify', 'clean', 'support', 'ensure',
  'apply', 'configure', 'install', 'upgrade', 'downgrade', 'migrate', 'integrate',
  'introduce', 'drop', 'init', 'initialize', 'adjust', 'correct', 'patch',
];
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|:[\w+-]+:/u;
const BULLET_REGEX = /^[\s]*[-*•]\s/m;

export function extractCommitMessageFeatures(commits: CommitData[]) {
  if (commits.length === 0) {
    return {
      avgCommitMsgLength: 0,
      multilineCommitRatio: 0,
      conventionalCommitRatio: 0,
      imperativeMoodRatio: 0,
      emojiCommitRatio: 0,
      bulletListRatio: 0,
      coAuthoredRatio: 0,
      signedOffRatio: 0,
    };
  }

  const msgLengths = commits.map(c => c.message.length + (c.body ? c.body.length : 0));
  const multiline = commits.filter(c => c.body.length > 0 || c.message.includes('\n'));
  const conventional = commits.filter(c => CONVENTIONAL_REGEX.test(c.message));
  const imperative = commits.filter(c => {
    const firstWord = c.message.replace(CONVENTIONAL_REGEX, '').trim().split(/\s+/)[0]?.toLowerCase();
    return firstWord ? IMPERATIVE_VERBS.includes(firstWord) : false;
  });
  const emoji = commits.filter(c => EMOJI_REGEX.test(c.message) || EMOJI_REGEX.test(c.body));
  const bullet = commits.filter(c => BULLET_REGEX.test(c.body));
  const coAuthored = commits.filter(c => /Co-authored-by:/i.test(c.body) || /Co-authored-by:/i.test(c.message));
  const signedOff = commits.filter(c => /Signed-off-by:/i.test(c.body) || /Signed-off-by:/i.test(c.message));

  return {
    avgCommitMsgLength: mean(msgLengths),
    multilineCommitRatio: ratio(multiline.length, commits.length),
    conventionalCommitRatio: ratio(conventional.length, commits.length),
    imperativeMoodRatio: ratio(imperative.length, commits.length),
    emojiCommitRatio: ratio(emoji.length, commits.length),
    bulletListRatio: ratio(bullet.length, commits.length),
    coAuthoredRatio: ratio(coAuthored.length, commits.length),
    signedOffRatio: ratio(signedOff.length, commits.length),
  };
}
