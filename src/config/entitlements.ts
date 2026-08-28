export type Plan = 'free' | 'premium_monthly' | 'premium_annual';
export interface Entitlements { maxActiveCharacters: number; monthlyMessages: number; monthlyVoiceMinutes: number; pronunciationAssessments: number; advancedReports: boolean; }
export const entitlements: Record<Plan, Entitlements> = {
  free: { maxActiveCharacters: 2, monthlyMessages: 120, monthlyVoiceMinutes: 10, pronunciationAssessments: 10, advancedReports: false },
  premium_monthly: { maxActiveCharacters: 20, monthlyMessages: 5000, monthlyVoiceMinutes: 600, pronunciationAssessments: 500, advancedReports: true },
  premium_annual: { maxActiveCharacters: 20, monthlyMessages: 5000, monthlyVoiceMinutes: 600, pronunciationAssessments: 500, advancedReports: true },
};
export const canUse = (plan: Plan, feature: keyof Entitlements) => entitlements[plan][feature];
