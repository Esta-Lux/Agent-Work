# Local development — auth & credentials

BootRise does **not** ship a fixed username/password. Use one of the modes below.

## Recommended: dev auth bypass (no Supabase)

Create `.env.local` from `.env.example` and uncomment:

```env
BOOTRISE_DEV_AUTH_BYPASS=1
NEXT_PUBLIC_BOOTRISE_DEV_AUTH_BYPASS=1
BOOTRISE_DEV_USER_ID=dev-user
BOOTRISE_DEV_USER_EMAIL=dev@bootrise.local
```

Optional overrides:

| Variable | Default | Purpose |
| --- | --- | --- |
| `BOOTRISE_DEV_ORG_ID` | `org_default` | Tenant org for API + project scope |
| `BOOTRISE_DEFAULT_ORG_ID` | `org_default` | Must match a row in `bootrise_organizations` if using Supabase DB |

**How to sign in:** restart `npm run dev`, open [http://localhost:3000](http://localhost:3000). The workspace loads as **dev@bootrise.local** with no login form. On `/auth/sign-in` you will see **Continue as dev user**.

**Never set `BOOTRISE_DEV_AUTH_BYPASS=1` in production.** Middleware disables bypass when `NODE_ENV=production`.

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
