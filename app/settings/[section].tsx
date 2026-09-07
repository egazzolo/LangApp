import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui';
import { interfaceLanguages } from '@/config/interface-languages';
import type { CorrectionIntensity, InterfaceLocale, PronunciationTarget } from '@/domain/models';
import { getCurrentPlan } from '@/services/subscriptions';
import { useAppStore } from '@/store/app-store';
import { colors, radius, spacing } from '@/theme/tokens';
import { privacyCopy } from '@/content/privacy-copy';

const intensityValues: CorrectionIntensity[] = ['chill', 'balanced', 'intensive'];
const pronunciationValues: { value: PronunciationTarget; label: string }[] = [{ value: 'general-american', label: 'General American' }, { value: 'modern-british', label: 'Modern British' }];

export default function SettingsSection() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { t, i18n } = useTranslation();
  const state = useAppStore();
  const [plan, setPlan] = useState('free');
  const privacy = privacyCopy[state.locale];
  useEffect(() => { if (section === 'subscription') void getCurrentPlan().then(setPlan); }, [section]);
  const chooseLocale = async (locale: InterfaceLocale) => { state.setLocale(locale); await i18n.changeLanguage(locale); };
  const setNotifications = async (enabled: boolean) => {
    if (enabled) { const result = await Notifications.requestPermissionsAsync(); state.setNotificationsEnabled(result.granted); }
    else state.setNotificationsEnabled(false);
  };
  const title = section && ['language','learning','notifications','privacy','subscription','aiDisclosure'].includes(section) ? t(`settings.${section}`) : t('settings.title');
  return <Screen><View style={styles.header}><Pressable accessibilityRole="button" onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" size={24} color={colors.ink}/></Pressable><Text style={styles.title}>{title}</Text></View><ScrollView contentContainerStyle={styles.content}>
    {section === 'language' && <Card>{interfaceLanguages.map(item => <Choice key={item.code} label={item.label} selected={state.locale===item.code} onPress={()=>void chooseLocale(item.code)}/>)}</Card>}
    {section === 'learning' && <><Label text={t('onboarding.correction')}/><Card>{intensityValues.map(value=><Choice key={value} label={t(`onboarding.${value}`)} detail={t(`onboarding.${value}Description`)} selected={state.correctionIntensity===value} onPress={()=>state.setCorrectionIntensity(value)}/>)}</Card><Label text="Pronunciation model"/><Card>{pronunciationValues.map(item=><Choice key={item.value} label={item.label} selected={state.pronunciationTarget===item.value} onPress={()=>state.setPronunciationTarget(item.value)}/>)}</Card><Card><Toggle label="Voice messages" value={state.voiceEnabled} onChange={state.setVoiceEnabled}/><Toggle label="Show language highlights" value={state.showLanguageHighlights} onChange={state.setShowLanguageHighlights}/></Card></>}
    {section === 'notifications' && <Card><Toggle label="Allow Ferson notifications" value={state.notificationsEnabled} onChange={value=>void setNotifications(value)}/><Text style={styles.note}>Turning this on asks Android for permission. You can also change it later in your phone settings.</Text></Card>}
    {section === 'privacy' && <Card><Text style={styles.heading}>{privacy.title}</Text><Text style={styles.body}>{privacy.privateData}</Text><Text style={styles.body}>{privacy.technicalData}</Text></Card>}
    {section === 'subscription' && <Card><Text style={styles.heading}>Current membership</Text><Text style={styles.plan}>{plan === 'free' ? 'Free' : plan === 'premium_annual' ? 'Premium annual' : 'Premium monthly'}</Text><Text style={styles.body}>{plan === 'free' ? 'Premium purchasing is not available in this test build yet.' : 'Premium access is active on this account.'}</Text></Card>}
    {section === 'aiDisclosure' && <Card><Text style={styles.heading}>Fersons are AI</Text><Text style={styles.body}>Every Ferson is a fictional, AI-generated contact. Their profiles and messages are generated for language practice.</Text><Text style={styles.body}>They are not real people, cannot act in the real world, and should not be relied on for professional or emergency advice.</Text></Card>}
  </ScrollView></Screen>;
}

function Card({children}:{children:React.ReactNode}){return <View style={styles.card}>{children}</View>}
function Label({text}:{text:string}){return <Text style={styles.label}>{text}</Text>}
function Choice({label,detail,selected,onPress}:{label:string;detail?:string;selected:boolean;onPress:()=>void}){return <Pressable onPress={onPress} style={[styles.choice,selected&&styles.selected]}><View style={styles.choiceCopy}><Text style={styles.choiceText}>{label}</Text>{detail?<Text style={styles.detail}>{detail}</Text>:null}</View>{selected?<Ionicons name="checkmark-circle" size={22} color={colors.primary}/>:null}</Pressable>}
function Toggle({label,value,onChange}:{label:string;value:boolean;onChange:(value:boolean)=>void}){return <View style={styles.toggle}><Text style={styles.choiceText}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{true:colors.primary}}/></View>}
const styles=StyleSheet.create({header:{paddingTop:54,paddingHorizontal:spacing.md,paddingBottom:12,flexDirection:'row',alignItems:'center',gap:10},back:{width:42,height:42,alignItems:'center',justifyContent:'center'},title:{fontSize:24,fontWeight:'800',color:colors.ink,flex:1},content:{padding:spacing.lg,paddingTop:8,paddingBottom:60,gap:14},card:{backgroundColor:colors.surface,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border,overflow:'hidden',padding:4},label:{fontSize:15,fontWeight:'800',color:colors.ink,marginTop:8},choice:{minHeight:54,padding:14,borderRadius:radius.md,flexDirection:'row',alignItems:'center',gap:12},selected:{backgroundColor:colors.primarySoft},choiceCopy:{flex:1},choiceText:{fontSize:16,fontWeight:'700',color:colors.ink},detail:{fontSize:13,lineHeight:18,color:colors.muted,marginTop:3},toggle:{minHeight:60,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},note:{fontSize:13,lineHeight:19,color:colors.muted,padding:14,paddingTop:4},heading:{fontSize:18,fontWeight:'800',color:colors.ink,padding:14,paddingBottom:5},body:{fontSize:15,lineHeight:22,color:colors.muted,paddingHorizontal:14,paddingBottom:14},plan:{fontSize:25,fontWeight:'800',color:colors.primary,paddingHorizontal:14,paddingVertical:8}});
