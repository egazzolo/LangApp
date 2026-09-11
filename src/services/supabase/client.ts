import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { env, hasSupabaseConfig } from '@/config/env';
export const supabase = hasSupabaseConfig && (Platform.OS !== 'web' || typeof window !== 'undefined') ? createClient(env.EXPO_PUBLIC_SUPABASE_URL!, env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } }) : null;
