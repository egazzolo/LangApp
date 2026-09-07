export interface TextGenerationRequest { model: string; system: string; input: unknown; schemaName: string; schema: Record<string, unknown>; }
export interface TextGenerationResult { data: unknown; usage: { inputTokens: number; outputTokens: number }; requestId?: string; }
export interface AITextProvider { generateStructured(request: TextGenerationRequest): Promise<TextGenerationResult>; }

export class AIProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number | null,
    public readonly retryable: boolean,
    public readonly requestId?: string,
    public readonly retryCount = 0,
  ) {
    super(code);
    this.name = 'AIProviderError';
  }
}

export class OpenAIProvider implements AITextProvider {
  constructor(private readonly apiKey: string) {}
  async generateStructured(request: TextGenerationRequest): Promise<TextGenerationResult> {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        instructions: request.system,
        input: JSON.stringify(request.input),
        text: { format: { type: 'json_schema', name: request.schemaName, strict: true, schema: request.schema } },
      }),
    });
    const requestId = response.headers.get('x-request-id') ?? undefined;
    if (!response.ok) {
      throw new AIProviderError('AI_PROVIDER_HTTP_ERROR', response.status, response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500, requestId);
    }
    const json = await response.json();
    const output = json.output?.flatMap((item: { content?: unknown[] }) => item.content ?? []).find((item: { type?: string }) => item.type === 'output_text') as { text?: string } | undefined;
    if (!output?.text) throw new AIProviderError('AI_EMPTY_OUTPUT', response.status, true, requestId);
    try {
      return { data: JSON.parse(output.text), usage: { inputTokens: json.usage?.input_tokens ?? 0, outputTokens: json.usage?.output_tokens ?? 0 }, requestId };
    } catch {
      throw new AIProviderError('AI_INVALID_JSON', response.status, true, requestId);
    }
  }
}
