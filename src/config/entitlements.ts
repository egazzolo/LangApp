export type Plan = "free" | "premium_monthly" | "premium_annual";
export interface Entitlements {
  conversationExport: boolean;
  regionalAccents: boolean;
  maxActiveCharacters: number;
  monthlyMessages: number;
  monthlyUserVoiceMessages: number;
  monthlyFersonVoiceMessages: number;
  monthlyBulbUses: number;
  monthlyTutorReviews: number;
  progressReportEveryLearnerMessages: number;
  savedCorrectionHistory: boolean;
  monthlyVoiceMinutes: number;
  pronunciationAssessments: number;
  advancedReports: boolean;
  casualTextingMode: boolean;
  specialistFersons: boolean;
}
export const entitlements: Record<Plan, Entitlements> = {
  free: {
    conversationExport: false,
    regionalAccents: false,
    maxActiveCharacters: 2,
    monthlyMessages: 120,
    monthlyUserVoiceMessages: 5,
    monthlyFersonVoiceMessages: 5,
    monthlyBulbUses: 50,
    monthlyTutorReviews: 4,
    progressReportEveryLearnerMessages: 80,
    savedCorrectionHistory: true,
    monthlyVoiceMinutes: 10,
    pronunciationAssessments: 10,
    advancedReports: false,
    casualTextingMode: false,
    specialistFersons: false,
  },
  premium_monthly: {
    conversationExport: true,
    regionalAccents: false,
    maxActiveCharacters: 20,
    monthlyMessages: 5000,
    monthlyUserVoiceMessages: 5000,
    monthlyFersonVoiceMessages: 5000,
    monthlyBulbUses: 5000,
    monthlyTutorReviews: 500,
    progressReportEveryLearnerMessages: 80,
    savedCorrectionHistory: true,
    monthlyVoiceMinutes: 600,
    pronunciationAssessments: 500,
    advancedReports: true,
    casualTextingMode: true,
    specialistFersons: true,
  },
  premium_annual: {
    conversationExport: true,
    regionalAccents: false,
    maxActiveCharacters: 20,
    monthlyMessages: 5000,
    monthlyUserVoiceMessages: 5000,
    monthlyFersonVoiceMessages: 5000,
    monthlyBulbUses: 5000,
    monthlyTutorReviews: 500,
    progressReportEveryLearnerMessages: 80,
    savedCorrectionHistory: true,
    monthlyVoiceMinutes: 600,
    pronunciationAssessments: 500,
    advancedReports: true,
    casualTextingMode: true,
    specialistFersons: true,
  },
};
export const canUse = <Feature extends keyof Entitlements>(
  plan: Plan,
  feature: Feature,
): Entitlements[Feature] => entitlements[plan][feature];
