import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import type { InterfaceLocale } from '@/domain/models';
import { supabase } from '@/services/supabase/client';

export const replyBodies: Record<InterfaceLocale, string> = {
  en: 'Sent you a message', 'es-419': 'Te envió un mensaje', 'es-ES': 'Te ha enviado un mensaje',
  'pt-BR': 'Enviou uma mensagem para você', 'zh-Hans': '给你发了一条消息', ja: 'メッセージが届きました',
  ko: '메시지를 보냈습니다', vi: 'Đã gửi tin nhắn cho bạn', id: 'Mengirim pesan kepada Anda',
  ar: 'أرسل إليك رسالة', fr: 'Vous a envoyé un message', tr: 'Sana bir mesaj gönderdi',
};

export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') void Notifications.setNotificationChannelAsync('messages', {
    name: 'Ferson replies', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 180, 100, 180],
  });
}

export async function registerDevicePushToken(enabled: boolean) {
  try {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    if (!enabled) {
      await supabase.from('device_push_tokens').update({ enabled: false, updated_at: new Date().toISOString() }).eq('user_id', user.id);
      return false;
    }
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return false;
    const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
    if (typeof projectId !== 'string' || !/^[0-9a-f-]{36}$/i.test(projectId)) return false;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const { error } = await supabase.from('device_push_tokens').upsert({ token, user_id: user.id, platform: Platform.OS, enabled: true, updated_at: new Date().toISOString() });
    return !error;
  } catch { return false; }
}

export async function notifyFersonReply(name: string, conversationId: string, locale: InterfaceLocale) {
  const permission = await Notifications.getPermissionsAsync();
  const granted = permission.granted ? permission : await Notifications.requestPermissionsAsync();
  if (!granted.granted) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: name, body: replyBodies[locale], sound: 'default', data: { conversationId } },
    trigger: null,
  });
  return true;
}
