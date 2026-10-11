# Rehearse — Agent Guide

Rehearse is an AI speaking coach for presentations and business meetings. The user gets a topic, records themselves speaking, and gets feedback on fillers, pauses, pitch/tone, pace, grammar, vocabulary, and formality — then re-records and sees the score improve.

## Workspace

Bun workspace. Two apps:

| Path | What | Stack |
| --- | --- | --- |
| `apps/desktop` | The product. Runs all models locally. | Tauri 2 (Rust) + React + TypeScript + Vite, TanStack Router + Query, oRPC client |
| `apps/web` | Web presence + backend API. Does not run models. | TanStack Start (React), oRPC, Drizzle + Postgres |

Commands (from repo root):

```
bun install
bun run dev             # mprocs: web + desktop (+ db-studio on demand), see mprocs.yaml
bun run dev:desktop     # tauri dev
bun run dev:web         # http://localhost:3000
bun run build:desktop
bun run build:web
bun run lint            # ultracite: oxlint (type-aware) + oxfmt format check
bun run format          # ultracite: auto-fix lint + format
bun run typecheck       # tsc --noEmit (both apps)
bun --filter desktop lint:rust     # cargo clippy, warnings = errors
bun --filter desktop format:rust   # cargo fmt
```

Linting/formatting is **Ultracite on Oxlint + Oxfmt** (no Biome, ESLint, or Prettier). Config: root `oxlint.config.mts` (presets `core`, `react`, `shadcn` + `@shadcn/lint` plugin) and `oxfmt.config.mts`; `apps/web/oxlint.config.ts` extends root and adds the `tanstack` preset. `@shadcn/lint` flags class names Tailwind doesn't know. Types: `type` aliases, not `interface` (lint-enforced everywhere; the only exception is a `declare module` augmentation, which needs `interface` and gets a `// oxlint-disable-next-line typescript/consistent-type-definitions` on that line), derive with `Pick`/`Omit`/`Extract`/`z.infer`/`$inferSelect` instead of redeclaring shapes. Style: `function` declarations for named functions (convention, `func-style` is off) and components (enforced), arrows only inline (e.g. callbacks); the rules enforce kebab-case filenames, sorted object keys, no `||` for defaults (use `??`), no unsafe `as` casts. Run `bun run format && bun run lint && bun run typecheck` before finishing any task.

**TypeScript 7** (native compiler) in both apps. Import from `src/` with the `@/` alias only (`@/styles.css?url`, `@/app`), never `./` or `../`. Alias is defined once in each app's `tsconfig.json` `paths`; Vite reads it via `resolve.tsconfigPaths`.

## Web backend

The API is **oRPC v2** (`2.0.0-beta.43`, pinned) inside TanStack Start. All server code lives in `apps/web/src/server/`; each feature is one folder in `src/server/modules/`.

```
src/
├── env.ts                         # global t3 env (server vars + VITE_ client vars); use `env`, never process.env
├── lib/orpc.ts                    # typed client: in-process on the server (SSR), RPCLink + batching in the browser
├── routes/api/
│   ├── rpc.$.ts                   # wiring: rpcHandler (typed client transport) at /api/rpc
│   └── $.ts                       # wiring: openapiHandler (REST, /api/spec.json, /api/docs) at /api
└── server/
    ├── orpc.ts                    # Context type, publicOS (400/500 declared, declaredErrorsOnly), protectedOS (+401/403, session)
    ├── errors.ts                  # defineError(), ERROR_STATUSES, shared error classes
    ├── constants.ts               # global server constants (COOKIE_OPTIONS: HttpOnly, Lax, Secure in production)
    ├── router.ts                  # root router { auth: authRouter }, AppRouter type
    ├── handlers.ts                # RPCHandler + OpenAPIHandler wiring (CORS, batch, response headers, CSRF, coercion, docs)
    ├── core/
    │   ├── declared-errors.ts     # declaredErrorsOnly middleware + declaredErrorsPlugin (undeclared → typed 500, bad decode → 400)
    │   ├── input-validation.ts    # inputValidation middleware (422 + prettified issues)
    │   └── openapi.ts             # OpenAPI generator, error body schemas, generateOpenAPISpec()
    ├── db/                        # client.ts (drizzle + postgres), schema.ts (tables)
    └── modules/<name>/
        ├── <name>.router.ts       # required: procedures
        ├── <name>.schemas.ts      # required: Zod input/output schemas + z.infer types (Zod-only imports)
        ├── <name>.errors.ts       # module error classes (error factory)
        ├── <name>.service.ts      # optional: logic + DB, no oRPC imports
        ├── <name>.middleware.ts   # optional: oRPC middleware (e.g. auth's requireSession)
        └── <name>.constants.ts    # optional: CONST_CASE tunables; no `env` (schemas import it)
```

- **Procedure = one chain:** `publicOS` (or `protectedOS`)`.meta(openapi({ method, path, summary, tags, successStatus? })).use(inputValidation).input(schema).output(schema).errors({...}).handler(({ input, errors }) => ...)`. Register it in the module's router object and the module in `server/router.ts`.
- **Errors are classes** made with `defineError(code, { message, data?, status? })` from `server/errors.ts` and thrown with `throw new X()`:
  - Standard HTTP codes (`BAD_REQUEST`, `NOT_FOUND`, `UNPROCESSABLE_CONTENT`, …) are only for the shared classes in `server/errors.ts`; they take their status from oRPC's `COMMON_ERROR_STATUS_MAP`.
  - **Module errors always use module-prefixed `SCREAMING_SNAKE` codes** (`AUTH_INVALID_CREDENTIALS`) and declare a standard HTTP status next to them: `defineError("AUTH_INVALID_CREDENTIALS", { status: 401, message, data? })`. A custom code without `status`, a lowercase code, a non-HTTP status (e.g. 418), or `status` on a standard code all fail to compile; reusing a custom code with a different status throws at startup.
  - `defineError` registers custom statuses in `ERROR_STATUSES`, which both handlers and the OpenAPI generator use. There is no hand-maintained status map.
  - Shared classes live in `server/errors.ts` (`BadRequest`, `InternalServerError`, `InputValidationFailed`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`); module classes in `<name>.errors.ts`.
  - Declare every class a procedure throws: `.errors({ [AuthInvalidCredentials.code]: AuthInvalidCredentials })`.
  - Importing `error` or `ORPCError` from `@orpc/server` is lint-banned outside `server/errors.ts` and `server/core/`, so every error goes through `defineError`.
- **Guarantee: a matched procedure only ever returns errors it declares.**
  - `publicOS` declares `BadRequest` (400) and `InternalServerError` (500) on every endpoint.
  - The `declaredErrorsOnly` middleware (procedure level, so SSR calls too) and the `declaredErrorsPlugin` handler interceptor (decode + plugins) turn anything undeclared into a logged (`[orpc] <path> failed`), typed `InternalServerError`. An undeclared `throw new X()` therefore surfaces as 500, never as an untyped error.
  - Malformed bodies/queries (failed decoding) become a typed `BadRequest`.
  - `.use(inputValidation)` before `.input(schema)` adds 422 `InputValidationFailed` (code `UNPROCESSABLE_CONTENT`, `z.prettifyError` message + `data.issues`) only to endpoints with input.
  - The OpenAPI doc therefore lists no `UndefinedError`. Unknown routes return `{ defined: false, code: "NOT_FOUND" }` (no procedure to declare against). Network/proxy failures (499, 502–504) are not part of the API; clients keep one generic fallback for them.
  - `protectedOS` adds `Unauthorized` (401, no/expired session) and `Forbidden` (403, `GetMethodCsrfProtectionHandlerPlugin`). The CSRF plugin is listed before `declaredErrorsPlugin` in `handlers.ts` so the boundary wraps it and the 403 stays typed.
- **Client:** `import { api } from "@/lib/orpc"`; handle errors with `safe(...)` + `isDefinedError(error) && error.code === "AUTH_INVALID_CREDENTIALS"` for typed `error.data`.
- **Frontend-importable server files:** only `src/server/**/*.schemas.ts` and `*.errors.ts` (excluded from Start `importProtection`); everything else in `src/server` is blocked from client bundles.
- **CORS:** `CORS_ORIGINS` (comma-separated), credentials on.
- **CSRF:** session cookie is `SameSite=Lax`; `GetMethodCsrfProtectionHandlerPlugin` blocks cross-site GET navigations. Any public GET it can block would surface as 500, so GET procedures that need it go under `protectedOS`.
- **Context:** `headers`, `clientIp` (from Start's `getRequestIP`, passed in by the routes and the SSR client), `resHeaders` (from `ResponseHeadersHandlerPlugin`; absent for in-process SSR calls, so cookies can't be set there). Cookies via `@orpc/server/helpers` (`getCookie`/`setCookie`/`deleteCookie`).
- **Auth:** student ID + password, **no signups**. Add students: `bun --filter web student:add <student-id> "<name>"` (prompts for password; re-running resets it). Argon2id via `@node-rs/argon2`; unknown IDs verify against a dummy hash so timing doesn't leak them. Procedures: `auth.login` (POST `/auth/login`), `auth.session` (GET `/auth/session`, protected), `auth.logout` (POST `/auth/logout`, 204).
- **Sessions:** random token in an HttpOnly `session` cookie (`SameSite=Lax`, `Secure` in production, 30 days); only its SHA-256 is stored, with student, expiry, IP, user agent. Protected procedures read `context.session` (`{ expiresAt, student }`).
- **Docs** (non-production): `/api/docs` (Scalar), `/api/spec.json` (OpenAPI 3.2), generated from the router.
- **DB:** Drizzle + `postgres`; `db.select()/insert()/update()/delete()` only, never `db.query.*`. Tables in `src/server/db/schema.ts`; migrations in `drizzle/` (committed).

```
bun --filter web db:generate   # create migration from schema changes
bun --filter web db:migrate    # apply migrations
bun --filter web db:studio     # browse data
```

## Desktop app

TanStack Router (file-based, code-split) + TanStack Query + oRPC client. All routes live in one place, `src/routes/` (TanStack's default; the plugin generates `routeTree.gen.ts` from it). Each feature's code is one folder in `src/modules/`; route files stay thin and import their page from the module.

```
src/
├── main.tsx                       # QueryClientProvider + RouterProvider
├── router.tsx                     # queryClient, router (context: { queryClient }), Register
├── routeTree.gen.ts               # generated, committed
├── routes/                        # every TanStack file route (thin: beforeLoad + component)
│   ├── __root.tsx                 # beforeLoad: context.session (Session | null) from sessionQueryOptions
│   ├── (auth)/                    # route.tsx = requireGuest layout; login.tsx
│   └── (private)/                 # route.tsx = requireSession layout; index.tsx (home)
└── modules/
    ├── common/
    │   ├── lib/env.ts             # t3 env (VITE_API_URL, default http://localhost:3000)
    │   ├── lib/orpc.ts            # `api` (typed RouterClient<AppRouter>, cookies included) + `orpc` (TanStack Query utils)
    │   ├── lib/query-client.ts    # createQueryClient(): no retry on 401
    │   ├── lib/errors.ts          # isUnauthorized(error), getErrorMessage(error, fallback)
    │   └── components/title-bar.tsx # overlay title bar: drag region, logo, theme Switch
    └── <name>/                    # only the folders a module needs
        ├── pages/                 # one component per route, imported by src/routes/
        ├── components/
        ├── queries/               # queryOptions
        ├── actions/               # mutation hooks (useX)
        └── lib/
```

- **Route groups:** `(auth)` = logged-out only (`requireGuest`, context `session: null`, logged-in → `/`); `(private)` = logged-in only (`requireSession`, context `session: Session`, logged-out → `/login`). Both layouts are `src/routes/(auth)/route.tsx` and `src/routes/(private)/route.tsx`; add a page by putting its route file in the matching group folder so it inherits the guard.
- **Launch:** `__root` awaits the session in `beforeLoad`; its `pendingComponent` is `SplashPage` (`modules/common/pages/`, just the centered logo from `src/assets/logo.svg`) with `pendingMs: 0` (shown at once, held for the default 500ms minimum so fast loads don't flicker). `index.html` inlines the light/dark `--background` so the window isn't white before CSS loads; keep it in sync with `index.css`.
- **Session:** `sessionQueryOptions` (`modules/auth/queries/session.ts`) maps 401 to `null`, `staleTime: "static"`; it only changes through the login/logout actions. Read it in `(private)` pages with `useSession()` (same file), not with `useQuery`.
- **Typed API:** desktop imports `AppRouter` from the web app (type-only) and may import web `*.schemas.ts` at runtime (Zod-only, e.g. `loginInputSchema` from `@server/modules/auth/auth.schemas` for form validation). Desktop code imports web sources with `@server/*` and `@env` (desktop `tsconfig.json` paths to `../web/src/...`). The same paths are also mapped under `@/server/*` and `@/env` only so the web files' own imports resolve when desktop typechecks `AppRouter`; desktop code importing those is lint-banned (root `oxlint.config.mts` override). So web server code may only import `@/env` and `@/server/*` (anything else breaks desktop typecheck). Never import any other web server code at runtime.
- **Forms:** `useAppForm` (`src/hooks/use-form.ts`, TanStack Form `createFormHook`) + `src/components/ui/form.tsx` on React Aria: `<form.AppForm><Form>` → `<form.AppField name>{() => <FormField><FormLabel/><Input/> or <PasswordField/><FormError/></FormField>}` → `<FormSubmit>`. `FormField` is a React Aria `TextField` bound to the field (value, blur, invalid once `isTouched && !isValid`, disabled while submitting), so labels, `aria-invalid` and `aria-describedby` are wired automatically. Validation: `validationLogic: revalidateLogic()` + `validators: { onDynamic: <web Zod schema> }` (quiet until the first submit, then re-checks on every change). `onSubmit` calls `mutate` (never `mutateAsync`, so nothing rejects into `handleSubmit` and no try/catch is needed) and passes `isPending={mutation.isPending}` to `<Form>`, which keeps fields disabled and the submit button spinning until the request settles.
- **Mutation errors:** every action hook (`modules/<name>/actions/useX`) handles its own failures in `onError`: `const errorMessage = getErrorMessage(error, "Couldn't <action>. …")` first (`modules/common/lib/errors.ts`; the server's message for declared errors, the inline fallback otherwise), then `if (!isDefinedError(error))` → `toast.error(errorMessage)` (transport), else `match(error.code).with(…).exhaustive(() => toast.error(errorMessage))` from `ts-pattern` over the procedure's declared codes, so adding a declared error to a procedure fails typecheck until every caller handles it (the `exhaustive` fallback only covers runtime surprises). The guard is required: transport failures are plain `Error`, which has no `code`. `onSuccess` navigates with `void navigate({ replace: true, to })`, not awaited. There is no global mutation or query error handler.
- **Toasts:** Sonner (`src/components/ui/sonner.tsx`, `richColors`, mounted in the root route); don't add per-form error alerts.
- **API URL:** `VITE_API_URL`. The web API must list the desktop origin in `CORS_ORIGINS` (dev: `http://localhost:1420`).

## Desktop UI

- **shadcn/ui, `aria-nova` style** (`apps/desktop/components.json`): components are built on **react-aria-components**, not Radix. Add components with `bunx shadcn@latest add <name>` from `apps/desktop`, then run `bun run format` and make sure every named component is a `function` declaration (lint rule `react/function-component-definition`).
- **Tailwind v4**, theme lives in `apps/desktop/src/index.css` as OKLCH CSS variables. No `tailwind.config`.
- **Palette "cobalt":** neutral surfaces (near-zero chroma; dark mode body is pure gray, never tinted) with ink text and a saturated cobalt `--primary` (hue 262) with white text in both modes. Dark-mode `--border`/`--input` are white at 14%/22% so hairlines stay visible. No gradient washes. Use theme tokens (`bg-primary`, `text-muted-foreground`), never raw colors.
- **Icons:** Tabler (`@tabler/icons-react`, `components.json` `iconLibrary: "tabler"`). Prefer the filled variants (`IconCircleCheckFilled`, `IconEyeFilled`); fall back to the outline icon only when no filled one exists (`IconEyeClosed`). Loading indicators use `Spinner` (`src/components/ui/spinner.tsx`, 8 fading spokes, `animate-spinner-spoke` keyframe in `index.css`), never a spinning icon. No lucide, no Hugeicons.
- **Button** `isLoading`: React Aria `isPending` (announces progress) + `isDisabled` + `Spinner` (replaces the icon on `icon*` sizes, leads the label otherwise). Use it instead of `isPending`.
- **Logo:** source is `src/assets/logo.svg`: a microphone whose capsule is five waveform bars (the speaker's voice) over a stem and base, flat white on a squircle styled like the primary Button (solid dark-mode `--primary` `#427FF7`, white 28%→0 top light, ink 0→22% bottom shade, 8px inset ink ring, white hairline fading 40%→6%). Change the fill together with the palette. After editing it, render a 1024px PNG and run `bunx tauri icon <png>` from `apps/desktop` to regenerate `src-tauri/icons` (delete the `android/` and `ios/` output).
- **Window:** macOS uses an overlay title bar, so `TitleBar` (`modules/common/components/title-bar.tsx`, rendered by the root layout above every page) carries `data-tauri-drag-region` and keeps its content centered, clear of the traffic lights. Pages fill the rest with `flex-1`, not `min-h-svh`. First launch opens maximized; `tauri-plugin-window-state` then persists size/position/maximized across restarts (so `width`/`height` in `tauri.conf.json` only matter before the first resize).
- **Fonts** are bundled via Fontsource (app works offline): Bricolage Grotesque for `h1`–`h3` (`font-heading`), Figtree for everything else (`font-sans`).
- **Dark mode:** `src/lib/theme.ts` follows the OS until the user flips the `Switch` in `TitleBar`, then persists the choice in `localStorage` (`theme`). It adds `.no-transitions` to `<html>` during the swap so colors change instantly.
- **`@shadcn/lint`**: pages may only position components (margin, width, flex, gap). Appearance (padding, color, type) goes through component variants/sizes — e.g. `<Button size="lg">`, not `className="px-4"`.
- Use React Aria primitives (`TextField`, `Label`) to wire labels and inputs for accessibility.
- **Component feel:** primary Button = top-lit gradient + `shadow-xs-skeuomorphic` + fading white hairline (`before:`); press feedback is `data-pressed:scale-[0.97]` (React Aria state, covers keyboard too), never translate. Input = `ring-1 ring-input ring-inset` + `shadow-xs`, `focus:ring-2 ring-ring`, no border; invalid = React Aria's `data-invalid` → `ring-destructive` (never `aria-invalid:` variants). `InputGroup` draws that same surface and its control goes transparent. shadcn output needs cleanup before it lints (sorted cva keys, no `"use client"`, no `as` casts, strict booleans) and restyling to this feel. Shadow tokens live in `@theme` in `index.css`.
- The web app has no Tailwind or shadcn.

## Core loop

1. Pick a topic (generated by the LLM, categories: presentation / meeting / pitch / interview).
2. 30s prep, then record 60–120s.
3. Analyze (pipeline below).
4. Show overall score % + subscores first.
5. Reveal mistakes progressively: top 3 expanded, the rest collapsed by category (Fillers, Pauses, Pace, Pitch/Tone, Grammar, Vocabulary, Structure). Each mistake = what was said → better version → why.
6. Retry the same topic focused on the top 3. Show diff vs previous attempt ("Fillers 14 → 5, score 62% → 78%").
7. Track progress across sessions.

## Analysis pipeline (all local, $0, offline)

Run steps **sequentially**, unloading each model before the next loads.

| Step | Tool | Output |
| --- | --- | --- |
| 1. Verbatim transcript | **CrisperWhisper 2.0 large** via whisper.cpp (`whisper-rs`) | Words incl. fillers/false starts + word timestamps |
| 2. Prosody | **Praat** CLI as Tauri sidecar (`praat --run script.praat`) | Pitch contour, intensity, pauses per word |
| 3. Metrics | Rust code (no AI) | Fillers/min, WPM, pause stats, pitch variance |
| 4. Feedback | **Qwen3.5 9B Q4_K_M** via llama.cpp `llama-server` sidecar | Grammar, vocab, rephrasings, tone/emphasis coaching, topics |

Fallback LLM when free RAM is low: Qwen3 8B Q4_K_M, then Qwen3.5 4B.

## Hard rules

- **No Python in the shipped app.** Everything is Rust + C++ engines + sidecars. PyTorch is too big to ship.
- **Models are downloaded on first launch, never bundled** in the installer.
- **RAM budget: peak ≤ ~8 GB on a 16 GB machine.** Check free RAM (`sysinfo`) before loading a model; pick a smaller tier or refuse rather than crash. LLM context capped at 4096.
- **Numbers come from code, not the LLM.** Counts, timings, WPM, pitch stats, and the score are computed deterministically. The LLM only explains and suggests.
- **LLM output is schema-constrained JSON** (llama.cpp `json_schema`). Thinking mode off. Temperature 0.2–0.3.
- **LLM must quote the exact phrase** for every mistake, and must not flag normal spoken fragments as errors.
- Prefer two focused LLM calls (1: grammar/mistakes, 2: vocab/rephrasing/tone) over one giant prompt.
- Audio never leaves the user's machine.
- Targets: macOS, Windows, Linux. Don't use platform-specific APIs without a fallback for the other two.

## Scoring

```
score = 0.20*fluency   (fillers/min, pause quality)
      + 0.15*pace      (WPM vs 130–160 target)
      + 0.15*delivery  (pitch variance, intensity)
      + 0.20*grammar   (errors per 100 words)
      + 0.30*content   (LLM rubric 1–5: structure, vocabulary, formality, clarity)
```

## Model footprint

| Model                              | Disk    | RAM        |
| ---------------------------------- | ------- | ---------- |
| CrisperWhisper 2.0 large (GGML q8) | ~1.6 GB | ~2–2.5 GB  |
| Qwen3.5 9B Q4_K_M                  | 6.6 GB  | ~7.5 GB    |
| Praat                              | ~40 MB  | negligible |

## Open items

- CrisperWhisper GGML conversions are community-made. Validate filler F1 against the official `crisperwhisper` Python pipeline on ~10 real clips before relying on them. If worse, consider ONNX conversions or a bundled Python sidecar.
- **License:** CrisperWhisper 2.0 weights are Nyra Health **non-commercial**. Commercial release needs a Nyra license (or swap to Whisper large-v3-turbo, MIT, weaker on fillers). Praat is GPL — run it only as a separate process.
- Measure real latency on Apple Silicon and CPU-only Windows/Linux.
