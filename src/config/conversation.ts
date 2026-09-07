import type { Character, Message } from '@/domain/models';

export interface ResponseTiming { beforeTypingMs: number; typingMs: number; }

export function getResponseTiming(_character:Character,recentMessages:Message[],_random=Math.random):ResponseTiming {
  const latestUserMessage = [...recentMessages].reverse().find((message) => message.sender === 'user');
  const text = latestUserMessage?.text.trim() ?? '';
  const wordCount = text ? text.split(/\s+/u).length : 0;
  const isLongMessage = wordCount >= 100 || Array.from(text).length >= 600;
  return { beforeTypingMs: isLongMessage ? 5000 : 1500, typingMs: 2000 };
}
