import { describe, expect, it } from 'vitest';
import { prompts } from '../supabase/functions/_shared/prompts';

describe('conversation prompt policy', () => {
  it('versions the adaptive texting instructions used by the server', () => {
    expect(prompts.conversation.version).toBe('conversation.v7');
    expect(prompts.conversation.system).toContain('Short messages (roughly 1-12 words): usually 3-20 words');
    expect(prompts.conversation.system).toContain('Medium messages (roughly 13-60 words): usually 15-45 words');
    expect(prompts.conversation.system).toContain('Long, substantive messages (over roughly 60 words): allow 30-100 words');
    expect(prompts.conversation.system).toContain('Ask at most one short question');
    expect(prompts.conversation.system).toContain('do not imitate their verbosity');
    expect(prompts.conversation.system).toContain('A general Ferson is an ordinary person, not an all-knowing assistant');
    expect(prompts.conversation.system).toContain('only inside the supplied expertiseDomains and occupation');
  });

  it('lets a short follow-up reset length and avoids padding or truncation', () => {
    expect(prompts.conversation.system).toContain('shorten your replies immediately');
    expect(prompts.conversation.system).toContain('never pad to meet a target');
    expect(prompts.conversation.system).toContain('Never cut off a thought mid-sentence');
    expect(prompts.conversation.system).toContain('Explicit requests for detail');
  });

  it('avoids unsolicited logistics and annotation-driven verbosity', () => {
    expect(prompts.conversation.system).toContain('Do not invent dates, meeting times, venues');
    expect(prompts.conversation.system).toContain('never add fancy words or extra sentences');
    expect(prompts.conversation.system).toContain('real restaurants, menus, or opening hours');
  });

  it('preserves disclosure, safety, boundaries, and optional annotations', () => {
    expect(prompts.conversation.system).toContain('clearly disclosed AI experience');
    expect(prompts.conversation.system).toContain('Never produce explicit sexting');
    expect(prompts.conversation.system).toContain('ordinary personal boundaries');
    expect(prompts.conversation.system).toContain('When it is false, return an empty annotations array');
  });

  it('distinguishes premium casual texting from standard English review', () => {
    expect(prompts.tutorReview.version).toBe('tutor-review.v5');
    expect(prompts.tutorReview.system).toContain('"r u", "gonna", "wanna", "kinda", "gotta", "idk"');
    expect(prompts.tutorReview.system).toContain('only when the server supplies true');
    expect(prompts.tutorReview.system).toContain('For chill');
    expect(prompts.tutorReview.system).toContain('For balanced');
    expect(prompts.tutorReview.system).toContain('For intensive');
    expect(prompts.tutorReview.system).toContain('regardless of correctionIntensity');
    expect(prompts.tutorReview.system).toContain('native speakers commonly use it');
    expect(prompts.tutorReview.system).toContain('formal speech and writing');
  });
});
