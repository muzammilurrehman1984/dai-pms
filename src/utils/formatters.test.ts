import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { compareRegNumbers, compareSectionNames, compareSessionNames } from './formatters';

// ---------------------------------------------------------------------------
// compareRegNumbers
// ---------------------------------------------------------------------------
describe('compareRegNumbers', () => {
  it('sorts older year first', () => {
    expect(compareRegNumbers('S22BARIN1M01001', 'S23BARIN1M01001')).toBeLessThan(0);
  });

  it('sorts Spring before Fall within same year', () => {
    expect(compareRegNumbers('S23BARIN1M01001', 'F23BARIN1M01001')).toBeLessThan(0);
  });

  it('sorts program 1 before 2 before 7', () => {
    expect(compareRegNumbers('S23BARIN1M01001', 'S23BARIN2M01001')).toBeLessThan(0);
    expect(compareRegNumbers('S23BARIN2M01001', 'S23BARIN7M01001')).toBeLessThan(0);
  });

  it('sorts Morning before Evening', () => {
    expect(compareRegNumbers('S23BARIN1M01001', 'S23BARIN1E01001')).toBeLessThan(0);
  });

  it('sorts by serial number ascending', () => {
    expect(compareRegNumbers('S23BARIN1M01001', 'S23BARIN1M01002')).toBeLessThan(0);
  });

  it('returns 0 for identical reg numbers', () => {
    expect(compareRegNumbers('S23BARIN1M01037', 'S23BARIN1M01037')).toBe(0);
  });

  it('falls back to localeCompare when one input is invalid', () => {
    const result = compareRegNumbers('INVALID', 'S23BARIN1M01037');
    expect(typeof result).toBe('number');
  });

  it('falls back to localeCompare when both inputs are invalid', () => {
    const result = compareRegNumbers('AAA', 'BBB');
    expect(result).toBe('AAA'.localeCompare('BBB'));
  });

  it('does not throw on empty strings', () => {
    expect(() => compareRegNumbers('', '')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// compareSectionNames
// ---------------------------------------------------------------------------
describe('compareSectionNames', () => {
  it('sorts lower semester number first', () => {
    expect(compareSectionNames('BSARIN-7TH-1M', 'BSARIN-8TH-1M')).toBeLessThan(0);
  });

  it('sorts lower section number first within same semester', () => {
    expect(compareSectionNames('BSARIN-7TH-1M', 'BSARIN-7TH-2M')).toBeLessThan(0);
  });

  it('sorts Morning before Evening within same semester and section', () => {
    expect(compareSectionNames('BSARIN-7TH-1M', 'BSARIN-7TH-1E')).toBeLessThan(0);
  });

  it('returns 0 for identical section names', () => {
    expect(compareSectionNames('BSARIN-7TH-1M', 'BSARIN-7TH-1M')).toBe(0);
  });

  it('falls back to localeCompare on invalid input', () => {
    const result = compareSectionNames('INVALID', 'BSARIN-7TH-1M');
    expect(typeof result).toBe('number');
  });

  it('does not throw on empty strings', () => {
    expect(() => compareSectionNames('', '')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// compareSessionNames
// ---------------------------------------------------------------------------
describe('compareSessionNames', () => {
  it('sorts older year first', () => {
    expect(compareSessionNames('2025 Spring', '2026 Spring')).toBeLessThan(0);
  });

  it('sorts Spring before Fall within same year', () => {
    expect(compareSessionNames('2026 Spring', '2026 Fall')).toBeLessThan(0);
  });

  it('returns 0 for identical session names', () => {
    expect(compareSessionNames('2026 Spring', '2026 Spring')).toBe(0);
  });

  it('falls back to localeCompare on invalid input', () => {
    const result = compareSessionNames('INVALID', '2026 Spring');
    expect(typeof result).toBe('number');
  });

  it('does not throw on empty strings', () => {
    expect(() => compareSessionNames('', '')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Property-based tests
// Validates: Requirements 21.1, 21.2, 21.3, 21.5, 21.6, 21.7
// ---------------------------------------------------------------------------

const regNumberArb = fc.tuple(
  fc.constantFrom('S', 'F'),
  fc.integer({ min: 20, max: 29 }).map(n => String(n).padStart(2, '0')),
  fc.constantFrom('1', '2', '7'),
  fc.constantFrom('M', 'E'),
  fc.integer({ min: 1, max: 99 }).map(n => String(n).padStart(2, '0')),
  fc.integer({ min: 1, max: 999 }).map(n => String(n).padStart(3, '0')),
).map(([sem, yr, prog, shift, prefix, serial]) => `${sem}${yr}BARIN${prog}${shift}${prefix}${serial}`);

const sectionNameArb = fc.tuple(
  fc.integer({ min: 7, max: 10 }),
  fc.integer({ min: 1, max: 5 }),
  fc.constantFrom('M', 'E'),
).map(([sem, sec, shift]) => `BSARIN-${sem}TH-${sec}${shift}`);

const sessionNameArb = fc.tuple(
  fc.integer({ min: 2020, max: 2030 }),
  fc.constantFrom('Spring', 'Fall'),
).map(([yr, term]) => `${yr} ${term}`);

describe('compareRegNumbers – properties', () => {
  it('is antisymmetric: compare(a,b) and compare(b,a) have opposite signs (or both 0)', () => {
    fc.assert(fc.property(regNumberArb, regNumberArb, (a, b) => {
      const ab = compareRegNumbers(a, b);
      const ba = compareRegNumbers(b, a);
      if (ab === 0) return ba === 0;
      return Math.sign(ab) === -Math.sign(ba);
    }));
  });

  it('is reflexive: compare(a,a) === 0', () => {
    fc.assert(fc.property(regNumberArb, (a) => compareRegNumbers(a, a) === 0));
  });

  it('never throws on arbitrary strings', () => {
    fc.assert(fc.property(fc.string(), fc.string(), (a, b) => {
      expect(() => compareRegNumbers(a, b)).not.toThrow();
      return true;
    }));
  });
});

describe('compareSectionNames – properties', () => {
  it('is antisymmetric', () => {
    fc.assert(fc.property(sectionNameArb, sectionNameArb, (a, b) => {
      const ab = compareSectionNames(a, b);
      const ba = compareSectionNames(b, a);
      if (ab === 0) return ba === 0;
      return Math.sign(ab) === -Math.sign(ba);
    }));
  });

  it('is reflexive: compare(a,a) === 0', () => {
    fc.assert(fc.property(sectionNameArb, (a) => compareSectionNames(a, a) === 0));
  });

  it('never throws on arbitrary strings', () => {
    fc.assert(fc.property(fc.string(), fc.string(), (a, b) => {
      expect(() => compareSectionNames(a, b)).not.toThrow();
      return true;
    }));
  });
});

describe('compareSessionNames – properties', () => {
  it('is antisymmetric', () => {
    fc.assert(fc.property(sessionNameArb, sessionNameArb, (a, b) => {
      const ab = compareSessionNames(a, b);
      const ba = compareSessionNames(b, a);
      if (ab === 0) return ba === 0;
      return Math.sign(ab) === -Math.sign(ba);
    }));
  });

  it('is reflexive: compare(a,a) === 0', () => {
    fc.assert(fc.property(sessionNameArb, (a) => compareSessionNames(a, a) === 0));
  });

  it('never throws on arbitrary strings', () => {
    fc.assert(fc.property(fc.string(), fc.string(), (a, b) => {
      expect(() => compareSessionNames(a, b)).not.toThrow();
      return true;
    }));
  });
});
