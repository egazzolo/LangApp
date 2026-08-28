import { useState } from 'react';
import { I18nManager, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Screen } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';
import { useAppStore } from '@/store/app-store';
import type { CorrectionIntensity, InterfaceLocale } from '@/domain/models';

const languages: { code: InterfaceLocale; label: string }[] = [{code:'en',label:'English'},{code:'es-419',label:'Español (Latinoamérica)'},{code:'es-ES',label:'Español (España)'},{code:'pt-BR',label:'Português (Brasil)'},{code:'zh-Hans',label:'简体中文'},{code:'ja',label:'日本語'},{code:'ko',label:'한국어'},{code:'vi',label:'Tiếng Việt'},{code:'id',label:'Bahasa Indonesia'},{code:'ar',label:'العربية'},{code:'fr',label:'Français'},{code:'tr',label:'Türkçe'}];

export default function Onboarding() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [voice, setVoice] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);
  const intensity = useAppStore((state) => state.correctionIntensity);
  const setIntensity = useAppStore((state) => state.setCorrectionIntensity);
  const chooseLocale = async (value: InterfaceLocale) => { setLocale(value); await i18n.changeLanguage(value); I18nManager.allowRTL(value === 'ar'); };

  return <Screen>
    <ScrollView contentContainerStyle={styles.content}>
      {step === 0 && <View style={styles.hero}><View style={styles.mark}><Text style={styles.markText}>L</Text></View><Text style={styles.eyebrow}>{t('welcome.eyebrow')}</Text><Text style={styles.title}>{t('welcome.title')}</Text><Text style={styles.body}>{t('welcome.body')}</Text><View style={styles.notice}><Text style={styles.noticeIcon}>◎</Text><Text style={styles.noticeText}>{t('welcome.disclosure')}</Text></View></View>}
      {step === 1 && <View><Text style={styles.step}>1 / 2</Text><Text style={styles.sectionTitle}>{t('onboarding.languageTitle')}</Text><Text style={styles.body}>{t('onboarding.languageBody')}</Text><View style={styles.options}>{languages.map((item) => <Pressable key={item.code} onPress={() => void chooseLocale(item.code)} style={[styles.option, locale === item.code && styles.selected]}><Text style={styles.optionText}>{item.label}</Text><Text style={styles.check}>{locale === item.code ? '●' : '○'}</Text></Pressable>)}</View></View>}
      {step === 2 && <View><Text style={styles.step}>2 / 2</Text><Text style={styles.sectionTitle}>{t('onboarding.profileTitle')}</Text><Text style={styles.fieldTitle}>{t('onboarding.correction')}</Text><View style={styles.info}><Text style={styles.infoTitle}>{t(`onboarding.${intensity}Title`)}</Text><Text style={styles.infoText}>{t(`onboarding.${intensity}Description`)}</Text></View><View style={styles.segment}>{(['chill','balanced','intensive'] as CorrectionIntensity[]).map((value) => <Pressable key={value} onPress={() => setIntensity(value)} style={[styles.segmentItem, intensity === value && styles.segmentSelected]}><Text style={[styles.segmentText, intensity === value && {color:'#fff'}]}>{t(`onboarding.${value}`)}</Text></Pressable>)}</View><SettingRow label={t('onboarding.voice')} value={voice} onValueChange={setVoice}/><SettingRow label={t('onboarding.notifications')} value={notifications} onValueChange={setNotifications}/><Text style={styles.finePrint}>{t('welcome.disclosure')}</Text></View>}
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>{step === 2 && <Button variant="ghost" label={t('common.back')} onPress={() => setStep(1)}/>}<View style={styles.primaryAction}><Button label={step === 0 ? t('welcome.begin') : step === 2 ? t('onboarding.finish') : t('common.next')} onPress={() => step === 2 ? router.replace('/create-character') : setStep(step + 1)}/></View></View>
  </Screen>;
}

function SettingRow({label,value,onValueChange}:{label:string;value:boolean;onValueChange:(value:boolean)=>void}) { return <View style={styles.setting}><Text style={styles.settingText}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{true:colors.primary}}/></View>; }

const styles=StyleSheet.create({content:{padding:spacing.lg,paddingTop:72,paddingBottom:150},hero:{minHeight:560,justifyContent:'center'},mark:{width:58,height:58,borderRadius:20,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',marginBottom:spacing.xl},markText:{color:'#fff',fontSize:30,fontWeight:'800'},eyebrow:{color:colors.primary,fontSize:12,fontWeight:'800',letterSpacing:1.5,marginBottom:spacing.md},title:{color:colors.ink,fontSize:37,lineHeight:44,fontWeight:'800',letterSpacing:-1.2},sectionTitle:{color:colors.ink,fontSize:30,lineHeight:36,fontWeight:'800',marginBottom:spacing.sm},body:{color:colors.muted,fontSize:17,lineHeight:26,marginTop:spacing.md},notice:{flexDirection:'row',gap:12,backgroundColor:colors.primarySoft,padding:spacing.md,borderRadius:radius.md,marginTop:spacing.xl,alignItems:'center'},noticeIcon:{fontSize:20,color:colors.primary},noticeText:{flex:1,color:colors.primary,fontSize:14,lineHeight:20},footer:{paddingHorizontal:spacing.lg,paddingTop:12,backgroundColor:colors.canvas,flexDirection:'row',alignItems:'center',gap:8},primaryAction:{flex:1},step:{color:colors.accent,fontWeight:'800',marginBottom:spacing.md},options:{gap:10,marginTop:spacing.lg},option:{paddingHorizontal:spacing.md,minHeight:54,backgroundColor:colors.surface,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},selected:{borderColor:colors.primary,backgroundColor:colors.primarySoft},optionText:{fontSize:16,color:colors.ink},check:{fontSize:18,color:colors.primary},fieldTitle:{fontSize:15,fontWeight:'700',marginTop:spacing.xl,marginBottom:spacing.sm},info:{backgroundColor:colors.primarySoft,borderRadius:radius.md,padding:spacing.md,marginBottom:12},infoTitle:{fontSize:15,fontWeight:'800',color:colors.primary},infoText:{fontSize:14,lineHeight:20,color:colors.muted,marginTop:4},segment:{flexDirection:'row',backgroundColor:colors.surface,padding:4,borderRadius:radius.md,borderWidth:1,borderColor:colors.border},segmentItem:{flex:1,paddingVertical:12,alignItems:'center',borderRadius:12},segmentSelected:{backgroundColor:colors.primary},segmentText:{fontSize:13,fontWeight:'700',color:colors.muted},setting:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:spacing.lg,borderBottomWidth:1,borderColor:colors.border},settingText:{flex:1,fontSize:16,color:colors.ink,paddingRight:12},finePrint:{color:colors.muted,fontSize:13,marginTop:spacing.xl}});
