# Rehearse web

The website ([rehearse.hanzlah.com](https://rehearse.hanzlah.com)), the API the desktop app talks to, and the background jobs that review talks with the LLM. Never sees audio.

TanStack Start (React) with Tailwind v4, an [oRPC](https://orpc.dev) API, Drizzle + Postgres, [Inngest](https://www.inngest.com) jobs, and the Vercel AI SDK on Groq. Deployed on Netlify.

## Run it

From the repo root, `bun run dev` starts this app together with the Inngest dev server and the desktop app (see the [root README](../../README.md) for setup). On its own:

```sh
cp .env.example .env   # DATABASE_URL and GROQ_API_KEY
bun run dev            # http://localhost:3000
bun run inngest:dev    # http://localhost:8288, runs the review jobs
```

API docs (development only): <http://localhost:3000/api/docs>, spec at `/api/spec.json`.

## Where things are

| Path | What |
| --- | --- |
| `src/routes/` | Pages (the landing page at `/`), the `/download/$id` redirect, and the API and Inngest endpoints under `api/` |
| `src/components/` | The landing page's sections |
| `src/server/` | All server code: oRPC setup, errors, the database, and one folder per feature in `modules/` (`auth`, `topics`, `feedback`) |
| `src/server/modules/feedback/` | The review: submit and usage limits, the Inngest function, prompts, LLM calls and the sanitizer |
| `drizzle/` | Database migrations (committed) |
| `scripts/` | `add-student.ts` and `seed-topics.ts` |

## Scripts

```sh
bun run dev            # dev server on :3000
bun run build          # production build
bun run inngest:dev    # Inngest dev server
bun run db:generate    # migration from schema changes
bun run db:migrate     # apply migrations
bun run db:studio      # browse the database
bun run student:add    # add or update a student (interactive)
bun run topics:seed    # add the shared topics (idempotent)
bun run typecheck
```

Conventions (errors, procedures, auth, the review pipeline) are in [AGENTS.md](../../AGENTS.md); deploying is in [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md).
