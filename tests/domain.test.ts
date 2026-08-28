import { describe, expect, it } from 'vitest';
import { generatedCharacterSchema, correctionSchema } from '../src/domain/schemas';
import { entitlements, canUse } from '../src/config/entitlements';
import { mergeMemory, rankMemories } from '../src/domain/memory';
describe('structured AI validation',()=>{it('rejects an incomplete character',()=>{expect(generatedCharacterSchema.safeParse({name:'Sarah'}).success).toBe(false)});it('accepts a useful correction',()=>{expect(correctionSchema.safeParse({original:'I go yesterday',improved:'I went yesterday',category:'grammar'}).success).toBe(true)})});
describe('entitlements',()=>{it('keeps commercial limits centralized',()=>{expect(canUse('premium_annual','maxActiveCharacters')).toBeGreaterThan(entitlements.free.maxActiveCharacters)})});
describe('memory retrieval',()=>{it('deduplicates and retains strongest evidence',()=>{const result=mergeMemory([{type:'user_fact',content:'Lives in Bogotá',confidence:.6,importance:.5}],{type:'user_fact',content:' lives  in bogotá ',confidence:.9,importance:.4});expect(result).toHaveLength(1);expect(result[0]?.confidence).toBe(.9)});it('ranks relevant memories',()=>{const result=rankMemories([{type:'fact',content:'Likes jazz',confidence:.8,importance:.5},{type:'fact',content:'Has an interview Friday',confidence:.8,importance:.8}],['interview']);expect(result[0]?.content).toContain('interview')})});

import { mockConversationProvider } from '../src/services/ai/mock';
import type { Character, Message } from '../src/domain/models';
describe('mock conversation continuity',()=>{it('responds naturally when the user starts with a greeting',async()=>{const character={id:'mina',name:'Mina',gender:'woman',dateOfBirth:'1992-01-01',location:'Boston',occupation:'Designer',relationship:'friend',personality:['Warm'],bio:'A fictional contact with a detailed life.',currentState:'Having a normal day.',voiceId:'voice',aiDisclosure:true} satisfies Character;const message={id:'m1',conversationId:'c1',sender:'user',kind:'text',text:'Hi Mina',createdAt:new Date().toISOString(),status:'sent'} satisfies Message;const reply=await mockConversationProvider.reply(character,[message]);expect(reply.text).toMatch(/hi|hey|nice to meet/i);expect(reply.text).not.toContain('Tell me more')})});

import { getResponseTiming } from '../src/config/conversation';
describe('response timing',()=>{it('uses the fixed two-second Ferson reply delay',()=>{const character={id:'mina',name:'Mina',gender:'woman',dateOfBirth:'1992-01-01',location:'Boston',occupation:'Paramedic',relationship:'professional_contact',personality:['Reserved'],bio:'A sufficiently detailed fictional biography.',currentState:'At work.',voiceId:'voice',aiDisclosure:true} satisfies Character;const timing=getResponseTiming(character,[],()=>.5);expect(timing.beforeTypingMs).toBe(0);expect(timing.typingMs).toBe(2000)})});


import { buildSuggestionSegments } from '../src/domain/assistance';
describe('reply assistance annotations',()=>{it('makes exact expressions selectable without changing the suggestion',()=>{const suggestion='Coffee at 4 works for me - see you there.';const segments=buildSuggestionSegments(suggestion,[{text:'works for me',meaning:'Me viene bien'}]);expect(segments.map((segment)=>segment.text).join('')).toBe(suggestion);expect(segments.find((segment)=>segment.phrase)?.phrase?.meaning).toBe('Me viene bien')});it('ignores annotations that are not present verbatim',()=>{expect(buildSuggestionSegments('See you soon',[{text:'works for me',meaning:'Me viene bien'}])).toEqual([{text:'See you soon'}])})});

