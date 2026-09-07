import { describe, expect, it } from 'vitest';
import { getResponseTiming } from '../src/config/conversation';
import type { Character, Message } from '../src/domain/models';

const character = { id: 'maya' } as Character;
const message = (text: string, sender: Message['sender'] = 'user'): Message => ({
  id: 'm1', conversationId: 'c1', sender, kind: 'text', text,
  createdAt: '2026-08-30T12:00:00Z', status: 'sent',
});

describe('reading delay', () => {
  it('waits 1.5 seconds for a normal message', () => {
    expect(getResponseTiming(character, [message('Hi Maya')])).toEqual({ beforeTypingMs: 1500, typingMs: 2000 });
  });

  it('switches to 5 seconds at 100 words', () => {
    expect(getResponseTiming(character, [message('hi '.repeat(99))]).beforeTypingMs).toBe(1500);
    expect(getResponseTiming(character, [message('hi '.repeat(100))]).beforeTypingMs).toBe(5000);
  });

  it('also recognizes long messages without spaces', () => {
    expect(getResponseTiming(character, [message('a'.repeat(599))]).beforeTypingMs).toBe(1500);
    expect(getResponseTiming(character, [message('a'.repeat(600))]).beforeTypingMs).toBe(5000);
  });

  it('uses only the latest learner message, not older messages or Ferson replies', () => {
    expect(getResponseTiming(character, [message('long '.repeat(200)), message('Okay'), message('reply '.repeat(200), 'character')]).beforeTypingMs).toBe(1500);
  });

  it('applies the same rule to a transcribed voice message', () => {
    expect(getResponseTiming(character, [{ ...message('hi '.repeat(100)), kind: 'voice' }]).beforeTypingMs).toBe(5000);
  });
});
