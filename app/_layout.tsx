import { useEffect } from 'react';
import i18n from '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/app-store';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 2, staleTime: 30_000 } } });

export default function RootLayout() {
  const locale = useAppStore((state) => state.locale);
  useEffect(() => { if (i18n.language !== locale) void i18n.changeLanguage(locale); }, [locale]);
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><StatusBar style="auto"/><Stack screenOptions={{ headerShown: false, animation: 'fade' }} /></QueryClientProvider></SafeAreaProvider>;
}
