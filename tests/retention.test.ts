import { describe, it, expect } from 'vitest';
import { isRetained, pruneHistory, sixMonthsAgo } from '../src/domain/retention';
import { canUse } from '../src/config/entitlements';
import type { Message, Conversation } from '../src/domain/models';
describe('retention', () => {
  const now = new Date('2026-09-08T00:00:00Z');
  const conversation: Conversation = {id:'chat',characterId:'person',lastMessage:'old',updatedAt:'2026-09-01T00:00:00Z',unreadCount:0};
  const old: Message = {id:'old',conversationId:'chat',sender:'user',kind:'voice',text:'private old transcript',createdAt:'2026-03-08T00:00:00Z',status:'sent',audioUrl:'file:///app/old.m4a',correction:{id:'correction',original:'I goes',improved:'I go',category:'grammar'}};
  const fresh: Message = {...old,id:'fresh',createdAt:'2026-09-01T00:00:00Z',text:'hello',audioUrl:undefined,correction:undefined};
  it('clamps calendar months and deletes at the exact boundary', () => {
    expect(sixMonthsAgo(new Date('2024-08-31T12:00:00Z')).toISOString()).toBe('2024-02-29T12:00:00.000Z');
    expect(isRetained(old.createdAt,now)).toBe(false);
    expect(isRetained('2026-03-08T00:00:00.001Z',now)).toBe(true);
  });
  it('retains academics and fresh messages without keeping expired transcripts', () => {
    const state = {characters:[],conversations:[conversation],messages:{chat:[old,fresh]},deletedConversations:[],archivedLearning:{},pendingAudioDeletes:[]};
    const result = pruneHistory(state,now);
    expect(result.messages.chat).toEqual([fresh]);
    expect(result.archivedLearning.chat?.learnerMessages).toBe(1);
    expect(result.archivedLearning.chat?.corrections).toEqual([old.correction]);
    expect(result.pendingAudioDeletes).toEqual(['file:///app/old.m4a']);
    expect(JSON.stringify(result)).not.toContain(old.text);
    expect(pruneHistory({...state,...result},now)).toEqual(result);
  });
  it('cannot extend lifetime by moving a conversation to the recycle bin', () => {
    const result = pruneHistory({characters:[],conversations:[],messages:{},deletedConversations:[{conversation:{...conversation,updatedAt:old.createdAt},messages:[old],deletedAt:now.toISOString()}],archivedLearning:{},pendingAudioDeletes:[]},now);
    expect(result.deletedConversations).toEqual([]);
    expect(result.archivedLearning.chat?.voiceMessages).toBe(1);
  });
  it('all plans retain corrections; only premium exports', () => {
    expect(canUse('free','savedCorrectionHistory')).toBe(true);
    expect(canUse('free','conversationExport')).toBe(false);
    expect(canUse('premium_monthly','conversationExport')).toBe(true);
    expect(canUse('premium_annual','conversationExport')).toBe(true);
  });
});
