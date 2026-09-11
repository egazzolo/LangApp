import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionFor, sixMonthsAgo, encodingFor } from './policy.mjs';
test('six calendar months clamp month ends and preserve UTC time', () => {
  assert.equal(sixMonthsAgo(new Date('2024-08-31T12:34:56Z')).toISOString(),'2024-02-29T12:34:56.000Z');
  assert.equal(sixMonthsAgo(new Date('2026-08-31T12:34:56Z')).toISOString(),'2026-02-28T12:34:56.000Z');
});
test('15-day boundary and six-month boundary, regardless of plan', () => {
  const now = new Date('2026-09-08T00:00:00Z');
  for (const plan of ['free','premium_monthly','premium_annual']) {
    const row = { plan, original_created_at: '2026-08-24T00:00:00Z' };
    assert.equal(actionFor(row,now),'degrade');
    assert.equal(actionFor({...row,original_created_at:'2026-08-24T00:00:00.001Z'},now),'keep');
    assert.equal(actionFor({...row,degraded_at:now.toISOString()},now),'keep');
    assert.equal(actionFor({...row,original_created_at:'2026-03-08T00:00:00Z',degraded_at:now.toISOString()},now),'delete');
  }
});
test('retains playback-compatible containers and rejects unknown formats', () => {
  for (const ext of ['mp3','m4a','mp4','webm','wav']) assert.ok(encodingFor(`user/file.${ext}`).mime.startsWith('audio/'));
  assert.throws(()=>encodingFor('unknown.bin'));
  assert.throws(()=>actionFor({original_created_at:'bad'},new Date()));
});
