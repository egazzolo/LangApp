import { voiceAccentNotice } from '@/content/voice-accent-copy';
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Field, Screen } from "@/components/ui";
import { colors, radius, spacing } from "@/theme/tokens";
import { mockCharacterProvider } from "@/services/ai/mock";
import { useAppStore } from "@/store/app-store";
import { track } from "@/services/analytics";
import { canUse, type Plan } from "@/config/entitlements";
import { getCurrentPlan } from "@/services/subscriptions";
import { specialistCopy } from "@/content/specialist-copy";
import { additionalFersonTitle } from "@/content/create-screen-copy";
import type {
  Character,
  CharacterGender,
  RelationshipType,
} from "@/domain/models";

const personalities = [
  "Warm",
  "Funny",
  "Curious",
  "Outgoing",
  "Thoughtful",
  "Calm",
  "Reserved",
  "Ambitious",
  "Blunt",
  "Bossy",
  "Impatient",
  "Sarcastic",
  "Serious",
  "Stubborn",
] as const;
const relationships: RelationshipType[] = [
  "friend",
  "coworker",
  "neighbor",
  "classmate",
  "professional_contact",
];
const draftNames = [
  "Maya",
  "Daniel",
  "Priya",
  "Noah",
  "Camille",
  "Omar",
  "Elena",
  "Marcus",
  "Sofia",
  "Theo",
  "Aisha",
  "Lucas",
  "Nina",
  "Elliot",
  "Grace",
  "Malik",
  "Clara",
  "Mateo",
  "Zoe",
  "Julian",
  "Leila",
  "Henry",
  "Anika",
  "Sam",
  "Valerie",
  "Adrian",
  "Mina",
  "Jonah",
  "Isabel",
  "Darius",
  "Ren",
  "Fatima",
  "Leo",
  "Mei",
  "Gabriel",
  "Nora",
  "Ibrahim",
  "Chloe",
  "Alex",
  "Amara",
];
const womenNames = new Set([
  "Maya",
  "Priya",
  "Camille",
  "Elena",
  "Sofia",
  "Aisha",
  "Nina",
  "Grace",
  "Clara",
  "Zoe",
  "Leila",
  "Anika",
  "Valerie",
  "Mina",
  "Isabel",
  "Fatima",
  "Mei",
  "Nora",
  "Chloe",
  "Amara",
]);
type RegionalIdentity = { name:string; gender:CharacterGender; location:string; countryCode:string };
const regionalIdentities: Record<"english-us"|"english-uk"|"spanish-latam"|"spanish-spain",RegionalIdentity[]> = {
  "english-us":[
    {name:"Ashley",gender:"woman",location:"Seattle, United States",countryCode:"US"},{name:"Megan",gender:"woman",location:"Austin, United States",countryCode:"US"},{name:"Jasmine",gender:"woman",location:"Atlanta, United States",countryCode:"US"},{name:"Lauren",gender:"woman",location:"Boston, United States",countryCode:"US"},{name:"Matt",gender:"man",location:"Denver, United States",countryCode:"US"},{name:"Brandon",gender:"man",location:"Chicago, United States",countryCode:"US"},{name:"Ethan",gender:"man",location:"Portland, United States",countryCode:"US"},{name:"Marcus",gender:"man",location:"Philadelphia, United States",countryCode:"US"},
  ],
  "english-uk":[
    {name:"Emily",gender:"woman",location:"Manchester, United Kingdom",countryCode:"GB"},{name:"Sophie",gender:"woman",location:"Bristol, United Kingdom",countryCode:"GB"},{name:"Charlotte",gender:"woman",location:"London, United Kingdom",countryCode:"GB"},{name:"Amelia",gender:"woman",location:"Edinburgh, United Kingdom",countryCode:"GB"},{name:"Oliver",gender:"man",location:"Liverpool, United Kingdom",countryCode:"GB"},{name:"Jack",gender:"man",location:"Leeds, United Kingdom",countryCode:"GB"},{name:"Harry",gender:"man",location:"Birmingham, United Kingdom",countryCode:"GB"},{name:"Callum",gender:"man",location:"Glasgow, United Kingdom",countryCode:"GB"},
  ],
  "spanish-latam":[
    {name:"María",gender:"woman",location:"Medellín, Colombia",countryCode:"CO"},{name:"Valentina",gender:"woman",location:"Buenos Aires, Argentina",countryCode:"AR"},{name:"Camila",gender:"woman",location:"Santiago, Chile",countryCode:"CL"},{name:"Daniela",gender:"woman",location:"Ciudad de México, México",countryCode:"MX"},{name:"Carlos",gender:"man",location:"Bogotá, Colombia",countryCode:"CO"},{name:"Santiago",gender:"man",location:"Quito, Ecuador",countryCode:"EC"},{name:"Diego",gender:"man",location:"Lima, Perú",countryCode:"PE"},{name:"Andrés",gender:"man",location:"San José, Costa Rica",countryCode:"CR"},
  ],
  "spanish-spain":[
    {name:"Lucía",gender:"woman",location:"Madrid, España",countryCode:"ES"},{name:"Marta",gender:"woman",location:"Valencia, España",countryCode:"ES"},{name:"Carmen",gender:"woman",location:"Sevilla, España",countryCode:"ES"},{name:"Irene",gender:"woman",location:"Bilbao, España",countryCode:"ES"},{name:"Javier",gender:"man",location:"Madrid, España",countryCode:"ES"},{name:"Álvaro",gender:"man",location:"Barcelona, España",countryCode:"ES"},{name:"Pablo",gender:"man",location:"Zaragoza, España",countryCode:"ES"},{name:"Sergio",gender:"man",location:"Málaga, España",countryCode:"ES"},
  ],
};
const identityPoolFor = (language: "en"|"es", variant: string) => language === "es"
  ? regionalIdentities[variant === "castilian-spanish" ? "spanish-spain" : "spanish-latam"]
  : regionalIdentities[variant === "modern-british" ? "english-uk" : "english-us"];
const draftLocations = [
  "Austin",
  "Manchester",
  "Toronto",
  "Chicago",
  "London",
  "Boston",
  "San Diego",
  "Bristol",
  "Seattle",
  "New York",
  "Denver",
  "Portland",
  "Atlanta",
  "Vancouver",
  "Edinburgh",
  "Dublin",
  "Melbourne",
  "Auckland",
  "Singapore",
  "Cape Town",
  "Brighton",
  "Liverpool",
  "Philadelphia",
  "Nashville",
];
const draftJobs = [
  "Architect",
  "Sound engineer",
  "Product manager",
  "Paramedic",
  "Museum curator",
  "Restaurant owner",
  "Marine biologist",
  "Civil engineer",
  "Nurse",
  "Graphic designer",
  "Teacher",
  "Software developer",
  "Journalist",
  "Physical therapist",
  "Chef",
  "Photographer",
  "Research assistant",
  "Accountant",
  "Urban planner",
  "Electrician",
  "Book editor",
  "Event coordinator",
  "Veterinarian",
  "Social worker",
];
const draftTraits = [
  "Warm",
  "Funny",
  "Curious",
  "Outgoing",
  "Thoughtful",
  "Calm",
  "Reserved",
  "Ambitious",
  "Blunt",
  "Bossy",
  "Impatient",
  "Sarcastic",
  "Serious",
  "Stubborn",
];
const draftRelationships: RelationshipType[] = [
  "friend",
  "coworker",
  "neighbor",
  "classmate",
  "professional_contact",
];
type AvatarChoice = { id: string; minAge: number; maxAge: number };
const avatarChoices: Record<CharacterGender, AvatarChoice[]> = {
  woman: [
    {id:"avatar-woman-01",minAge:24,maxAge:38},{id:"avatar-woman-02",minAge:21,maxAge:34},{id:"avatar-woman-03",minAge:20,maxAge:32},
    {id:"avatar-woman-04",minAge:46,maxAge:70},{id:"avatar-woman-05",minAge:24,maxAge:39},{id:"avatar-woman-06",minAge:23,maxAge:38},
    {id:"avatar-woman-07",minAge:28,maxAge:45},{id:"avatar-woman-08",minAge:24,maxAge:39},{id:"avatar-woman-09",minAge:28,maxAge:45},
  ],
  man: [
    {id:"avatar-man-01",minAge:20,maxAge:32},{id:"avatar-man-02",minAge:25,maxAge:39},{id:"avatar-man-03",minAge:33,maxAge:48},
    {id:"avatar-man-04",minAge:48,maxAge:70},{id:"avatar-man-05",minAge:22,maxAge:35},{id:"avatar-man-06",minAge:20,maxAge:30},
  ],
};
const nextAvatar = (gender: CharacterGender, age: number, characters: Character[]) => {
  const sameGender = characters.filter(
    (character) => character.gender === gender,
  );
  const used = new Set(sameGender.map((character) => character.avatarUrl));
  const compatible = avatarChoices[gender].filter((avatar)=>age>=avatar.minAge&&age<=avatar.maxAge);
  const nearest = [...avatarChoices[gender]].sort((a,b)=>Math.min(Math.abs(age-a.minAge),Math.abs(age-a.maxAge))-Math.min(Math.abs(age-b.minAge),Math.abs(age-b.maxAge)));
  const pool = compatible.length ? compatible : nearest.slice(0,2);
  const unused = pool.filter((avatar)=>!used.has(avatar.id));
  return pick(unused.length ? unused : pool).id;
};
const pick = <T,>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)]!;
const pickTraits = () =>
  [...draftTraits].sort(() => Math.random() - 0.5).slice(0, 3);
const openingMessage = (character: Character, contactCount: number) => {
  if (character.learningLanguage === "es") {
    const spanish = [`¡Hola! Soy ${character.name}. ¿Cómo va tu día?`, "¡Hola! ¿Qué tal todo?", "Oye, cuéntame algo bueno de tu día."];
    const score = [...character.name].reduce((total, letter) => total + letter.charCodeAt(0), 0);
    return spanish[(score + contactCount) % spanish.length]!;
  }
  const relationshipOpeners: Partial<Record<RelationshipType, string[]>> = {
    friend: [
      `Hey, it’s ${character.name}. I was about to make some coffee—what are you up to?`,
      `Hi! How’s your day been so far? Mine has been surprisingly busy.`,
      `Okay, quick question: what’s the best thing that happened to you today?`,
    ],
    neighbor: [
      `Hi—${character.name} from nearby. How’s your week going?`,
      `Hey! I think we keep just missing each other. How are you?`,
      `Hi, it’s ${character.name}. Is your day as hectic as mine?`,
    ],
    coworker: [
      `Hey, it’s ${character.name}. How did the rest of your day go?`,
      `Hi! Are you finally done with work too?`,
      `Hey—no work talk, I promise. How are you doing?`,
    ],
    classmate: [
      `Hi! How are you finding everything so far?`,
      `Hey, it’s ${character.name}. Did today make sense to you, or was it just me?`,
      `Hi! What did you think of today?`,
    ],
    professional_contact: [
      `Hello, this is ${character.name}. I hope your day is going well.`,
      `Hi, ${character.name} here. How have things been on your side?`,
      `Hello! I finally have a quiet moment. How are you?`,
    ],
  };
  const generic = [
    `Hey! ${character.name} here. What are you up to today?`,
    `Hi—how’s everything going?`,
    `Hey, good to meet you. How has your day been?`,
  ];
  const options = relationshipOpeners[character.relationship] ?? generic;
  const nameScore = [...character.name].reduce(
    (total, letter) => total + letter.charCodeAt(0),
    0,
  );
  return options[(nameScore + contactCount) % options.length]!;
};
export default function CreateCharacter() {
  const formScroll=useRef<ScrollView>(null);
  const revealField=()=>setTimeout(()=>{const input=TextInput.State.currentlyFocusedInput();if(input)formScroll.current?.scrollResponderScrollNativeHandleToKeyboard(input,100,true);},100);
  useEffect(()=>{const sub=Keyboard.addListener('keyboardDidShow',revealField);return()=>sub.remove();},[]);

  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const add = useAppStore((state) => state.addCharacter);
  const complete = useAppStore((state) => state.completeOnboarding);
  const existingCharacters = useAppStore((state) => state.characters);
  const locale = useAppStore((state) => state.locale);
  const learningLanguage = useAppStore((state) => state.learningLanguage);
  const pronunciationTarget = useAppStore((state) => state.pronunciationTarget);
  const specialistText = specialistCopy[locale];
  const [name, setName] = useState("Sarah");
  const [gender, setGender] = useState<CharacterGender>("woman");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    "avatar-woman-01",
  );
  const [age, setAge] = useState("29");
  const [location, setLocation] = useState("Seattle");
  const [countryCode, setCountryCode] = useState("US");
  const [job, setJob] = useState("Veterinary nurse");
  const [relationship, setRelationship] = useState<RelationshipType>("friend");
  const [selected, setSelected] = useState(["Warm", "Outgoing"]);
  const [starter, setStarter] = useState<"user" | "character" | "surprise">(
    "user",
  );
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [plan, setPlan] = useState<Plan>("free");
  const [specialist, setSpecialist] = useState(false);
  const [expertise, setExpertise] = useState("");
  const specialistAvailable = canUse(plan, "specialistFersons");

  useEffect(() => { void getCurrentPlan().then(setPlan); }, []);

  const fillAiDraft = async (showLoading = true) => {
    if (showLoading) {
      setDrafting(true);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    const generatedGender: CharacterGender =
      Math.random() < 0.5 ? "woman" : "man";
    const existingNames = new Set(
      existingCharacters.map((character) => character.name.toLocaleLowerCase()),
    );
    const regionalPool = identityPoolFor(learningLanguage, pronunciationTarget).filter((identity)=>identity.gender===generatedGender);
    const availableIdentities = regionalPool.filter((identity)=>!existingNames.has(identity.name.toLocaleLowerCase())&&identity.name.toLocaleLowerCase()!==name.trim().toLocaleLowerCase());
    const identity = pick(availableIdentities.length ? availableIdentities : regionalPool);
    setGender(generatedGender);
    const generatedName = availableIdentities.length ? identity.name : `${identity.name} ${String(existingCharacters.length + 1)}`;
    setName(generatedName);
    const generatedAge = 20 + Math.floor(Math.random() * 51);
    setAge(String(generatedAge));
    setLocation(identity.location);
    setCountryCode(identity.countryCode);
    const generatedJob = pick(draftJobs);
    setJob(generatedJob);
    if (specialist) setExpertise(generatedJob);
    setRelationship(pick(draftRelationships));
    setSelected(pickTraits());
    setAvatarUrl(nextAvatar(generatedGender, generatedAge, existingCharacters));
    setDraftReady(true);
    if (showLoading) setDrafting(false);
  };
  useEffect(() => {
    void fillAiDraft(false);
    // A fresh suggestion should appear whenever this screen is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const submit = async () => {
    if (!name.trim() || !Number(age) || !location.trim() || !job.trim()) {
      Alert.alert(t("create.requiredTitle"), t("create.requiredBody"));
      return;
    }
    setLoading(true);
    try {
      const character = await mockCharacterProvider.generate({
        name: name.trim(),
        gender,
        age: Number(age),
        location: location.trim(),
        occupation: job.trim(),
        avatarUrl,
        relationship,
        personality: selected,
        knowledgeLevel: specialist && specialistAvailable ? "specialist" : "general",
        expertiseDomains: specialist && specialistAvailable ? [expertise.trim() || job.trim()] : [],
        learningLanguage,
        languageVariant: pronunciationTarget,
        countryCode,
      });
      const cid = `conversation-${character.id}`;
      const opening = openingMessage(character, existingCharacters.length);
      const resolvedStarter =
        starter === "surprise"
          ? Math.random() < 0.5
            ? "user"
            : "character"
          : starter;
      const characterStarts = resolvedStarter === "character";
      add(
        character,
        {
          id: cid,
          characterId: character.id,
          lastMessage: characterStarts ? opening : "",
          updatedAt: new Date().toISOString(),
          unreadCount: characterStarts ? 1 : 0,
        },
        characterStarts
          ? {
              id: `message-${character.id}`,
              conversationId: cid,
              sender: "character",
              kind: "text",
              text: opening,
              createdAt: new Date().toISOString(),
              status: "sent",
            }
          : undefined,
      );
      complete();
      await track("character_created", {
        mode: draftReady ? "ai_draft" : "quick",
        starter: resolvedStarter,
      });
      router.replace(`/chat/${cid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
      <ScrollView ref={formScroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>{t("create.kicker")}</Text>
        <Text style={styles.title}>{existingCharacters.length === 0 ? t("create.title") : additionalFersonTitle[locale]}</Text>
        <Text style={styles.body}>{t("create.subtitle")}</Text>
        {learningLanguage === "en" && <Text style={styles.body}>{voiceAccentNotice[locale]}</Text>}
        <View style={styles.aiAction}>
          <Button
            variant="secondary"
            label={drafting ? t("create.aiDrafting") : t("create.aiDraft")}
            loading={drafting}
            onPress={() => void fillAiDraft(true)}
          />
          {draftReady && (
            <Text style={styles.review}>{t("create.reviewDraft")}</Text>
          )}
        </View>
        <View style={styles.form}>
          <Field onFocus={revealField} label={t("create.name")} value={name} onChangeText={setName} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field onFocus={revealField}
                label={t("create.age")}
                value={age}
                keyboardType="number-pad"
                onChangeText={setAge}
                onEndEditing={() => {
                  const numericAge = Number(age);
                  if (numericAge >= 18) setAvatarUrl(nextAvatar(gender, numericAge, existingCharacters));
                }}
              />
            </View>
            <View style={{ flex: 2 }}>
              <Field onFocus={revealField}
                label={t("create.from")}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>
          <Field onFocus={revealField} label={t("create.job")} value={job} onChangeText={setJob} />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: specialist, disabled: !specialistAvailable }}
            onPress={() => specialistAvailable ? setSpecialist((value) => !value) : Alert.alert(specialistText.alertTitle, specialistText.alertBody)}
            style={[styles.specialistCard, specialist && specialistAvailable && styles.specialistSelected, !specialistAvailable && styles.specialistLocked]}
          >
            <View style={styles.specialistIcon}><Ionicons name={specialistAvailable ? "school-outline" : "lock-closed"} size={20} color={specialistAvailable ? colors.primary : colors.muted}/></View>
            <View style={styles.specialistCopy}><View style={styles.specialistTitleRow}><Text style={[styles.specialistTitle,!specialistAvailable&&styles.lockedText]}>{specialistText.title}</Text><Text style={styles.premiumLabel}>PREMIUM</Text></View><Text style={styles.specialistBody}>{specialistText.body}</Text></View>
            {specialistAvailable ? <Ionicons name={specialist ? "checkmark-circle" : "ellipse-outline"} size={23} color={colors.primary}/> : null}
          </Pressable>
          {specialist && specialistAvailable ? <Field onFocus={revealField} label={specialistText.field} value={expertise} onChangeText={setExpertise} placeholder={job || specialistText.example}/> : null}
          <Text style={styles.label}>{t("create.gender")}</Text>
          <View style={styles.genderRow}>
            {(["woman", "man"] as CharacterGender[]).map((value) => (
              <Pressable
                key={value}
                onPress={() => {
                  setGender(value);
                  setAvatarUrl(nextAvatar(value, Number(age) || 30, existingCharacters));
                }}
                style={[
                  styles.genderOption,
                  gender === value && styles.genderSelected,
                ]}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === value && styles.selectedText,
                  ]}
                >
                  {t("create.gender_" + value)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>{t("create.relationship")}</Text>
          <View style={styles.chips}>
            {relationships.map((value) => (
              <Pressable
                key={value}
                onPress={() => setRelationship(value)}
                style={[
                  styles.chip,
                  relationship === value && styles.chipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    relationship === value && styles.selectedText,
                  ]}
                >
                  {t("create.relationship_" + value)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>{t("create.conversationStarter")}</Text>
          <View style={styles.starterRow}>
            {(["user", "character", "surprise"] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setStarter(value)}
                style={[
                  styles.starterOption,
                  starter === value && styles.starterSelected,
                ]}
              >
                <Text
                  style={[
                    styles.starterText,
                    starter === value && styles.selectedText,
                  ]}
                >
                  {t(`create.${value}Starts`)}
                </Text>
              </Pressable>
            ))}
          </View>
          {starter === "user" && (
            <Text style={styles.starterHint}>{t("create.userStartsHint")}</Text>
          )}
          <Text style={styles.label}>{t("create.personality")}</Text>
          <View style={styles.chips}>
            {personalities.map((personality) => (
              <Pressable
                key={personality}
                onPress={() =>
                  setSelected((current) =>
                    current.includes(personality)
                      ? current.filter((item) => item !== personality)
                      : [...current, personality],
                  )
                }
                style={[
                  styles.chip,
                  selected.includes(personality) && styles.chipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected.includes(personality) && styles.selectedText,
                  ]}
                >
                  {t("create.personality_" + personality.toLowerCase())}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.note}>
          <Text style={styles.noteText}>◎ {t("create.aiNote")}</Text>
        </View>
      </ScrollView>
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <Button
          label={loading ? t("create.generating") : t("create.generate")}
          loading={loading}
          onPress={() => void submit()}
        />
      </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 64, paddingBottom: 160 },
  kicker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 12,
  },
  body: { fontSize: 16, lineHeight: 24, color: colors.muted, marginTop: 10 },
  aiAction: { marginTop: spacing.lg, gap: 10 },
  review: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.primary,
    textAlign: "center",
  },
  form: { gap: spacing.lg, marginTop: spacing.xl },
  specialistCard:{flexDirection:"row",alignItems:"center",gap:12,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface,padding:14},
  specialistSelected:{borderColor:colors.primary,backgroundColor:colors.primarySoft},
  specialistLocked:{opacity:.62},
  specialistIcon:{width:34,height:34,borderRadius:17,backgroundColor:colors.primarySoft,alignItems:"center",justifyContent:"center"},
  specialistCopy:{flex:1},
  specialistTitleRow:{flexDirection:"row",alignItems:"center",gap:7},
  specialistTitle:{fontSize:16,fontWeight:"800",color:colors.ink},
  lockedText:{color:colors.muted},
  premiumLabel:{fontSize:9,fontWeight:"900",color:colors.primary,borderWidth:1,borderColor:colors.primary,borderRadius:8,paddingHorizontal:5,paddingVertical:2},
  specialistBody:{fontSize:13,lineHeight:18,color:colors.muted,marginTop:3},
  row: { flexDirection: "row", gap: 12 },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink },
  genderRow: { flexDirection: "row", gap: 8 },
  genderOption: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  genderSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  genderText: { fontSize: 14, fontWeight: "700", color: colors.muted },
  starterRow: { flexDirection: "row", gap: 8 },
  starterOption: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  starterSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  starterText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textAlign: "center",
  },
  starterHint: { fontSize: 13, color: colors.primary, marginTop: -12 },
  avatarChoices: { flexDirection: "row", gap: 14 },
  avatarChoice: {
    padding: 3,
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 40,
  },
  avatarChoiceSelected: { borderColor: colors.primary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: { color: colors.muted, fontWeight: "600" },
  selectedText: { color: colors.primary },
  note: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: "#EFEAE2",
    borderRadius: radius.md,
  },
  noteText: { color: colors.muted, fontSize: 13 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    backgroundColor: colors.canvas,
  },
});
