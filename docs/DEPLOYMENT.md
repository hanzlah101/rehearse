# Deployment

Two things ship, in different ways:

|  | Web app + API (`apps/web`) | Desktop app (`apps/desktop`) |
| --- | --- | --- |
| Where | Netlify (functions) + Neon (Postgres) + Inngest Cloud | Installers on GitHub Releases |
| When | Every push to `main` | When you push a `v*` tag |
| Updates reach people | Immediately | On their next launch (auto-updater), once you publish the release |

Workflows: `.github/workflows/ci.yml` (checks on every PR and push to `main`) and `.github/workflows/release-desktop.yml` (desktop builds on tags). Netlify config: `apps/web/netlify.toml`.

## API compatibility

Installed apps can be weeks old. Only add fields and procedures; never rename, remove or tighten what an older app sends or reads.

## How sign-in works across origins

The API serves two kinds of client, and each carries the session its own way:

| Client | Session | Sent as |
| --- | --- | --- |
| Browsers (same origin as the API) | HttpOnly `session` cookie, `SameSite=Lax`, `Secure` in production | the cookie |
| Desktop app | the `token` that `auth.login` returns, kept in the OS credential store (Keychain, Credential Manager, Secret Service) | `Authorization: Bearer <token>`, with `credentials: "omit"` |

The installed app runs at `tauri://localhost` (macOS, Linux) or `http://tauri.localhost` (Windows), which is cross-site to the API, so it never relies on cookies. Those two origins only need to be in `CORS_ORIGINS` (below). The server reads the bearer header first, then the cookie (`getSessionToken`), so both work against the same deployment, and changing a password signs out the student's other sessions whichever way they signed in.

## One-time setup

### 1. Updater signing key (do this first, keep it forever)

Installed apps only accept updates signed with this key. **If you lose the private key, existing installs can never update again.** Store it and its password in a password manager.

```sh
cd apps/desktop
bunx tauri signer generate -w ~/.tauri/rehearse.key
```

- Paste the contents of `~/.tauri/rehearse.key.pub` into `plugins.updater.pubkey` in `apps/desktop/src-tauri/tauri.conf.json` and commit it (it's public).
- The private key and password go to GitHub (next step), nowhere else.

### 2. GitHub repository settings

Settings → Secrets and variables → Actions:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `TAURI_SIGNING_PRIVATE_KEY` | contents of `~/.tauri/rehearse.key` |
| Secret | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | the password you chose |
| Variable | `API_URL` | production API, e.g. `https://rehearse.netlify.app` (baked into the app as `VITE_API_URL`) |

Settings → Actions → General → Workflow permissions: **Read and write** (the release workflow creates releases).

Optional: Settings → Branches → protect `main` and require the **CI** checks to pass before merging.

### 3. Neon (database)

- Production uses the existing database (`DATABASE_URL`).
- Create a **branch** for deploy previews so PR previews never touch real data.

### 4. Inngest Cloud

1. Create an account and an app at inngest.com.
2. Copy the **Event key** and **Signing key**.
3. After the first Netlify deploy, sync the app: URL `https://<your-site>/api/inngest`. It discovers `review-attempt` and re-syncs on each deploy (or install the Netlify integration from Inngest).

### 5. Netlify

1. Add new site → import the GitHub repo. Set **Base directory** to `apps/web`; the rest comes from `apps/web/netlify.toml` (build `bun run build`, publish `dist/client`).
2. Site configuration → Environment variables:

| Name | Value | Contexts |
| --- | --- | --- |
| `DATABASE_URL` | Neon production URL | Production |
| `DATABASE_URL` | Neon preview-branch URL | Deploy previews, branch deploys |
| `GROQ_API_KEY` | Groq key | All |
| `INNGEST_EVENT_KEY` | from Inngest | All |
| `INNGEST_SIGNING_KEY` | from Inngest | All |
| `CORS_ORIGINS` | `tauri://localhost,http://tauri.localhost` (the installed app on macOS/Linux and Windows) | All |
| `NODE_ENV` | `production` | Production |

3. Production deploys run `bun run db:migrate` before building (`apps/web/netlify.toml`), so new migrations apply on deploy.
4. Function limit: 60 s per request, not configurable. Each Inngest step is one request; LLM calls time out at 50 s (`FEEDBACK_CALL_TIMEOUT_MS`) and Inngest retries them.

### 6. OS code signing (optional at first, needed for a wide release)

Without it the app still works, but people see warnings.

| Platform | Without signing | What you need |
| --- | --- | --- |
| macOS | "can't be opened because Apple cannot check it" (right-click → Open gets past it) | Apple Developer Program ($99/yr): a Developer ID Application certificate, exported as `.p12`. Add `APPLE_CERTIFICATE` (base64 of the .p12), `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD` (app-specific password), `APPLE_TEAM_ID` as secrets, then uncomment them in `release-desktop.yml`. |
| Windows | SmartScreen "unknown publisher" (More info → Run anyway) | Azure Trusted Signing or an OV/EV code-signing certificate, configured in `bundle.windows` (Tauri docs: Windows code signing). |
| Linux | No warnings | Nothing. |

## Releasing the desktop app

Versions follow semver (`MAJOR.MINOR.PATCH`): patch = fixes, minor = features, major = breaks old data or behaviour. The single source of truth is `version` in `apps/desktop/package.json` (`tauri.conf.json` reads it).

1. Make sure `main` is green and the web app is already deployed with any API the new version needs (old API, new app must also keep working until everyone updates).
2. Bump `version` in `apps/desktop/package.json`, e.g. `0.1.0` → `0.2.0`.
3. Commit, tag and push:

   ```sh
   git commit -am "release: v0.2.0"
   git tag v0.2.0
   git push && git push --tags
   ```

4. **Release desktop** runs (GitHub → Actions). It checks that the tag matches the version, the public key and secrets exist, then builds macOS (Apple Silicon + Intel), Windows and Linux in parallel and uploads everything to a **draft** release.
5. Download an installer from the draft and try it.
6. Edit the release, write notes, **Publish**. Installed apps fetch `releases/latest/download/latest.json` on launch, download the update in the background and offer "Restart".

A bad release: publish a new patch version with the fix. Updates only move forward (`requireSignedVersion` in the updater config also rejects replayed older releases).

## Day to day

```
feature branch → PR (CI + Netlify deploy preview) → merge to main
  → Netlify deploys the web app (migrations run first)
  → when the desktop is ready: bump version, tag, push → draft release → publish
```

## What's automatic in the app

- The local database migrates itself on launch, so updates never lose rehearsals.
- The speech model (~1.6 GB) downloads on first use and isn't bundled, so installers and updates stay small.
- Recordings and data live in the app data folder, which updates don't touch.
- The update check runs once per launch in release builds only (`modules/common/components/update-checker.tsx`) and never restarts the app by itself.
