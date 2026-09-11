import { env } from '@/config/env';
import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import { ensureSession } from './live';

const contentTypeFor = (uri: string) => uri.toLowerCase().endsWith('.webm') ? 'audio/webm' : uri.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/m4a';

export async function transcribeVoiceMessage(uri: string, interfaceLocale: string, targetLanguage: string): Promise<string> {
  const session = await ensureSession();
  if (!env.EXPO_PUBLIC_SUPABASE_URL || !env.EXPO_PUBLIC_SUPABASE_ANON_KEY) throw new Error('SUPABASE_NOT_CONFIGURED');
  const type = contentTypeFor(uri);
  const extension = type.split('/')[1] ?? 'm4a';
  const body = new FormData();
  body.append('feature', 'transcription');
  body.append('interfaceLocale', interfaceLocale);
  body.append('targetLanguage', targetLanguage);
  const file = new File(uri);
  body.append('file', file, 'voice-message.' + extension);
  const response = await fetch(env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/ai-orchestrator', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + session.access_token,
      apikey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    body,
  });
  if (!response.ok) throw new Error('TRANSCRIPTION_' + response.status);
  const json = await response.json();
  const text = typeof json?.data?.text === 'string' ? json.data.text.trim() : '';
  if (!text) throw new Error('EMPTY_TRANSCRIPTION');
  return text;
}
