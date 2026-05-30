# Local development — auth & credentials

BootRise does **not** ship a fixed username/password. Use one of the modes below.

## Supabase URL for the browser

Next.js only exposes `NEXT_PUBLIC_*` vars to client components. If you already set `SUPABASE_URL` in `.env`, `next.config.mjs` mirrors it to `NEXT_PUBLIC_SUPABASE_URL` at dev/build time. You can still set `NEXT_PUBLIC_SUPABASE_URL` explicitly if you prefer.

## Local auth bypass (default on `npm run dev`)

**You do not need to sign in on localhost.** When `NODE_ENV=development`, BootRise acts as **dev@bootrise.local** for all workspace APIs and the UI. Preview deployments also keep the bypass open when `VERCEL_ENV=preview` (or `BOOTRISE_PREVIEW_DEV=1` for non-Vercel preview stacks). Live production builds never enable this.

| Variable | When to set | Effect |
| --- | --- | --- |
| *(none)* | Normal local testing | Bypass **on** — workspace loads immediately and local credit gates stay open |
| `BOOTRISE_DEV_AUTH_STRICT=1` | Test magic link / GitHub / cookies | Bypass **off** — real Supabase auth required |
| `BOOTRISE_DEV_AUTH_BYPASS=0` | Same as strict | Bypass **off** |
| `BOOTRISE_DEV_AUTH_BYPASS=1` | Explicit (optional) | Bypass **on** (redundant in dev) |

Optional identity overrides:

| Variable | Default | Purpose |
| --- | --- | --- |
| `BOOTRISE_DEV_USER_ID` | `dev-user` | Synthetic user id for APIs |
| `BOOTRISE_DEV_USER_EMAIL` | `dev@bootrise.local` | Shown in header |
| `BOOTRISE_DEV_ORG_ID` | `org_default` | Tenant org for API + project scope |
| `BOOTRISE_DEV_BYPASS_INCLUDED_CREDITS` | `1000000` | Synthetic credit balance shown while dev auth bypass is active |
| `BOOTRISE_DEFAULT_ORG_ID` | `org_default` | Must match a row in `bootrise_organizations` if using Supabase DB |

`/auth/sign-in` redirects to the workspace automatically while bypass is active. Auth code paths remain in the repo for production and for strict local testing. While bypass stays on, workspace credit checks do not block local dev or preview flows and charges are not persisted.

**Never rely on bypass in live production** — it stays disabled for `NODE_ENV=production` unless the runtime is an explicit preview environment.

## AI chat / fix (separate from Supabase auth)

If you see **"BootRise is not configured for this workspace"**, that means the **AI API key** is missing — not Supabase login.

| Engine | Env variable | Get a key |
| --- | --- | --- |
| BootRise (default) | `NVIDIA_API_KEY` | [NVIDIA Build](https://build.nvidia.com/) |
| ChatGPT | `OPENAI_API_KEY` | OpenAI dashboard |

Add to `.env.local` and restart `npm run dev`:

```env
NVIDIA_API_KEY=nvapi-...
# or
OPENAI_API_KEY=sk-...
```

Without either key, **chat still works** in offline mode (deterministic answers). Full AI code review and enhanced replies need a key.

## GitHub import / push

See **[docs/GITHUB_APP.md](./GITHUB_APP.md)** for `GITHUB_APP_CLIENT_ID`, private key, and installation setup. Check `GET /api/github/status` after restart.

## Admin routes in dev

Add your dev email to admin allowlist:

```env
BOOTRISE_ADMIN_EMAILS=dev@bootrise.local
```

Then open `/admin` (with bypass or real session). Alternatively use an `owner` / `admin` row in `bootrise_org_members` in Supabase.

## Full auth (Supabase + GitHub / magic link)

1. Create a Supabase project and run migrations under `supabase/migrations/`.
2. Set in `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

3. In Supabase Dashboard → Authentication → URL configuration, add redirect URL:
   `http://localhost:3000/auth/callback`
4. Enable Email (magic link) and/or GitHub provider.
5. Sign in at `/auth/sign-in` with your real email or GitHub account.

There is no shared test password — magic link sends to your inbox, or GitHub uses OAuth.

## API testing without a browser

With dev bypass on, cookies are not required for identity; the server reads bypass env on each request. Example:

```bash
curl http://localhost:3000/api/workspace/credits
```

With bypass off, use a Supabase session cookie from a signed-in browser, or test via the UI.

## Styling not loading?

If pages look like plain HTML (Times New Roman, unstyled buttons):

1. Run from repo root: `npm install` then `npm run dev` (not opening files directly).
2. Clear cache: `npm run dev:clean` (or delete `.next` and restart).
3. Confirm `src/app/layout.tsx` imports `./globals.css` and PostCSS is installed (`postcss`, `tailwindcss`, `autoprefixer` in `devDependencies`).
