import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui";
import { exampleFor, meaningFor, progressCopy, progressDataCopy } from "@/content/progress-copy";
import { progressTitleFor } from "@/content/progress-language-copy";
import { useAppStore } from "@/store/app-store";
import { colors, radius, spacing } from "@/theme/tokens";

type Sound={ipa:string;word:string};
const englishSounds:Sound[]=[{ipa:"/ðɪs/",word:"this"},{ipa:"/ʃɪp/",word:"ship"},{ipa:"/ˈveri/",word:"very"}];
const latinSpanishSounds:Sound[]=[{ipa:"/ˈpeɾo/",word:"pero"},{ipa:"/ˈpero/",word:"perro"},{ipa:"/ˈniɲo/",word:"niño"}];
const spainSpanishSounds:Sound[]=[{ipa:"/ˈθiŋko/",word:"cinco"},{ipa:"/ˈpero/",word:"perro"},{ipa:"/ˈxente/",word:"gente"}];

export default function Progress(){
  const {t}=useTranslation();
  const locale=useAppStore((state)=>state.locale);
  const learningLanguage=useAppStore((state)=>state.learningLanguage);
  const pronunciationTarget=useAppStore((state)=>state.pronunciationTarget);
  const conversations=useAppStore((state)=>state.conversations);
  const characters=useAppStore((state)=>state.characters);
  const messageGroups=useAppStore((state)=>state.messages);
  const archivedLearning=useAppStore(state=>state.archivedLearning);
  const archived=Object.values(archivedLearning).filter(record=>record.language===learningLanguage);
  const copy=progressCopy[locale];
  const dataCopy=progressDataCopy[locale];
  const languageConversationIds=new Set(conversations.filter((conversation)=>(characters.find((character)=>character.id===conversation.characterId)?.learningLanguage??"en")===learningLanguage).map((conversation)=>conversation.id));
  const languageConversations=conversations.filter((conversation)=>languageConversationIds.has(conversation.id));
  const allMessages=Object.entries(messageGroups).filter(([conversationId])=>languageConversationIds.has(conversationId)).flatMap(([,items])=>items);
  const learnerMessages=allMessages.filter((message)=>message.sender==="user");
  const voiceMessages=learnerMessages.filter((message)=>message.kind==="voice");
  const soundExamples=learningLanguage==="es"?(pronunciationTarget==="castilian-spanish"?spainSpanishSounds:latinSpanishSounds):englishSounds;
  const play=async(word:string)=>{
    try {
      const Speech=await import("expo-speech");
      await Speech.stop();
      const speechLanguage=learningLanguage==="es"?(pronunciationTarget==="castilian-spanish"?"es-ES":"es-MX"):(pronunciationTarget==="modern-british"?"en-GB":"en-US");
      Speech.speak(word,{language:speechLanguage,rate:.72});
    } catch {
      Alert.alert("Ferson","Pronunciation audio will be available after the development app is rebuilt.");
    }
  };
  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>{progressTitleFor(locale,learningLanguage,t("progress.title"))}</Text><Text style={styles.sub}>{t("progress.subtitle")}</Text>
    <View style={styles.stats}><Stat value={String(languageConversations.length)} label={t("progress.conversations")}/><Stat value={String(learnerMessages.length + archived.reduce((total,r)=>total+r.learnerMessages,0))} label={t("progress.messages")}/><Stat value={String(voiceMessages.length + archived.reduce((total,r)=>total+r.voiceMessages,0))} label={dataCopy.voiceMessages}/></View>
    <Text style={styles.heading}>{t("progress.recurring")}</Text><View style={styles.card}><Text style={styles.emptyCopy}>{dataCopy.awaitingFocus}</Text></View>
    <Text style={styles.heading}>{t("progress.pronunciation")}</Text><View style={styles.card}>
      <Text style={styles.practiceNotice}>{dataCopy.pronunciationPractice}</Text><Text style={styles.soundsTitle}>{copy.usefulSounds}</Text><Text style={styles.soundHint}>{copy.soundHint}</Text>
      <View style={styles.soundList}>{soundExamples.map((item)=><View key={item.word} style={styles.soundChip}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${copy.hear} ${item.word}`} onPress={()=>void play(item.word)} style={styles.soundHalf}><Ionicons name="volume-medium" size={18} color={colors.primary}/><View><Text style={styles.soundWord}>{item.word}</Text><Text style={styles.soundIpa}>{item.ipa}</Text></View></Pressable>
        <View style={styles.soundDivider}/>
        <View accessibilityLabel={`${copy.meaning} ${item.word}`} style={[styles.soundHalf,styles.meaningHalf]}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.75} style={styles.soundMeaning}>{meaningFor(locale,item.word)}</Text><Text numberOfLines={2} style={styles.soundExample}>{exampleFor(item.word)}</Text></View>
      </View>)}</View>
    </View>
  </ScrollView></Screen>;
}
function Stat({value,label}:{value:string;label:string}){return <View style={styles.stat}><Text style={styles.value}>{value}</Text><Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={.72} android_hyphenationFrequency="none" textBreakStrategy="simple" style={styles.statLabel}>{label}</Text></View>}
const styles=StyleSheet.create({content:{padding:spacing.lg,paddingTop:60,paddingBottom:100},title:{fontSize:30,fontWeight:"800",color:colors.ink},sub:{fontSize:16,color:colors.muted,marginTop:5},stats:{flexDirection:"row",gap:8,marginTop:spacing.xl},stat:{flex:1,backgroundColor:colors.surface,padding:14,borderRadius:radius.md},value:{fontSize:25,fontWeight:"800",color:colors.primary},statLabel:{fontSize:11,lineHeight:15,color:colors.muted,marginTop:4},heading:{fontSize:18,fontWeight:"800",color:colors.ink,marginTop:spacing.xl,marginBottom:10},card:{backgroundColor:colors.surface,padding:spacing.md,borderRadius:radius.lg},emptyCopy:{fontSize:14,lineHeight:21,color:colors.muted},practiceNotice:{fontSize:13,lineHeight:19,color:colors.muted},soundsTitle:{fontSize:15,fontWeight:"800",color:colors.ink,marginTop:14},soundHint:{fontSize:13,lineHeight:19,color:colors.muted,marginTop:4},soundList:{gap:8,marginTop:12},soundChip:{minHeight:76,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,flexDirection:"row",alignItems:"stretch",overflow:"hidden"},soundHalf:{flex:1,minHeight:76,paddingHorizontal:10,flexDirection:"row",alignItems:"center",gap:8},meaningHalf:{justifyContent:"center",alignItems:"flex-start",flexDirection:"column",gap:3},soundDivider:{width:1,backgroundColor:colors.border,marginVertical:8},soundWord:{fontSize:15,fontWeight:"700",color:colors.ink},soundIpa:{fontSize:14,fontWeight:"800",color:colors.primary,marginTop:2},soundMeaning:{fontSize:13,fontWeight:"800",lineHeight:17,color:colors.ink},soundExample:{fontSize:11,lineHeight:15,color:colors.muted}});
