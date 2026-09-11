export function sixMonthsAgo(now) {
  const cutoff = new Date(now);
  cutoff.setUTCDate(1);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
  const last = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate();
  cutoff.setUTCDate(Math.min(now.getUTCDate(), last));
  return cutoff;
}
export function actionFor(object, now) {
  const born = new Date(object.original_created_at).getTime();
  if (!Number.isFinite(born)) throw new Error('invalid_object_date');
  if (born <= sixMonthsAgo(now).getTime()) return 'delete';
  if (!object.degraded_at && born <= now.getTime() - 15 * 86400000) return 'degrade';
  return 'keep';
}
export function encodingFor(name) {
  const ext = name.split('.').at(-1).toLowerCase();
  if (ext === 'mp3') return { mime: 'audio/mpeg', args: ['-c:a','libmp3lame','-b:a','24k','-f','mp3'] };
  if (ext === 'm4a' || ext === 'mp4') return { mime: 'audio/mp4', args: ['-c:a','aac','-b:a','24k','-movflags','+faststart','-f','mp4'] };
  if (ext === 'webm') return { mime: 'audio/webm', args: ['-c:a','libopus','-b:a','16k','-f','webm'] };
  if (ext === 'wav') return { mime: 'audio/wav', args: ['-ar','8000','-c:a','pcm_u8','-f','wav'] };
  throw new Error('unsupported_audio_format');
}
