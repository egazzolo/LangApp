import { describe, expect, it } from 'vitest';
import { learningFacts } from '../src/content/learning-facts';

describe('localized Tutor learning facts', () => {
  it('provides several useful facts in every supported interface language', () => {
    expect(Object.keys(learningFacts)).toHaveLength(12);
    for (const set of Object.values(learningFacts)) {
      expect(set.title.trim().length).toBeGreaterThan(0);
      expect(set.facts.length).toBeGreaterThanOrEqual(4);
      expect(new Set(set.facts).size).toBe(set.facts.length);
      expect(set.facts.every((fact) => fact.trim().length > 15)).toBe(true);
    }
  });
});
