const headers = { 'Content-Type': 'application/json' };
// Retired: the Cloud Run job owns both buckets and conversation expiry.
Deno.serve(() => new Response(JSON.stringify({ error: 'retired_use_cloud_run_retention_job' }), { status: 410, headers }));
