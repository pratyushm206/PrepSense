# PrepSense project interview answers

Use these as concise first-person drafts. Replace bracketed details with measured results from a real run before presenting them as personal achievements.

## 1. Tell me about PrepSense.

I built PrepSense to help students practice for campus interviews with company and role specific mock sessions. A session can use written questions, multiple choice, or a mix. Written answers are evaluated through Gemini, while multiple choice scoring stays local. The app keeps session history and turns successful evaluations into readiness, topic, and performance trends. I built the React and Vite client, Express API, and MongoDB data layer, with JWT authentication and separate request limits for generation and evaluation.

## 2. How did you design question generation?

I separated prompt construction, model calls, and output validation. The model returns structured JSON, and the server validates and normalizes questions before saving them. If the model returns too few valid questions, the server makes one targeted top up request and removes duplicates. Subjective question sets can be reused for 24 hours when the company, role, difficulty, category, and count match. I describe those questions as PrepSense generated practice, not verified company interview questions.

## 3. How do you handle unreliable AI responses?

I ask Gemini for schema constrained output and still validate the response in application code. Transient rate limit or availability errors receive bounded retry behavior. If evaluation remains unavailable, the answer is recorded as failed rather than treated as a zero score, and the student can retry it later. This keeps a provider outage from silently damaging a user's progress history.

## 4. How did you make analytics meaningful?

Analytics use the latest successful evaluation per question. I normalize scores by difficulty through a shared scoring service, then derive topic averages, weak and strong areas, trends, and readiness. The dashboard also shows the recent session scores over time. I reuse the same scoring rules so the dashboard does not disagree with session summaries.

## 5. What security decisions did you make?

Passwords are hashed, protected routes use JWTs, inputs have explicit limits and validation, and generation, evaluation, and authentication have separate rate limits. Public reports expose a sanitized result and can be revoked. Shared report tokens use a partial unique index, so sessions without a public token do not compete for a null unique value. Production deployment still needs a dedicated least privilege Atlas user and a narrow network allowlist.

## 6. What was a tricky database issue?

MongoDB had an older sparse unique index on the report token field. Changing the schema alone would leave that index in place and cause conflicts when sessions had no token. I added a startup migration that drops only the known legacy sparse index, then creates the new partial unique index for string tokens. I verified the index shape against Atlas and used temporary records that were deleted immediately after the check.

## 7. How did you keep the API responsive as data grows?

The session history endpoint returns only summary fields. Company insights, leaderboards, recommendations, and admin metrics use MongoDB aggregation to do filtering and grouping close to the data. The dashboard analytics query is bounded to the user's sessions, and the visible score history is limited to the 12 latest evaluated sessions.

## 8. How did you test it?

I added unit coverage for MCQ scoring, difficulty normalization, session scoring, trend detection, and generated question validation. I also checked the React production build and the API health route against Atlas. Before a public launch, I would exercise registration, login, question generation, written evaluation, MCQ scoring, share revocation, and mobile layouts through a dedicated smoke account and record the results.

## 9. What would you improve next?

I would add end to end tests around the full student journey, make the dashboard bundle smaller with route based code splitting, and instrument model latency, retry rates, and evaluation failures. I would also compare generated sets for quality across categories and difficulty levels before making any claims about company specific accuracy.

## 10. What result did the project achieve?

I have not yet measured a production user count or interview outcome, so I would report implementation and verification facts instead of inventing impact. The current local suite has [test count] passing tests, and the deployed service has [verified user count] registered users after launch. I would update those values from the actual run and database before using this answer.

## Resume bullets

- Built PrepSense, a React, Express, and MongoDB interview practice platform with JWT accounts, written and multiple choice sessions, AI feedback, and per user rate limits.
- Designed validated Gemini question and evaluation flows with bounded retries, duplicate filtering, 24 hour question reuse, and recoverable failed evaluations.
- Implemented MongoDB backed readiness analytics, topic trends, shareable reports with revocation, company leaderboards, and aggregation based insights.

Add measured scale or impact only after collecting and verifying it.
