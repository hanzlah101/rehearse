# Rehearse desktop

The Rehearse app for macOS, Windows and Linux. It records a talk, analyses it on the computer (speech model, Praat, metrics), sends only the text and numbers to the API for the LLM review, and shows the score, the marked-up transcript and a better version to read aloud.

Tauri 2 (Rust) with React, TanStack Router + Query, React Aria (shadcn `aria-nova`) and Tailwind v4. Rehearsals live in SQLite on the device; audio never leaves it.

## Run it

From the repo root, `bun run dev` starts this app together with the API and the Inngest dev server (see the [root README](../../README.md) for setup). On its own, with the API already running on `http://localhost:3000`:

```sh
bun run tauri dev
```

It talks to `VITE_API_URL` (default `http://localhost:3000`). `tauri dev` fetches the Praat sidecar first; the speech model (about 1.7 GB) downloads on first use.

## Where things are

| Path | What |
| --- | --- |
| `src/routes/` | Every route (thin files: guards and loaders) |
| `src/modules/` | One folder per feature: `analysis` (the background pipeline), `session` (recording), `rehearsal` (the report), `history` (local data, sidebar), `auth`, `settings`, `onboarding`, `common` |
| `src/components/ui/` | Shared UI components on React Aria |
| `src-tauri/src/` | Rust: `speech.rs` (CrisperWhisper, Praat, model download), `db.rs` (SQLite), `auth.rs` (OS credential store), `window.rs` (opening the window) |
| `drizzle/` | Local database migrations, applied on launch |

## Scripts

```sh
bun run tauri dev      # run the app
bun run tauri build    # build an installer for this machine
bun run typecheck
bun run lint:rust      # cargo clippy
bun run format:rust    # cargo fmt
bun run db:generate    # local migration from schema changes
bun run praat:fetch    # fetch the Praat sidecar into src-tauri/binaries
bun test               # unit tests
```

Use `bun run tauri`, not `bunx tauri` (that's an unrelated npm package). Conventions are in [AGENTS.md](../../AGENTS.md); releasing is in [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md).
