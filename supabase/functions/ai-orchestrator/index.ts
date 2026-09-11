import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AIProviderError, OpenAIProvider } from '../_shared/providers.ts';
import { prompts } from '../_shared/prompts.ts';

const headers = { 'Content-Type': 'application/json' };
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const moderationResult = async (input: string) => {
  const response = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + Deno.env.get('OPENAI_API_KEY')!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'omni-moderation-latest', input }),
  });
  if (!response.ok) throw new Error('moderation_unavailable');
  const result = (await response.json()).results?.[0];
  const categories = result?.categories ?? {};
  return { sexual: categories.sexual === true, sexualMinors: categories['sexual/minors'] === true };
};

const adultBoundaryReply = {
  text: "I'm not comfortable taking the conversation there. We can keep it flirty without getting explicit.",
  kind: 'text',
  annotations: [
    { text: "taking the conversation there", meaning: 'Moving the conversation toward a topic or level the speaker does not want.' },
    { text: 'keep it flirty', meaning: 'Continue with light romantic teasing or attraction without becoming explicit.' },
  ],
};
const minorBoundaryReply = {
  text: "I can't engage with anything sexual involving anyone under 18. Let's change the subject.",
  kind: 'text',
  annotations: [{ text: 'change the subject', meaning: 'Stop discussing the current topic and talk about something else.' }],
};

Deno.serve(async (req) => {
  const started = Date.now();
  let admin: ReturnType<typeof createClient> | null = null;
  let userId: string | null = null;
  let attemptedFeature = 'unknown';
  let attemptedModel = 'unknown';
  let reservedReplyIdeaConversationId: string | null = null;
  let knownTutorFocusCount = 0;
  try {
    const token = req.headers.get('Authorization');
    if (!token) return jsonResponse({ error: 'unauthorized' }, 401);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: token } } });
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) return jsonResponse({ error: 'unauthorized' }, 401);

    userId = user.id;
    admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const contentType = req.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      if (form.get('feature') !== 'transcription') return jsonResponse({ error: 'invalid_feature' }, 400);
      const file = form.get('file');
      if (!(file instanceof File) || file.size === 0) return jsonResponse({ error: 'missing_audio' }, 400);
      if (file.size > 25 * 1024 * 1024) return jsonResponse({ error: 'audio_too_large' }, 413);

      const openAIForm = new FormData();
      openAIForm.append('model', Deno.env.get('OPENAI_TRANSCRIPTION_MODEL') ?? 'gpt-transcribe');
      openAIForm.append('file', file, file.name || 'voice-message.m4a');
      openAIForm.append('prompt', 'Transcribe exactly what the speaker says. Preserve natural code-switching and do not translate. The language being practised is ' + String(form.get('targetLanguage') ?? 'unknown') + '. The app interface locale is ' + String(form.get('interfaceLocale') ?? 'unknown') + '.');
      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + Deno.env.get('OPENAI_API_KEY')! },
        body: openAIForm,
      });
      if (!transcriptionResponse.ok) {
        const retryable = transcriptionResponse.status === 429 || transcriptionResponse.status >= 500;
        await admin.from('ai_usage').insert({ user_id: user.id, conversation_id: null, provider: 'openai', model: Deno.env.get('OPENAI_TRANSCRIPTION_MODEL') ?? 'gpt-transcribe', feature: 'transcription', request_id: transcriptionResponse.headers.get('x-request-id'), latency_ms: Date.now() - started, success: false, error_code: 'TRANSCRIPTION_HTTP_ERROR', http_status: transcriptionResponse.status, retryable, retry_count: 0 });
        console.error('TRANSCRIPTION_HTTP_ERROR', transcriptionResponse.status);
        return jsonResponse({ error: 'transcription_unavailable', retryable }, retryable ? 503 : 422);
      }
      const transcription = await transcriptionResponse.json();
      const text = typeof transcription.text === 'string' ? transcription.text.trim() : '';
      if (!text) {
        await admin.from('ai_usage').insert({ user_id: user.id, conversation_id: null, provider: 'openai', model: Deno.env.get('OPENAI_TRANSCRIPTION_MODEL') ?? 'gpt-transcribe', feature: 'transcription', request_id: transcriptionResponse.headers.get('x-request-id'), latency_ms: Date.now() - started, success: false, error_code: 'EMPTY_TRANSCRIPTION', http_status: transcriptionResponse.status, retryable: true, retry_count: 0 });
        return jsonResponse({ error: 'empty_transcription', retryable: true }, 503);
      }
      await admin.from('ai_usage').insert({ user_id: user.id, conversation_id: null, provider: 'openai', model: Deno.env.get('OPENAI_TRANSCRIPTION_MODEL') ?? 'gpt-transcribe', feature: 'transcription', request_id: transcriptionResponse.headers.get('x-request-id'), latency_ms: Date.now() - started, success: true, http_status: transcriptionResponse.status, retryable: false, retry_count: 0 });
      return jsonResponse({ data: { text } });
    }

    const body = await req.json();
    const feature = body.feature;
    attemptedFeature = typeof feature === 'string' ? feature : 'unknown';
    if (feature === 'reply_assistance') {
      const conversationId = typeof body.conversationId === 'string' ? body.conversationId.trim() : '';
      if (!conversationId) return jsonResponse({ error: 'missing_conversation_id' }, 400);
      const now = new Date().toISOString();
      const { data: entitlement } = await admin.from('profiles').select('is_premium,trial_ends_at,grace_period_ends_at,premium_expires_at').eq('id', user.id).maybeSingle();
      const hasPremium = Boolean(
        (entitlement?.is_premium === true && (!entitlement.premium_expires_at || entitlement.premium_expires_at > now))
        || (entitlement?.trial_ends_at && entitlement.trial_ends_at > now)
        || (entitlement?.grace_period_ends_at && entitlement.grace_period_ends_at > now)
      );
      if (!hasPremium) {
        const { error: reservationError } = await admin.from('reply_assistance_uses').insert({ user_id: user.id, conversation_id: conversationId });
        if (reservationError?.code === '23505') return jsonResponse({ error: 'reply_idea_premium_required' }, 402);
        if (reservationError) throw new Error('reply_idea_reservation_failed');
        reservedReplyIdeaConversationId = conversationId;
      }
    }
    if (feature === 'tutor_review') {
      const now = new Date().toISOString();
      const { data: entitlement } = await admin.from('profiles').select('is_premium,trial_ends_at,grace_period_ends_at,premium_expires_at').eq('id', user.id).maybeSingle();
      const hasPremium = Boolean(
        (entitlement?.is_premium === true && (!entitlement.premium_expires_at || entitlement.premium_expires_at > now))
        || (entitlement?.trial_ends_at && entitlement.trial_ends_at > now)
        || (entitlement?.grace_period_ends_at && entitlement.grace_period_ends_at > now)
      );
      const correctionIntensity = ['chill', 'balanced', 'intensive'].includes(body.context?.correctionIntensity)
        ? body.context.correctionIntensity
        : 'balanced';
      const targetLanguage=body.context?.targetLanguage==='es'?'es':'en';
      const {data:knownFocus}=await admin.from('learning_skill_signals').select('skill_key,category,label,evidence_count,successful_uses').eq('user_id',user.id).eq('target_language',targetLanguage).is('mastered_at',null).order('evidence_count',{ascending:false}).limit(8);
      knownTutorFocusCount=knownFocus?.length??0;
      body.context = { ...body.context, correctionIntensity, acceptCasualTexting: false, knownFocusAreas:knownFocus??[] };
    }
    if (feature === 'conversation') {
      const now = new Date().toISOString();
      const { data: entitlement } = await admin.from('profiles').select('is_premium,trial_ends_at,grace_period_ends_at,premium_expires_at').eq('id', user.id).maybeSingle();
      const hasPremium = Boolean(
        (entitlement?.is_premium === true && (!entitlement.premium_expires_at || entitlement.premium_expires_at > now))
        || (entitlement?.trial_ends_at && entitlement.trial_ends_at > now)
        || (entitlement?.grace_period_ends_at && entitlement.grace_period_ends_at > now)
      );
      const requestedKnowledge = body.context?.character?.knowledgeProfile;
      body.context = {
        ...body.context,
        character: {
          ...body.context?.character,
          knowledgeProfile: hasPremium && requestedKnowledge?.level === 'specialist'
            ? { level: 'specialist', expertiseDomains: Array.isArray(requestedKnowledge.expertiseDomains) ? requestedKnowledge.expertiseDomains.slice(0, 5) : [] }
            : { level: 'general', expertiseDomains: [] },
        },
      };
      const conversation = Array.isArray(body.context?.conversation) ? body.context.conversation : [];
      const latestUserText = [...conversation].reverse().find((message: { role?: string; text?: string }) => message.role === 'user')?.text;
      if (typeof latestUserText === 'string' && latestUserText.trim()) {
        const moderation = await moderationResult(latestUserText);
        if (moderation.sexualMinors || moderation.sexual) {
          await admin.from('ai_usage').insert({ user_id: user.id, conversation_id: null, provider: 'openai', model: 'omni-moderation-latest', feature: 'conversation_safety_boundary', latency_ms: Date.now() - started, success: true, http_status: 200, retryable: false, retry_count: 0 });
          return jsonResponse({ data: moderation.sexualMinors ? minorBoundaryReply : adultBoundaryReply, promptVersion: 'safety-boundary.v1' });
        }
      }
    }
    const prompt = feature === 'character_generation' ? prompts.characterGeneration : feature === 'learning_analysis' ? prompts.learningAnalysis : feature === 'memory_extraction' ? prompts.memoryExtraction : feature === 'reply_assistance' ? prompts.replyAssistance : feature === 'tutor_review' ? prompts.tutorReview : feature === 'message_explanation' ? prompts.messageExplanation : prompts.conversation;
    const model = Deno.env.get('OPENAI_TEXT_MODEL') ?? 'gpt-5-mini';
    attemptedModel = model;
    const provider = new OpenAIProvider(Deno.env.get('OPENAI_API_KEY')!);
    const targetLanguage = body.context?.targetLanguage === 'es' ? 'Spanish' : 'English';
    const targetVariant = typeof body.context?.targetVariant === 'string' ? body.context.targetVariant : '';
    const languageDirective = `\nIMPORTANT LANGUAGE OVERRIDE: The language being practised is ${targetLanguage}. Every reference in the instructions to English or an English learner must be interpreted as ${targetLanguage}. Ferson replies and reply suggestions must be written in ${targetLanguage}. Review the learner's ${targetLanguage}, and annotate expressions from ${targetLanguage}. The requested variety is ${targetVariant || 'unspecified'}; keep vocabulary and usage coherent with it without treating other valid regional varieties as mistakes. For a conversation reply, inspect the latest user message. If it is clearly and predominantly written in a different language, the Ferson must not answer its content: respond briefly and naturally in ${targetLanguage} that they did not understand and ask the user to say it in ${targetLanguage}. Do not trigger this for names, borrowed words, common greetings shared by languages, a learner's mistakes, very short ambiguous text, or natural occasional code-switching. User interests are optional conversation inspiration only; never claim the user likes something merely because its category appears in userInterests. For Spanish casual-register handling, forms such as "q", "xq", "pa", "toy", "tas", "finde", omitted capitalization, and omitted opening punctuation in casual texts follow the same register policy as common English texting forms. Never mark voseo, seseo, ustedes/vosotros usage, or another valid regional form as inherently incorrect.\n`;
    const result = await provider.generateStructured({ model, system: prompt.system + languageDirective, input: body.context, schemaName: body.schemaName, schema: body.schema });
    if (feature === 'tutor_review' && Array.isArray(result.data?.focusAreas)) {
      const targetLanguage = body.context?.targetLanguage === 'es' ? 'es' : 'en';
      for (const focus of result.data.focusAreas.slice(0, 8)) {
        if (!focus || typeof focus.skillKey !== 'string' || typeof focus.label !== 'string') continue;
        await admin.rpc('record_learning_skill_signal', {
          p_user_id: user.id, p_target_language: targetLanguage, p_skill_key: focus.skillKey,
          p_category: focus.category, p_label: focus.label,
          p_evidence_count: focus.evidenceCount, p_confidence: focus.confidence,
        });
      }
      for(const strengthened of Array.isArray(result.data?.strengthenedAreas)?result.data.strengthenedAreas.slice(0,8):[]){
        if(!strengthened||typeof strengthened.skillKey!=='string')continue;
        await admin.rpc('record_learning_skill_success',{p_user_id:user.id,p_target_language:targetLanguage,p_skill_key:strengthened.skillKey,p_successes:strengthened.successfulUses});
      }
      const {count:remaining}=await admin.from('learning_skill_signals').select('skill_key',{count:'exact',head:true}).eq('user_id',user.id).eq('target_language',targetLanguage).is('mastered_at',null);
      const {data:profile}=await admin.from('profiles').select('focused_practice_enabled').eq('id',user.id).maybeSingle();
      const completed=knownTutorFocusCount>0&&remaining===0&&profile?.focused_practice_enabled===true;
      if(completed)await admin.from('profiles').update({focused_practice_enabled:false}).eq('id',user.id);
      result.data.focusedPracticeCompleted=completed;
    }
    if (feature === 'conversation' && typeof result.data?.text === 'string') {
      const moderation = await moderationResult(result.data.text);
      if (moderation.sexualMinors) result.data = minorBoundaryReply;
      else if (moderation.sexual) result.data = adultBoundaryReply;
    }
    await admin.from('ai_usage').insert({ user_id: user.id, conversation_id: null, provider: 'openai', model, feature, input_tokens: result.usage.inputTokens, output_tokens: result.usage.outputTokens, latency_ms: Date.now() - started, success: true, request_id: result.requestId, http_status: 200, retryable: false, retry_count: 0 });
    return jsonResponse({ data: result.data, promptVersion: prompt.version });
  } catch (error) {
    const providerError = error instanceof AIProviderError ? error : null;
    if (admin && userId && reservedReplyIdeaConversationId) await admin.from('reply_assistance_uses').delete().eq('user_id', userId).eq('conversation_id', reservedReplyIdeaConversationId);
    if (admin && userId) await admin.from('ai_usage').insert({ user_id: userId, conversation_id: null, provider: 'openai', model: attemptedModel, feature: attemptedFeature, request_id: providerError?.requestId, latency_ms: Date.now() - started, success: false, error_code: providerError?.code ?? 'AI_ORCHESTRATOR_ERROR', http_status: providerError?.httpStatus ?? 500, retryable: providerError?.retryable ?? true, retry_count: providerError?.retryCount ?? 0 });
    console.error(providerError?.code ?? 'AI_ORCHESTRATOR_ERROR');
    return jsonResponse({ error: 'provider_unavailable', retryable: providerError?.retryable ?? true }, 503);
  }
});
