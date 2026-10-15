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
mkdir -p ~/.tauri
cd apps/desktop
bun run tauri signer generate -w ~/.tauri/rehearse.key
```

Use `bun run tauri` (the project's `@tauri-apps/cli`), not `bunx tauri`: on npm, `tauri` is an unrelated old package. Run it in your own terminal; it asks for the password.

- Paste the contents of `~/.tauri/rehearse.key.pub` into `plugins.updater.pubkey` in `apps/desktop/src-tauri/tauri.conf.json` and commit it (it's public).
- The private key and password go to GitHub (next step), nowhere else.

### 2. GitHub repository settings

Settings → Secrets and variables → Actions:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `TAURI_SIGNING_PRIVATE_KEY` | contents of `~/.tauri/rehearse.key` |
| Secret | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | the password you chose |
| Variable | `API_URL` | production API, e.g. `https://rehearse.netlify.app` (baked into the app as `VITE_API_URL`) |

Settings → Actions → General → Workflow permissions can stay **Read repository contents** (the default): the release jobs ask for write access themselves.

Optional: Settings → Branches → protect `main` and require the **CI** checks to pass before merging.

### 3. Neon (database)

- Production uses the existing database (`DATABASE_URL`).
- Create a **branch** for deploy previews so PR previews never touch real data.

### 4. Inngest Cloud

1. Create an account and an app at inngest.com.
2. Copy the **Event key** and **Signing key**.
3. After the first Netlify deploy, sync the app: URL `https://<your-site>/api/inngest`. It discovers `review-attempt` and re-syncs on each deploy (or install the Netlify integration from Inngest).
4. Both keys must be set on Netlify (below) before syncing. Without `INNGEST_SIGNING_KEY` the SDK runs in cloud mode with no key and `/api/inngest` answers `500 {"code":"internal_server_error"}`: the app can't sync, and reviews stay queued forever. A healthy endpoint answers an unsigned `curl` with `401 Unauthorized`. Reviews submitted before the app was synced don't start by themselves; retry them from the app.

### 5. Netlify

1. Add new site → import the GitHub repo. In Build settings set **Base directory** to `apps/web` and leave **Package directory** and **Build command** empty, so `apps/web/netlify.toml` supplies the build (and the production migration). If the UI insists on a **Publish directory**, it's `apps/web/dist/client` (UI paths start at the repo root). The deploy log's "Resolved config" should show `BUN_VERSION` and a non-`ui` command origin; if it says `ui`, the file wasn't read (a wrong Package directory does this).
2. Site configuration → Environment variables. Mark only the real secrets (`DATABASE_URL`, `GROQ_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`) as "Contains secret values". Netlify fails any build whose secret values appear in the repo, and `production` and the Tauri origins do.

| Name | Value | Contexts |
| --- | --- | --- |
| `DATABASE_URL` | Neon production URL | Production |
| `DATABASE_URL` | Neon preview-branch URL | Deploy previews, branch deploys |
| `GROQ_API_KEY` | Groq key | All |
| `INNGEST_EVENT_KEY` | from Inngest | All |
| `INNGEST_SIGNING_KEY` | from Inngest | All |
| `CORS_ORIGINS` | `tauri://localhost,http://tauri.localhost` (the installed app on macOS/Linux and Windows) | All |
| `NODE_ENV` | `production` | Production, scope **Functions** only (the server reads it at runtime; set for builds it can make the install skip devDependencies) |

3. Production deploys run `bun run db:migrate` before building (`apps/web/netlify.toml`), so new migrations apply on deploy.
4. Function limit: 60 s per request, not configurable. Each Inngest step is one request; LLM calls time out at 50 s (`FEEDBACK_CALL_TIMEOUT_MS`) and Inngest retries them.

### 6. OS code signing (optional at first, needed for a wide release)

Without it the app still works, but people see warnings.

| Platform | Without signing | What you need |
| --- | --- | --- |
| macOS | "Apple could not verify Rehearse is free of malware": open it once from System Settings → Privacy & Security → **Open Anyway** (older macOS: right-click → Open). The bundle is ad-hoc signed (`bundle.macOS.signingIdentity: "-"`); without that signature macOS calls a downloaded app "damaged" with no way past it. | Apple Developer Program ($99/yr): a Developer ID Application certificate, exported as `.p12`. Add `APPLE_CERTIFICATE` (base64 of the .p12), `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD` (app-specific password), `APPLE_TEAM_ID` as secrets, then uncomment them in `release-desktop.yml`. |
| Windows | SmartScreen "unknown publisher" (More info → Run anyway) | Azure Trusted Signing or an OV/EV code-signing certificate, configured in `bundle.windows` (Tauri docs: Windows code signing). |
| Linux | No warnings | Nothing. |

## Releasing the desktop app

Versions follow semver (`MAJOR.MINOR.PATCH`): patch = fixes, minor = features, major = breaks old data or behaviour. The single source of truth is `version` in `apps/desktop/package.json` (`tauri.conf.json` reads it).

**Rehearse is in beta.** Until the first stable release, versions carry a `-beta.N` suffix (`0.1.0-beta.1` → `0.1.0-beta.2` → … → `0.1.0`), and customers see it: a "Beta" badge next to the logo in the app and on the website, "Free while in beta" under the download button, and the release notes open with it. The updater orders these correctly (`0.1.0-beta.2` is newer than `0.1.0-beta.1`, and `0.1.0` newer than both), so betas update straight into the stable release. Two consequences:

- Windows ships only the NSIS installer (`setup.exe`). An MSI's version must be numeric, so it can't carry `-beta`.
- Releases are published as normal releases, not GitHub prereleases: `releases/latest`, which the updater and the website's download links use, skips prereleases. The version and the notes are what say "beta".

When leaving beta, drop the suffix and remove the badges (`Badge` in the desktop sidebar, narrow top bar and login page; the website header) and the "while in beta" wording.

1. Make sure `main` is green and the web app is already deployed with any API the new version needs (old API, new app must also keep working until everyone updates).
2. Bump `version` in `apps/desktop/package.json`, e.g. `0.1.0-beta.1` → `0.1.0-beta.2`.
3. Merge the bump to `main` (PR from `release/v0.1.0-beta.2`, commit `release: v0.1.0-beta.2`), then tag the merged commit and push that tag. The tag must match the version on `main`, or the release stops at its first check (`Tag … doesn't match package.json version …`):

   ```sh
   git checkout main && git pull
   git tag v0.1.0-beta.2
   git push origin v0.1.0-beta.2
   ```

   Tagged too early? Delete the tag (`git push origin :refs/tags/v0.1.0-beta.2 && git tag -d v0.1.0-beta.2`) and any draft release it made, merge the fix, tag again.

4. **Release desktop** runs (GitHub → Actions). It checks that the tag matches the version, the public key and secrets exist, then builds macOS (Apple Silicon + Intel), Windows and Linux in parallel and uploads everything to a **draft** release. Once all four are done, a last job writes the updater's `latest.json` from their signatures (one file written once, so no platform can go missing).
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
- The update check runs once per launch in release builds only (`modules/common/components/update-checker.tsx`) and never restarts the app by itself. A downloaded update is announced once with a toast and stays in the sidebar as an "Update ready" card with Restart; it installs only then (on Windows the installer closes the app).
