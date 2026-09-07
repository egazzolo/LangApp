import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { mockLearningProvider } from "@/services/ai/mock";
import {
  getMessageAnnotations,
  getReplyAssistance,
  getTutorReview,
  liveConversationProvider,
} from "@/services/ai/live";
import { transcribeVoiceMessage } from "@/services/ai/transcription";
import { colors, radius, spacing } from "@/theme/tokens";
import type { Message } from "@/domain/models";

type TutorCorrection = {
  original: string;
  mistake: string;
  explanation: string;
  corrected: string;
  alternatives: string[];
};
import { track } from "@/services/analytics";
import { getResponseTiming } from "@/config/conversation";
import {
  buildSuggestionSegments,
  type AssistancePhrase,
} from "@/domain/assistance";
import { canUse, type Plan } from "@/config/entitlements";
import { getCurrentPlan } from "@/services/subscriptions";
import { learningFacts } from "@/content/learning-facts";
import { voiceSendingCopy } from "@/content/chat-status-copy";
import { chatExperienceCopy } from "@/content/chat-experience-copy";
import { createVoiceReplySignedUrl, markReplyDelivered } from "@/services/ai/reply-deliveries";

const makeId = () =>
  String(Date.now()) + "-" + Math.random().toString(36).slice(2);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const formatDuration = (seconds: number) =>
  Math.max(0, Math.round(seconds))
    .toString()
    .padStart(2, "0")
    .replace(/^(d+)$/, "0:$1");

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);
  const conversations = useAppStore((state) => state.conversations);
  const characters = useAppStore((state) => state.characters);
  const all = useAppStore((state) => state.messages);
  const add = useAppStore((state) => state.addMessage);
  const setMessageAnnotations = useAppStore(
    (state) => state.setMessageAnnotations,
  );
  const markRead = useAppStore((state) => state.markRead);
  const markTutorReviewed = useAppStore((state) => state.markTutorReviewed);
  const correctTutorPunctuation = useAppStore(
    (state) => state.correctTutorPunctuation,
  );
  const setCorrectTutorPunctuation = useAppStore(
    (state) => state.setCorrectTutorPunctuation,
  );
  const acceptCasualTexting = useAppStore((state) => state.acceptCasualTexting);
  const correctionIntensity = useAppStore((state) => state.correctionIntensity);
  const setAcceptCasualTexting = useAppStore(
    (state) => state.setAcceptCasualTexting,
  );
  const showLanguageHighlights = useAppStore(
    (state) => state.showLanguageHighlights,
  );
  const setShowLanguageHighlights = useAppStore(
    (state) => state.setShowLanguageHighlights,
  );
  const tutorReviews = useAppStore((state) => state.tutorReviews);
  const addTutorReview = useAppStore((state) => state.addTutorReview);
  const locale = useAppStore((state) => state.locale);
  const voiceEnabled = useAppStore((state) => state.voiceEnabled);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 100);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewingTutorHistory, setViewingTutorHistory] = useState(false);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorCorrections, setTutorCorrections] = useState<TutorCorrection[]>(
    [],
  );
  const [assistance, setAssistance] = useState<{
    suggestion: string;
    reason: string;
    fullTranslation: string;
    phrases: AssistancePhrase[];
  } | null>(null);
  const [assistanceLoading, setAssistanceLoading] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState<AssistancePhrase | null>(
    null,
  );
  const [showFullTranslation, setShowFullTranslation] = useState(false);
  const [plan, setPlan] = useState<Plan>("free");
  const [learningFactIndex, setLearningFactIndex] = useState(0);
  const casualTextingAvailable = canUse(plan, "casualTextingMode");
  const tutorLearningFacts = learningFacts[locale];
  const experienceCopy = chatExperienceCopy[locale];
  const conversation = conversations.find((item) => item.id === id);
  const person = characters.find(
    (item) => item.id === conversation?.characterId,
  );
  const messages = useMemo(() => all[id] ?? [], [all, id]);
  const previousTutorReviews = tutorReviews[id] ?? [];
  const hasNewTutorMessages = useMemo(() => {
    const reviewedIndex = conversation?.tutorReviewedThroughMessageId
      ? messages.findIndex(
          (message) =>
            message.id === conversation.tutorReviewedThroughMessageId,
        )
      : -1;
    return messages
      .slice(reviewedIndex + 1)
      .some((message) => message.sender === "user");
  }, [conversation?.tutorReviewedThroughMessageId, messages]);
  const scrollToLatest = (animated = true) =>
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  useEffect(() => {
    if (id) markRead(id);
  }, [id, markRead]);
  useEffect(() => {
    void getCurrentPlan().then(setPlan);
  }, []);
  useEffect(() => {
    if (!tutorLoading) {
      setLearningFactIndex(0);
      return;
    }
    const interval = setInterval(
      () => setLearningFactIndex((current) => (current + 1) % tutorLearningFacts.facts.length),
      8000,
    );
    return () => clearInterval(interval);
  }, [tutorLearningFacts.facts.length, tutorLoading]);
  useEffect(() => {
    scrollToLatest(true);
  }, [messages.length, typing, processingVoice]);
  useEffect(() => {
    const event =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const subscription = Keyboard.addListener(event, () =>
      setTimeout(() => scrollToLatest(true), 80),
    );
    return () => subscription.remove();
  }, []);

  const getReply = async (mine: Message, history: Message[]) => {
    if (!person) return;
    const timing = getResponseTiming(person, [...history, mine]);
    try {
      const responsePromise = liveConversationProvider.reply(
        person,
        [...history, mine],
        locale,
        showLanguageHighlights,
      );
      await wait(timing.beforeTypingMs);
      setTyping(true);
      const [response] = await Promise.all([
        responsePromise,
        wait(timing.typingMs),
      ]);
      add(id, {
        id: response.deliveryId ? `reply-${response.deliveryId}` : makeId(),
        conversationId: id,
        sender: "character",
        kind: response.kind,
        text: response.text,
        annotations: response.annotations,
        audioUrl: response.audioUrl,
        audioPath: response.audioPath,
        durationSeconds: response.durationSeconds,
        createdAt: new Date().toISOString(),
        status: "sent",
      });
      if (response.deliveryId) void markReplyDelivered(response.deliveryId);
    } catch (error) {
      console.error("Live AI reply failed", error);
      setSendError(
        error instanceof Error &&
          /Anonymous sign-ins are disabled/i.test(error.message)
          ? experienceCopy.connectionError
          : experienceCopy.messageError,
      );
    } finally {
      setTyping(false);
    }
  };
  const send = async () => {
    const value = text.trim();
    if (!value || !person) return;
    setText("");
    setSendError(null);
    const mine: Message = {
      id: makeId(),
      conversationId: id,
      sender: "user",
      kind: "text",
      text: value,
      createdAt: new Date().toISOString(),
      status: "sent",
    };
    add(id, mine);
    void track("message_sent", { kind: "text", has_correction: false });
    await getReply(mine, messages);
  };

  const startRecording = async () => {
    setSendError(null);
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("chat.microphoneTitle"), t("chat.microphoneBody"));
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };
  const stopAndSendRecording = async () => {
    const durationSeconds = recorderState.durationMillis / 1000;
    await recorder.stop();
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });
    const uri = recorder.uri;
    if (!uri || durationSeconds < 0.4) return;
    setProcessingVoice(true);
    setSendError(null);
    try {
      const transcript = await transcribeVoiceMessage(uri, locale);
      const mine: Message = {
        id: makeId(),
        conversationId: id,
        sender: "user",
        kind: "voice",
        text: transcript,
        audioUrl: uri,
        durationSeconds,
        createdAt: new Date().toISOString(),
        status: "sent",
      };
      add(id, mine);
      void track("message_sent", { kind: "voice", has_correction: false });
      setProcessingVoice(false);
      await getReply(mine, messages);
    } catch (error) {
      console.error("Voice message failed", error);
      setSendError(
        error instanceof Error &&
          /Anonymous sign-ins are disabled/i.test(error.message)
          ? experienceCopy.connectionError
          : experienceCopy.messageError,
      );
      setProcessingVoice(false);
    }
  };
  const toggleRecording = () => {
    if (processingVoice || typing) return;
    if (recorderState.isRecording) void stopAndSendRecording();
    else void startRecording();
  };
  const loadMessageAnnotations = async (message: Message) => {
    if (
      !showLanguageHighlights ||
      message.sender !== "character" ||
      message.annotations?.length
    )
      return;
    try {
      const result = await getMessageAnnotations(message.text, locale);
      setMessageAnnotations(id, message.id, result.annotations);
    } catch (error) {
      console.error("Message explanation failed", error);
      setSendError(t("chat.meaningError"));
    }
  };
  const requestAssistance = async () => {
    if (!person || assistanceLoading) return;
    setAssistanceLoading(true);
    setSendError(null);
    setSelectedPhrase(null);
    setShowFullTranslation(false);
    try {
      setAssistance(await getReplyAssistance(person, messages, locale));
    } catch (error) {
      console.error("Reply assistance failed", error);
      setSendError(
        error instanceof Error &&
          /Anonymous sign-ins are disabled/i.test(error.message)
          ? experienceCopy.connectionError
          : experienceCopy.suggestionError,
      );
    } finally {
      setAssistanceLoading(false);
    }
  };
  const requestTutorReview = async () => {
    if (tutorLoading || !conversation) return;
    setMenuOpen(false);
    const reviewedIndex = conversation.tutorReviewedThroughMessageId
      ? messages.findIndex(
          (message) =>
            message.id === conversation.tutorReviewedThroughMessageId,
        )
      : -1;
    const unreviewed = messages
      .slice(reviewedIndex + 1)
      .filter((message) => message.sender === "user");
    if (!unreviewed.length) {
      Alert.alert(t("chat.tutorTitle"), t("chat.tutorNothingNew"));
      return;
    }
    const checkpoint = unreviewed.at(-1)!;
    const useCasualTexting = casualTextingAvailable && acceptCasualTexting;
    setViewingTutorHistory(false);
    setTutorLoading(true);
    setTutorOpen(true);
    setTutorCorrections([]);
    try {
      const result = await getTutorReview(
        unreviewed,
        locale,
        correctTutorPunctuation,
        useCasualTexting,
        correctionIntensity,
      );
      setTutorCorrections(result.corrections);
      addTutorReview({
        id: makeId(),
        conversationId: id,
        throughMessageId: checkpoint.id,
        createdAt: new Date().toISOString(),
        correctPunctuation: correctTutorPunctuation,
        acceptCasualTexting: useCasualTexting,
        correctionIntensity,
        corrections: result.corrections,
      });
      markTutorReviewed(id, checkpoint.id);
    } catch (error) {
      console.error("Tutor review failed", error);
      setTutorOpen(false);
      setSendError(t("chat.tutorError"));
    } finally {
      setTutorLoading(false);
    }
  };

  if (!person) return <View />;
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t("common.back")}
          onPress={() => router.replace("/(tabs)")}
          style={styles.icon}
        >
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Avatar name={person.name} avatarUrl={person.avatarUrl} size={42} />
        <View style={styles.headerCopy}>
          <Text style={styles.name}>{person.name}</Text>
          <Text style={styles.ai}>{t("chat.disclosure")}</Text>
        </View>
        <Pressable
          accessibilityLabel={t("chat.moreOptions")}
          onPress={() => setMenuOpen(true)}
          style={styles.icon}
        >
          <Ionicons name="ellipsis-horizontal" size={23} color={colors.ink} />
        </Pressable>
      </View>
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.menuBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMenuOpen(false)}
          />
          <View
            style={[styles.moreMenu, { top: Math.max(insets.top, 12) + 48 }]}
          >
            <Pressable
              accessibilityState={{ disabled: !hasNewTutorMessages }}
              disabled={!hasNewTutorMessages}
              onPress={() => void requestTutorReview()}
              style={[
                styles.menuItem,
                !hasNewTutorMessages && styles.menuItemDisabled,
              ]}
            >
              <View
                style={[
                  styles.tutorCircle,
                  !hasNewTutorMessages && styles.tutorCircleDisabled,
                ]}
              >
                <Ionicons name="school-outline" size={22} color="#fff" />
              </View>
              <View style={styles.menuCopy}>
                <Text
                  style={[
                    styles.menuTitle,
                    !hasNewTutorMessages && styles.menuTextDisabled,
                  ]}
                >
                  {t("chat.tutorTitle")}
                </Text>
                <Text style={styles.menuDescription}>
                  {t(
                    hasNewTutorMessages
                      ? "chat.tutorDescription"
                      : "chat.tutorUpToDate",
                  )}
                </Text>
              </View>
            </Pressable>
            <Pressable
              disabled={!previousTutorReviews.length}
              onPress={() => {
                setMenuOpen(false);
                setViewingTutorHistory(true);
                setTutorOpen(true);
              }}
              style={[
                styles.menuItem,
                !previousTutorReviews.length && styles.menuItemDisabled,
              ]}
            >
              <View
                style={[
                  styles.historyCircle,
                  !previousTutorReviews.length && styles.tutorCircleDisabled,
                ]}
              >
                <Ionicons name="time-outline" size={22} color="#fff" />
              </View>
              <View style={styles.menuCopy}>
                <Text
                  style={[
                    styles.menuTitle,
                    !previousTutorReviews.length && styles.menuTextDisabled,
                  ]}
                >
                  {t("chat.tutorHistory")}
                </Text>
                <Text style={styles.menuDescription}>
                  {t(
                    previousTutorReviews.length
                      ? "chat.tutorHistoryDescription"
                      : "chat.tutorNoHistory",
                  )}
                </Text>
              </View>
            </Pressable>
            <View style={styles.menuItem}>
              <View style={styles.highlightCircle}>
                <Ionicons name="language-outline" size={22} color="#fff" />
              </View>
              <View style={styles.menuCopy}>
                <Text style={styles.menuTitle}>
                  {t("chat.expressionHighlights")}
                </Text>
                <Text style={styles.menuDescription}>
                  {t(
                    showLanguageHighlights
                      ? "chat.expressionHighlightsOn"
                      : "chat.expressionHighlightsOff",
                  )}
                </Text>
              </View>
              <Switch
                accessibilityLabel={t("chat.expressionHighlights")}
                value={showLanguageHighlights}
                onValueChange={setShowLanguageHighlights}
                trackColor={{ false: "#B7B2AB", true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={tutorOpen}
        animationType="slide"
        onRequestClose={() => !tutorLoading && setTutorOpen(false)}
      >
        <View
          style={[styles.tutorScreen, { paddingTop: Math.max(insets.top, 16) }]}
        >
          <View style={styles.tutorHeader}>
            <View style={styles.tutorHeaderTitle}>
              <View style={styles.tutorCircle}>
                <Ionicons name="school-outline" size={22} color="#fff" />
              </View>
              <Text style={styles.tutorTitle}>
                {t(
                  viewingTutorHistory
                    ? "chat.tutorHistory"
                    : "chat.tutorCorrections",
                )}
              </Text>
            </View>
            {!tutorLoading ? (
              <Pressable
                accessibilityLabel={t("common.cancel")}
                onPress={() => setTutorOpen(false)}
                style={styles.icon}
              >
                <Ionicons name="close" size={25} color={colors.ink} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.punctuationSetting}>
            <Text
              style={[
                styles.punctuationChoice,
                !correctTutorPunctuation && styles.punctuationChoiceSelected,
              ]}
            >
              {t("chat.ignorePunctuation")}
            </Text>
            <Switch
              value={correctTutorPunctuation}
              onValueChange={setCorrectTutorPunctuation}
              trackColor={{ false: "#B7B2AB", true: colors.primary }}
              thumbColor="#fff"
            />
            <Text
              style={[
                styles.punctuationChoice,
                correctTutorPunctuation && styles.punctuationChoiceSelected,
              ]}
            >
              {t("chat.correctPunctuation")}
            </Text>
          </View>
          <View
            style={[
              styles.casualTextingSetting,
              !casualTextingAvailable && styles.casualTextingLocked,
            ]}
          >
            <View style={styles.casualTextingCopy}>
              <View style={styles.casualTextingTitleRow}>
                <Text
                  style={[
                    styles.casualTextingTitle,
                    !casualTextingAvailable && styles.lockedText,
                  ]}
                >
                  {t("chat.casualTexting")}
                </Text>
                {!casualTextingAvailable ? (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="lock-closed" size={11} color={colors.muted} />
                    <Text style={styles.premiumBadgeText}>
                      {t("chat.premiumFeature")}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.casualTextingDescription}>
                {t("chat.casualTextingDescription")}
              </Text>
            </View>
            <Switch
              accessibilityLabel={t("chat.casualTexting")}
              disabled={!casualTextingAvailable}
              value={casualTextingAvailable && acceptCasualTexting}
              onValueChange={setAcceptCasualTexting}
              trackColor={{ false: "#C8C4BE", true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          {tutorLoading ? (
            <View style={styles.tutorLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.tutorLoadingText}>
                {t("chat.tutorReviewing")}
              </Text>
              <View style={styles.learningFactCard}>
                <Text style={styles.learningFactTitle}>
                  {tutorLearningFacts.title}
                </Text>
                <Text style={styles.learningFactText}>
                  {tutorLearningFacts.facts[learningFactIndex]}
                </Text>
              </View>
            </View>
          ) : viewingTutorHistory ? (
            <ScrollView contentContainerStyle={styles.tutorList}>
              {previousTutorReviews.map((review) => (
                <View key={review.id}>
                  <Text style={styles.reviewDate}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Text>
                  {review.corrections.length ? (
                    review.corrections.map((correction, index) => (
                      <TutorCorrectionCard
                        key={index}
                        correction={correction}
                        index={index}
                        t={t}
                      />
                    ))
                  ) : (
                    <Text style={styles.reviewNoMistakes}>
                      {t("chat.tutorNoMistakes")}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.tutorList}>
              {tutorCorrections.length ? (
                tutorCorrections.map((correction, index) => (
                  <TutorCorrectionCard
                    key={index}
                    correction={correction}
                    index={index}
                    t={t}
                  />
                ))
              ) : (
                <View style={styles.tutorEmpty}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={42}
                    color={colors.primary}
                  />
                  <Text style={styles.tutorEmptyText}>
                    {t("chat.tutorNoMistakes")}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Bubble
            message={item}
            t={t}
            showLanguageHighlights={showLanguageHighlights}
            onLoadAnnotations={() => void loadMessageAnnotations(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyTitle}>{t("chat.emptyTitle")}</Text>
            <Text style={styles.emptyBody}>{t("chat.emptyBody")}</Text>
          </View>
        }
        ListFooterComponent={
          processingVoice ? (
            <View style={styles.processing}>
              <Text style={styles.processingText}>
                {voiceSendingCopy[locale]}
              </Text>
            </View>
          ) : typing ? (
            <TypingIndicator />
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        onContentSizeChange={() => scrollToLatest(false)}
        onLayout={() => scrollToLatest(false)}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      />
      {sendError ? <Text style={styles.sendError}>{sendError}</Text> : null}
      {assistance ? (
        <View style={styles.assistanceCard}>
          <View style={styles.assistanceHeader}>
            <View style={styles.assistanceTitleRow}>
              <Ionicons name="bulb" size={17} color={colors.primary} />
              <Text style={styles.assistanceTitle}>
                {t("chat.assistanceTitle")}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t("common.cancel")}
              onPress={() => {
                setAssistance(null);
                setSelectedPhrase(null);
                setShowFullTranslation(false);
              }}
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>
          <AnnotatedSuggestion
            suggestion={assistance.suggestion}
            phrases={assistance.phrases}
            selectedPhrase={selectedPhrase}
            onSelectPhrase={(phrase) =>
              setSelectedPhrase((current) =>
                current?.text === phrase.text ? null : phrase,
              )
            }
          />
          {assistance.phrases.length ? (
            <Text style={styles.expressionHint}>
              {t("chat.tapExpressions")}
            </Text>
          ) : null}
          {selectedPhrase ? (
            <View style={styles.meaningBox}>
              <View style={styles.meaningHeader}>
                <Text style={styles.meaningPhrase}>{selectedPhrase.text}</Text>
                <Pressable
                  accessibilityLabel={t("chat.hideExpressionMeaning")}
                  onPress={() => setSelectedPhrase(null)}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={18} color={colors.muted} />
                </Pressable>
              </View>
              <Text style={styles.meaningText}>{selectedPhrase.meaning}</Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowFullTranslation((value) => !value)}
            style={styles.translationToggle}
          >
            <Ionicons
              name="language-outline"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.translationToggleText}>
              {t(
                showFullTranslation
                  ? "chat.hideFullMeaning"
                  : "chat.showFullMeaning",
              )}
            </Text>
          </Pressable>
          {showFullTranslation ? (
            <View style={styles.fullTranslation}>
              <Text style={styles.translationLabel}>
                {t("chat.fullMeaning")}
              </Text>
              <Text style={styles.translationText}>
                {assistance.fullTranslation}
              </Text>
            </View>
          ) : null}
          <Text style={styles.assistanceReason}>{assistance.reason}</Text>
          <View style={styles.assistanceActions}>
            <Pressable
              onPress={() => void requestAssistance()}
              style={styles.anotherButton}
            >
              <Text style={styles.anotherText}>
                {t("chat.anotherSuggestion")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setText(assistance.suggestion);
                setAssistance(null);
                setSelectedPhrase(null);
                setShowFullTranslation(false);
              }}
              style={styles.useButton}
            >
              <Text style={styles.useText}>{t("chat.useSuggestion")}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <View
        style={[
          styles.composer,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        {!recorderState.isRecording && (
          <Pressable
            accessibilityLabel={t("chat.assistanceButton")}
            onPress={() => void requestAssistance()}
            style={styles.assistButton}
          >
            {assistanceLoading ? (
              <SpinningHourglass />
            ) : (
              <Ionicons name="bulb-outline" size={21} color={colors.primary} />
            )}
          </Pressable>
        )}
        {recorderState.isRecording ? (
          <View style={styles.recordingStatus}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>
              {t("chat.recording")}{" "}
              {formatDuration(recorderState.durationMillis / 1000)}
            </Text>
            <Text style={styles.recordingHint}>{t("chat.tapStop")}</Text>
          </View>
        ) : (
          <TextInput
            accessibilityLabel={t("chat.placeholder")}
            value={text}
            onChangeText={setText}
            onFocus={() => setTimeout(() => scrollToLatest(true), 80)}
            placeholder={t("chat.placeholder")}
            placeholderTextColor="#99948D"
            multiline
            style={styles.input}
          />
        )}
        {voiceEnabled ? <Pressable
            accessibilityLabel={
              recorderState.isRecording ? t("chat.stopAndSend") : t("chat.voice")
            }
            onPress={toggleRecording}
            style={[styles.mic, recorderState.isRecording && styles.micRecording]}
          >
            <Ionicons
              name={recorderState.isRecording ? "stop" : "mic"}
              size={21}
              color={recorderState.isRecording ? "#fff" : colors.primary}
            />
          </Pressable> : null}
        {!recorderState.isRecording && (
          <Pressable
            accessibilityLabel={t("chat.send")}
            onPress={() => void send()}
            style={[styles.send, !text.trim() && { opacity: 0.4 }]}
          >
            <Ionicons name="arrow-up" size={22} color="#fff" />
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function TutorCorrectionCard({
  correction,
  index,
  t,
}: {
  correction: TutorCorrection;
  index: number;
  t: (key: string) => string;
}) {
  const start = correction.original
    .toLocaleLowerCase()
    .indexOf(correction.mistake.toLocaleLowerCase());
  return (
    <View style={styles.tutorCard}>
      <Text style={styles.tutorNumber}>{index + 1}</Text>
      <Text style={styles.tutorOriginal}>
        {start >= 0 ? (
          <>
            <Text>{correction.original.slice(0, start)}</Text>
            <Text style={styles.tutorMistake}>
              {correction.original.slice(
                start,
                start + correction.mistake.length,
              )}
            </Text>
            <Text>
              {correction.original.slice(start + correction.mistake.length)}
            </Text>
          </>
        ) : (
          correction.original
        )}
      </Text>
      <Text style={styles.tutorExplanation}>{correction.explanation}</Text>
      <Text style={styles.tutorLabel}>{t("chat.tutorCorrect")}</Text>
      <Text style={styles.tutorCorrected}>{correction.corrected}</Text>
      <Text style={styles.tutorLabel}>{t("chat.tutorPossibleAnswers")}</Text>
      {correction.alternatives.map((option, optionIndex) => (
        <Text key={optionIndex} style={styles.tutorOption}>
          {optionIndex + 1}. {option}
        </Text>
      ))}
    </View>
  );
}
function SpinningHourglass() {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 850,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotation]);
  return (
    <Animated.View
      style={{
        transform: [
          {
            rotate: rotation.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "360deg"],
            }),
          },
        ],
      }}
    >
      <Ionicons name="hourglass-outline" size={21} color={colors.primary} />
    </Animated.View>
  );
}
function AnnotatedSuggestion({
  suggestion,
  phrases,
  selectedPhrase,
  onSelectPhrase,
}: {
  suggestion: string;
  phrases: AssistancePhrase[];
  selectedPhrase: AssistancePhrase | null;
  onSelectPhrase: (phrase: AssistancePhrase) => void;
}) {
  const segments = useMemo(
    () => buildSuggestionSegments(suggestion, phrases),
    [suggestion, phrases],
  );
  return (
    <Text style={styles.assistanceSuggestion}>
      {segments.map((segment, index) =>
        segment.phrase ? (
          <Text
            key={index}
            accessibilityRole="button"
            accessibilityState={{
              selected: selectedPhrase?.text === segment.phrase.text,
            }}
            onPress={() => onSelectPhrase(segment.phrase!)}
            style={[
              styles.assistanceHighlight,
              selectedPhrase?.text === segment.phrase.text &&
                styles.assistanceHighlightSelected,
            ]}
          >
            {segment.text}
          </Text>
        ) : (
          <Text key={index}>{segment.text}</Text>
        ),
      )}
    </Text>
  );
}
function TypingIndicator() {
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  useEffect(() => {
    const animations = dots.map((dot, index) => Animated.loop(Animated.sequence([
      Animated.delay(index * 120),
      Animated.timing(dot, { toValue: -6, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(dot, { toValue: 2, duration: 110, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(dot, { toValue: 0, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay((2 - index) * 120),
    ])));
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dots]);
  return <View style={styles.typing}>{dots.map((dot, index) => <Animated.View key={index} style={[styles.typingDot, { transform: [{ translateY: dot }] }]}/>)}</View>;
}

function Bubble({
  message,
  t,
  showLanguageHighlights,
  onLoadAnnotations,
}: {
  message: Message;
  t: (key: string) => string;
  showLanguageHighlights: boolean;
  onLoadAnnotations: () => void;
}) {
  const mine = message.sender === "user";
  const [selected, setSelected] = useState<AssistancePhrase | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [loadingMeanings, setLoadingMeanings] = useState(false);
  const annotations = showLanguageHighlights ? (message.annotations ?? []) : [];
  const requestMeanings = async () => {
    if (mine || annotations.length || loadingMeanings) return;
    setLoadingMeanings(true);
    onLoadAnnotations();
    setTimeout(() => setLoadingMeanings(false), 1200);
  };
  return (
    <View style={[styles.messageRow, mine && { alignItems: "flex-end" }]}>
      <Pressable
        disabled={mine || message.kind === "voice"}
        onPress={() => void requestMeanings()}
        style={[styles.bubble, mine ? styles.mine : styles.theirs]}
      >
        {message.kind === "voice" ? (
          <VoiceBubble
            message={message}
            showTranscript={showTranscript}
            onToggleTranscript={() => setShowTranscript((value) => !value)}
            t={t}
            annotations={annotations}
            selected={selected}
            onSelect={(annotation) =>
              setSelected((current) =>
                current?.text === annotation.text ? null : annotation,
              )
            }
          />
        ) : mine ? (
          <Text style={styles.messageText}>{message.text}</Text>
        ) : (
          <AnnotatedFersonText
            text={message.text}
            annotations={annotations}
            selected={selected}
            onSelect={(annotation) =>
              setSelected((current) =>
                current?.text === annotation.text ? null : annotation,
              )
            }
          />
        )}
        <Text style={styles.time}>
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </Pressable>
      {showLanguageHighlights &&
      !mine &&
      (message.kind === "text" || showTranscript) &&
      !annotations.length ? (
        <Pressable onPress={() => void requestMeanings()}>
          <Text style={styles.meaningHint}>
            {loadingMeanings
              ? t("chat.loadingMeanings")
              : t("chat.tapForMeanings")}
          </Text>
        </Pressable>
      ) : null}
      {showLanguageHighlights && !mine && annotations.length ? (
        <Text style={styles.meaningHint}>
          {t("chat.tapHighlightedMeanings")}
        </Text>
      ) : null}
      {showLanguageHighlights && selected ? (
        <View style={styles.messageMeaning}>
          <View style={styles.meaningHeader}>
            <Text style={styles.meaningPhrase}>{selected.text}</Text>
            <Pressable onPress={() => setSelected(null)} hitSlop={8}>
              <Ionicons name="close" size={17} color={colors.muted} />
            </Pressable>
          </View>
          <Text style={styles.meaningText}>{selected.meaning}</Text>
        </View>
      ) : null}
    </View>
  );
}

function AnnotatedFersonText({
  text,
  annotations,
  selected,
  onSelect,
}: {
  text: string;
  annotations: AssistancePhrase[];
  selected: AssistancePhrase | null;
  onSelect: (annotation: AssistancePhrase) => void;
}) {
  const segments = useMemo(
    () => buildSuggestionSegments(text, annotations),
    [text, annotations],
  );
  return (
    <Text style={styles.messageText}>
      {segments.map((segment, index) =>
        segment.phrase ? (
          <Text
            key={index}
            onPress={() => onSelect(segment.phrase!)}
            style={[
              styles.fersonHighlight,
              selected?.text === segment.phrase.text &&
                styles.fersonHighlightSelected,
            ]}
          >
            {segment.text}
          </Text>
        ) : (
          <Text key={index}>{segment.text}</Text>
        ),
      )}
    </Text>
  );
}
function VoiceBubble({
  message,
  showTranscript,
  onToggleTranscript,
  t,
  annotations,
  selected,
  onSelect,
}: {
  message: Message;
  showTranscript: boolean;
  onToggleTranscript: () => void;
  t: (key: string) => string;
  annotations: AssistancePhrase[];
  selected: AssistancePhrase | null;
  onSelect: (annotation: AssistancePhrase) => void;
}) {
  const player = useAudioPlayer(message.audioUrl ?? null, {
    updateInterval: 100,
  });
  const status = useAudioPlayerStatus(player);
  useEffect(() => {
    if (!message.audioPath) return;
    void createVoiceReplySignedUrl(message.audioPath).then((url) => player.replace(url)).catch(() => undefined);
  }, [message.audioPath, player]);
  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || status.currentTime >= status.duration)
      await player.seekTo(0);
    player.play();
  };
  const duration = status.duration || message.durationSeconds || 0;
  return (
    <View style={styles.voiceContent}>
      <View style={styles.voiceControls}>
        <Pressable
          accessibilityLabel={
            status.playing ? t("chat.pauseVoice") : t("chat.playVoice")
          }
          onPress={() => void toggle()}
          style={styles.play}
        >
          <Ionicons
            name={status.playing ? "pause" : "play"}
            size={20}
            color="#fff"
          />
        </Pressable>
        <View style={styles.waveform}>
          {[7, 13, 19, 11, 17, 22, 9, 15, 20, 12, 18, 8, 14, 21, 10].map(
            (height, index) => (
              <View
                key={index}
                style={[
                  styles.waveBar,
                  {
                    height,
                    opacity:
                      status.currentTime / duration > index / 15 ? 1 : 0.38,
                  },
                ]}
              />
            ),
          )}
        </View>
        <Text style={styles.duration}>
          {formatDuration(status.playing ? status.currentTime : duration)}
        </Text>
        <Pressable
          accessibilityLabel={
            showTranscript ? t("chat.hideTranscript") : t("chat.showTranscript")
          }
          onPress={onToggleTranscript}
          style={[
            styles.transcriptButton,
            showTranscript && styles.transcriptButtonOpen,
          ]}
        >
          <Text
            style={[
              styles.transcriptLetter,
              showTranscript && { color: "#fff" },
            ]}
          >
            T
          </Text>
        </Pressable>
      </View>
      {showTranscript && (
        <View style={styles.transcript}>
          <AnnotatedFersonText
            text={message.text}
            annotations={annotations}
            selected={selected}
            onSelect={onSelect}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3EFE9" },
  menuBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.18)" },
  moreMenu: {
    position: "absolute",
    right: 12,
    width: 270,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 8 },
  menuItemDisabled: { opacity: 0.58 },
  tutorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tutorCircleDisabled: { backgroundColor: "#AAA6A0" },
  historyCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#5B6472",
    alignItems: "center",
    justifyContent: "center",
  },
  highlightCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#806A9A",
    alignItems: "center",
    justifyContent: "center",
  },
  menuCopy: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  menuTextDisabled: { color: colors.muted },
  menuDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 2,
  },
  tutorScreen: { flex: 1, backgroundColor: "#F3EFE9" },
  punctuationSetting: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  punctuationChoice: { fontSize: 12, color: colors.muted, flexShrink: 1 },
  punctuationChoiceSelected: { fontWeight: "900", color: colors.ink },
  casualTextingSetting: {
    minHeight: 76,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  casualTextingLocked: { opacity: 0.58 },
  casualTextingCopy: { flex: 1 },
  casualTextingTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  casualTextingTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  casualTextingDescription: { fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 3 },
  lockedText: { color: colors.muted },
  premiumBadge: { flexDirection: "row", alignItems: "center", gap: 3, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  premiumBadgeText: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  reviewDate: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.primary,
    marginTop: 8,
    marginBottom: 8,
  },
  reviewNoMistakes: {
    fontSize: 13,
    color: colors.muted,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radius.md,
    marginBottom: 12,
  },
  tutorHeader: {
    height: 64,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tutorHeaderTitle: { flexDirection: "row", alignItems: "center", gap: 10 },
  tutorTitle: { fontSize: 19, fontWeight: "900", color: colors.ink },
  tutorLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  tutorLoadingText: { fontSize: 14, color: colors.muted },
  learningFactCard: {
    maxWidth: 340,
    marginTop: 14,
    marginHorizontal: 24,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  learningFactTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    textAlign: "center",
  },
  learningFactText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink,
    textAlign: "center",
  },
  tutorList: { padding: 16, paddingBottom: 40, gap: 12 },
  tutorCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tutorNumber: { fontSize: 12, fontWeight: "900", color: colors.primary },
  tutorOriginal: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.ink,
    marginTop: 6,
  },
  tutorMistake: {
    backgroundColor: "#FFD7D0",
    color: "#9A3427",
    textDecorationLine: "underline",
    fontWeight: "800",
  },
  tutorExplanation: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    marginTop: 8,
  },
  tutorLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.muted,
    textTransform: "uppercase",
    marginTop: 12,
  },
  tutorCorrected: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    color: colors.primary,
    marginTop: 3,
  },
  tutorOption: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink,
    marginTop: 3,
  },
  tutorEmpty: { alignItems: "center", paddingTop: 80, gap: 12 },
  tutorEmptyText: { fontSize: 15, color: colors.muted, textAlign: "center" },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, marginLeft: 10 },
  name: { fontSize: 17, fontWeight: "800", color: colors.ink },
  ai: { fontSize: 11, color: colors.muted },
  list: { padding: spacing.md, paddingBottom: 24, flexGrow: 1 },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: colors.ink },
  emptyBody: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 6,
    textAlign: "center",
  },
  messageRow: { marginVertical: 5, alignItems: "flex-start" },
  bubble: {
    maxWidth: "88%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 7,
    gap: 6,
  },
  mine: { backgroundColor: colors.bubbleMine, borderBottomRightRadius: 5 },
  theirs: { backgroundColor: colors.bubbleTheirs, borderBottomLeftRadius: 5 },
  messageText: { fontSize: 16, lineHeight: 22, color: colors.ink },
  fersonHighlight: {
    color: colors.primary,
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
    backgroundColor: "#FFF0A8",
  },
  fersonHighlightSelected: { backgroundColor: "#F7D86A" },
  meaningHint: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingTop: 4,
  },
  messageMeaning: {
    maxWidth: "88%",
    backgroundColor: "#FFF7D8",
    borderRadius: radius.md,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E8D9A9",
  },
  time: { fontSize: 10, color: colors.muted, alignSelf: "flex-end" },
  voiceContent: { minWidth: 250, maxWidth: 300 },
  voiceControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  play: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  waveform: {
    height: 26,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: colors.primary },
  duration: { fontSize: 11, color: colors.muted, minWidth: 30 },
  transcriptButton: {
    width: 27,
    height: 27,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  transcriptButtonOpen: { backgroundColor: colors.primary },
  transcriptLetter: { fontSize: 14, fontWeight: "900", color: colors.primary },
  transcript: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    borderTopWidth: 1,
    borderColor: "rgba(0,0,0,.08)",
    paddingTop: 8,
    marginTop: 3,
  },
  suggestion: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingTop: 5,
  },
  correction: {
    maxWidth: "82%",
    marginTop: 6,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: "#FFF9EC",
    borderWidth: 1,
    borderColor: "#F2DDA6",
  },
  improved: { fontSize: 15, fontWeight: "700", color: colors.ink },
  explanation: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    marginTop: 5,
  },
  typing: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    alignSelf: "flex-start",
  },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.muted, marginHorizontal: 2 },
  processing: {
    alignSelf: "flex-end",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
  },
  processingText: { fontSize: 12, color: colors.primary, fontWeight: "700" },
  assistanceCard: {
    backgroundColor: "#FFFDF5",
    borderTopWidth: 1,
    borderColor: "#E8D9A9",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  assistanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  assistanceTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  assistanceTitle: { fontSize: 13, fontWeight: "800", color: colors.primary },
  assistanceSuggestion: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 8,
  },
  assistanceHighlight: {
    color: colors.primary,
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
    backgroundColor: "#FFF0A8",
  },
  assistanceHighlightSelected: { backgroundColor: "#F7D86A" },
  expressionHint: { fontSize: 11, color: colors.muted, marginTop: 5 },
  meaningBox: {
    backgroundColor: "#FFF7D8",
    borderRadius: radius.md,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E8D9A9",
  },
  meaningHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  meaningPhrase: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
    flex: 1,
  },
  meaningText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
    marginTop: 2,
  },
  translationToggle: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    marginTop: 3,
  },
  translationToggleText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },
  fullTranslation: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  translationLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
  },
  translationText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    marginTop: 3,
  },
  assistanceReason: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    marginTop: 5,
  },
  assistanceActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  anotherButton: { paddingHorizontal: 10, paddingVertical: 8 },
  anotherText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  useButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  useText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  sendError: {
    backgroundColor: "#FFF0ED",
    color: "#9A3427",
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  composer: {
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  assistButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF7D8",
    alignItems: "center",
    justifyContent: "center",
  },
  mic: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  micRecording: { backgroundColor: colors.danger },
  recordingStatus: {
    flex: 1,
    minHeight: 42,
    borderRadius: 22,
    backgroundColor: "#FFF0ED",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  recordingText: { fontSize: 14, fontWeight: "800", color: colors.danger },
  recordingHint: {
    flex: 1,
    textAlign: "right",
    fontSize: 11,
    color: colors.muted,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    borderRadius: 22,
    backgroundColor: "#F3F1ED",
    paddingHorizontal: 16,
    paddingTop: 10,
    color: colors.ink,
    fontSize: 16,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
