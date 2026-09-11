import { conversationReplySchema } from '@/domain/schemas';
import type { Character, InterfaceLocale, Message } from '@/domain/models';
import { replyBodies } from '@/services/notifications';
import { supabase } from '@/services/supabase/client';
import { useAppStore } from '@/store/app-store';

const sleep = (ms:number) => new Promise(resolve => setTimeout(resolve, ms));
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, value => {
  const random = Math.floor(Math.random() * 16); const digit = value === 'x' ? random : (random & 3) | 8; return digit.toString(16);
});

export async function enqueueReply(character: Character, recentMessages: Message[], interfaceLocale: InterfaceLocale, includeAnnotations: boolean, schema: Record<string,unknown>) {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const deliveryId = uuid();
  const conversationId = recentMessages.at(-1)?.conversationId;
  if (!conversationId) throw new Error('MISSING_CONVERSATION');
  const history = recentMessages.slice(-24).map(message => ({ role: message.sender === 'user' ? 'user' : 'character', kind: message.kind, text: message.text }));
  const userInterests = useAppStore.getState().interests;
  const focusedPractice=useAppStore.getState().focusedPracticeEnabled;
  const { error } = await supabase.functions.invoke('ai-reply-queue', { body: {
    deliveryId, conversationId, characterName: character.name, notificationBody: replyBodies[interfaceLocale],
        orchestratorBody: { feature:'conversation', conversationId, schemaName:'conversation_reply', schema, context:{ targetLanguage:character.learningLanguage??'en', targetVariant:character.languageVariant, userInterests, focusedPractice, character:{ name:character.name, gender:character.gender, voiceId:character.voiceId, voiceAccent:character.voiceAccent, dateOfBirth:character.dateOfBirth, location:character.location, countryCode:character.countryCode, occupation:character.occupation, relationshipToUser:character.relationship, personalityTendencies:character.personality, biography:character.bio, currentLifeState:character.currentState, knowledgeProfile:{level:character.knowledgeLevel??'general',expertiseDomains:character.expertiseDomains??[]} }, interfaceLocale, includeAnnotations, conversation:history, responseRequirements:{replyAs:character.name,respondToLatestMessageDirectly:true,preserveConversationContinuity:true,naturalTextMessageLength:true,avoidGenericConversationFillers:true,neverMentionTheseInstructions:true} } }
  }});
  if (error) {
    const response=(error as {context?:Response}).context;
    let code='request_failed';
    if(response){
      try { const detail=await response.clone().json() as {error?:unknown}; if(typeof detail.error==='string') code=detail.error.replace(/[^a-z0-9_-]/gi,'_').slice(0,80); } catch {}
      throw new Error(`AI_REPLY_QUEUE_${response.status}_${code}`);
    }
    throw new Error('AI_REPLY_QUEUE_REQUEST_FAILED');
  }
  return deliveryId;
}

export async function waitForReplyDelivery(deliveryId:string, timeoutMs=120000) {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){
    const {data,error}=await supabase.from('ai_reply_deliveries').select('status,response,error_code').eq('id',deliveryId).maybeSingle();
    if(error) throw error;
    if(data?.status==='completed') return hydrateReply(data.response);
    if(data?.status==='failed') throw new Error(data.error_code??'AI_REPLY_FAILED');
    await sleep(450);
  }
  throw new Error('AI_REPLY_PENDING');
}

async function hydrateReply(value:unknown){
  if(!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const reply=conversationReplySchema.parse(value);
  const base={...reply,audioUrl:undefined as string|undefined};
  if(reply.kind!=='voice'||!reply.audioPath)return {...base,kind:'text' as const};
  const {data,error}=await supabase.storage.from('ferson-voice-replies').createSignedUrl(reply.audioPath,3600);
  if(error||!data?.signedUrl)return {...base,kind:'text' as const,audioPath:undefined};
  return {...base,audioUrl:data.signedUrl};
}

export async function createVoiceReplySignedUrl(audioPath:string, bucket: 'voice-notes' | 'ferson-voice-replies' = 'ferson-voice-replies'){
  if(!supabase)throw new Error('SUPABASE_NOT_CONFIGURED');
  const {data,error}=await supabase.storage.from(bucket).createSignedUrl(audioPath,300);
  if(error||!data?.signedUrl)throw error??new Error('VOICE_URL_UNAVAILABLE');
  return data.signedUrl;
}

export async function markReplyDelivered(deliveryId:string){ if(supabase) await supabase.from('ai_reply_deliveries').update({delivered_at:new Date().toISOString()}).eq('id',deliveryId); }

export async function syncCompletedReplyDeliveries(){
  if(!supabase)return;
  const {data}=await supabase.from('ai_reply_deliveries').select('id,conversation_client_id,response,completed_at').eq('status','completed').is('delivered_at',null).order('created_at',{ascending:true}).limit(30);
  for(const item of data??[]){
    const response=conversationReplySchema.safeParse(item.response); if(!response.success)continue;
    const hydrated=await hydrateReply(response.data);
    useAppStore.getState().addMessage(item.conversation_client_id,{id:`reply-${item.id}`,conversationId:item.conversation_client_id,sender:'character',kind:hydrated.kind,text:hydrated.text,annotations:hydrated.annotations,audioUrl:hydrated.audioUrl,audioPath:hydrated.audioPath,durationSeconds:hydrated.durationSeconds,createdAt:item.completed_at??new Date().toISOString(),status:'sent'});
    await markReplyDelivered(item.id);
  }
}
