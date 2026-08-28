import { Redirect } from 'expo-router';
import { useAppStore } from '@/store/app-store';
export default function Index() { return <Redirect href={useAppStore((s) => s.onboarded) ? '/(tabs)' : '/onboarding'} />; }
