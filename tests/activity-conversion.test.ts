import { describe,it,expect,vi,afterEach } from 'vitest';
import { conversionSchema, convertActivity } from '../supabase/functions/_shared/activity-conversion';
describe('Conversion provider schema',()=>{
  it('uses supported nested unions while preserving all eight exclusive activity kinds',()=>{
    const schema=JSON.parse(JSON.stringify(conversionSchema()));
    const variants=schema.properties.stages.items.properties.items.items.anyOf;
    expect(variants).toHaveLength(8);
    expect(new Set(variants.map((v:{properties:{kind:{const:string}}})=>v.properties.kind.const)).size).toBe(8);
    expect(JSON.stringify(schema)).not.toContain('"oneOf"');
    expect(schema.additionalProperties).toBe(false);
  });
});

describe('Conversion transport failures',()=>{
  afterEach(()=>vi.unstubAllGlobals());
  it('reports timeouts without exposing source or provider error text',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new DOMException('private data','TimeoutError')));
    await expect(convertActivity({apiKey:'test',model:'gpt-4.1'})).rejects.toThrow('CONVERSION_TIMEOUT');
  });
  it('distinguishes network failures',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('private data')));
    await expect(convertActivity({apiKey:'test',model:'gpt-4.1'})).rejects.toThrow('CONVERSION_NETWORK_ERROR');
  });
});
