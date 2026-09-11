import { Share } from 'react-native';
import { supabase } from '@/services/supabase/client';
import { useAppStore } from '@/store/app-store';
export async function exportConversation(conversationId: string) {
  if (!supabase) throw new Error('EXPORT_UNAVAILABLE');
  useAppStore.getState().purgeExpiredConversations();
  const messages = (useAppStore.getState().messages[conversationId] ?? []).map(({ sender, text, createdAt }) => ({ sender, text, createdAt }));
  const { data, error } = await supabase.functions.invoke('export-conversation', { body: { messages } });
  if (error) {
    if ((error as { context?: Response }).context?.status === 403) throw new Error('PREMIUM_REQUIRED');
    throw new Error('EXPORT_UNAVAILABLE');
  }
  if (!data || !Array.isArray(data.messages)) throw new Error('EXPORT_UNAVAILABLE');
  await Share.share({ title: 'Ferson conversation', message: JSON.stringify(data, null, 2) });
}
