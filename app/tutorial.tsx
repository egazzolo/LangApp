import {Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {router} from "expo-router";
import {Screen} from "@/components/ui";
import {tutorialCopy} from "@/content/tutorial-copy";
import {useAppStore} from "@/store/app-store";
import {colors,radius,spacing} from "@/theme/tokens";
export default function Tutorial(){const locale=useAppStore(s=>s.locale);const copy=tutorialCopy[locale];return <Screen><View style={styles.header}><Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" size={24} color={colors.ink}/></Pressable><Text style={styles.title}>{copy.title}</Text></View><ScrollView contentContainerStyle={styles.content}><Card title={copy.correctionsTitle} body={copy.correctionsBody}/></ScrollView></Screen>}
function Card({title,body}:{title:string;body:string}){return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.body}>{body}</Text></View>}
const styles=StyleSheet.create({header:{paddingTop:54,paddingHorizontal:spacing.md,paddingBottom:12,flexDirection:"row",alignItems:"center",gap:10},back:{width:42,height:42,alignItems:"center",justifyContent:"center"},title:{fontSize:24,fontWeight:"800",color:colors.ink,flex:1},content:{padding:spacing.lg,gap:14,paddingBottom:80},card:{backgroundColor:colors.surface,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border,padding:spacing.lg},cardTitle:{fontSize:18,fontWeight:"800",color:colors.ink,marginBottom:8},body:{fontSize:15,lineHeight:23,color:colors.muted}});
