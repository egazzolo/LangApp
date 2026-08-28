import { z } from 'zod';
const schema = z.object({ EXPO_PUBLIC_SUPABASE_URL: z.url().optional(), EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional() });
export const env = schema.parse({ EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || undefined, EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || undefined });
export const hasSupabaseConfig = Boolean(env.EXPO_PUBLIC_SUPABASE_URL && env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
