/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync('supabase/functions/export-conversation/index.ts','utf8').replace(/^import .*createClient.*;$/m,'');
function endpoint(authenticated: boolean, allowed: boolean, entitlementError = false) {
  let handler: (req: Request) => Promise<Response>;
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  vm.runInNewContext(code, {
    Response, Date, JSON, Number, Array,
    Deno: { env: { get: () => 'unused' }, serve: (h: typeof handler) => { handler = h; } },
    createClient: () => ({
      auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'owner' } : null }, error: null }) },
      rpc: async () => ({ data: allowed, error: entitlementError ? {} : null }),
    }),
  });
  return (body: unknown, token = true) => handler!(new Request('https://example.test/export', { method: 'POST', headers: token ? { Authorization: 'Bearer user-jwt' } : {}, body: JSON.stringify(body) }));
}
describe('premium conversation export endpoint', () => {
  it('rejects unauthenticated and free requests even when the body claims premium', async () => {
    expect((await endpoint(false,true)({},false)).status).toBe(401);
    expect((await endpoint(false,true)({})).status).toBe(401);
    expect((await endpoint(true,false)({plan:'premium_annual',messages:[]})).status).toBe(403);
  });
  it('fails closed when entitlement verification is unavailable', async () => {
    expect((await endpoint(true,true,true)({messages:[]})).status).toBe(503);
  });
  it('exports only retained text and never private media paths', async () => {
    const fresh = new Date(Date.now()-1000).toISOString();
    const response = await endpoint(true,true)({messages:[
      {sender:'user',text:'hello',createdAt:fresh,audioPath:'private/audio.m4a',audioUrl:'signed-secret'},
      {sender:'character',text:'expired',createdAt:'2000-01-01T00:00:00Z'},
    ]});
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.messages).toEqual([{sender:'user',text:'hello',createdAt:fresh}]);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it('rejects malformed messages', async () => {
    expect((await endpoint(true,true)({messages:[{sender:'user',text:'hello',createdAt:'bad'}]})).status).toBe(400);
  });
});
