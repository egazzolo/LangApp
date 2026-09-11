import type { Character, CorrectionIntensity, Message } from "@/domain/models";
import {
  messageAnnotationsSchema,
  replyAssistanceSchema,
  tutorReviewSchema,
} from "@/domain/schemas";
import { supabase } from "@/services/supabase/client";
import type { ConversationProvider } from "./contracts";
import { enqueueReply, waitForReplyDelivery } from "./reply-deliveries";

const replyJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    text: { type: "string", minLength: 1, maxLength: 1200 },
    kind: { type: "string", enum: ["text", "voice"] },
    annotations: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string", minLength: 1, maxLength: 100 },
          meaning: { type: "string", minLength: 1, maxLength: 300 },
        },
        required: ["text", "meaning"],
      },
    },
  },
  required: ["text", "kind", "annotations"],
} as const;

export async function ensureSession() {
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) return data.session;
  const signedIn = await supabase.auth.signInAnonymously();
  if (signedIn.error) throw signedIn.error;
  if (!signedIn.data.session) throw new Error("ANONYMOUS_AUTH_UNAVAILABLE");
  return signedIn.data.session;
}

export const liveConversationProvider: ConversationProvider = {
  async reply(
    character: Character,
    recentMessages: Message[],
    interfaceLocale = "en",
    includeAnnotations = true,
  ) {
    await ensureSession();
    if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");

    const deliveryId = await enqueueReply(character, recentMessages, interfaceLocale, includeAnnotations, replyJsonSchema as unknown as Record<string, unknown>);
    const result = await waitForReplyDelivery(deliveryId);
    return { ...result, deliveryId };
  },
};

const assistanceJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    suggestion: { type: "string", minLength: 1, maxLength: 400 },
    reason: { type: "string", minLength: 1, maxLength: 500 },
    fullTranslation: { type: "string", minLength: 1, maxLength: 600 },
    phrases: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string", minLength: 1, maxLength: 100 },
          meaning: { type: "string", minLength: 1, maxLength: 300 },
        },
        required: ["text", "meaning"],
      },
    },
  },
  required: ["suggestion", "reason", "fullTranslation", "phrases"],
} as const;

export async function getReplyAssistance(
  character: Character,
  recentMessages: Message[],
  interfaceLocale: string,
) {
  await ensureSession();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const lastMessage = recentMessages.at(-1);
  const situation = !lastMessage
    ? "The chat is completely empty. Suggest only a short, casual first greeting such as Hi, Hey, or Hey, how are you? Do not invent plans, appointments, shared events, or prior context."
    : lastMessage.sender === "character"
      ? "The character has replied and the user may want help answering."
      : "The user sent the latest message and is currently waiting for the character.";
  const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
    body: {
      feature: "reply_assistance",
      conversationId: lastMessage?.conversationId,
      schemaName: "reply_assistance",
      schema: assistanceJsonSchema,
      context: {
        interfaceLocale,
        targetLanguage: character.learningLanguage ?? "en",
        targetVariant: character.languageVariant,
        situation,
        character: {
          name: character.name,
          gender: character.gender,
          relationshipToUser: character.relationship,
          personalityTendencies: character.personality,
          occupation: character.occupation,
          currentLifeState: character.currentState,
        },
        conversation: recentMessages
          .slice(-16)
          .map((message) => ({
            role: message.sender === "user" ? "user" : "character",
            text: message.text,
          })),
      },
    },
  });
  if (error) {
    const response = (error as { context?: Response }).context;
    if (response) {
      try {
        const detail = await response.clone().json() as { error?: string };
        if (detail.error === "reply_idea_premium_required") throw new Error("REPLY_IDEA_PREMIUM_REQUIRED");
      } catch (detailError) {
        if (detailError instanceof Error && detailError.message === "REPLY_IDEA_PREMIUM_REQUIRED") throw detailError;
      }
    }
    throw error;
  }
  return replyAssistanceSchema.parse(data?.data);
}

const tutorReviewJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    corrections: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          original: { type: "string", minLength: 1, maxLength: 600 },
          mistake: { type: "string", minLength: 1, maxLength: 200 },
          explanation: { type: "string", minLength: 1, maxLength: 500 },
          corrected: { type: "string", minLength: 1, maxLength: 600 },
          alternatives: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: { type: "string", minLength: 1, maxLength: 600 },
          },
        },
        required: [
          "original",
          "mistake",
          "explanation",
          "corrected",
          "alternatives",
        ],
      },
    },
    focusAreas:{type:"array",maxItems:8,items:{type:"object",additionalProperties:false,properties:{skillKey:{type:"string",pattern:"^[a-z0-9_]+$",maxLength:80},category:{type:"string",enum:["grammar","vocabulary","naturalness","pronunciation","fluency","other"]},label:{type:"string",minLength:1,maxLength:120},evidenceCount:{type:"integer",minimum:1,maximum:20},confidence:{type:"number",minimum:0,maximum:1}},required:["skillKey","category","label","evidenceCount","confidence"]}},
    strengthenedAreas:{type:"array",maxItems:8,items:{type:"object",additionalProperties:false,properties:{skillKey:{type:"string",pattern:"^[a-z0-9_]+$",maxLength:80},successfulUses:{type:"integer",minimum:1,maximum:3}},required:["skillKey","successfulUses"]}},
  },
  required: ["corrections","focusAreas","strengthenedAreas"],
} as const;

export async function getTutorReview(
  messages: Message[],
  interfaceLocale: string,
  targetLanguage: string,
  targetVariant: string,
  correctPunctuation: boolean,
  acceptCasualTexting: boolean,
  correctionIntensity: CorrectionIntensity,
) {
  await ensureSession();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
    body: {
      feature: "tutor_review",
      conversationId: messages.at(-1)?.conversationId,
      schemaName: "tutor_review",
      schema: tutorReviewJsonSchema,
      context: {
        interfaceLocale,
        targetLanguage,
        targetVariant,
        correctPunctuation,
        acceptCasualTexting,
        correctionIntensity,
        userMessages: messages.map((message) => ({
          id: message.id,
          kind: message.kind,
          text: message.text,
        })),
      },
    },
  });
  if (error) throw error;
  return tutorReviewSchema.parse(data?.data);
}

const messageAnnotationsJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    annotations: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string", minLength: 1, maxLength: 100 },
          meaning: { type: "string", minLength: 1, maxLength: 300 },
        },
        required: ["text", "meaning"],
      },
    },
  },
  required: ["annotations"],
} as const;

export async function getMessageAnnotations(
  messageText: string,
  interfaceLocale: string,
  targetLanguage: string,
) {
  await ensureSession();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
    body: {
      feature: "message_explanation",
      schemaName: "message_annotations",
      schema: messageAnnotationsJsonSchema,
      context: { interfaceLocale, targetLanguage, messageText },
    },
  });
  if (error) throw error;
  return messageAnnotationsSchema.parse(data?.data);
}
