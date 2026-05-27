# GitHub App integration

BootRise uses GitHub credentials for **import**, **branch list**, **push**, and **draft PRs**.

## Recommended: GitHub App installation token

1. Open your app at [GitHub Developer settings → GitHub Apps](https://github.com/settings/apps).
2. Copy **App ID**, **Client ID**, and **Client secret** into `.env.local` (see `.env.example`).
3. Click **Generate a private key** → save the `.pem` file.
4. Set either:
   - `GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"`  
     (use `\n` for line breaks in one line), or  
   - `GITHUB_APP_PRIVATE_KEY_PATH=/absolute/path/to/bootrise-github-app.pem`
5. Set `GITHUB_APP_SLUG` from `https://github.com/apps/<slug>`.
6. **Install** the app on your org or repo: `https://github.com/apps/<slug>/installations/new`
7. Optional: set `GITHUB_APP_INSTALLATION_ID` from the installation URL. If you have exactly one install, BootRise auto-detects it.

Check status (no secrets returned):

```bash
curl -s http://127.0.0.1:3000/api/github/status | jq
```

Restart `npm run dev` after changing env.

## Fallback: personal access token

```env
GITHUB_TOKEN=ghp_...
```

If both `GITHUB_TOKEN` and App credentials are set, **PAT wins** for API calls.

## OAuth helper (dev)

When installation tokens are not configured yet:

- Start: `http://127.0.0.1:3000/api/github/oauth/start`
- Callback: `/api/github/oauth/callback`

Use this only to obtain a **user** token for local testing; production should use installation tokens.

## Permissions (GitHub App)

Typical scopes for BootRise:

- Repository contents: Read & write (import + push)
- Pull requests: Read & write (draft PR)
- Metadata: Read

## Security

- Never commit `.env.local` or private keys.
- Rotate **client secret** if it was exposed in chat or logs.
