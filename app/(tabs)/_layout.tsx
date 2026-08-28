import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';
export default function TabsLayout(){const {t}=useTranslation();const insets=useSafeAreaInsets();return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:colors.primary,tabBarInactiveTintColor:colors.muted,tabBarStyle:{height:66+insets.bottom,paddingTop:6,paddingBottom:insets.bottom,backgroundColor:colors.surface,borderTopColor:colors.border},tabBarLabelStyle:{fontSize:11,fontWeight:'600'}}}><Tabs.Screen name="index" options={{title:t('tabs.chats'),tabBarIcon:({color,size})=><Ionicons name="chatbubble-ellipses" color={color} size={size}/>}}/><Tabs.Screen name="people" options={{title:t('tabs.people'),tabBarIcon:({color,size})=><Ionicons name="people" color={color} size={size}/>}}/><Tabs.Screen name="progress" options={{title:t('tabs.progress'),tabBarIcon:({color,size})=><Ionicons name="pulse" color={color} size={size}/>}}/><Tabs.Screen name="settings" options={{title:t('tabs.settings'),tabBarIcon:({color,size})=><Ionicons name="settings" color={color} size={size}/>}}/></Tabs>}

