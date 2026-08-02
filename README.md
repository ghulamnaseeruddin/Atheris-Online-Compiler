# Atheris Online Compiler

A professional online code editor and execution platform — write, run, and
share code in every practical language, in a UI structured after
[OneCompiler](https://onecompiler.com/), under the Atheris brand.

```
atheris/
├── frontend/   React + Vite + Tailwind + Monaco Editor (light/dark mode)
└── backend/    Node.js + Express + SQLite, JWT + GitHub/Google OAuth
```

Read this top to bottom before going live — it covers local setup,
required secrets, deployment, and what's genuinely production-ready today
vs. what needs more infrastructure (see "Honest status" below).

---

## 1. Local setup

### Prerequisites
- Node.js 18+ and npm
- Nothing to install for the database — SQLite ships as a single file
  (`backend/data/atheris.db`), created automatically on first run
- For code execution: the toolchains you want to support installed locally
  (e.g. `python3`, `node`, `gcc`/`g++`, `default-jdk`, `go`, `ruby`, `php`,
  `rustc`). You only need the ones you plan to enable — see
  `backend/src/execution/runners/index.js`.

### Backend
```bash
cd backend
cp .env.example .env      # then fill in the values — see section 2 below
npm install
npm run dev                # starts on http://localhost:4000
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                # starts on http://localhost:5173
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` requests to
the backend, so both need to be running.

---

## 2. Environment configuration

All variables live in `backend/.env` (see `backend/.env.example` for the
full annotated list) and `frontend/.env`.

| Variable | Where to get it |
|---|---|
| `SQLITE_DB_PATH` | Optional — path to the SQLite file. Defaults to `backend/data/atheris.db`, created automatically |
| `JWT_SECRET`, `SESSION_SECRET` | Generate with `openssl rand -hex 32` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App. Set the callback URL to `<your-backend-url>/api/auth/github/callback` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) → Create OAuth client ID (Web application). Set the callback URL to `<your-backend-url>/api/auth/google/callback` |
| `CLIENT_URL` | Your deployed frontend origin (used for CORS and OAuth redirects) |
| `EXECUTION_ENGINE_URL` | Only needed if you swap in an external execution worker — see `backend/src/execution/README.md` |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | See "AI Assistant" section below |

The frontend only needs `VITE_API_BASE_URL` pointed at your backend's `/api`
in production (e.g. `https://api.yourdomain.com/api`).

---

### AI Assistant

The chat panel (top-right icon, visible once logged in) is powered by
`backend/src/routes/ai.js` — a thin proxy to any OpenAI-compatible
`/chat/completions` endpoint. It works with real OpenAI, but **OpenAI's API
is pay-per-token, not free** (aside from limited trial credit on new
accounts). For a genuinely free option with no credit card, use
[Groq](https://console.groq.com/keys):

```
AI_API_KEY=<your Groq key>
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
```

Groq's free tier is rate-limited (~30 requests/minute) rather than
metered by cost — fine for personal use or a small number of users, not for
production-scale traffic. Other OpenAI-compatible options if you outgrow it:
OpenRouter (some models tagged `:free`), Google Gemini's OpenAI-compat
endpoint, Together AI, or a self-hosted Ollama server. Swapping providers is
just changing these three env vars — no code changes.

If `AI_API_KEY` is unset, the chat panel returns a clear "not configured"
message instead of erroring — the rest of the app works fine without it.

---

### Auto-installed Python dependencies

When run code imports a library from a curated allowlist (`numpy`, `pandas`,
`matplotlib`, `scipy`, `scikit-learn`, `requests`, `beautifulsoup4`,
`Pillow`, `seaborn`, `Flask`, `Django`, `pytest`, `PyYAML`,
`opencv-python-headless`, `networkx`, `sympy` — see
`backend/src/execution/dependencyInstaller.js` for the full list) and it
isn't already installed, the backend installs it automatically before
running your code, and the output panel shows an `[deps] Installed: ...`
line. It's installed once on the server's Python environment, not per-run,
so only the first script to use a given library pays the install cost —
subsequent runs are instant. Imports outside the allowlist are left alone
and fail with a normal `ModuleNotFoundError`, same as before this feature
existed — this is intentionally not "install anything the user imports",
since that would be a real abuse vector on a shared server.

---

## 3. Deployment

Any Node-friendly host works; a common, low-friction combination:

**Frontend (static build) → Vercel or Netlify**
```bash
cd frontend
npm run build        # outputs frontend/dist
```
Deploy `dist/` as a static site. Set `VITE_API_BASE_URL` as an environment
variable in the host's dashboard before building.

**Backend (Node server) → Render, Railway, or Fly.io**
- Build command: `npm install`
- Start command: `npm start`
- Add every variable from `backend/.env.example` in the host's environment
  variable settings.
- If you're running the built-in subprocess execution engine (see section 5
  below on limits), install the language toolchains you enabled as part of
  the build/Dockerfile for that service.

**Database → SQLite on a persistent disk.** SQLite is a file, not a
service, so there's nothing to provision — but on hosts with an ephemeral
filesystem (most container platforms wipe local disk on redeploy) you must
attach a persistent volume and point `SQLITE_DB_PATH` at a file inside it
(e.g. Render/Fly/Railway "disks" or "volumes"), or the database resets on
every deploy. For a single-instance deployment this is simpler and cheaper
than a hosted MongoDB cluster; it does mean the app can only run one backend
instance at a time (no horizontal scaling) since SQLite is a single local
file.

**Custom domain**: point your domain's DNS at the frontend host (usually a
CNAME to their edge network) and, if you want a subdomain like
`api.yourdomain.com`, point that at the backend host. Update `CLIENT_URL`,
the OAuth callback URLs, and `VITE_API_BASE_URL` to match once the domain is
live — OAuth logins will fail until the callback URLs in the GitHub/Google
app settings match exactly.

---

## 4. Going live — pushing to GitHub

```bash
cd atheris
git init
git add .
git commit -m "Initial commit: Atheris Online Compiler"
git branch -M main
git remote add origin https://github.com/<your-username>/atheris-online-compiler.git
git push -u origin main
```
Add a `.gitignore` (Node's standard one covers `node_modules/`, `.env`,
`dist/`) before your first commit so secrets never get pushed — see the one
included at the repo root. Then connect the repo to your hosting provider
for automatic deploys on push.

---

## 5. Honest status — what's real vs. what needs more infrastructure

This scaffold is a genuine, working full-stack app, not a mockup. Two areas
are intentionally flagged rather than faked:

- **Code execution isolation**: the included execution engine runs code as a
  local subprocess with a timeout — correct for development, but **not a
  security sandbox**. Before accepting untrusted public traffic, route
  execution to an isolated worker (network-disabled container per run).
  Full details and a recommended drop-in (Piston) are in
  `backend/src/execution/README.md`.
- **Full language coverage**: the frontend's language picker already lists
  every language named in the brief, grouped as High-Level / Low-Level /
  Web / Databases / Shell. The backend ships working runners for a starter
  set (Python, JS, TS, C, C++, Java, Go, Ruby, PHP, Rust, Bash); the rest
  need their toolchain wired into a runner entry — a config change, not a
  redesign. See the same README for the list and the recommended path.
- **OAuth / database**: fully implemented in code (Passport strategies, JWT
  issuing, bcrypt hashing, a SQLite-backed repository layer via
  `better-sqlite3`) — the database itself needs no setup or connection
  string, but you do need to supply your own GitHub/Google app credentials,
  since those can't be provisioned on your behalf. See section 3 above on
  persistent disks if deploying to a container host.
- **Transactional email**: the forgot-password flow issues and validates a
  real, time-limited reset token, but actually emailing it is left as a
  one-file integration with whatever provider you choose (Postmark, SES,
  Resend) — see the `TODO` in `backend/src/routes/auth.js`.

---

## 6. Future feature roadmap

Prioritize and approve before implementation, per the brief's change-management note:

- **Orgs / Teams** — shared workspaces, role-based access to snippets
- **Coding challenges** — a practice/problem-set mode with test-case grading
- **Additional accent themes** — beyond light/dark, a set of named color themes (e.g. Dracula, Nord, Solarized, high-contrast) — the toggle is now a real light/dark switch across the whole UI, but a multi-theme picker would need an accent-color system layered on top, touching most components
- **Embeddable editor API** — `<iframe>`/JS-widget embed for docs and courses
- **Mobile app** — React Native or a PWA wrapper of the existing frontend
- **Real-time collaborative editing** — multi-cursor sessions (e.g. via Yjs)
- **Execution worker fleet** — the Piston-style isolated sandbox described above, unlocking every language in the picker
- **Account linking** — let a local (password) account also sign in via GitHub/Google
- **Usage-based rate limiting per account** (vs. the current per-IP limiting)
- **Migrate to Postgres/MySQL** if you outgrow a single-instance SQLite file (e.g. need horizontal scaling or multi-region writes)
