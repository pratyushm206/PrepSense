import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

const GITHUB_REPO = 'https://github.com/pratyushm206/PrepSense';

function iconProps(title) {
  return {
    className: 'landing-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': title ? undefined : true,
    role: title ? 'img' : undefined
  };
}

function IconMail() {
  return (
    <svg {...iconProps()}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="M4 7.5 12 13l8-5.5" />
    </svg>
  );
}

function IconGithub() {
  return (
    <svg {...iconProps()} fill="currentColor" stroke="none">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.04 1.53 1.04.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.8a9.5 9.5 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86v2.76c0 .26.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg {...iconProps()}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M8 10.5V16.5M8 7.5v.02M12 16.5v-3.6c0-1.2.9-2 2-2s2 .8 2 2v3.6" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg {...iconProps()}>
      <path d="M7 4.5h7.5L19 9v10.5H7z" />
      <path d="M14.5 4.5V9H19M9.5 13h5M9.5 16h3.5" />
    </svg>
  );
}

function IconX() {
  return (
    <svg {...iconProps()}>
      <path d="M5 5 19 19M19 5 5 19" />
    </svg>
  );
}

export default function Landing() {
  const { authLoading, isAuthenticated } = useAuth();

  if (authLoading) {
    return (
      <main className="center-screen">
        <div className="loader" />
        <p>Checking your session...</p>
      </main>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <a className="landing-brand" href="#top">
          <span className="landing-brand-dot" aria-hidden="true" />
          <span className="landing-wordmark">PrepSense</span>
        </a>
        <nav className="landing-nav" aria-label="Page">
          <a href="#what-it-does">What it does</a>
          <a href="#how-it-works">How it works</a>
          <a href="#under-the-hood">Under the hood</a>
        </nav>
        <div className="landing-header-actions">
          <ThemeToggle />
          <Link className="landing-btn landing-btn-primary" to="/register">
            Start a mock interview
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero" id="top">
          <div className="landing-hero-copy">
            <p className="eyebrow">Placement readiness</p>
            <h1>Practice like the interview already started.</h1>
            <p className="landing-lead">
              Company-specific mock interviews, scored answers, and a persistent readiness score —
              so you know exactly where you are weak before the real round does.
            </p>
            <div className="landing-hero-actions">
              <Link className="landing-btn landing-btn-primary landing-btn-lg" to="/register">
                Start a mock interview
              </Link>
              <Link className="landing-text-link" to="/login">
                Already have an account? Sign in
              </Link>
            </div>
          </div>
          <aside className="landing-hero-rail" aria-label="Product signals">
            <div>
              <span>01</span>
              <p>Questions scoped to company, role, and difficulty — not a generic prompt dump.</p>
            </div>
            <div>
              <span>02</span>
              <p>Every answer scored against expected key points, with a verdict you can act on.</p>
            </div>
            <div>
              <span>03</span>
              <p>Readiness compounds across sessions: topics, trends, and what that company tests.</p>
            </div>
          </aside>
        </section>

        <section id="what-it-does" className="landing-section">
          <p className="eyebrow">What it does</p>
          <h2 className="landing-section-title">Not a single-shot Q&amp;A tool.</h2>
          <p className="landing-copy">
            Pick a target company, role, practice category, and difficulty. PrepSense generates
            fresh interview questions for that combination, scores each answer against expected key
            points, and rolls results into readiness, topic trends, and company-specific
            recommendations.
          </p>
          <div className="landing-feature-grid">
            <article className="landing-feature">
              <h3>DSA</h3>
              <p>
                Full problem statements — description, worked examples, glossary, I/O format, and
                constraints — not a one-line prompt.
              </p>
            </article>
            <article className="landing-feature">
              <h3>System design</h3>
              <p>
                Architecture-style prompts scoped to the company and role you are actually targeting.
              </p>
            </article>
            <article className="landing-feature">
              <h3>Core CS</h3>
              <p>
                OS, DBMS, and networks questions that get scored against the points an interviewer
                is listening for.
              </p>
            </article>
            <article className="landing-feature">
              <h3>Behavioral</h3>
              <p>
                Structured feedback on strengths, gaps, and verdict — so stories get tighter each
                session, not vaguer.
              </p>
            </article>
          </div>
        </section>

        <section id="how-it-works" className="landing-section">
          <p className="eyebrow">How it works</p>
          <h2 className="landing-section-title">Generate, answer, score, repeat.</h2>
          <ol className="landing-steps">
            <li>
              <span className="landing-step-index">01</span>
              <div>
                <h3>Set the target</h3>
                <p>Company, role, category, and difficulty — the session is scoped before a question is generated.</p>
              </div>
            </li>
            <li>
              <span className="landing-step-index">02</span>
              <div>
                <h3>Sit the mock</h3>
                <p>Answer in the flow of a real round. Each response is evaluated against expected key points.</p>
              </div>
            </li>
            <li>
              <span className="landing-step-index">03</span>
              <div>
                <h3>Read the signal</h3>
                <p>Score, strengths, improvements, and a verdict feed a readiness number and topic-level trends.</p>
              </div>
            </li>
            <li>
              <span className="landing-step-index">04</span>
              <div>
                <h3>Practice what they test</h3>
                <p>Recommendations cross-reference your weak topics with what that company actually asks.</p>
              </div>
            </li>
          </ol>
        </section>

        <section id="under-the-hood" className="landing-section">
          <p className="eyebrow">Under the hood</p>
          <h2 className="landing-section-title">Built as a product, not a prompt wrapper.</h2>
          <div className="landing-engine-grid">
            <article className="landing-engine">
              <h3>Gemini, structured</h3>
              <p>
                Question generation and answer evaluation go through validated structured output,
                with retry on malformed responses and cache keyed by company, role, difficulty,
                count, and category.
              </p>
            </article>
            <article className="landing-engine">
              <h3>Scoring that persists</h3>
              <p>
                Scores normalize by difficulty, aggregate per topic, and feed a documented
                readiness formula plus trend detection across sessions — not a throwaway chat score.
              </p>
            </article>
            <article className="landing-engine">
              <h3>Stack</h3>
              <p>
                React and Express, MongoDB, JWT auth, helmet, CORS, and per-user rate limits on
                AI-calling routes. Open source on GitHub.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-col">
            <h2 className="landing-footer-brand">PrepSense</h2>
            <p className="landing-footer-blurb">
              AI-powered mock interview and placement-readiness platform. Practice, get scored, and
              know exactly where you're weak before the real interview does.
            </p>
          </div>
          <div className="landing-footer-col">
            <p className="eyebrow">Our other projects</p>
            <div className="landing-projects">
              <article>
                <a
                  className="landing-project-link"
                  href="https://nutri-track-sage.vercel.app/"
                  target="_blank"
                  rel="noreferrer"
                >
                  NutriTrack
                </a>
                <p className="landing-footer-meta">
                  AI nutrition and fitness tracker — React, Node, PostgreSQL, Gemini.
                </p>
                <a
                  className="landing-repo-link"
                  href="https://github.com/pratyushm206/NutriTrack"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub repo
                </a>
              </article>
              <article>
                <a
                  className="landing-project-link"
                  href="https://ai-resume-analyzer-pratyushm206.streamlit.app/"
                  target="_blank"
                  rel="noreferrer"
                >
                  AI Resume Analyzer
                </a>
                <p className="landing-footer-meta">
                  Upload a resume, get structured AI feedback — Python, Streamlit.
                </p>
                <a
                  className="landing-repo-link"
                  href="https://github.com/pratyushm206/AI-Resume-Analyzer"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub repo
                </a>
              </article>
            </div>
          </div>
          <div className="landing-footer-col">
            <p className="eyebrow">Connect</p>
            <ul className="landing-connect">
              <li>
                <a href="mailto:pratyushm206@gmail.com">
                  <IconMail />
                  pratyushm206@gmail.com
                </a>
              </li>
              <li>
                <a href="https://github.com/pratyushm206" target="_blank" rel="noreferrer">
                  <IconGithub />
                  github.com/pratyushm206
                </a>
              </li>
              <li>
                <a href="https://www.linkedin.com/in/pratyushm206" target="_blank" rel="noreferrer">
                  <IconLinkedIn />
                  LinkedIn
                </a>
              </li>
              <li>
                <a href={GITHUB_REPO} target="_blank" rel="noreferrer">
                  <IconCode />
                  View source
                </a>
              </li>
              <li>
                <a href="https://x.com/Pratyus35569136" target="_blank" rel="noreferrer">
                  <IconX />
                  x.com/Pratyus35569136
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="landing-footer-bar-wrap">
          <div className="landing-footer-bar">
            <p>© 2026 PrepSense. All rights reserved.</p>
            <p className="landing-credit">
              Designed and Coded by <strong>Pratyush Mishra</strong>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
