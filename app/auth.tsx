import { useState } from "react";
import {
  ActivityIndicator,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  continueWithSocial,
  registerWithEmail,
  resendSignupCode,
  signInWithEmail,
  verifyEmailCode,
  type SocialProvider,
} from "@/services/auth";
import { interfaceLanguages } from "@/config/interface-languages";
import { authCopy } from "@/content/auth-copy";
import type { InterfaceLocale } from "@/domain/models";
import { useAppStore } from "@/store/app-store";
import { colors, radius, spacing } from "@/theme/tokens";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);
  const hasSelectedInterfaceLanguage = useAppStore(
    (state) => state.hasSelectedInterfaceLanguage,
  );
  const confirmInterfaceLanguage = useAppStore(
    (state) => state.confirmInterfaceLanguage,
  );
  const [languageConfirmedThisVisit, setLanguageConfirmedThisVisit] = useState(false);
  const [mode, setMode] = useState<"register" | "signin">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submitEmail = async () => {
    if (!email.trim() || password.length < 8 || busy) return;
    setBusy("email");
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        await signInWithEmail(email.trim(), password);
        router.replace(useAppStore.getState().onboarded ? "/(tabs)" : "/onboarding");
      } else {
        const normalizedEmail = email.trim();
        const result = await registerWithEmail(normalizedEmail, password);
        if (result.needsEmailConfirmation) setPendingEmail(normalizedEmail);
        else router.replace(useAppStore.getState().onboarded ? "/(tabs)" : "/onboarding");
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not continue. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  };
  const submitVerification = async () => {
    if (!pendingEmail || !verificationCode.trim() || busy) return;
    setBusy("verify");
    setError(null);
    try {
      await verifyEmailCode(pendingEmail, verificationCode);
      router.replace(useAppStore.getState().onboarded ? "/(tabs)" : "/onboarding");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not verify this code. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  };
  const resendVerification = async () => {
    if (!pendingEmail || busy) return;
    setBusy("resend");
    setError(null);
    setNotice(null);
    try {
      await resendSignupCode(pendingEmail);
      setNotice(authCopy[locale].resent);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not resend the code. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  };
  const social = async (provider: SocialProvider) => {
    if (busy) return;
    setBusy(provider);
    setError(null);
    setNotice(null);
    try {
      if (await continueWithSocial(provider)) router.replace(useAppStore.getState().onboarded ? "/(tabs)" : "/onboarding");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Social sign-in could not be completed.",
      );
    } finally {
      setBusy(null);
    }
  };
  const chooseLocale = async (value: InterfaceLocale) => {
    setLocale(value);
    await i18n.changeLanguage(value);
    I18nManager.allowRTL(value === "ar");
  };
  const copy = authCopy[locale];
  if (!hasSelectedInterfaceLanguage || !languageConfirmedThisVisit)
    return (
      <View style={styles.languageScreen}>
        <View style={styles.languageHeader}>
          <View style={styles.mark}>
            <Text style={styles.markText}>F</Text>
          </View>
          <Text style={styles.languageTitle}>
            {t("onboarding.languageTitle")}
          </Text>
          <Text style={styles.languageBody}>
            {t("onboarding.languageBody")}
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.languageList}>
          {interfaceLanguages.map((item) => (
            <Pressable
              key={item.code}
              onPress={() => void chooseLocale(item.code)}
              style={[
                styles.languageOption,
                locale === item.code && styles.languageSelected,
              ]}
            >
              <Text style={styles.languageOptionText}>{item.label}</Text>
              {locale === item.code ? (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.primary}
                />
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
        <View style={[styles.languageFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable onPress={() => { confirmInterfaceLanguage(); setLanguageConfirmedThisVisit(true); }} style={styles.primary}>
            <Text style={styles.primaryText}>{t("common.next")}</Text>
          </Pressable>
        </View>
      </View>
    );
  if (pendingEmail)
    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={24}
      >
        <ScrollView
          contentContainerStyle={styles.authScroll}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        ><View style={styles.card}>
          <View style={styles.mark}>
            <Text style={styles.markText}>F</Text>
          </View>
          <Text style={styles.title}>{copy.verifyTitle}</Text>
          <Text style={styles.subtitle}>
            {copy.verifyIntro} {pendingEmail}.
          </Text>
          <TextInput
            value={verificationCode}
            onChangeText={setVerificationCode}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            placeholder={copy.code}
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            onPress={() => void submitVerification()}
            disabled={Boolean(busy) || !verificationCode.trim()}
            style={[
              styles.primary,
              (Boolean(busy) || !verificationCode.trim()) && styles.disabled,
            ]}
          >
            {busy === "verify" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>{copy.verify}</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => void resendVerification()}
            disabled={Boolean(busy)}
            style={styles.switch}
          >
            <Text style={styles.switchText}>
              {busy === "resend" ? copy.sending : copy.resend}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setPendingEmail(null);
              setVerificationCode("");
              setError(null);
            }}
            style={styles.switch}
          >
            <Text style={styles.switchText}>{copy.different}</Text>
          </Pressable>
        </View></ScrollView>
      </KeyboardAvoidingView>
    );
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={24}
    >
      <ScrollView
        contentContainerStyle={styles.authScroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      ><View style={styles.card}>
        <View style={styles.mark}>
          <Text style={styles.markText}>F</Text>
        </View>
        <Text style={styles.title}>
          {mode === "register" ? copy.createTitle : copy.signInTitle}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "register" ? copy.createSubtitle : copy.signInSubtitle}
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="Email"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={
            mode === "register" ? "new-password" : "current-password"
          }
          placeholder={copy.password}
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          onPress={() => void submitEmail()}
          disabled={Boolean(busy) || !email.trim() || password.length < 8}
          style={[
            styles.primary,
            (Boolean(busy) || !email.trim() || password.length < 8) &&
              styles.disabled,
          ]}
        >
          {busy === "email" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              {mode === "register" ? copy.create : copy.signIn}
            </Text>
          )}
        </Pressable>
        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.or}>{copy.or}</Text>
          <View style={styles.line} />
        </View>
        <SocialButton
          label={copy.google}
          icon="logo-google"
          loading={busy === "google"}
          disabled={Boolean(busy)}
          onPress={() => void social("google")}
        />
        <SocialButton
          label={copy.apple}
          icon="logo-apple"
          loading={busy === "apple"}
          disabled={Boolean(busy)}
          onPress={() => void social("apple")}
        />
        <Pressable
          onPress={() => {
            setMode(mode === "register" ? "signin" : "register");
            setError(null);
            setNotice(null);
          }}
          style={styles.switch}
        >
          <Text style={styles.switchText}>
            {mode === "register" ? copy.existing : copy.newHere}
          </Text>
        </Pressable>
      </View></ScrollView>
    </KeyboardAvoidingView>
  );
}
function SocialButton({
  label,
  icon,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  icon: "logo-google" | "logo-apple";
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.social, disabled && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <>
          <Ionicons name={icon} size={20} color={colors.ink} />
          <Text style={styles.socialText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  authScroll: { flexGrow: 1, justifyContent: "center", padding: spacing.lg, paddingBottom: 96 },
  card: { width: "100%", gap: 14 },
  languageScreen: { flex: 1, backgroundColor: colors.canvas, paddingTop: 64 },
  languageHeader: { paddingHorizontal: spacing.lg },
  languageList: { paddingHorizontal: spacing.lg, paddingBottom: 16 },
  languageFooter: { padding: spacing.lg, paddingTop: 10 },
  languageTitle: { fontSize: 22, fontWeight: "800", color: colors.ink },
  languageBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    marginTop: 5,
    marginBottom: 14,
  },
  languageOption: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.md,
    marginBottom: 5,
  },
  languageSelected: { backgroundColor: colors.primarySoft },
  languageOptionText: { fontSize: 16, color: colors.ink },
  mark: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  markText: { color: "#fff", fontSize: 27, fontWeight: "800" },
  title: { fontSize: 32, lineHeight: 38, fontWeight: "800", color: colors.ink },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.muted,
    marginBottom: 10,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.ink,
  },
  primary: {
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  line: { height: 1, backgroundColor: colors.border, flex: 1 },
  or: { color: colors.muted, fontSize: 13 },
  social: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  socialText: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  switch: { alignItems: "center", padding: 10 },
  switchText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  notice: { color: colors.primary, lineHeight: 20 },
  error: { color: colors.danger, lineHeight: 20 },
});
