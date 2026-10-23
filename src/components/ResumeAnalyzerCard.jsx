import { RESUME_ANALYZER_URL } from '../config/links.js';

export default function ResumeAnalyzerCard() {
  return (
    <section className="panel resume-feature" aria-labelledby="resume-feature-title">
      <div className="resume-feature-copy">
        <p className="eyebrow">Resume toolkit</p>
        <h2 id="resume-feature-title">Help your resume get past the first screen.</h2>
        <p>Recruiters and ATS filters can screen resumes before a person sees them.</p>
        <p>Get an explainable score and feedback tied to the specific job description you’re targeting.</p>
        <div className="resume-feature-chips" aria-label="Analyzer features">
          <span className="tag">Explainable score</span>
          <span className="tag">JD-specific feedback</span>
          <span className="tag">ATS format check</span>
        </div>
        <div className="resume-feature-actions">
          <a className="button primary" href={RESUME_ANALYZER_URL} target="_blank" rel="noopener noreferrer">
            Analyze my resume
          </a>
          <span>Free. PDF up to 10 MB. The first load can take ~30 s if the app is asleep.</span>
        </div>
      </div>
      <div className="resume-gauge-motif" aria-hidden="true">
        <svg viewBox="0 0 140 88" focusable="false">
          <path className="resume-gauge-track" d="M 14 76 A 56 56 0 0 1 126 76" />
          <path className="resume-gauge-value" d="M 14 76 A 56 56 0 0 1 100 24" />
          <line className="resume-gauge-needle" x1="70" y1="76" x2="96" y2="40" />
          <circle className="resume-gauge-hub" cx="70" cy="76" r="5" />
        </svg>
        <span>Resume match</span>
      </div>
    </section>
  );
}
