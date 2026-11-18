# Optional Cloudflare Free counters and automatic clock

Pages will serve all public content without this service. The current tracking UI
is enabled only when ANALYTICS_ORIGIN points at a separately verified Worker.
Check the Cloudflare account is on Workers Free before connecting this project.
The production Worker has no endpoint for changing the Notion or GitHub settings.

## Deploy in order

1. Create a blog-only D1 database, apply schema.sql, and check the singleton
   visitor_state against the final aggregate snapshot from Sites. Preserve the
   three start dates and totals independently. Never initialize an existing
   metric as zero merely because its source failed. Make no copies of the old
   integration secret, account record, browser hashes or raw events for a
   migration between different origins.
2. Copy wrangler.example.toml to a private wrangler.toml, set PAGES_URL to the
   real Pages address and use the real D1 binding. Deploy Worker with tracking,
   reports and external clock still disabled. The /health read must succeed.
3. In a separate test D1 database, verify 1 new anonymous browser, an independent
   homepage opening, a published article reading, a repeated event, a bot and
   an excluded origin. Keep test events out of the production database.
4. On the real site, connect ANALYTICS_ORIGIN to the Worker HTTPS origin. First
   verify the read-only totals, then enable TRACKING_ACTIVE. The website
   publishes an article allowlist and the three Notion switches with each
   successful release. A failed publishing copy leaves the previous release.
5. Set NOTION_REPORT_TOKEN as an encrypted Worker secret with read/insert/update
   permission on the existing daily report database only. Set
   NOTION_REPORT_SOURCE_ID to its data-source ID. Activate REPORTS_ACTIVE
   only after verifying the view and a full day of worker coverage. Existing
   Notion rows on that date update in place. Do not run two active writers.
6. For a clock independent of GitHub's inactivity policy, create a private
   GitHub App installed only on this repository. Grant Actions: Read and write
   and required Metadata: Read. Store its PEM as the GITHUB_APP_KEY Worker
   secret and set GITHUB_APP_ID, GITHUB_INSTALLATION_ID and GITHUB_REPOSITORY.
   Turn on SYNC_ACTIVE, check a real dispatch, then switch PAGES_AUTOMATIC to
   false in GitHub so one clock remains in charge. The worker issues temporary
   repository-scoped tokens and reuses the usual publishing workflow.

The worker excludes known bots, counts events once during retries and expires
raw view-event records after seven days. Daily reports require healthy hourly
checks across a complete Tokyo date. A known gap is left unarchived. No IP or
account identifiers are copied by the worker into the daily report. The public
static site remains readable if counting reaches a free service limit.
