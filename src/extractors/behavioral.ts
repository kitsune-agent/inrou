import { CommitData } from '../types.js';
import { ratio } from '../utils/math.js';

export function extractBehavioralFeatures(commits: CommitData[]) {
  if (commits.length === 0) {
    return {
      commitFrequency: 0,
      burstPattern: 0,
      sessionDuration: 0,
    };
  }

  const sorted = [...commits].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Session duration in hours
  const first = sorted[0].date.getTime();
  const last = sorted[sorted.length - 1].date.getTime();
  const sessionDuration = (last - first) / (1000 * 60 * 60);

  // Commits per hour
  const commitFrequency = sessionDuration > 0 ? commits.length / sessionDuration : commits.length;

  // Burst pattern: ratio of commits within 1-minute windows of another commit
  let burstCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].date.getTime() - sorted[i - 1].date.getTime();
    if (gap < 60_000) { // within 1 minute
      burstCount++;
    }
  }
  const burstPattern = ratio(burstCount, Math.max(commits.length - 1, 1));

  return {
    commitFrequency,
    burstPattern,
    sessionDuration,
  };
}
