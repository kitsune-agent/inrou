export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map(v => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

export function giniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const totalSum = sorted.reduce((a, b) => a + b, 0);
  if (totalSum === 0) return 0;

  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (2 * (i + 1) - n - 1) * sorted[i];
  }
  return numerator / (n * totalSum);
}

export function shannonEntropy(values: number[]): number {
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const probabilities = values.filter(v => v > 0).map(v => v / total);
  const entropy = -probabilities.reduce((sum, p) => sum + p * Math.log2(p), 0);
  return entropy || 0; // Avoid -0
}

export function ratio(count: number, total: number): number {
  if (total === 0) return 0;
  return count / total;
}
