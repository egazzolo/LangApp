import type { CharacterProvider, CharacterDraft, ConversationProvider, LearningProvider } from './contracts';
import type { Character } from '@/domain/models';

const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const birthDate = (age: number) => `${new Date().getFullYear() - age}-04-12`;

export const mockCharacterProvider: CharacterProvider = {
  async generate(input: CharacterDraft): Promise<Character> {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return { id: id(), name: input.name, gender: input.gender, dateOfBirth: birthDate(input.age), location: input.location, occupation: input.occupation, relationship: input.relationship, personality: input.personality, bio: `${input.name} lives in ${input.location} and works as a ${input.occupation}. ${input.name} loves live music, long walks, and trying tiny neighborhood restaurants.`, currentState: 'Planning a relaxed weekend and wondering whether to move apartments.', voiceId: 'warm-american-1', avatarUrl: input.avatarUrl, aiDisclosure: true };
  },
  async regenerateField(character, field) { return character[field]; },
};

export const mockConversationProvider: ConversationProvider = {
  async reply(character, recentMessages) {
    await new Promise((resolve) => setTimeout(resolve, 650));
    const userMessages = recentMessages.filter((message) => message.sender === 'user');
    const latest = userMessages.at(-1)?.text.trim() ?? '';
    const previousUserText = userMessages.at(-2)?.text.toLocaleLowerCase() ?? '';
    const previousCharacterText = [...recentMessages].reverse().find((message) => message.sender === 'character')?.text.toLocaleLowerCase() ?? '';
    const normalized = latest.toLocaleLowerCase();
    const asksHowTheyAre = /\b(how(?:'s|s| is)? (?:it going|are you|you doing)|what(?:'s|s| is) up)\b/.test(normalized);
    const previousAskedHow = /\b(how(?:'s|s| is)? (?:it going|are you|you doing)|what(?:'s|s| is) up)\b/.test(previousUserText);
    const greets = /\b(hi|hey|hello|hiya|haya|yo)\b/.test(normalized);
    const positiveState = /\b(i(?:'m|m| am) (?:fine|good|great|okay|ok|cool)|doing (?:fine|good|great|okay|ok))\b/.test(normalized);
    const difficultDay = /\b(rough|awful|terrible|hard day|bad day|stressed|exhausted|overwhelmed)\b/.test(normalized);
    const shortAcknowledgement = /^(yeah|yes|yep|yea|right|okay|ok|sure|uh huh|mhm)[.!?]*$/i.test(latest);
    let text: string;
    if (shortAcknowledgement && previousAskedHow) text = `Yeah—I’m doing fine. Work kept me busy, but I’m relaxing now. What are you up to?`;
    else if (shortAcknowledgement && /what have you been up to|how about you|what about you/.test(previousCharacterText)) text = `So, what have you been up to today? Anything interesting?`;
    else if (shortAcknowledgement) text = `Yeah. Anyway, how has your day been?`;
    else if (asksHowTheyAre && positiveState) text = `Glad you’re doing well. I’m good too—just winding down after work. What have you been up to today?`;
    else if (greets && !previousCharacterText) text = `Hi! Nice to meet you. How are you doing?`;
    else if (greets) text = `Hey! Good to hear from you. How have you been?`;
    else if (asksHowTheyAre && greets) text = `Hey! I’m doing pretty well, thanks. Work was busy, but I’m finally relaxing. How about you?`;
    else if (asksHowTheyAre) text = `I’m doing well, thanks. A little tired after work, but nothing dramatic. What about you?`;
    else if (positiveState) text = `Good to hear. I’m doing pretty well too. Did you do anything interesting today?`;
    else if (difficultDay) text = `That sounds like a lot. Do you want to talk about what made the day difficult?`;
    else if (/\b(work|job|office|shift)\b/.test(normalized)) text = `How has work been for you lately? Mine was unusually busy today.`;
    else if (latest.length > 8 && latest.endsWith('?')) text = `I’m not completely sure. What made you think about that?`;
    else text = `Tell me more—I’m listening.`;
    return { text, kind: 'text', annotations: [] };
  },
};

export const mockLearningProvider: LearningProvider = { async analyze(text) { const match = /\bI go\b.*\byesterday\b/i.test(text); return { corrections: match ? [{ id: id(), original: text, improved: text.replace(/I go/i, 'I went'), explanation: 'Use the past form “went” for a finished action yesterday.', category: 'grammar' }] : [], proficiencySignals: [] }; } };



