# PrepSense

> AI-powered mock interview and campus placement readiness platform. Generates company-specific interview questions, evaluates answers with structured AI feedback, and tracks readiness across sessions — not a single-shot Q&A tool.

## What it does

A student picks a target company, role, practice category (DSA, system design, core CS subjects, or behavioral), and difficulty. PrepSense generates fresh interview questions for that combination, scores each answer against expected key points, and rolls results into a persistent readiness score, topic-level trend tracking, and company-specific topic recommendations built from aggregated question data across all users.

## Tech Stack

- **Backend:** Node.js, Express 5
- **Database:** MongoDB Atlas + Mongoose
- **AI:** Google Gemini API (`@google/genai`) — `gemini-2.5-flash-lite` for question generation, `gemini-2.5-flash` for answer evaluation
- **Auth:** JWT + bcrypt
- **Frontend:** React (Vite) + React Router + Context API
- **Security:** helmet, cors, per-user rate limiting on AI-calling routes

## Current Status

🚧 Actively in development. Backend feature set is ahead of frontend exposure — several endpoints below are fully built and tested but not yet wired into every screen.

### Implemented

- JWT auth (register, login, protected routes) with a live-lookup `isAdmin` check (not trusted from the JWT payload)
- AI question generation, scoped by company, role, difficulty, and practice **category**:
  - **DSA** questions return a full problem-statement schema — description, worked examples, a glossary for non-obvious terms, input/output format, and constraints — not just a one-line prompt
  - System design, core subjects (OS/DBMS/networks), and behavioral use a lighter question schema appropriate to those formats
- Structured-output validation with retry-on-malformed-response, plus response caching keyed by company/role/difficulty/count/category
- Answer evaluation against expected key points, with score, strengths, improvements, and verdict
- Scoring engine: score normalization by difficulty, per-topic aggregation, a documented readiness-score formula, and trend detection across sessions
- Analytics dashboard endpoint: readiness score, topic breakdown, weak/strong areas
- Company insights + leaderboard: aggregated (anonymized) question and score data across all users for a given company
- Recommendations engine: cross-references a user's weak topics against what their target company actually tests
- React frontend: auth flow, dashboard, interview flow, session history, practice setup with category/difficulty/question-count selection, recommendations page
- Production static file serving (Express 5 regex routing, not the `'*'` wildcard that breaks on Express 5)

### Known issues

- DSA question generation is intermittently filtering out valid-looking questions during response validation (root cause under investigation — likely a strict field-shape check rejecting borderline-valid Gemini output)
- The interview-taking screen doesn't yet render the new DSA fields (problem statement, examples, constraints) — schema and generation are ahead of that UI
- No code editor yet for DSA answers — currently a plain textarea for every question type

### Not yet built

- Admin stats page (backend endpoint exists, no frontend)
- Aptitude/MCQ-style questions (current pipeline assumes free-text answers scored against key points; aptitude needs a different question and scoring shape)

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register user |
| POST | `/api/auth/login` | No | Login, get token |
| GET | `/api/auth/me` | Yes | Get current user |
| POST | `/api/sessions` | Yes | Create a session |
| GET | `/api/sessions` | Yes | List user's sessions |
| GET | `/api/sessions/:id` | Yes | Get one session |
| POST | `/api/questions/generate` | Yes | Generate questions for a session |
| POST | `/api/answers/evaluate` | Yes | Evaluate a submitted answer |
| GET | `/api/analytics/overview` | Yes | Readiness, topic breakdown, weak/strong areas |
| GET | `/api/recommendations` | Yes | Personalized + company-matched topic recommendations |
| GET | `/api/companies/:name/insights` | No | Aggregated topic/difficulty data for a company |
| GET | `/api/companies/:name/leaderboard` | No | Anonymized top scores for a company |
| GET | `/api/admin/stats` | Yes (admin) | Platform-wide stats |

## Run Locally

```bash
git clone https://github.com/pratyushm206/PrepSense.git
cd PrepSense
npm install
# create a .env file — see Environment Variables below
npm run dev
```

`npm run dev` runs the Express API (nodemon, port 5000) and the Vite dev server (port 5173) together via `concurrently`.

## Environment Variables

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `NODE_ENV`