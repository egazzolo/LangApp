param(
  [string]$SupabaseUrl = "https://hajbbzogslmqypxmaxsh.supabase.co",
  [string]$SecretVersion = "1"
)
$ErrorActionPreference = 'Stop'
$projectId = 'lang-app-507604'
$region = 'us-east5'
$account = "audio-retention-worker@$projectId.iam.gserviceaccount.com"
# This deploy intentionally starts in dry-run mode. Activate only after reviewing a successful execution.
gcloud run jobs deploy audio-retention-worker --project=$projectId --region=$region --source=$PSScriptRoot --service-account=$account --tasks=1 --parallelism=1 --max-retries=1 --task-timeout=25m --cpu=1 --memory=512Mi --set-env-vars="SUPABASE_URL=$SupabaseUrl,DRY_RUN=true" --set-secrets="SUPABASE_SECRET_KEY=ferson-supabase-secret-key:$SecretVersion" --quiet
if ($LASTEXITCODE -ne 0) { throw 'Worker deployment failed' }
gcloud run jobs execute audio-retention-worker --project=$projectId --region=$region --wait
if ($LASTEXITCODE -ne 0) { throw 'Worker dry run failed' }
