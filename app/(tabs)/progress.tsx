import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui';
import { progressCopy, progressDataCopy } from '@/content/progress-copy';
import { useAppStore } from '@/store/app-store';
import { colors, radius, spacing } from '@/theme/tokens';

const soundExamples=[{symbol:'/ð/',word:'this'},{symbol:'/ɪ/',word:'ship'},{symbol:'/v/',word:'very'}];

export default function Progress(){
  const {t}=useTranslation();
  const locale=useAppStore((state)=>state.locale);
  const pronunciationTarget=useAppStore((state)=>state.pronunciationTarget);
  const conversations=useAppStore((state)=>state.conversations);
  const messageGroups=useAppStore((state)=>state.messages);
  const copy=progressCopy[locale];
  const dataCopy=progressDataCopy[locale];
  const allMessages=Object.values(messageGroups).flat();
  const learnerMessages=allMessages.filter((message)=>message.sender==='user');
  const voiceMessages=learnerMessages.filter((message)=>message.kind==='voice');
  const play=async(word:string)=>{
    try {
      const Speech=await import('expo-speech');
      await Speech.stop();
      Speech.speak(word,{language:pronunciationTarget==='modern-british'?'en-GB':'en-US',rate:.72});
    } catch {
      Alert.alert('Ferson','Pronunciation audio will be available after the development app is rebuilt.');
    }
  };
  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>{t('progress.title')}</Text><Text style={styles.sub}>{t('progress.subtitle')}</Text>
    <View style={styles.stats}><Stat value={String(conversations.length)} label={t('progress.conversations')}/><Stat value={String(learnerMessages.length)} label={t('progress.messages')}/><Stat value={String(voiceMessages.length)} label={dataCopy.voiceMessages}/></View>
    <Text style={styles.heading}>{t('progress.recurring')}</Text><View style={styles.card}><Text style={styles.emptyCopy}>{dataCopy.awaitingFocus}</Text></View>
    <Text style={styles.heading}>{t('progress.pronunciation')}</Text><View style={styles.card}>
      <Text style={styles.practiceNotice}>{dataCopy.pronunciationPractice}</Text><Text style={styles.soundsTitle}>{copy.usefulSounds}</Text><Text style={styles.soundHint}>{copy.soundHint}</Text>
      <View style={styles.soundList}>{soundExamples.map((item)=><Pressable key={item.symbol} accessibilityRole="button" accessibilityLabel={`${copy.hear} ${item.word}`} onPress={()=>void play(item.word)} style={styles.soundChip}><Ionicons name="volume-medium" size={17} color={colors.primary}/><Text style={styles.soundWord}>{item.word}</Text><Text style={styles.soundSymbol}>{item.symbol}</Text></Pressable>)}</View>
    </View>
  </ScrollView></Screen>;
}
function Stat({value,label}:{value:string;label:string}){return <View style={styles.stat}><Text style={styles.value}>{value}</Text><Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={.72} android_hyphenationFrequency="none" textBreakStrategy="simple" style={styles.statLabel}>{label}</Text></View>}
const styles=StyleSheet.create({content:{padding:spacing.lg,paddingTop:60,paddingBottom:100},title:{fontSize:30,fontWeight:'800',color:colors.ink},sub:{fontSize:16,color:colors.muted,marginTop:5},stats:{flexDirection:'row',gap:8,marginTop:spacing.xl},stat:{flex:1,backgroundColor:colors.surface,padding:14,borderRadius:radius.md},value:{fontSize:25,fontWeight:'800',color:colors.primary},statLabel:{fontSize:11,lineHeight:15,color:colors.muted,marginTop:4},heading:{fontSize:18,fontWeight:'800',color:colors.ink,marginTop:spacing.xl,marginBottom:10},card:{backgroundColor:colors.surface,padding:spacing.md,borderRadius:radius.lg},emptyCopy:{fontSize:14,lineHeight:21,color:colors.muted},practiceNotice:{fontSize:13,lineHeight:19,color:colors.muted},soundsTitle:{fontSize:15,fontWeight:'800',color:colors.ink,marginTop:14},soundHint:{fontSize:13,lineHeight:19,color:colors.muted,marginTop:4},soundList:{gap:8,marginTop:12},soundChip:{minHeight:46,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8},soundWord:{fontSize:15,fontWeight:'700',color:colors.ink},soundSymbol:{marginLeft:'auto',fontSize:13,color:colors.primary}});
