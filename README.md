# Rehearse

An AI speaking coach for presentations and meetings. Pick a topic, talk about it, and get feedback on fillers, pauses, pace, pitch, grammar, vocabulary and structure. Then try again and watch the score improve.

Rehearse is in beta. Download it from [rehearse.hanzlah.com](https://rehearse.hanzlah.com) (macOS, Windows, Linux).

## How it works

Your voice never leaves your computer. The desktop app transcribes and measures the talk locally; only the text and the numbers go to the server, which reviews them with an LLM in a background job.

| Step | Where | What |
| --- | --- | --- |
| 1. Transcript | Desktop (Rust) | [CrisperWhisper 2.0](https://huggingface.co/nyrahealth/CrisperWhisper) via whisper.cpp: every word, fillers and false starts included, with timings |
| 2. Prosody | Desktop ([Praat](https://www.praat.org) sidecar) | Pitch, loudness and silences |
| 3. Metrics | Desktop (TypeScript) | Fillers, pace, pauses, repetition, pitch spread. Plain code, no AI |
| 4. Review | Server ([Inngest](https://www.inngest.com) job) | gpt-oss-120b on [Groq](https://groq.com): grammar, vocabulary, rewrites, pauses to take, coverage of the topic, a content check |
| 5. Report | Desktop (TypeScript) | The score, the marked-up transcript and "a better version" to read aloud |

Every number, including the score, comes from code; the LLM only explains and suggests.

## Repository

A [Bun](https://bun.sh) workspace with two apps:

| Path | What | Stack |
| --- | --- | --- |
| [`apps/desktop`](apps/desktop) | The app: records and analyses speech, shows the feedback | Tauri 2 (Rust), React, TanStack Router + Query, React Aria, Tailwind v4, SQLite |
| [`apps/web`](apps/web) | The website, the API and the review jobs | TanStack Start, oRPC, Drizzle + Postgres, Inngest, Vercel AI SDK |

Also here:

- [`AGENTS.md`](AGENTS.md): the full guide to the code (architecture, conventions, every module). Read it before changing anything.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): deploying the website and releasing the desktop app.
- [`docs/PLAN.md`](docs/PLAN.md): the product plan.

## Getting started

### Prerequisites

- [Bun](https://bun.sh) 1.3 or newer
- [Rust](https://rustup.rs) (stable) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your system. whisper.cpp also needs CMake and Clang.
- A Postgres database (local, or a free [Neon](https://neon.tech) one)
- A [Groq](https://console.groq.com) API key

### Setup

```sh
bun install
cp apps/web/.env.example apps/web/.env   # then fill in DATABASE_URL and GROQ_API_KEY
bun --filter web db:migrate              # create the tables
bun run topics:seed                      # add the shared topics
bun run student:add                      # create a student to log in with (there are no signups)
```

### Run it

```sh
bun run dev
```

This starts everything in [mprocs](https://github.com/pvolok/mprocs): the website and API on <http://localhost:3000>, the Inngest dev server on <http://localhost:8288> (it runs the review jobs locally) and the desktop app. Start `db-studio` from mprocs to browse the database.

The first analysis downloads the speech model (about 1.7 GB, once). The app offers it on its home page too.

To run one part on its own: `bun run dev:web`, `bun run dev:inngest` or `bun run dev:desktop`.

## Checks

Run these before opening a pull request; CI runs them too.

```sh
bun run format                     # fix formatting and lint issues (Ultracite: Oxlint + Oxfmt)
bun run lint
bun run typecheck
bun test --cwd apps/desktop
bun --filter desktop lint:rust     # cargo clippy
bun --filter desktop format:rust   # cargo fmt
```

## Deploying

The website deploys to Netlify on every merge to `main`. The desktop app is released by pushing a version tag, which builds every platform on GitHub Actions; installed apps update themselves once the release is published. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Licenses

- The CrisperWhisper 2.0 weights are licensed by Nyra Health for **non-commercial** use only. A commercial release needs a license from them, or a switch to Whisper large-v3-turbo (MIT).
- Praat is GPL. Rehearse runs it only as a separate process and doesn't link it.
