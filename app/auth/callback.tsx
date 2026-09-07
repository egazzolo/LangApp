import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { completeAuthFromUrl } from '@/services/auth';
import { supabase } from '@/services/supabase/client';
import { useAppStore } from '@/store/app-store';
import { colors } from '@/theme/tokens';

export default function AuthCallback() {
  const onboarded = useAppStore((state) => state.onboarded);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let failureTimer: ReturnType<typeof setTimeout> | undefined;

    const acceptSession = async () => {
      const { data } = await supabase!.auth.getSession();
      if (data.session && !data.session.user.is_anonymous && active) {
        if (failureTimer) clearTimeout(failureTimer);
        setDone(true);
        return true;
      }
      return false;
    };

    const acceptUrl = async (url: string | null) => {
      if (await acceptSession()) return;
      if (url?.includes('auth/callback')) {
        try { await completeAuthFromUrl(url); } catch { /* Another callback handler may already have exchanged it. */ }
      }
      await acceptSession();
    };

    if (!supabase) { setFailed(true); return; }
    const authListener = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !session.user.is_anonymous && active) setDone(true);
    });
    const linkListener = Linking.addEventListener('url', ({ url }) => { void acceptUrl(url); });
    void Linking.getInitialURL().then(acceptUrl).finally(() => {
      failureTimer = setTimeout(() => { if (active) setFailed(true); }, 5000);
    });

    return () => {
      active = false;
      if (failureTimer) clearTimeout(failureTimer);
      authListener.data.subscription.unsubscribe();
      linkListener.remove();
    };
  }, []);

  if (done) return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
  return <View style={styles.screen}>{failed ? <><Text style={styles.title}>Couldn’t finish signing in</Text><Text style={styles.body}>Return to the account screen and try again.</Text></> : <><ActivityIndicator color={colors.primary}/><Text style={styles.body}>Finishing sign-in…</Text></>}</View>;
}

const styles = StyleSheet.create({screen:{flex:1,alignItems:'center',justifyContent:'center',gap:14,backgroundColor:colors.canvas,padding:24},title:{fontSize:22,fontWeight:'800',color:colors.ink},body:{fontSize:15,color:colors.muted,textAlign:'center'}});
