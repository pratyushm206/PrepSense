import { Link } from 'react-router-dom';
import { RESUME_ANALYZER_URL } from '../config/links.js';

const signals = [
  ['Semantic relevance · 30%', 'How the resume’s meaning relates to the job description.'],
  ['Skill match · 30%', 'Skills detected in both the resume and the job description.'],
  ['Keyword coverage · 15%', 'Prominent job-description terms found in the resume.'],
  ['Experience match · 15%', 'The experience requirements compared with the resume.'],
  ['Section strength · 10%', 'Resume section relevance, named section_relevance in the score breakdown.']
];

export default function ResumeAnalyzer() {
  return (
    <section className="page-stack resume-analyzer-page">
      <header className="panel resume-analyzer-hero signature-card">
        <div>
          <p className="eyebrow">Resume toolkit</p>
          <h1>Make your resume relevant to the role.</h1>
          <p className="lead">Compare a text-based resume PDF with the job description you’re applying to, then review the score and feedback.</p>
          <div className="resume-feature-actions">
            <a className="button primary" href={RESUME_ANALYZER_URL} target="_blank" rel="noopener noreferrer">Analyze my resume</a>
            <Link className="button secondary" to="/interview/new">Back to Practice</Link>
          </div>
        </div>
      </header>

      <section className="grid two">
        <article className="panel resume-info-card">
          <p className="eyebrow">Why use it</p>
          <h2>Get a clearer view before you apply.</h2>
          <p>Recruiters and ATS filters can screen resumes before a person sees them. Use an explainable score and feedback connected to the specific job description.</p>
          <p>The numeric score is a deterministic weighted calculation from these five signals. Gemini writes the explanatory prose; it does not set the score.</p>
          <p>The analyzer is a separate app. When you analyze a resume, it sends the text to Google's Gemini API to write the explanation of your score. PrepSense does not receive or store your resume.</p>
        </article>
        <article className="panel resume-info-card">
          <p className="eyebrow">How it works</p>
          <ol>
            <li>Upload a text-based resume PDF (up to 10 MB).</li>
            <li>Paste the full job description or upload a text-based PDF (up to 10 MB).</li>
            <li>Review the score, signals, and written feedback.</li>
            <li>Run the optional ATS format-only check, which is separate from the job match score.</li>
            <li>Download the analysis report as PDF. Generated cover letters and tailored resumes can be exported as TXT, PDF, or DOCX.</li>
          </ol>
        </article>
      </section>

      <section className="panel resume-info-card">
        <div className="section-heading">
          <div><p className="eyebrow">Five signals</p><h2>See what contributes to the match.</h2></div>
        </div>
        <div className="resume-signal-grid">
          {signals.map(([title, description]) => (
            <article className="resume-signal" key={title}>
              <strong>{title}</strong>
              <span>{description}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel resume-info-card">
        <p className="eyebrow">Before you start</p>
        <h2>Tips for a useful comparison.</h2>
        <ul className="resume-tip-list">
          <li className="callout info">Use a text-based PDF so resume content can be extracted.</li>
          <li className="callout info">Paste the full job description, including responsibilities and qualifications.</li>
          <li className="callout info">Include the role’s seniority and experience requirements in the job description.</li>
        </ul>
        <p className="resume-note">Free. PDF up to 10 MB. The first load can take ~30 s if the app is asleep.</p>
        <p className="resume-note">The inspected code does not confirm privacy or data-retention behavior.</p>
        <div className="resume-feature-actions">
          <a className="button primary" href={RESUME_ANALYZER_URL} target="_blank" rel="noopener noreferrer">Analyze my resume</a>
          <Link className="button secondary" to="/interview/new">Back to Practice</Link>
        </div>
      </section>
    </section>
  );
}
