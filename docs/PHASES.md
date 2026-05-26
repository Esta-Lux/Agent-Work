# BootRise delivery phases

## Phase 1 — Beta ✅

Import, chat, architecture health, plan/report, sandbox, export, admin telemetry.

## Phase 2 — Patches & preview ✅

Real patches, approval gate, host dev preview + proxy, disk + **Supabase** pending fixes, Git Trees push, monorepo sandbox.

## Phase 3 — Platform scale ✅

Architecture map, personas, Living Ledger, kill switches, BootRise voice.

## Phase 3+ — Enterprise ✅ Shipped

| Feature | Implementation |
|---------|----------------|
| **WebContainer** | `@webcontainer/api` in **Verify** tab — npm install + dev in browser (COOP/COEP via `next.config.mjs`). Set `BOOTRISE_PREVIEW_MODE=webcontainer` to skip host Node. |
| **Device farm streams** | `POST/GET /api/workspace/streams` → `bootrise_remote_streams` + iframe/WebRTC URL from env templates |
| **SOC2 / multi-tenant** | `003_enterprise_tenancy.sql` — orgs, RLS, `bootrise_living_ledger_events`, `bootrise_pending_fixes`, `bootrise_audit_events` |
| **Cloud ledger** | Hybrid local + Supabase (`x-bootrise-org-id` header) |
| **Cloud audit** | `GET /api/admin/audit` reads `bootrise_audit_events` when migrated |

### Supabase migrations (run in order)

1. `supabase/migrations/001_living_ledger.sql`
2. `supabase/migrations/002_workspace_core.sql`
3. `supabase/migrations/003_enterprise_tenancy.sql`
4. `supabase/migrations/004_repo_canonical.sql` — optional org-level repo registry mirror

Admin → copy combined SQL from `/api/admin/supabase/migration-sql`.

### Env (Phase 3+)

```env
BOOTRISE_DEFAULT_ORG_ID=org_default
NEXT_PUBLIC_BOOTRISE_ORG_ID=org_default
BOOTRISE_PREVIEW_MODE=auto   # auto | webcontainer | host
BOOTRISE_ANDROID_STREAM_URL=https://your-farm.example/android/{repositoryId}
BOOTRISE_IOS_STREAM_URL=https://your-farm.example/ios/{repositoryId}
BOOTRISE_WEBRTC_SIGNAL_URL=wss://your-farm.example/signal/{repositoryId}
```

### WebContainer requirements

- Restart dev server after `next.config.mjs` COOP/COEP headers
- Browser must report `crossOriginIsolated === true`
- Import must include `package.json` + source (WebContainer caps ~400 files)

### Remaining (optional infra)

- Managed device farm provider wiring (URLs above)
- Supabase Auth JWT for end-user RLS (policies ready; service role used today)
- GitHub OAuth + installation tokens (push via GITHUB_TOKEN works today)
- Cross-repo org graph (`004` adds single-repo registry; multi-repo edges are a later schema)
