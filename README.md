# Monorepo Template

A production-ready monorepo template for building web + mobile applications with a shared design system.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | SvelteKit 2, Svelte 5 (Runes) |
| **Styling** | Tailwind CSS 4, shadcn-svelte |
| **Language** | TypeScript 5.9, strict mode |
| **Mobile** | Capacitor 8 (iOS + Android) |
| **i18n** | Paraglide JS (compile-time) |
| **Build** | Vite 7, Turborepo, pnpm workspaces |
| **CI/CD** | GitLab CI, Docker (BuildKit), Helm + Kubernetes |
| **Code Quality** | ESLint 9, Prettier, svelte-check |
| **Testing** | Vitest |

## Project Structure

```
├── apps/
│   ├── web/                  # SvelteKit web app (SSR, Node adapter)
│   │   ├── chart/            # Kubernetes Helm chart
│   │   ├── .gitlab/          # App-specific CI/CD deploy pipeline
│   │   ├── messages/         # i18n translation files
│   │   ├── Dockerfile        # Multi-stage production build
│   │   └── src/
│   │
│   └── mobile/               # SvelteKit mobile app (SPA, Static adapter)
│       ├── messages/         # i18n translation files
│       ├── Gemfile           # Fastlane (iOS/Android deployment)
│       ├── capacitor.config.ts
│       └── src/
│
├── packages/
│   ├── ui/                   # Shared design system (56 shadcn-svelte components)
│   ├── typescript-config/    # Shared TypeScript base config
│   └── eslint-config/        # Shared ESLint rules
│
├── .gitlab-ci.yml            # Root CI pipeline
├── .gitlab/ci/               # Reusable CI pipeline fragments
├── turbo.json                # Turborepo task orchestration
├── pnpm-workspace.yaml       # Workspace definition
└── package.json              # Root scripts and dev dependencies
```

---

## Getting Started

### Prerequisites

- **Node.js 22** (see `.nvmrc`)
- **pnpm 10.30+** (`corepack enable && corepack prepare pnpm@10.30.3 --activate`)
- **Git LFS** (optional, for large binary assets)

### 1. Clone and rename

```bash
# Clone this template into your project directory
cp -r <template-dir> my-project
cd my-project

# Reinitialize git
rm -rf .git
git init
```

### 2. Replace placeholders

Search-and-replace these placeholders across the entire project:

| Placeholder | Where | Replace with |
|------------|-------|-------------|
| `my-app` | `package.json` (root) | Your monorepo package name (e.g. `acme-platform`) |
| `My App` | `messages/*.json`, `capacitor.config.ts` | Your app's display name |
| `Meine App` | `messages/de.json` | German translation of your app name |
| `com.example.myapp` | `apps/mobile/capacitor.config.ts` | Your reverse-domain app ID (e.g. `com.acme.myapp`) |
| `app.example.com` | `apps/web/chart/values.yaml` | Your production domain(s) |
| `my-app/web:latest` | `apps/web/chart/values.yaml` | Your Docker registry image path |
| `replace me` / `replace_me` | `apps/web/.env.example`, `apps/mobile/.env.example` | Describe expected values or leave as-is |

**Quick find command** to locate all placeholders:

```bash
grep -rn "my-app\|My App\|Meine App\|com\.example\|app\.example\|replace.me\|replace_me" \
  --include="*.json" --include="*.yaml" --include="*.yml" --include="*.ts" --include="*.env*" .
```

### 3. Configure i18n locales

Edit the locale list in both apps if you need different languages:

- `apps/web/project.inlang/settings.json` — set `baseLocale` and `locales`
- `apps/mobile/project.inlang/settings.json` — set `baseLocale` and `locales`

The template ships with `en` (base) and `de`. Add/remove locales as needed and create matching `messages/<locale>.json` files.

### 4. Install dependencies

```bash
pnpm install
```

### 5. Run development servers

```bash
# Both apps in parallel
pnpm dev

# Or individually
pnpm --filter web dev        # Web app at http://localhost:5174
pnpm --filter mobile dev     # Mobile app at http://localhost:5173
```

### 6. Verify the setup

```bash
pnpm check       # TypeScript + Svelte type checking
pnpm lint        # ESLint
pnpm format      # Prettier (auto-fix)
pnpm test        # Vitest
pnpm build       # Production build (all apps)
```

---

## Next Steps by Area

### Design System (`packages/ui`)

The UI package includes 56 pre-built shadcn-svelte components. To add more:

```bash
cd packages/ui
pnpm dlx shadcn-svelte@latest add <component-name>
```

Customize the theme by editing color tokens in `packages/ui/src/globals.css`.

### Web App (`apps/web`)

- Add routes in `apps/web/src/routes/`
- Add translations in `apps/web/messages/*.json`
- The web app uses `@sveltejs/adapter-node` for server-side rendering

### Mobile App (`apps/mobile`)

1. **Initialize native platforms:**
   ```bash
   cd apps/mobile
   pnpm build
   pnpm dlx cap add android
   pnpm dlx cap add ios
   pnpm dlx cap sync
   ```

2. **Configure Capacitor** in `capacitor.config.ts`:
   - Set your `appId` and `appName`
   - Configure splash screen colors
   - Set up OTA update URLs (if using Capgo)

3. **Set up Fastlane** for automated store deployments:
   ```bash
   cd apps/mobile
   bundle install
   bundle exec fastlane init
   ```

### Git LFS (for binary assets)

Uncomment and adjust patterns in `.gitattributes` for your asset paths:

```gitattributes
apps/mobile/assets/*.png filter=lfs diff=lfs merge=lfs -text
apps/mobile/src/assets/**/*.mp3 filter=lfs diff=lfs merge=lfs -text
```

Then initialize: `git lfs install`

### CI/CD (GitLab)

The pipeline is pre-configured with:

- **Change detection** via `turbo-ignore` — only rebuilds apps with changes
- **Docker builds** via BuildKit (rootless)
- **Kubernetes deployment** via Helm charts

To activate:

1. Set these CI/CD variables in GitLab:
   - `TURBO_TEAM`, `TURBO_TOKEN` — for Turbo remote cache
   - `DEFAULT_KUBE_CONTEXT` — your GitLab Kubernetes agent
   - `HOST` — your production domain
   - `AUTOSCALING_MIN_REPLICAS`, `AUTOSCALING_MAX_REPLICAS`
   - Any `PUBLIC_*` env vars your app needs

2. To add more deployable apps, add entries to the `parallel.matrix` in `.gitlab-ci.yml` and create a matching `.gitlab/.gitlab-ci.deploy.yml` in the app directory.

### Analytics (Umami)

Both apps are pre-wired for [Umami](https://umami.is/) privacy-focused analytics. Set these env vars:

```env
PUBLIC_UMAMI_HOST=https://analytics.example.com/script.js
PUBLIC_UMAMI_WEBSITE_ID=your-website-id
```

---

## Working with Coding Agents and GSD (Get Shit Done)

This project is designed to work with [GSD](https://github.com/glittercowboy/get-shit-done) — an AI-powered project management workflow that provides structured planning, execution, and verification through slash commands. It works with Claude Code, OpenCode, Gemini, and other AI coding runtimes.

For optimal context and knowledge seeding keep the references up-to-date. See `setup-agent-env.sh` and the `AGENTS.md` file. `CLAUDE.md` is a symlink to `AGENTS.md`, so you only need to update one file to keep all Agent harnesses in sync.

Periodically run `./setup-agent-env.sh` to update code references.

### Installing GSD

#### Claude Code

```bash
# Interactive installer (recommended for first-time setup)
npx get-shit-done-cc@latest

# Non-interactive: install globally for all projects
npx get-shit-done-cc@latest --claude --global

# Non-interactive: install locally for this project only
npx get-shit-done-cc@latest --claude --local
```

The interactive installer will ask you to select your runtime and whether to install globally (`~/.claude/`) or locally (`./.claude/` in the project).

After installation, restart Claude Code and verify with `/gsd:help`.

#### OpenCode

```bash
# Interactive installer
npx get-shit-done-cc@latest

# Non-interactive: install globally
npx get-shit-done-cc@latest --opencode --global
```

This installs to `~/.config/opencode/`. OpenCode uses GSD agents as subagents — you can optionally configure model assignments in `~/.config/opencode/opencode.json`:

```json
{
  "agent": {
    "gsd-planner": { "model": "your-provider/model-id" },
    "gsd-executor": { "model": "your-provider/model-id" },
    "gsd-verifier": { "model": "your-provider/model-id" }
  }
}
```

#### All Runtimes at Once

```bash
npx get-shit-done-cc@latest --all --global
```

#### Updating GSD

```bash
npx get-shit-done-cc@latest
```

The updater detects your current version, shows a changelog, and performs a clean install. If you had local modifications, they are backed up to `gsd-local-patches/` and can be reapplied with `/gsd:reapply-patches`.

### Initial Project Setup

When starting a new project from this template, initialize GSD:

```
/gsd:new-project
```

This will:
- Gather deep context about your project through interactive questions
- Research your domain and tech ecosystem
- Create a `PROJECT.md` with requirements, success criteria, and constraints
- Generate a phased roadmap in `.planning/`

### Core Workflow

GSD follows a **plan-execute-verify** loop organized into milestones and phases:

```
1. /gsd:new-project          → Define project, create roadmap
2. /gsd:plan-phase            → Create detailed plan for next phase
3. /gsd:execute-phase         → Execute the plan (atomic commits, parallel agents)
4. /gsd:verify-work           → Validate features through conversational UAT
5. /gsd:progress              → Check status and route to next action
```

### Command Reference

#### Project & Milestone Management

| Command | When to use |
|---------|------------|
| `/gsd:new-project` | Starting a brand new project from scratch |
| `/gsd:new-milestone` | Starting a new major version or milestone cycle |
| `/gsd:audit-milestone` | Before archiving — verify milestone completeness |
| `/gsd:complete-milestone` | Archive a finished milestone, prepare for next |

#### Phase Planning & Execution

| Command | When to use |
|---------|------------|
| `/gsd:progress` | Check where you are and what to do next |
| `/gsd:discuss-phase` | Gather context through questions before planning |
| `/gsd:list-phase-assumptions` | Surface AI assumptions before committing to a plan |
| `/gsd:plan-phase` | Create a detailed executable plan (PLAN.md) |
| `/gsd:execute-phase` | Execute all plans in a phase with parallel agents |
| `/gsd:quick` | Run a small task with GSD guarantees (atomic commits) |

#### Verification & Quality

| Command | When to use |
|---------|------------|
| `/gsd:verify-work` | Conversational UAT — validate built features work |
| `/gsd:add-tests` | Generate tests for a completed phase |
| `/gsd:map-codebase` | Analyze codebase architecture with parallel agents |

#### Task & Phase Management

| Command | When to use |
|---------|------------|
| `/gsd:add-phase` | Add a new phase to the end of the roadmap |
| `/gsd:insert-phase` | Insert urgent work between existing phases |
| `/gsd:remove-phase` | Remove a future phase and renumber |
| `/gsd:add-todo` | Capture an idea or task for later |
| `/gsd:check-todos` | Review pending todos |

#### Session Management

| Command | When to use |
|---------|------------|
| `/gsd:pause-work` | Create a handoff document when stopping mid-phase |
| `/gsd:resume-work` | Resume work from a previous session with full context |
| `/gsd:debug` | Systematic debugging with persistent state |

#### Configuration

| Command | When to use |
|---------|------------|
| `/gsd:settings` | Configure workflow toggles and model profile |
| `/gsd:set-profile` | Switch model profile (quality/balanced/budget) |
| `/gsd:health` | Diagnose and repair planning directory issues |
| `/gsd:cleanup` | Archive accumulated phase directories |
| `/gsd:update` | Update GSD to the latest version |
| `/gsd:help` | Show all available commands |

### Typical Session Flow

**Starting a new feature:**
```
/gsd:progress              → See current state
/gsd:discuss-phase         → Clarify what the phase should do
/gsd:plan-phase            → Generate the plan
/gsd:execute-phase         → Build it
/gsd:verify-work           → Test it
/gsd:progress              → Move to next phase
```

**Resuming after a break:**
```
/gsd:resume-work           → Restore full context from last session
/gsd:progress              → See where you left off
```

**Quick fix or small task:**
```
/gsd:quick                 → Execute with atomic commits, skip heavy planning
```

---

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Production build (all apps) |
| `pnpm check` | Type-check all packages |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format all files with Prettier |
| `pnpm test` | Run all tests |
| `pnpm paraglide:compile` | Compile i18n messages |
| `pnpm --filter <app> dev` | Dev server for a single app |
