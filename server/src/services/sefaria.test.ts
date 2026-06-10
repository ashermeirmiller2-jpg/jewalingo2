import { describe, expect, it } from 'vitest';
import { stripHtml, stripNikud } from './sefaria.js';

describe('sefaria text normalization', () => {
  it('strips nikud from the brief-supplied formula, preserving consonants', () => {
    expect(stripNikud('זָכִין לְאָדָם שֶׁלֹּא בְּפָנָיו')).toBe('זכין לאדם שלא בפניו');
  });

  it('converts maqaf to a space and collapses whitespace', () => {
    expect(stripNikud('אִי־נַמִי  הָכִי')).toBe('אי נמי הכי');
  });

  it('strips inline HTML markers', () => {
    expect(stripHtml('<b>אמר</b> רבא <sup>1</sup>')).toBe('אמר רבא 1');
  });
});
