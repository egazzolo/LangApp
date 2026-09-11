import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase/client';
import { useAppStore } from '@/store/app-store';

const backupKey = (id: string) => 'ferson-account-state-v1:' + id;

export async function signOutSafely() {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const state = useAppStore.getState();
  // Saving must succeed before logout can clear the active device state.
  if (data.session) {
    const snapshot = useAppStore.persist.getOptions().partialize!(state);
    await AsyncStorage.setItem(backupKey(data.session.user.id), JSON.stringify(snapshot));
  }
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
  useAppStore.getState().resetForSignOut();
}

export async function restoreSignedInAccount() {
  if (!supabase) return;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session || data.session.user.is_anonymous) return;
  const key = backupKey(data.session.user.id);
  const saved = await AsyncStorage.getItem(key);
  if (!saved) return;
  // Backups come only from the persisted data subset, never store actions.
  const snapshot = JSON.parse(saved);
  useAppStore.setState(snapshot);
  useAppStore.getState().purgeExpiredConversations();
  await AsyncStorage.removeItem(key);
}
