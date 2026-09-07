import { z } from 'zod';

export const generatedCharacterSchema = z.object({
  name: z.string().trim().min(1).max(80),
  gender: z.enum(['woman', 'man']),
  dateOfBirth: z.iso.date(),
  location: z.string().trim().min(2).max(120),
  occupation: z.string().trim().min(2).max(120),
  relationship: z.enum(['stranger','acquaintance','classmate','coworker','neighbor','friend','close_friend','professional_contact']),
  personality: z.array(z.string().min(1).max(40)).min(2).max(8),
  bio: z.string().min(20).max(1200),
  currentState: z.string().min(5).max(400),
  voiceId: z.string().min(1),
});

export const correctionSchema = z.object({
  original: z.string().min(1), improved: z.string().min(1),
  explanation: z.string().optional(), category: z.enum(['grammar','word_choice','naturalness','structure']),
});

export const memoryExtractionSchema = z.object({
  memories: z.array(z.object({ type: z.enum(['user_fact','user_preference','shared_event','unresolved_topic']), content: z.string().min(1).max(500), confidence: z.number().min(0).max(1) })).max(12),
});

export const conversationReplySchema = z.object({
  text: z.string().trim().min(1).max(1200),
  kind: z.enum(['text', 'voice']),
  audioPath: z.string().min(1).max(500).optional(),
  durationSeconds: z.number().nonnegative().optional(),
  annotations: z.array(z.object({ text: z.string().trim().min(1).max(100), meaning: z.string().trim().min(1).max(300) })).max(12),
});

export const replyAssistanceSchema = z.object({
  suggestion: z.string().trim().min(1).max(400),
  reason: z.string().trim().min(1).max(500),
  fullTranslation: z.string().trim().min(1).max(600),
  phrases: z.array(z.object({
    text: z.string().trim().min(1).max(100),
    meaning: z.string().trim().min(1).max(300),
  })).max(6),
});

export const tutorReviewSchema = z.object({
  corrections: z.array(z.object({
    original: z.string().trim().min(1).max(600),
    mistake: z.string().trim().min(1).max(200),
    explanation: z.string().trim().min(1).max(500),
    corrected: z.string().trim().min(1).max(600),
    alternatives: z.array(z.string().trim().min(1).max(600)).min(1).max(3),
  })).max(12),
});

export const messageAnnotationsSchema = z.object({
  annotations: z.array(z.object({
    text: z.string().trim().min(1).max(100),
    meaning: z.string().trim().min(1).max(300),
  })).max(12),
});
