import { File, Paths } from 'expo-file-system';
import { supabase } from '@/services/supabase/client';
import { useAppStore } from '@/store/app-store';
import { isRetained } from '@/domain/retention';
import type { Message } from '@/domain/models';

let syncing = false;

let restoredFor: string | null = null;
supabase?.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') restoredFor = null; });
async function restoreAcademics(userId: string) {
  if (!supabase || restoredFor === userId) return;
  let after = '';
  while (true) {
    const { data, error } = await supabase.from('academic_records').select('record_id,record')
      .eq('user_id', userId).gt('record_id', after).order('record_id').limit(100);
    if (error) throw new Error('ACADEMIC_RESTORE_FAILED');
    if (!data?.length) break;
    useAppStore.setState(state => {
      const archivedLearning = { ...state.archivedLearning };
      const tutorReviews = { ...state.tutorReviews };
      for (const row of data) {
        const record = row.record;
        if (!record || typeof record !== 'object') continue;
        if (row.record_id.startsWith('learning:') && ['en','es'].includes(record.language)
          && Number.isFinite(record.learnerMessages) && Number.isFinite(record.voiceMessages) && Array.isArray(record.corrections)) {
          const id = row.record_id.slice(9);
          const remote = record as import('@/domain/retention').ArchivedLearning;
          const local = archivedLearning[id];
          archivedLearning[id] = local ? { ...local,
            learnerMessages: Math.max(local.learnerMessages,remote.learnerMessages),
            voiceMessages: Math.max(local.voiceMessages,remote.voiceMessages),
            corrections: [...new Map([...remote.corrections,...local.corrections].map(c => [c.id,c])).values()],
          } : remote;
        } else if (row.record_id.startsWith('tutor:') && typeof record.id === 'string'
          && typeof record.conversationId === 'string' && Array.isArray(record.corrections)) {
          const remote = record as import('@/domain/models').TutorReviewRecord;
          const local = tutorReviews[remote.conversationId] ?? [];
          if (!local.some(r => r.id === remote.id)) tutorReviews[remote.conversationId] = [...local,remote];
        }
      }
      return { archivedLearning, tutorReviews };
    });
    after = data.at(-1)!.record_id;
  }
  restoredFor = userId;
}

export async function uploadUserAudio(message: Message): Promise<string> {
  if (!supabase || !message.audioUrl?.startsWith('file://')) throw new Error('AUDIO_UPLOAD_UNAVAILABLE');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('AUTH_REQUIRED');
  const extension = message.audioUrl.toLowerCase().endsWith('.webm') ? 'webm' : message.audioUrl.toLowerCase().endsWith('.wav') ? 'wav' : 'm4a';
  const path = user.id + '/' + encodeURIComponent(message.id) + '.' + extension;
  const file = new File(message.audioUrl);
  const { error } = await supabase.storage.from('voice-notes').upload(path, await file.bytes(), {
    contentType: extension === 'm4a' ? 'audio/mp4' : 'audio/' + extension, upsert: false,
  });
  if (error && (error as { statusCode?: string }).statusCode !== '409') throw new Error('AUDIO_UPLOAD_FAILED');
  // Birth time is supplied through an owner-checked RPC, including old offline recordings.
  const { error: registrationError } = await supabase.rpc('register_user_audio_age', { p_path: path, p_created_at: message.createdAt });
  if (registrationError) throw new Error('AUDIO_REGISTRATION_FAILED');
  return path;
}

export async function syncRetention() {
  if (syncing || !useAppStore.persist.hasHydrated()) return;
  syncing = true;
  try {
    useAppStore.getState().purgeExpiredConversations();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await restoreAcademics(user.id);
        const state = useAppStore.getState();
        const records = [
          ...Object.entries(state.archivedLearning).map(([id, record]) => ({ user_id: user.id, record_id: 'learning:' + id, record })),
          ...Object.values(state.tutorReviews).flat().map(record => ({ user_id: user.id, record_id: 'tutor:' + record.id, record })),
        ];
        for (let i = 0; i < records.length; i += 100) {
          const { error } = await supabase.from('academic_records').upsert(records.slice(i, i + 100));
          if (error) break; // Persisted local records remain available for retry.
        }
        const messages = [...Object.values(state.messages).flat(), ...state.deletedConversations.flatMap(c => c.messages)];
        for (const message of messages) {
          if (message.sender !== 'user' || !message.audioUrl?.startsWith('file://') || !isRetained(message.createdAt)) continue;
          try {
            const path = await uploadUserAudio(message);
            useAppStore.getState().setMessageAudio(message.conversationId, message.id, path);
          } catch { /* Retry on next foreground/sync; preserve the local recording. */ }
        }
      }
    }
    for (const uri of useAppStore.getState().pendingAudioDeletes) {
      try {
        // Only delete app-owned recordings, never arbitrary persisted filesystem paths.
        if (!uri.startsWith(Paths.cache.uri) && !uri.startsWith(Paths.document.uri)) continue;
        const file = new File(uri);
        if (file.exists) file.delete();
        useAppStore.getState().acknowledgeAudioDelete(uri);
      } catch { /* Keep the deletion queued for retry. */ }
    }
  } catch { /* Local records and pending files survive for retry. */ } finally { syncing = false; }
}
