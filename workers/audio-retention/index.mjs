import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { actionFor, encodingFor } from './policy.mjs';

const exec = promisify(execFile);
const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SECRET_KEY;
const dryRun = process.env.DRY_RUN !== 'false';
if (!url || !key || !url.startsWith('https://')) throw new Error('missing_worker_configuration');
const now = new Date();
const deadline = Date.now() + 20 * 60000;
const token = randomUUID();
const counts = { keep: 0, degrade: 0, delete: 0, failed: 0, messages: 0, deliveries: 0, conversations: 0 };

async function request(path, options = {}, binary = false) {
  const response = await fetch(`${url}${path}`, {
    ...options, signal: AbortSignal.timeout(60000),
    headers: { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}), ...options.headers },
  });
  // Never log response bodies: they may contain paths, conversation text, or credentials.
  if (!response.ok) throw new Error(`supabase_http_${response.status}`);
  if (binary) {
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 26 * 1024 * 1024) throw new Error('audio_too_large');
    return Buffer.from(bytes);
  }
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}
const rpc = (name, body) => request(`/rest/v1/rpc/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const objectPath = object => `${encodeURIComponent(object.bucket_id)}/${object.name.split('/').map(encodeURIComponent).join('/')}`;

async function degrade(object) {
  const encoding = encodingFor(object.name);
  const dir = await mkdtemp(join(tmpdir(), 'retention-'));
  try {
    const input = join(dir, 'input');
    const output = join(dir, 'output');
    await writeFile(input, await request(`/storage/v1/object/authenticated/${objectPath(object)}`, {}, true));
    // Local input only; disable network protocols and discard metadata/video.
    await exec('ffmpeg', ['-nostdin','-hide_banner','-loglevel','error','-protocol_whitelist','file,pipe',
      '-i',input,'-map','0:a:0','-vn','-map_metadata','-1','-ac','1','-ar','16000',...encoding.args,'-y',output],
      { timeout: 120000, maxBuffer: 65536 });
    const audio = await readFile(output);
    if (!audio.length) throw new Error('empty_transcode');
    await request(`/storage/v1/object/${objectPath(object)}`, { method: 'PUT', headers: { 'Content-Type': encoding.mime, 'cache-control': 'max-age=0' }, body: audio });
    await request(`/rest/v1/audio_retention_objects?object_id=eq.${object.object_id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ degraded_at: now.toISOString() }),
    });
  } finally { await rm(dir, { recursive: true, force: true }); }
}

let acquired = false;
try {
  acquired = await rpc('retention_acquire', { p_token: token });
  if (!acquired) {
    console.log(JSON.stringify({ event: 'retention_already_running' }));
  } else {
    let after = null;
    let exhausted = false;
    while (Date.now() < deadline) {
      const page = await rpc('retention_audio_page', { p_after: after, p_limit: 100 });
      if (!page.length) { exhausted = true; break; }
      for (const object of page) {
        if (Date.now() >= deadline) break;
        after = object.object_id; // UUID keyset pagination is stable when objects are deleted.
        try {
          const action = actionFor(object, now);
          if (!dryRun && action === 'delete') {
            await request(`/storage/v1/object/${encodeURIComponent(object.bucket_id)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [object.name] }) });
          } else if (!dryRun && action === 'degrade') await degrade(object);
          counts[action]++;
        } catch { counts.failed++; } // Keep originals/references on failure; retry the next execution.
      }
    }
    if (!exhausted) counts.failed++;
    if (!dryRun) {
      while (Date.now() < deadline) {
        const result = await rpc('retention_purge_history', { p_limit: 500 });
        for (const field of ['messages','deliveries','conversations']) counts[field] += result[field];
        if (!result.messages && !result.deliveries) break;
      }
    }
    console.log(JSON.stringify({ event: 'retention_finished', dryRun, ...counts }));
    if (counts.failed) process.exitCode = 1;
  }
} catch {
  console.error(JSON.stringify({ event: 'retention_failed' }));
  process.exitCode = 1;
} finally {
  if (acquired) await rpc('retention_release', { p_token: token }).catch(() => { process.exitCode = 1; });
}
