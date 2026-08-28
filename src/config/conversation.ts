import type { Character, Message } from '@/domain/models';

export interface ResponseTiming { beforeTypingMs: number; typingMs: number; }

export function getResponseTiming(_character:Character,_recentMessages:Message[],_random=Math.random):ResponseTiming {
  return { beforeTypingMs: 0, typingMs: 2000 };
}
