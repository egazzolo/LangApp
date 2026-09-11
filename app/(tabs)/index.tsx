import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Avatar, Screen } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, radius, spacing } from "@/theme/tokens";
import { addFersonCopy } from "@/content/add-ferson-copy";
export default function Inbox() {
  const { t } = useTranslation();
  const locale = useAppStore((s) => s.locale);
  const addLabel = addFersonCopy[locale];
  const conversations = useAppStore((s) => s.conversations);
  const characters = useAppStore((s) => s.characters);
  const deleteConversation = useAppStore((s) => s.deleteConversation);
  const purgeExpired = useAppStore((s) => s.purgeExpiredConversations);
  const hideWarning = useAppStore((s) => s.hideDeleteChatWarning);
  const setHideWarning = useAppStore((s) => s.setHideDeleteChatWarning);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  useEffect(() => {
    purgeExpired();
  }, [purgeExpired]);
  const requestDelete = (id: string) => {
    if (hideWarning) {
      deleteConversation(id);
      return;
    }
    setDontShowAgain(false);
    setPendingDelete(id);
  };
  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (dontShowAgain) setHideWarning(true);
    deleteConversation(pendingDelete);
    setPendingDelete(null);
  };
  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t("inbox.title")}</Text>
        </View>
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
        {conversations.length === 0 ? (
          <Text style={styles.empty}>{t("inbox.empty")}</Text>
        ) : (
          conversations.map((c) => {
            const person = characters.find((x) => x.id === c.characterId);
            if (!person) return null;
            return (
              <View key={c.id} style={styles.item}>
                <Pressable
                  onPress={() => router.push(("/chat/" + c.id) as never)}
                  style={styles.openChat}
                >
                  <View>
                    <Avatar
                      name={person.name}
                      avatarUrl={person.avatarUrl}
                      size={58}
                    />
                    <View style={styles.online} />
                  </View>
                  <View style={styles.copy}>
                    <View style={styles.line}>
                      <Text style={styles.name}>{person.name}</Text>
                      <Text style={styles.time}>{c.lastMessage ? new Date(c.updatedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : ""}</Text>
                    </View>
                    <View style={styles.line}>
                      <Text numberOfLines={1} style={styles.preview}>
                        {c.lastMessage || t("inbox.startConversation")}
                      </Text>
                      {c.unreadCount > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{c.unreadCount}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.ai}>{t("inbox.aiLabel")}</Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityLabel={t("deleteChat.delete")}
                  onPress={() => requestDelete(c.id)}
                  hitSlop={8}
                  style={styles.delete}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={colors.danger}
                  />
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
      <Modal
        visible={Boolean(pendingDelete)}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDelete(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{t("deleteChat.title")}</Text>
            <Text style={styles.dialogBody}>{t("deleteChat.body")}</Text>
            <Pressable
              onPress={() => setDontShowAgain((value) => !value)}
              style={styles.checkboxRow}
            >
              <Ionicons
                name={dontShowAgain ? "checkbox" : "square-outline"}
                size={24}
                color={dontShowAgain ? colors.primary : colors.muted}
              />
              <Text style={styles.checkboxLabel}>
                {t("deleteChat.dontShowAgain")}
              </Text>
            </Pressable>
            <View style={styles.actions}>
              <Pressable
                onPress={() => setPendingDelete(null)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable onPress={confirmDelete} style={styles.deleteButton}>
                <Text style={styles.deleteText}>{t("deleteChat.delete")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 58,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: { fontSize: 13, color: colors.muted },
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
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  item: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: 10,
    alignItems: "center",
  },
  openChat: {
    flex: 1,
    flexDirection: "row",
    padding: spacing.md,
    alignItems: "center",
  },
  delete: {
    width: 48,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderColor: colors.border,
  },
  online: {
    position: "absolute",
    right: 0,
    bottom: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#45A874",
    borderWidth: 2,
    borderColor: "#fff",
  },
  copy: { flex: 1, marginLeft: 14, gap: 4 },
  line: { flexDirection: "row", alignItems: "center" },
  name: { flex: 1, fontSize: 17, fontWeight: "700", color: colors.ink },
  time: { fontSize: 12, color: colors.muted },
  preview: { flex: 1, fontSize: 15, color: colors.muted },
  badge: {
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  ai: { fontSize: 11, color: colors.muted },
  empty: { textAlign: "center", color: colors.muted, marginTop: 80 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  dialogTitle: { fontSize: 21, fontWeight: "800", color: colors.ink },
  dialogBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    marginTop: 10,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 18,
  },
  checkboxLabel: { fontSize: 15, color: colors.ink, flex: 1 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  cancelButton: { paddingHorizontal: 18, paddingVertical: 12 },
  cancelText: { fontWeight: "700", color: colors.muted },
  deleteButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
  },
  deleteText: { fontWeight: "800", color: "#fff" },
});
