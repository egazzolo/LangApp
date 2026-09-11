import type { CorrectionIntensity, LearningLanguage, PronunciationTarget } from "@/domain/models";
import { supabase } from "@/services/supabase/client";

export async function saveLearningPreferences(values: {
  learningLanguage: LearningLanguage;
  pronunciationTarget: PronunciationTarget;
  correctionIntensity: CorrectionIntensity;
  interests?: string[];
  focusedPracticeEnabled?:boolean;
}) {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user || user.is_anonymous) return;
  const { error } = await supabase.from("profiles").update({
    target_language: values.learningLanguage,
    pronunciation_target: values.pronunciationTarget,
    correction_intensity: values.correctionIntensity,
    ...(values.interests ? { interests: values.interests } : {}),
    ...(values.focusedPracticeEnabled!==undefined?{focused_practice_enabled:values.focusedPracticeEnabled}:{}),
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);
  if (error) console.warn("[preferences] Couldn’t save learning preferences", error.code);
}
