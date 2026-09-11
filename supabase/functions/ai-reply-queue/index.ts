import { speechInstructions, resolveVoiceAccent } from '../_shared/voice-accents.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase provides this global when running the deployed function.
declare const EdgeRuntime: { waitUntil(work: Promise<unknown>): void };

const headers = { 'Content-Type': 'application/json' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ttsVoices = {
  woman: ['nova','shimmer','coral'],
  man: ['ash','echo','onyx','verse','cedar','ballad','fable'],
} as const;
const voiceFor = (identity: unknown, gender: unknown, name: unknown) => {
  const pool = gender === 'man' ? ttsVoices.man : ttsVoices.woman;
  if (typeof identity === 'string' && (pool as readonly string[]).includes(identity)) return identity;
  const value = `${typeof identity === 'string' ? identity : 'legacy'}:${typeof name === 'string' ? name : 'Ferson'}`;
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash * 31) + value.charCodeAt(index)) >>> 0;
  return pool[hash % pool.length];
};

Deno.serve(async (req) => {
  const token = req.headers.get('Authorization');
  if (!token) return json({ error: 'unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: token } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: 'unauthorized' }, 401);
  const body = await req.json().catch(() => null);
  const deliveryId = body?.deliveryId;
  const conversationId = typeof body?.conversationId === 'string' ? body.conversationId.slice(0, 160) : '';
  const characterName = typeof body?.characterName === 'string' ? body.characterName.trim().slice(0, 80) : 'Ferson';
  const notificationBody = typeof body?.notificationBody === 'string' ? body.notificationBody.trim().slice(0, 120) : 'Sent you a message';
  const orchestratorBody = body?.orchestratorBody;
  if (!uuid.test(deliveryId ?? '') || !conversationId || orchestratorBody?.feature !== 'conversation') return json({ error: 'invalid_request' }, 400);
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error: profileError } = await admin.from('profiles').upsert(
    { id: user.id, email: user.email ?? null },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (profileError) return json({ error: 'profile_unavailable' }, 500);
  const { error: insertError } = await admin.from('ai_reply_deliveries').insert({ id: deliveryId, user_id: user.id, conversation_client_id: conversationId, character_name: characterName, status: 'pending' });
  if (insertError) {
    console.error('ai_reply_queue_insert_failed', { code: insertError.code });
    return json({ error: `queue_failed_${insertError.code ?? 'unknown'}` }, 500);
  }

  const work = (async () => {
    try {
      await admin.from('ai_reply_deliveries').update({ status: 'processing' }).eq('id', deliveryId).eq('user_id', user.id);
      const targetLanguage=orchestratorBody?.context?.targetLanguage==='es'?'es':'en';
      const {data:focusSignals}=await admin.from('learning_skill_signals').select('skill_key,category,label,evidence_count,confidence').eq('user_id',user.id).eq('target_language',targetLanguage).is('mastered_at',null).order('evidence_count',{ascending:false}).order('last_seen_at',{ascending:false}).limit(5);
      let focusedPractice=false;
      if(orchestratorBody?.context?.focusedPractice===true){
        const now=new Date().toISOString();
        const {data:entitlement}=await admin.from('profiles').select('is_premium,trial_ends_at,grace_period_ends_at,premium_expires_at').eq('id',user.id).maybeSingle();
        focusedPractice=Boolean((entitlement?.is_premium===true&&(!entitlement.premium_expires_at||entitlement.premium_expires_at>now))||(entitlement?.trial_ends_at&&entitlement.trial_ends_at>now)||(entitlement?.grace_period_ends_at&&entitlement.grace_period_ends_at>now));
      }
      orchestratorBody.context={...orchestratorBody.context,reinforcementFocus:focusSignals??[],focusedPractice};
      const response = await fetch(`${url}/functions/v1/ai-orchestrator`, { method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify(orchestratorBody) });
      const result = await response.json();
      if (!response.ok || !result?.data) throw new Error(typeof result?.error === 'string' ? result.error : `orchestrator_${response.status}`);
      let reply = { ...result.data, kind: 'text' };
      const conversation = Array.isArray(orchestratorBody?.context?.conversation) ? orchestratorBody.context.conversation : [];
      const latestMessage = conversation.at(-1);
      const wantsVoiceReply = latestMessage?.role === 'user' && latestMessage?.kind === 'voice' && typeof reply.text === 'string' && reply.text.trim().length > 0;
      if (wantsVoiceReply) {
        const now = new Date().toISOString();
        const { data: entitlement } = await admin.from('profiles').select('is_premium,trial_ends_at,grace_period_ends_at,premium_expires_at').eq('id', user.id).maybeSingle();
        const hasPremium = Boolean(
          (entitlement?.is_premium === true && (!entitlement.premium_expires_at || entitlement.premium_expires_at > now))
          || (entitlement?.trial_ends_at && entitlement.trial_ends_at > now)
          || (entitlement?.grace_period_ends_at && entitlement.grace_period_ends_at > now)
        );
        const { data: reserved, error: reserveError } = await admin.rpc('reserve_ferson_voice_reply', { p_user_id: user.id, p_delivery_id: deliveryId, p_limit: hasPremium ? 5000 : 5 });
        if (!reserveError && reserved === true) {
          const ttsStarted = Date.now();
          const ttsModel = 'gpt-4o-mini-tts';
          const speechCharacter=orchestratorBody?.context?.character??{};
          console.info('ferson_voice_selection',{deliveryId,model:ttsModel,premium:hasPremium,voice:voiceFor(speechCharacter.voiceId,speechCharacter.gender,speechCharacter.name),gender:speechCharacter.gender==='woman'?'woman':speechCharacter.gender==='man'?'man':'unknown',accent:resolveVoiceAccent(hasPremium,speechCharacter)});
          try {
            const speech = await fetch('https://api.openai.com/v1/audio/speech', {
              method: 'POST',
              headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')!}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: ttsModel, voice: voiceFor(orchestratorBody?.context?.character?.voiceId, orchestratorBody?.context?.character?.gender, orchestratorBody?.context?.character?.name), input: reply.text, instructions: speechInstructions(hasPremium,orchestratorBody?.context?.character??{},targetLanguage,orchestratorBody?.context?.targetVariant), response_format: 'mp3', speed: 1 }),
            });
            const requestId = speech.headers.get('x-request-id');
            if (!speech.ok) {
              await admin.from('ai_usage').insert({ user_id: user.id, conversation_id: null, provider: 'openai', model: ttsModel, feature: 'speech_generation', request_id: requestId, latency_ms: Date.now()-ttsStarted, success: false, error_code: 'TTS_HTTP_ERROR', http_status: speech.status, retryable: speech.status===408||speech.status===409||speech.status===429||speech.status>=500, retry_count: 0 });
              throw new Error(`tts_${speech.status}`);
            }
            const audio = await speech.arrayBuffer();
            const audioPath = `${user.id}/${deliveryId}.mp3`;
            const { error: uploadError } = await admin.storage.from('ferson-voice-replies').upload(audioPath, audio, { contentType: 'audio/mpeg', upsert: false });
            if (uploadError) throw new Error(`tts_storage_${uploadError.name ?? 'error'}`);
            reply = { ...reply, kind: 'voice', audioPath };
            await admin.from('ai_usage').insert({ user_id: user.id, conversation_id: null, provider: 'openai', model: ttsModel, feature: 'speech_generation', request_id: requestId, latency_ms: Date.now()-ttsStarted, success: true, http_status: speech.status, retryable: false, retry_count: 0 });
          } catch (ttsError) {
            await admin.from('ferson_voice_reply_reservations').delete().eq('delivery_id', deliveryId).eq('user_id', user.id);
            console.error('ferson_voice_reply_failed', { code: ttsError instanceof Error ? ttsError.message.replace(/[^a-z0-9_-]/gi,'_').slice(0,80) : 'unknown' });
          }
        }
      }
      await admin.from('ai_reply_deliveries').update({ status: 'completed', response: reply, completed_at: new Date().toISOString() }).eq('id', deliveryId).eq('user_id', user.id);
      const { data: devices } = await admin.from('device_push_tokens').select('token').eq('user_id', user.id).eq('enabled', true);
      if (devices?.length) await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(devices.map(({ token: pushToken }) => ({ to: pushToken, title: characterName, body: notificationBody, sound: 'default', channelId: 'messages', data: { conversationId } }))) });
    } catch (reason) {
      const errorCode = reason instanceof Error ? reason.message.replace(/[^a-z0-9_-]/gi, '_').slice(0, 80) : 'reply_job_failed';
      await admin.from('ai_reply_deliveries').update({ status: 'failed', error_code: errorCode, completed_at: new Date().toISOString() }).eq('id', deliveryId).eq('user_id', user.id);
    }
  })();
  EdgeRuntime.waitUntil(work);
  return json({ deliveryId, status: 'queued' }, 202);
});
