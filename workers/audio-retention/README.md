# Audio and conversation retention

Cloud project: `lang-app-507604`. Cloud Run job and service account: `audio-retention-worker`. Cloud Run region: `us-east5`. Scheduler region: `us-east1` (Scheduler does not support `us-east5`).
Supabase project: `hajbbzogslmqypxmaxsh`. Secret Manager: `ferson-supabase-secret-key`, pinned to version 1.

## Deployed status (2026-09-08)

The retention migration and export endpoint are deployed. The Cloud Run job is active with `DRY_RUN=false`. Cloud Scheduler job `audio-retention-daily` is enabled in `us-east1`, daily at 03:00 America/Bogota. Both the initial dry run and the first live execution succeeded with zero failures; the two existing audio objects were too recent to degrade or delete. No existing content was deleted in those runs.

## Policy

- At 15 days, both `voice-notes` and `ferson-voice-replies` are transcoded to mono, lower-quality audio in their existing playback-compatible container. MP3/AAC uses 24 kbps; WebM uses 16 kbps Opus; WAV uses 8 kHz unsigned 8-bit PCM.
- At six UTC calendar months (month ends clamped), audio objects and individual conversation messages expire for every plan. Inactive empty conversation rows also expire. Activity never extends older messages' lifetimes.
- The job deletes audio through the Storage API before removing linked message/delivery rows. PostgreSQL foreign keys detach academic assessments instead of cascading deletion into corrections or pronunciation records.
- Academic records, Tutor corrections, learning skill signals and archived learning counts have no automatic expiry. Explicit account deletion remains separate.
- Conversation export requires a valid signed-in session and a current server-verified premium, trial or grace entitlement. The current app stores chat history locally, so the export endpoint validates the supplied local history and returns retained text only. It does not export signed URLs or audio files.

## Deployment

The Supabase migration is `supabase/migrations/202609080001_audio_and_conversation_retention.sql`.
Deploy the `export-conversation` Edge Function. The old `purge-expired-voice` endpoint is retired with HTTP 410; remove any old scheduler that called it.

Run `./workers/audio-retention/deploy.ps1` from the repository root. It builds only this worker directory, runs synthetic codec checks during the container build, pins the existing secret version, deploys a single-task job, and executes a dry run. The secret value never enters source code or build arguments.

Review Cloud Run execution logs for `retention_finished`, `dryRun: true`, zero failures and plausible counts. The dry run writes only coordination/inventory metadata; it does not replace audio or delete content.

After validation, set `DRY_RUN=false` on the job. Configure Cloud Scheduler to POST to:
`https://run.googleapis.com/v2/projects/lang-app-507604/locations/us-east5/jobs/audio-retention-worker:run`.
Use OAuth with the worker service account and job-scoped `roles/run.invoker`; never expose an unauthenticated service. Daily schedule: `0 3 * * *`, timezone `America/Bogota`. Physical cleanup happens on the next successful scheduled execution after the threshold.

[Google Cloud scheduling documentation](https://docs.cloud.google.com/run/docs/execute/jobs-on-schedule).
[Supabase API-key headers](https://supabase.com/docs/guides/getting-started/api-keys): opaque secret keys are sent in `apikey`; only legacy JWT keys also use a bearer header.

## Retry and operations

The database lease prevents overlapping jobs for 30 minutes. The worker stops admitting work after 20 minutes; the Cloud Run timeout is 25 minutes. Transcoding and HTTP calls have bounded timeouts. Failures produce a nonzero exit code and sanitized aggregate logs. No paths, transcripts, response bodies or credentials are logged. Investigate failed executions; repeating a run is safe. A killed worker's lease expires automatically.

UUID keyset pagination avoids skipping files when deleting more than one page. The inventory preserves original creation timestamps, including offline uploads, so degradation never resets expiry. A failed transcode retains its source; a failed deletion retains database references. Very large backlogs may require additional executions; incomplete scans fail visibly.

## Mobile rollout and limits

Ship/load the updated app to activate device cleanup, user-recording upload, export controls and updated privacy text. Existing binaries cannot be remotely made to erase their local files. The updated app prunes history after hydration, on foreground and once per minute, preserving academic records and a retryable queue of local files to delete. App-owned recordings are removed after cloud upload or expiry. Offline recordings retain their birth date when uploaded.

Local Tutor reviews and archived learning totals are backed up to `academic_records` and restored after authentication. Backups need a successful network connection before uninstall/device loss. Retention preserves academic excerpts, not complete expired chat transcripts. Exported copies explicitly shared by a user are outside app-managed retention.

## Validation

- `npm test` and `npm run typecheck`.
- `node --test workers/audio-retention/policy.check.mjs`.
- PostgreSQL integration: install `@electric-sql/pglite` in a temporary npm prefix, set `PGLITE_PACKAGE` to that prefix, then run `node workers/audio-retention/database.check.mjs` from the repository root. The fixture replaces the unrelated vector extension with a text column; retention SQL itself runs unmodified.
- The image build runs `codec.check.mjs` with FFmpeg/FFprobe for MP3, M4A, WebM and WAV.
