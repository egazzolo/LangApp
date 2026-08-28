export interface TextGenerationRequest { model: string; system: string; input: unknown; schemaName: string; schema: Record<string, unknown>; }
export interface TextGenerationResult { data: unknown; usage: { inputTokens: number; outputTokens: number }; requestId?: string; }
export interface AITextProvider { generateStructured(request: TextGenerationRequest): Promise<TextGenerationResult>; }
export class OpenAIProvider implements AITextProvider {
  constructor(private readonly apiKey: string) {}
  async generateStructured(request: TextGenerationRequest): Promise<TextGenerationResult> {
    const response = await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:request.model,instructions:request.system,input:JSON.stringify(request.input),text:{format:{type:'json_schema',name:request.schemaName,strict:true,schema:request.schema}}})});
    if(!response.ok) throw new Error(`AI_PROVIDER_${response.status}`);
    const json=await response.json(); const output=json.output?.flatMap((x:any)=>x.content??[]).find((x:any)=>x.type==='output_text')?.text;
    if(!output) throw new Error('AI_EMPTY_OUTPUT');
    return {data:JSON.parse(output),usage:{inputTokens:json.usage?.input_tokens??0,outputTokens:json.usage?.output_tokens??0},requestId:response.headers.get('x-request-id')??undefined};
  }
}
