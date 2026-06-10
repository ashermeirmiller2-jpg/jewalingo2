import { describe, expect, it } from 'vitest';
import { tokenizePlain, COVERAGE_THRESHOLD } from './coverage.js';

describe('coverage', () => {
  it('threshold is the locked 70% rule', () => {
    expect(COVERAGE_THRESHOLD).toBe(0.7);
  });

  it('tokenizes plain text into Hebrew-only word tokens', () => {
    expect(tokenizePlain('זכין לאדם שלא בפניו')).toEqual(['זכין', 'לאדם', 'שלא', 'בפניו']);
  });

  it('drops punctuation and latin characters', () => {
    expect(tokenizePlain('אמר רבא: (test) זכין!')).toEqual(['אמר', 'רבא', 'זכין']);
  });
});
