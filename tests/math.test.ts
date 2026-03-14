import { describe, it, expect } from 'vitest';
import { mean, stddev, giniCoefficient, shannonEntropy, ratio } from '../src/utils/math.js';

describe('mean', () => {
  it('returns 0 for empty array', () => {
    expect(mean([])).toBe(0);
  });

  it('calculates mean correctly', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
    expect(mean([10])).toBe(10);
  });
});

describe('stddev', () => {
  it('returns 0 for less than 2 values', () => {
    expect(stddev([])).toBe(0);
    expect(stddev([5])).toBe(0);
  });

  it('calculates standard deviation', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] has stddev ~2.138
    const result = stddev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(2.138, 2);
  });
});

describe('giniCoefficient', () => {
  it('returns 0 for empty array', () => {
    expect(giniCoefficient([])).toBe(0);
  });

  it('returns 0 for equal distribution', () => {
    expect(giniCoefficient([5, 5, 5, 5])).toBeCloseTo(0);
  });

  it('returns high value for unequal distribution', () => {
    const result = giniCoefficient([0, 0, 0, 100]);
    expect(result).toBeGreaterThan(0.5);
  });
});

describe('shannonEntropy', () => {
  it('returns 0 for empty array', () => {
    expect(shannonEntropy([])).toBe(0);
  });

  it('returns 0 for single category', () => {
    expect(shannonEntropy([10])).toBe(0);
  });

  it('returns 1 for two equal categories', () => {
    expect(shannonEntropy([5, 5])).toBeCloseTo(1);
  });

  it('increases with more diversity', () => {
    const low = shannonEntropy([10, 1]);
    const high = shannonEntropy([5, 5]);
    expect(high).toBeGreaterThan(low);
  });
});

describe('ratio', () => {
  it('returns 0 when total is 0', () => {
    expect(ratio(5, 0)).toBe(0);
  });

  it('calculates ratio correctly', () => {
    expect(ratio(1, 4)).toBe(0.25);
    expect(ratio(3, 3)).toBe(1);
  });
});
