import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Avatar, Screen } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, radius, spacing } from "@/theme/tokens";
import { addFersonCopy } from "@/content/add-ferson-copy";
export default function People() {
  const { t } = useTranslation();
  const people = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const locale = useAppStore((s) => s.locale);
  const addLabel = addFersonCopy[locale];
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{t("people.title")}</Text>
        <Pressable
          accessibilityLabel={addLabel}
          onPress={() => router.push("/create-character")}
          style={styles.add}
        >
          <Ionicons name="person-add-outline" size={19} color={colors.primary} />
          <Text style={styles.addText}>{addLabel}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {people.map((p) => (
          <Pressable key={p.id} accessibilityRole="button" onPress={()=>{let conversation=conversations.find((item)=>item.characterId===p.id);if(!conversation){conversation={id:Date.now()+'-'+Math.random().toString(36).slice(2),characterId:p.id,lastMessage:'',updatedAt:new Date().toISOString(),unreadCount:0};useAppStore.setState(state=>({conversations:[conversation!,...state.conversations],messages:{...state.messages,[conversation!.id]:[]}}));}router.push(`/chat/${conversation.id}` as never)}} style={styles.card}>
            <Avatar name={p.name} avatarUrl={p.avatarUrl} size={64} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.meta}>
                {p.occupation} · {p.location}
              </Text>
              <Text style={styles.bio} numberOfLines={2}>
                {p.bio}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  header: {
    padding: spacing.lg,
    paddingTop: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 30, fontWeight: "800", color: colors.ink },
  add: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  addText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  list: { padding: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    gap: 14,
  },
  name: { fontSize: 19, fontWeight: "800", color: colors.ink },
  meta: { fontSize: 13, color: colors.primary, marginTop: 3 },
  bio: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 7 },
});
