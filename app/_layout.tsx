import { useEffect } from 'react';
import i18n from '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, StatusBar } from 'react-native';
import { useAppStore } from '@/store/app-store';
import { initializeMonitoring, withMonitoring } from '@/services/monitoring';
import { configureNotifications, registerDevicePushToken } from '@/services/notifications';
import { syncCompletedReplyDeliveries } from '@/services/ai/reply-deliveries';
import { supabase } from '@/services/supabase/client';
import { syncRetention } from '@/services/retention';
import { colors } from '@/theme/tokens';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 2, staleTime: 30_000 } } });
initializeMonitoring();
configureNotifications();

function RootLayout() {
  const adminRoute = usePathname().startsWith('/admin');
  const locale = useAppStore((state) => state.locale);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  useEffect(() => { if (i18n.language !== locale) void i18n.changeLanguage(locale); }, [locale]);
  useEffect(() => {
    if (adminRoute) return;
    const openConversation = (response: Notifications.NotificationResponse) => {
      const conversationId = response.notification.request.content.data?.conversationId;
      if (typeof conversationId === 'string' && conversationId) router.push(`/chat/${conversationId}` as never);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(openConversation);
    void Notifications.getLastNotificationResponseAsync().then((response) => { if (response) openConversation(response); });
    return () => subscription.remove();
  }, [adminRoute]);
  useEffect(() => {
    if (adminRoute) return;
    const sync = () => { void syncRetention(); void syncCompletedReplyDeliveries(); void registerDevicePushToken(notificationsEnabled); };
    sync();
    const hydrated = useAppStore.persist.onFinishHydration(sync);
    const retentionTimer = setInterval(() => void syncRetention(), 60000);
    const appState = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    const authState = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { queryClient.clear(); router.replace('/auth'); return; }
      setTimeout(sync, 0);
    });
    return () => { clearInterval(retentionTimer); hydrated(); appState.remove(); authState?.data.subscription.unsubscribe(); };
  }, [notificationsEnabled, adminRoute]);
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent={false}/><Stack screenOptions={{ headerShown: false, animation: 'fade' }} /></QueryClientProvider></SafeAreaProvider>;
}
export default withMonitoring(RootLayout);
