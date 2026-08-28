export type AssistancePhrase = { text: string; meaning: string };

export type AssistanceSegment = {
  text: string;
  phrase?: AssistancePhrase;
};

export function buildSuggestionSegments(suggestion: string, phrases: AssistancePhrase[]): AssistanceSegment[] {
  const normalized = suggestion.toLocaleLowerCase();
  const matches = phrases
    .map((phrase) => {
      const start = normalized.indexOf(phrase.text.toLocaleLowerCase());
      return { phrase, start, end: start + phrase.text.length };
    })
    .filter((match) => match.start >= 0)
    .sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));

  const accepted = matches.filter((match, index, all) =>
    !all.slice(0, index).some((other) => match.start < other.end && match.end > other.start),
  );
  if (!accepted.length) return [{ text: suggestion }];

  const segments: AssistanceSegment[] = [];
  let cursor = 0;
  for (const match of accepted) {
    if (match.start > cursor) segments.push({ text: suggestion.slice(cursor, match.start) });
    segments.push({ text: suggestion.slice(match.start, match.end), phrase: match.phrase });
    cursor = match.end;
  }
  if (cursor < suggestion.length) segments.push({ text: suggestion.slice(cursor) });
  return segments;
}
