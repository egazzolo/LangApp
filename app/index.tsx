import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAppStore } from '@/store/app-store';
import { supabase } from '@/services/supabase/client';
import { colors } from '@/theme/tokens';
export default function Index() {
  const onboarded = useAppStore((state) => state.onboarded); const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  useEffect(() => { if (!supabase) { setAuthenticated(false); return; } void supabase.auth.getSession().then(({ data }) => setAuthenticated(Boolean(data.session && !data.session.user.is_anonymous))); const { data } = supabase.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session && !session.user.is_anonymous))); return () => data.subscription.unsubscribe(); }, []);
  if (authenticated === null) return <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:colors.canvas}}><ActivityIndicator color={colors.primary}/></View>;
  return <Redirect href={(authenticated ? (onboarded ? '/(tabs)' : '/onboarding') : '/auth') as never} />;
}
