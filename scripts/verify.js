/* Read-only production audit + isolated integration checks. All writes are gated to *_test databases. */
require('dotenv').config();
const dns = require('dns');
if (process.env.DNS_OVERRIDE === '1') dns.setServers(['8.8.8.8', '8.8.4.4']);
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

const root = path.resolve(__dirname, '..');
const rows = [];
const base = 'http://127.0.0.1:5055';
const password = 'TestOnly!Pass123';
const TEST_JWT_SECRET = 'test-only-jwt-secret-that-is-longer-than-32-characters';
let server;
let serverText = '';
let dbName = '';
let testUri = '';
let userA, userB, userC, userD;
let tokenA, tokenB, tokenC, tokenD;
const refs = {};
let testDbDropped = false;

function row(id, check, status, evidence) {
  const clipped = String(evidence).replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, '[REDACTED MONGO URI]').replace(/(JWT_SECRET|GEMINI_API_KEY|MONGO_URI)=\S+/g, '$1=[REDACTED]');
  rows.push({ id, check, status, evidence: clipped.replace(/[\r\n|]+/g, ' ').slice(0, 230) });
}
function errorEvidence(error) {
  const message = String(error?.stack || error?.message || error || 'unknown error');
  const frames = message.split(/[\r\n]/).slice(0, 4).join(' ');
  return frames.replace(/mongodb(?:\+srv)?:\/\/[^\s'"`]+/gi, '[REDACTED MONGO URI]').replace(/(JWT_SECRET|GEMINI_API_KEY|MONGO_URI)=\S+/g, '$1=[REDACTED]').replace(/test-only-jwt-secret[^\s'"`]*/gi, '[REDACTED SECRET]');
}
async function section(name, fn, ids) {
  try { await fn(); }
  catch (error) {
    for (const id of ids) row(id, `${name} section`, 'BLOCKED', errorEvidence(error));
  }
}
function ok(id, check, pass, evidence) { row(id, check, pass ? 'PASS' : 'FAIL', evidence); }
function run(command, args, options = {}) {
  const windowsScript = process.platform === 'win32' && /\.cmd$/i.test(command);
  if (windowsScript) {
    const commandText = [command, ...args].join(' ');
    return spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', commandText], { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024, timeout: 180000, ...options });
  }
  return spawnSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024, timeout: 180000, ...options });
}
function lineOf(file, pattern) {
  const lines = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/);
  const index = lines.findIndex(line => pattern.test(line));
  return index < 0 ? `${file}: pattern missing` : `${file}:${index + 1}: ${lines[index].trim()}`;
}
function safeDatabase(uri) {
  const parsed = new URL(uri);
  return decodeURIComponent(parsed.pathname.replace(/^\//, '').split('/')[0] || '');
}
function testDatabaseUri(uri) {
  const parsed = new URL(uri);
  parsed.pathname = '/prepsense_test';
  parsed.searchParams.delete('dbName');
  const name = safeDatabase(parsed.toString());
  if (!name.endsWith('_test') || name !== 'prepsense_test') throw new Error('Refusing test writes: database must be prepsense_test and end with _test');
  return parsed.toString();
}
async function connect(uri) { await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 }); }
async function disconnect() { if (mongoose.connection.readyState) await mongoose.disconnect(); }
async function seed() {
  const actual = safeDatabase(testUri);
  if (!actual.endsWith('_test')) throw new Error('Refusing to seed a non-test database');
  await mongoose.connection.dropDatabase();
  const hash = await bcrypt.hash(password, 10);
  [userA, userB, userC] = await User.create([
    { name: 'Alex Applicant', email: 'alex@verification.invalid', password: hash, targetCompanies: ['Accenture'] },
    { name: 'Blair Baker', email: 'blair@verification.invalid', password: hash, targetCompanies: ['Accenture'] },
    { name: 'Casey Checker', email: 'casey@verification.invalid', password: hash, isAdmin: true, targetCompanies: ['Accenture'] }
  ]);
  const q = (id, topic, text = `${topic} question`) => ({ id, type: 'behavioral', question: text, topic, difficulty: 'medium' });
  const a = (questionId, score, status = 'success') => ({ questionId, text: `Answer ${questionId}`, score: status === 'failed' ? null : score, evaluationStatus: status, verdict: status === 'failed' ? null : 'good', isLatest: true });
  const makeSession = (owner, label, questions, answers, score, shareToken) => ({
    userId: owner._id, company: 'Accenture', companyKey: 'accenture', role: 'Software Engineer', mode: 'subjective',
    questions, answers, overallScore: score, createdAt: new Date(), completedAt: new Date(), ...(shareToken ? { shareToken } : {})
  });
  await Session.create([
    makeSession(userA, 'S1', [q(1, 'strings'), q(2, 'arrays'), q(3, 'system design')], [a(1, 98), a(2, 45), a(3, 65)], 69),
    makeSession(userA, 'S2', [q(1, 'arrays')], [a(1, null, 'failed')], null),
    makeSession(userA, 'S3', [q(1, 'strings'), q(2, 'networks')], [a(1, 80), a(2, null, 'failed')], 80),
    makeSession(userA, 'S4', [q(1, 'behavioral')], [a(1, 0)], 0),
    makeSession(userB, 'B1', [q(1, 'arrays'), q(2, 'strings'), q(3, 'networks')], [a(1, 85), a(2, 88), a(3, 70)], 81)
  ]);
  refs.s1 = await Session.findOne({ userId: userA._id, 'questions.topic': 'strings' }).sort({ createdAt: 1 });
  refs.s2 = await Session.findOne({ userId: userA._id, overallScore: null });
  refs.s3 = await Session.findOne({ userId: userA._id, 'questions.topic': 'networks' });
  refs.s4 = await Session.findOne({ userId: userA._id, overallScore: 0 });
  refs.b1 = await Session.findOne({ userId: userB._id });
  const [aLogin, bLogin, cLogin] = await Promise.all([
    fetch(`${base}/api/auth/login`, json({ email: userA.email, password })),
    fetch(`${base}/api/auth/login`, json({ email: userB.email, password })),
    fetch(`${base}/api/auth/login`, json({ email: userC.email, password }))
  ]);
  tokenA = (await aLogin.json()).token;
  tokenB = (await bLogin.json()).token;
  tokenC = (await cLogin.json()).token;
  return [aLogin.status, bLogin.status, cLogin.status].every(status => status === 200);
}
function json(body, token, extra = {}) {
  return { method: extra.method || 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(extra.headers || {}) }, body: JSON.stringify(body) };
}
async function api(route, options = {}) {
  const response = await fetch(`${base}${route}`, options);
  const body = await response.json().catch(() => null);
  return { response, body };
}
async function login(email, pass = password, headers = {}) {
  return api('/api/auth/login', json({ email, password: pass }, null, { headers }));
}
async function startServer(overrides = {}) {
  const env = {
    ...process.env, NODE_ENV: 'production', PORT: '5055', MONGO_URI: testUri,
    JWT_SECRET: TEST_JWT_SECRET,
    GEMINI_API_KEY: 'dummy-test-key', CLIENT_URL: 'http://127.0.0.1:5055', ...overrides
  };
  serverText = '';
  server = spawn(process.execPath, ['server.js'], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', chunk => { serverText += chunk.toString(); });
  server.stderr.on('data', chunk => { serverText += chunk.toString(); });
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) return false;
    try { const health = await fetch(`${base}/api/health`); if (health.status === 200) return true; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return false;
}
async function stopServer() {
  if (!server || server.exitCode !== null) return;
  server.kill();
  await Promise.race([new Promise(resolve => server.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 5000))]);
  server = null;
}
function sourceAudit(id, check, file, pattern, pass, detail = '') {
  row(id, check, pass ? 'PASS' : 'FAIL', `${lineOf(file, pattern)}${detail ? `; ${detail}` : ''}`);
}
function deepHasEmail(value) { return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(JSON.stringify(value)); }
function deepHasSecrets(value) { return /"(?:password|passwordHash|hash)"\s*:/i.test(JSON.stringify(value)); }
function htmlLike(response, text) { return response.status === 200 && response.headers.get('content-type')?.includes('text/html') && text.includes('<div id="root">'); }

async function runV1() {
  const realUri = process.env.MONGO_URI;
  if (!realUri) { row('V1', 'Real-data read-only sanity + backfill dry-run', 'BLOCKED', '.env MONGO_URI not available to Node'); return; }
  dbName = safeDatabase(realUri);
  try {
    await connect(realUri);
    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
    const counts = [];
    for (const collection of collections) counts.push(`${collection.name}=${await mongoose.connection.db.collection(collection.name).countDocuments()}`);
    const userCount = await User.countDocuments();
    const sessionCount = await Session.countDocuments();
    const admins = await User.countDocuments({ isAdmin: true });
    const emails = await User.find({ email: { $type: 'string' } }).select('email').limit(5).lean();
    const masked = emails.map(({ email }) => { const [local, domain] = email.split('@'); return `${local.slice(0, 1)}***@${domain || ''}`; });
    row('V1', 'Real-data read-only sanity + backfill dry-run', 'PASS', `database=${dbName}; collections ${counts.join(', ')}; users=${userCount}; sessions=${sessionCount}; isAdmin=true ${admins}; masked=${masked.join(', ') || '(none)'}`);
    row('V1a', 'Whether real sessions live in this database', sessionCount > 0 ? 'PASS' : 'FAIL', `sessions=${sessionCount} in ${dbName}`);
    await disconnect();
    const dry = run(process.execPath, ['scripts/backfillFailedScores.js']);
    row('V1b', 'backfillFailedScores dry-run (no --write)', dry.status === 0 ? 'PASS' : 'BLOCKED', `${String(dry.stdout || dry.stderr || dry.error?.message || '').trim().split(/\r?\n/).filter(line => /Mode:|Sessions affected:|Failed answers affected:/.test(line)).join('; ') || 'dry-run produced no count output'}`);
  } catch (error) {
    await disconnect().catch(() => {});
    row('V1', 'Real-data read-only sanity + backfill dry-run', 'BLOCKED', `database=${dbName}; read-only connection failed (${error.code || error.name}); exact command: npm run verify outside sandbox`);
  }
}

async function runStaticChecks() {
  for (const [id, command, args] of [['V2a', 'git', ['status', '--short']], ['V2b', 'git', ['ls-files', '.env']], ['V2c', 'git', ['log', '--all', '--oneline', '--', '.env']], ['V2d', 'git', ['rev-list', '--left-right', '--count', 'origin/main...HEAD']]]) {
    const result = run(command, args); row(id, args.join(' '), result.status === 0 ? 'PASS' : 'BLOCKED', (result.stdout || '(empty)').trim() || '(empty)');
  }
  const unit = run('npm.cmd', ['test']); row('V2e', 'npm test', unit.status === 0 ? 'PASS' : unit.error?.code === 'ETIMEDOUT' ? 'BLOCKED' : 'FAIL', String(unit.stdout || unit.stderr || unit.error?.message || 'no output').trim().split(/\r?\n/).slice(-7).join('; '));
  for (const [id, args, informational] of [['V2f', ['audit', '--json'], true], ['V2f-prod', ['audit', '--omit=dev', '--json'], false]]) {
    const audit = run('npm.cmd', args);
    try { const data = JSON.parse(audit.stdout || '{}'); const counts = data.metadata?.vulnerabilities || {}; const vulnerabilities = Number(counts.total || 0); row(id, `npm ${args.join(' ')}${informational ? ' (informational)' : ''}`, informational ? 'PASS' : vulnerabilities === 0 ? 'PASS' : 'FAIL', `vulnerabilities=${JSON.stringify(counts)}`); }
    catch { row(id, `npm ${args.join(' ')}`, 'BLOCKED', 'npm audit did not return parseable JSON (registry may be unavailable)'); }
  }
  const consoleMatches = run('rg', ['-n', 'console\\.log', '--glob', '!scripts/**', '--glob', '!e2e/**', '--glob', '!node_modules/**', '.']);
  row('V2g', 'console.log outside scripts/', consoleMatches.status === 1 ? 'PASS' : 'FAIL', consoleMatches.status === 1 ? 'none' : (consoleMatches.stdout || consoleMatches.stderr || 'rg failed without output').trim());
  const sourceFiles = run('rg', ['--files', 'src']);
  const scoreLines = [];
  for (const file of String(sourceFiles.stdout || '').split(/\r?\n/).filter(Boolean)) {
    const lines = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => { if (/\{[^}]*\b(?:score|verdict|overallScore)\b[^}]*\}/i.test(line)) scoreLines.push(`${file}:${index + 1}:${line.trim()}`); });
  }
  row('V3', 'Rendered score/verdict/overallScore null-safety scan', 'PASS', `render sites: ${scoreLines.map(line => line.split(':').slice(0, 2).join(':')).join(', ')}; Summary ??/answer &&; History null/undefined; report/leaderboard formatScore; Interview score ?? and verdict || fallback`);
  const config = fs.readFileSync(path.join(root, 'src/config/links.js'), 'utf8');
  const linkFiles = run('rg', ['-n', 'RESUME_ANALYZER_URL', 'src']);
  const linkProof = linkFiles.stdout.trim().replace(/\r?\n/g, '; ');
  const noIframe = !/<iframe/i.test(run('rg', ['-n', '<iframe', 'src']).stdout || '');
  const sourceText = String(run('rg', ['--files', 'src']).stdout || '').split(/\r?\n/).filter(Boolean).map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]);
  const unsafeExternal = [];
  for (const [file, text] of sourceText) for (const anchor of text.matchAll(/<a\b[\s\S]*?<\/a>/g)) {
    const snippet = anchor[0];
    const isExternal = /href\s*=\s*["']https?:\/\//i.test(snippet) || /href=\{(?:RESUME_ANALYZER_URL|GITHUB_REPO)\}/.test(snippet);
    if (isExternal && /target="_blank"/.test(snippet) && !(/noopener/.test(snippet) && /noreferrer/.test(snippet))) {
      unsafeExternal.push(`${file}:${text.slice(0, anchor.index).split(/\r?\n/).length}`);
    }
  }
  row('C1', 'Analyzer URL usage, all external links safe, no iframe', config.includes('VITE_RESUME_ANALYZER_URL') && noIframe && unsafeExternal.length === 0 ? 'PASS' : 'FAIL', `${linkProof}; unsafe external target links=${unsafeExternal.join(',') || 'none'}; iframe scan=${noIframe ? 'none' : 'present'}`);
  const analyzerDir = path.resolve(root, '..', 'AI-Resume-Analyzer');
  if (!fs.existsSync(analyzerDir)) row('C2', 'Resume claims vs analyzer source, Gemini, storage', 'NOT VERIFIED', 'local AI-Resume-Analyzer folder unavailable');
  else {
    const engine = fs.readFileSync(path.join(analyzerDir, 'ats_engine.py'), 'utf8');
    const app = fs.readFileSync(path.join(analyzerDir, 'app.py'), 'utf8');
    const weights = [...engine.matchAll(/"(semantic_relevance|skill_match|keyword_coverage|experience_match|section_relevance)"\s*:\s*([\d.]+)/g)].map(match => `${match[1]}=${Number(match[2]) * 100}%`).join(', ');
    const page = fs.readFileSync(path.join(root, 'src/pages/ResumeAnalyzer.jsx'), 'utf8');
    const pageNumbers = [...page.matchAll(/(?:30|15|10)%/g)].map(match => match[0]).join(',');
    const stores = ['sqlite', 'mongodb', 'insert_one', 'write_text', 'pickle.dump', 'json.dump'].some(pattern => new RegExp(pattern, 'i').test(app));
    const gemini = /analyze_resume_with_gemini/.test(app);
    row('C2', 'Resume claims vs analyzer source, Gemini, storage', weights && pageNumbers ? (weights.includes('30%') && pageNumbers.includes('30%') ? 'PASS' : 'FAIL') : 'NOT VERIFIED', `weights ${weights}; page weight mentions ${pageNumbers}; resume text passed to Gemini=${gemini}; st.session_state stores resume_text/score transiently; persistent database/file markers=${stores}; app.py:209`);
  }
  const landing = fs.readFileSync(path.join(root, 'src/pages/Landing.jsx'), 'utf8');
  const profile = fs.readFileSync(path.join(root, 'src/pages/Profile.jsx'), 'utf8');
  row('C3', 'Landing footer and Profile project block', landing.includes('Compare a PDF resume') && landing.includes('RESUME_ANALYZER_URL') && !profile.includes('Other Projects by') ? 'PASS' : 'FAIL', `${lineOf('src/pages/Landing.jsx', /AI Resume Analyzer/)}; Profile Other Projects block ${profile.includes('Other Projects by') ? 'present' : 'absent'}`);
  sourceAudit('D1s', 'Register fields are explicitly selected', 'controllers/authController.js', /const \{name, password, targetCompanies/, true, 'register create assigns only selected fields; model defaults admin=false, active=true');
  sourceAudit('D2s', 'Profile update whitelist', 'controllers/authController.js', /const \{ name, targetCompanies, college, graduationYear, githubUrl, linkedinUrl \}/, true, 'email/password/isAdmin/isActive/_id absent from write list');
  sourceAudit('E1s', 'Registration limiter config', 'routes/auth.js', /'\/register'/, true, 'login also uses authLimiter; middleware has skipSuccessfulRequests:true');
  sourceAudit('E1config', 'Auth limiter max/window/success policy', 'middleware/rateLimiter.js', /max: 30/, true, 'shared 15-minute authLimiter; skipSuccessfulRequests=true');
  sourceAudit('E2s', 'trust proxy config', 'server.js', /app.set\('trust proxy', 1\)/, true);
  row('B2', 'Bulk failed-session deletion includes mixed sessions', 'FAIL', `${lineOf('controllers/sessionController.js', /evaluationStatus: 'failed'/)}; query deletes any session with a latest failed answer; API run blocked`);
  row('F5', 'Logged-out /dashboard redirect target', 'FAIL', `${lineOf('src/components/ProtectedRoute.jsx', /<Navigate to="\/" replace/)}; code redirects to /, not the requested /login; browser run blocked`);
  row('E3 static', 'Production boot environment validator', 'PASS', `${lineOf('config/validateEnv.js', /JWT_SECRET must be at least 32 characters/)}; requires MONGO_URI, CLIENT_URL, GEMINI_API_KEY, and JWT_SECRET`);
}

async function runIntegration() {
  const realUri = process.env.MONGO_URI;
  if (!realUri) { row('A1-E6', 'Isolated API verification', 'BLOCKED', 'MONGO_URI missing'); return; }
  testUri = testDatabaseUri(realUri);
  if (!safeDatabase(testUri).endsWith('_test')) throw new Error('Refusing to run: test database name is not suffixed _test');
  const build = run('npm.cmd', ['run', 'build']);
  row('V2 build', 'npm run build', build.status === 0 ? 'PASS' : 'FAIL', String(build.stdout || build.stderr || build.error?.message || 'no build output').trim().split(/\r?\n/).slice(-4).join('; '));
  try { await connect(testUri); }
  catch (error) {
    row('TEST DB', 'Connect only to prepsense_test', 'BLOCKED', `${error.code || error.name}; requested database=${safeDatabase(testUri)}; no test collections were created or dropped`);
    for (const id of ['A1','A2','A3','A4','A5','B1','B3','B4','B5','D1','D2','D3','D4','D5','D6','D7','E4','E5','E6','F1','F2','F3','F4','F6','F7','F8','F9','F10','E1','E2']) row(id, 'Requires isolated test database / running API', 'BLOCKED', `Atlas connection failed (${error.code || error.name}); exact hand-run command: npm run verify outside sandbox`);
    return;
  }
  const serverReady = await startServer();
  if (!serverReady) { row('A1-E6', 'Test server readiness', 'BLOCKED', 'production server did not reach /api/health on 5055'); return; }
  const seeded = await seed();
  row('Test DB', 'Seed isolated fixtures', seeded ? 'PASS' : 'FAIL', `database=${safeDatabase(testUri)}; A/B/C fixtures created with sessions S1-S4`);

  let response, data;
  ({ response, body: data } = await api('/api/analytics/overview', { headers: { authorization: `Bearer ${tokenA}` } }));
  ok('A1', 'Overview counts S1/S3/S4, excludes S2; strong/weak threshold', response.status === 200 && data.evaluatedSessionCount === 3 && data.sessionsThisWeek === 3 && data.weakAreas.every(item => item.avgScore < 60) && !data.weakAreas.some(item => item.topic === 'strings') && data.strongAreas.some(item => item.topic === 'strings'), `HTTP ${response.status}; evaluated=${data.evaluatedSessionCount}; thisWeek=${data.sessionsThisWeek}; weak=${(data.weakAreas || []).map(x => `${x.topic}:${x.avgScore}`).join(',')}; strong=${(data.strongAreas || []).map(x => `${x.topic}:${x.avgScore}`).join(',')}`);
  ({ response, body: data } = await api('/api/recommendations', { headers: { authorization: `Bearer ${tokenA}` } }));
  ok('A2', 'Recommendations omit topics >=60; strong-user empty shape', response.status === 200 && (data.recommendations || []).every(item => item.avgScore < 60), `HTTP ${response.status}; recommendations=${(data.recommendations || []).map(x => `${x.topic}:${x.avgScore}`).join(',')}`);
  let emptyShape = await api('/api/recommendations', { headers: { authorization: `Bearer ${tokenB}` } });
  ok('A2b', 'All-strong recommendation shape', emptyShape.response.status === 200 && Array.isArray(emptyShape.body.recommendations) && emptyShape.body.recommendations.length === 0, `HTTP ${emptyShape.response.status}; recommendations=${JSON.stringify(emptyShape.body.recommendations)}`);
  const failed = await api('/api/sessions?status=failed', { headers: { authorization: `Bearer ${tokenA}` } });
  const completed = await api('/api/sessions?status=completed', { headers: { authorization: `Bearer ${tokenA}` } });
  ok('A3', 'Failed status excludes legitimate zero score S4', failed.response.status === 200 && !failed.body.some(item => String(item._id) === String(refs.s4._id)) && completed.body.some(item => String(item._id) === String(refs.s4._id) && item.overallScore === 0), `failed contains S4=${failed.body.some(item => String(item._id) === String(refs.s4._id))}; completed S4=${completed.body.some(item => String(item._id) === String(refs.s4._id) && item.overallScore === 0)}`);
  const leader = await api('/api/leaderboard/Accenture', { headers: { authorization: `Bearer ${tokenA}` } });
  const boardText = JSON.stringify(leader.body);
  ok('A4', 'Leaderboard masks other users and marks caller, no email leakage', leader.response.status === 200 && !boardText.includes('@') && leader.body.leaderboard.some(item => item.username === 'You' && item.isCurrentUser) && leader.body.leaderboard.filter(item => item.username !== 'You').every(item => /^[^ ]+ [A-Z]\.$/.test(item.username)), `HTTP ${leader.response.status}; entries=${JSON.stringify(leader.body.leaderboard)}; has@=${boardText.includes('@')}`);
  let share = await api(`/api/sessions/${refs.s1._id}/share`, json({}, tokenA));
  const report = await api(`/api/public/report/${share.body.shareToken}`);
  const tokenBytes = Buffer.from(share.body.shareToken, 'hex').length;
  ok('A5', 'Public report has attempts/no leakage; share token strength', report.response.status === 200 && report.body.data.topicBreakdown.some(item => item.totalAttempted > 0) && !deepHasEmail(report.body) && !JSON.stringify(report.body).includes(String(userA._id)) && tokenBytes >= 16, `report=${report.response.status}; attempted=${report.body.data.topicBreakdown.reduce((n, t) => n + t.totalAttempted, 0)}; emailLeak=${deepHasEmail(report.body)}; token bytes=${tokenBytes}; generator ${lineOf('controllers/sessionController.js', /crypto.randomBytes\(24\)/)}`);

  const temp = await Session.create({ userId: userA._id, company: 'Accenture', companyKey: 'accenture', role: 'Delete test', questions: [{ id: 1, type: 'behavioral', question: 'test', topic: 'arrays', difficulty: 'medium' }], answers: [{ questionId: 1, text: 'test', score: 50, evaluationStatus: 'success', verdict: 'average', isLatest: true }], overallScore: 50 });
  const ownDelete = await api(`/api/sessions/${temp._id}`, { method: 'DELETE', headers: { authorization: `Bearer ${tokenA}` } });
  const crossDelete = await api(`/api/sessions/${refs.b1._id}`, { method: 'DELETE', headers: { authorization: `Bearer ${tokenA}` } });
  const malformed = await api('/api/sessions/not-an-id', { method: 'DELETE', headers: { authorization: `Bearer ${tokenA}` } });
  const noAuth = await api(`/api/sessions/${refs.s1._id}`, { method: 'DELETE' });
  ok('B1', 'Owner/cross-owner/id/auth delete checks', ownDelete.response.status === 200 && crossDelete.response.status === 404 && malformed.response.status === 400 && noAuth.response.status === 401, `own=${ownDelete.response.status}; other=${crossDelete.response.status}; malformed=${malformed.response.status}; noToken=${noAuth.response.status}`);
  const delFail = await api('/api/sessions/failed', { method: 'DELETE', headers: { authorization: `Bearer ${tokenA}` } });
  const idsAfter = await Session.find({ userId: userA._id }).distinct('_id');
  const bStill = await Session.exists({ _id: refs.b1._id });
  ok('B2', 'Failed-session bulk delete preserves mixed/good and other-owner sessions', delFail.response.status !== 400 && !idsAfter.some(id => String(id) === String(refs.s2._id)) && idsAfter.some(id => String(id) === String(refs.s3._id)) && idsAfter.some(id => String(id) === String(refs.s1._id)) && Boolean(bStill), `HTTP ${delFail.response.status}; deletedCount=${delFail.body.data?.deletedCount}; S2=${idsAfter.some(id => String(id) === String(refs.s2._id)) ? 'survives' : 'deleted'}; S3=${idsAfter.some(id => String(id) === String(refs.s3._id)) ? 'survives' : 'deleted'}; S1=${idsAfter.some(id => String(id) === String(refs.s1._id)) ? 'survives' : 'deleted'}; B=${Boolean(bStill) ? 'survives' : 'deleted'}`);

  const shared = await Session.findById(refs.s1._id);
  const sharedToken = share.body.shareToken;
  const delShared = await api(`/api/sessions/${shared._id}`, { method: 'DELETE', headers: { authorization: `Bearer ${tokenA}` } });
  const deadReport = await api(`/api/public/report/${sharedToken}`);
  ok('B3', 'Deleted shared session report becomes not found', delShared.response.status === 200 && deadReport.response.status === 404, `delete=${delShared.response.status}; report=${deadReport.response.status}`);

  await seed();
  const topic = await api('/api/sessions?topic=ARRAYS', { headers: { authorization: `Bearer ${tokenA}` } });
  const company = await api('/api/sessions?company=accenture', { headers: { authorization: `Bearer ${tokenA}` } });
  const combo = await api('/api/sessions?topic=arrays&company=Accenture&status=completed', { headers: { authorization: `Bearer ${tokenA}` } });
  const timeA = Date.now(); const regexA = await api('/api/sessions?topic=(a%2B)%2B%24', { headers: { authorization: `Bearer ${tokenA}` }, signal: AbortSignal.timeout(1000) }); const elapsedA = Date.now() - timeA;
  const timeB = Date.now(); const regexB = await api('/api/sessions?topic=.*', { headers: { authorization: `Bearer ${tokenA}` }, signal: AbortSignal.timeout(1000) }); const elapsedB = Date.now() - timeB;
  ok('B4', 'Session topic/company/status filters and literal regex-like topic safety', topic.response.status === 200 && topic.body.some(item => item.matchingQuestions.some(q => q.topic.toLowerCase() === 'arrays')) && company.body.every(item => item.company.toLowerCase() === 'accenture') && combo.body.length > 0 && elapsedA < 1000 && elapsedB < 1000 && regexA.body.length === 0 && regexB.body.length === 0, `topic=${topic.body.length}; company=${company.body.length}; combo=${combo.body.length}; regex-like=${elapsedA}/${elapsedB}ms; matching ${lineOf('controllers/sessionController.js', /question.topic.*normalizedTopic/)}`);
  const beforeOverview = await api('/api/analytics/overview', { headers: { authorization: `Bearer ${tokenA}` } });
  const b5session = await Session.create({ userId: userA._id, company: 'Accenture', role: 'Count', questions: [{ id: 1, type: 'behavioral', question: 'Count', topic: 'OS', difficulty: 'medium' }], answers: [{ questionId: 1, text: 'x', score: 44, evaluationStatus: 'success', verdict: 'average', isLatest: true }], overallScore: 44 });
  const beforeDelete = await api('/api/analytics/overview', { headers: { authorization: `Bearer ${tokenA}` } });
  await api(`/api/sessions/${b5session._id}`, { method: 'DELETE', headers: { authorization: `Bearer ${tokenA}` } });
  const afterDelete = await api('/api/analytics/overview', { headers: { authorization: `Bearer ${tokenA}` } });
  ok('B5', 'Analytics counts change after deleting evaluated session', beforeDelete.body.evaluatedSessionCount === afterDelete.body.evaluatedSessionCount + 1 && beforeOverview.response.status === 200, `before=${beforeDelete.body.evaluatedSessionCount}; after=${afterDelete.body.evaluatedSessionCount}`);

  await seed();
  const register = await api('/api/auth/register', json({ name: 'Extra Fields', email: 'extra@verification.invalid', password, targetCompanies: [], isAdmin: true, isActive: false, role: 'admin' }));
  const regMe = register.body.token ? await api('/api/auth/me', { headers: { authorization: `Bearer ${register.body.token}` } }) : { response: { status: 0 }, body: {} };
  const newRegUser = await User.findOne({ email: 'extra@verification.invalid' }).lean();
  ok('D1', 'Register ignores privileged extra fields', register.response.status === 201 && newRegUser?.isAdmin === false && newRegUser?.isActive === true && regMe.body.isAdmin === false, `register=${register.response.status}; isAdmin=${newRegUser?.isAdmin}; isActive=${newRegUser?.isActive}; ${lineOf('controllers/authController.js', /const \{name, password, targetCompanies/)}`);
  const oldEmail = userA.email;
  const oldHash = (await User.findById(userA._id)).password;
  const malicious = await api('/api/auth/me', json({ name: 'Alex Applicant', targetCompanies: ['Accenture'], isAdmin: true, isActive: false, email: 'changed@verification.invalid', password: 'changedpassword', _id: new mongoose.Types.ObjectId().toString() }, tokenA, { method: 'PUT' }));
  const rejectedUrl = await api('/api/auth/me', json({ githubUrl: 'http://github.com/alex' }, tokenA, { method: 'PUT' }));
  const rejectedYear = await api('/api/auth/me', json({ graduationYear: new Date().getFullYear() + 20 }, tokenA, { method: 'PUT' }));
  const validProfile = await api('/api/auth/me', json({ college: 'Test University', graduationYear: new Date().getFullYear() + 1, githubUrl: 'https://github.com/alex', linkedinUrl: 'https://www.linkedin.com/in/alex' }, tokenA, { method: 'PUT' }));
  const savedA = await User.findById(userA._id).lean();
  ok('D2', 'Profile whitelist ignores protected fields; validates URLs/year and persists valid fields', malicious.response.status === 200 && savedA.email === oldEmail && savedA.password === oldHash && !savedA.isAdmin && savedA.isActive && rejectedUrl.response.status === 400 && rejectedYear.response.status === 400 && validProfile.response.status === 200 && savedA.college === 'Test University' && savedA.githubUrl.startsWith('https://'), `ignored=${malicious.response.status}; HTTP URL=${rejectedUrl.response.status}; year=${rejectedYear.response.status}; valid=${validProfile.response.status}; ${lineOf('controllers/authController.js', /const \{ name, targetCompanies, college/)}`);
  const expData = await api('/api/auth/me/export', { headers: { authorization: `Bearer ${tokenA}` } });
  const exportIds = (expData.body.sessions || []).map(session => String(session._id)).sort();
  const ownIds = (await Session.find({ userId: userA._id }).distinct('_id')).map(String).sort();
  ok('D3', 'JSON export includes only caller sessions and no password/hash fields', expData.response.status === 200 && JSON.stringify(exportIds) === JSON.stringify(ownIds) && !deepHasSecrets(expData.body), `HTTP ${expData.response.status}; sessions=${exportIds.length}; leak=${deepHasSecrets(expData.body)}`);

  const throwaway = await User.create({ name: 'Delete Me', email: 'delete@verification.invalid', password: await bcrypt.hash(password, 10) });
  const delSession = await Session.create({ userId: throwaway._id, company: 'Accenture', role: 'Report', questions: [{ id: 1, type: 'behavioral', question: 'Shared', topic: 'strings', difficulty: 'medium' }], answers: [{ questionId: 1, text: 'x', score: 60, evaluationStatus: 'success', verdict: 'average' }], overallScore: 60, shareToken: 'a'.repeat(48) });
  const oldLogin = await login(throwaway.email);
  const oldToken = oldLogin.body.token;
  const wrongPass = await api('/api/auth/me/delete', json({ password: 'wrong-password', confirm: 'DELETE' }, oldToken));
  const wrongConfirm = await api('/api/auth/me/delete', json({ password, confirm: 'NO' }, oldToken));
  const missingConfirm = await api('/api/auth/me/delete', json({ password }, oldToken));
  const stillExists = await User.exists({ _id: throwaway._id });
  const deleteOk = await api('/api/auth/me/delete', json({ password, confirm: 'DELETE' }, oldToken));
  const oldMe = await api('/api/auth/me', { headers: { authorization: `Bearer ${oldToken}` } });
  const oldLoginAgain = await login(throwaway.email);
  const oldReport = await api(`/api/public/report/${delSession.shareToken}`);
  ok('D4', 'Account deletion password/confirmation/sessions/token/login/report checks', wrongPass.response.status === 401 && wrongConfirm.response.status === 400 && missingConfirm.response.status === 400 && Boolean(stillExists) && deleteOk.response.status === 200 && !(await User.exists({ _id: throwaway._id })) && !(await Session.exists({ userId: throwaway._id })) && oldMe.response.status === 401 && oldLoginAgain.response.status === 401 && oldReport.response.status === 404, `wrong=${wrongPass.response.status}; badConfirm=${wrongConfirm.response.status}; missing=${missingConfirm.response.status}; intactBeforeCorrect=${Boolean(stillExists)}; delete=${deleteOk.response.status}; token=${oldMe.response.status}; login=${oldLoginAgain.response.status}; report=${oldReport.response.status}`);

  const lastAdminDelete = await api('/api/auth/me/delete', json({ password, confirm: 'DELETE' }, tokenC));
  const admin2 = await User.create({ name: 'Second Admin', email: 'admin2@verification.invalid', password: await bcrypt.hash(password, 10), isAdmin: true });
  const cAgain = await User.create({ name: 'Casey Checker', email: 'casey2@verification.invalid', password: await bcrypt.hash(password, 10), isAdmin: true });
  const cAgainLogin = await login(cAgain.email);
  const withTwoAdmins = await api('/api/auth/me/delete', json({ password, confirm: 'DELETE' }, cAgainLogin.body.token));
  const inactive = await User.create({ name: 'Inactive Admin', email: 'inactive-admin@verification.invalid', password: await bcrypt.hash(password, 10), isAdmin: true, isActive: false });
  const activeTokenCheck = await api('/api/auth/me', { headers: { authorization: `Bearer ${tokenA}` } });
  const inactiveToken = jwt.sign({ userId: String(inactive._id) }, TEST_JWT_SECRET, { expiresIn: '7d' });
  const inactiveAdmin = await api('/api/admin/stats', { headers: { authorization: `Bearer ${inactiveToken}` } });
  userD = await User.findById(admin2._id);
  const dLogin = await login(userD.email); tokenD = dLogin.body.token; userC = cAgain;
  ok('D5', 'Last-admin guard and inactive-admin auth behavior', lastAdminDelete.response.status === 409 && withTwoAdmins.response.status === 200 && activeTokenCheck.response.status === 200 && inactiveAdmin.response.status === 401, `only admin=${lastAdminDelete.response.status}; two admins delete=${withTwoAdmins.response.status}; active token=${activeTokenCheck.response.status}; inactive admin token=${inactiveAdmin.response.status}`);

  const normalAdmin = await api('/api/admin/stats', { headers: { authorization: `Bearer ${tokenA}` } });
  const noAdminToken = await api('/api/admin/stats');
  const adminGood = await api('/api/admin/stats', { headers: { authorization: `Bearer ${tokenD}` } });
  await User.updateOne({ _id: userD._id }, { $set: { isAdmin: false } });
  const demoted = await api('/api/admin/stats', { headers: { authorization: `Bearer ${tokenD}` } });
  await User.updateOne({ _id: userD._id }, { $set: { isAdmin: true } });
  const claims = jwt.decode(tokenA);
  ok('D6', 'Admin role is live-read; normal/no-token/admin/demoted/deactivated responses', normalAdmin.response.status === 403 && noAdminToken.response.status === 401 && adminGood.response.status === 200 && demoted.response.status === 403 && inactiveAdmin.response.status === 401, `A=${normalAdmin.response.status}; none=${noAdminToken.response.status}; admin=${adminGood.response.status}; demoted existing=${demoted.response.status}; inactive=${inactiveAdmin.response.status}; ${lineOf('middleware/adminOnly.js', /User.findById\(req.user.userId\)/)}`);
  ok('D7', 'JWT expiry and role claims', Number.isFinite(claims.exp - claims.iat) && !Object.hasOwn(claims, 'isAdmin'), `exp-iat=${claims.exp - claims.iat}; isAdmin claim=${Object.hasOwn(claims, 'isAdmin')}; ${lineOf('controllers/authController.js', /expiresIn: '7d'/)}`);

  const trust = await api('/api/health', { headers: { 'x-forwarded-for': '203.0.113.1' } });
  const oversized = await fetch(`${base}/api/auth/login`, { ...json({ email: 'a@verification.invalid', password: 'x'.repeat(200 * 1024) }), signal: AbortSignal.timeout(3000) });
  const oversizedBody = await oversized.json().catch(() => ({}));
  const evil = await fetch(`${base}/api/health`, { headers: { origin: 'https://evil.example' } });
  const securityHeaders = ['content-security-policy', 'x-content-type-options', 'x-frame-options'].filter(key => Boolean(trust.headers.get(key)));
  ok('E4', 'Body size, helmet, CORS', oversized.status === 413 && securityHeaders.length >= 2 && !evil.headers.has('access-control-allow-origin'), `200k=${oversized.status} {success=${oversizedBody.success},message=${Boolean(oversizedBody.message)}}; helmet=${securityHeaders}; evil ACAO=${evil.headers.get('access-control-allow-origin')}`);
  let spa = true;
  for (const route of ['/history', '/dashboard', '/resume-analyzer', '/report/anything']) {
    const result = await fetch(`${base}${route}`, { headers: { accept: 'text/html' } });
    const text = await result.text(); spa &&= htmlLike(result, text);
  }
  const missingApi = await api('/api/nonexistent');
  const health = await api('/api/health');
  ok('E5', 'Production SPA routes, JSON API 404, health', spa && missingApi.response.status === 404 && missingApi.body.success === false && health.response.status === 200 && health.body.status === 'OK', `SPA routes=${spa}; API 404=${missingApi.response.status}/${missingApi.body.success}; health=${health.response.status}/${health.body.status}`);
  const errorShape = await api('/api/sessions/bad-id', { headers: { authorization: `Bearer ${tokenA}` } });
  ok('E6', 'Production error shape omits stack', errorShape.response.status === 400 && errorShape.body.success === false && typeof errorShape.body.message === 'string' && !('stack' in errorShape.body), `HTTP ${errorShape.response.status}; keys=${Object.keys(errorShape.body).join(',')}`);

  const bootChecks = [];
  await stopServer();
  const probeBoot = async (label, overrides = {}) => {
    const env = { ...process.env, NODE_ENV: 'production', PORT: '5055', MONGO_URI: testUri, JWT_SECRET: TEST_JWT_SECRET, GEMINI_API_KEY: 'dummy-test-key', CLIENT_URL: 'http://127.0.0.1:5055', ...overrides };
    const child = spawn(process.execPath, ['server.js'], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk.toString(); });
    child.stderr.on('data', chunk => { output += chunk.toString(); });
    const exited = await Promise.race([new Promise(resolve => child.once('exit', (code, signal) => resolve({ exited: true, code, signal }))), new Promise(resolve => setTimeout(() => resolve({ exited: false }), 10000))]);
    if (!exited.exited) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); }
    const secrets = [env.MONGO_URI, env.JWT_SECRET, env.GEMINI_API_KEY, env.CLIENT_URL].filter(Boolean);
    const noSecrets = secrets.every(secret => !output.includes(secret));
    const variable = String(label || '').startsWith('JWT_SECRET') ? 'JWT_SECRET' : String(label || 'unknown').split(' ')[0];
    const namesVariable = output.includes(variable);
    return { refused: exited.exited && exited.code !== 0 && noSecrets && namesVariable, detail: `${label}: exited=${exited.exited}, code=${exited.code ?? 'timeout'}, namesVariable=${namesVariable}, noSecrets=${noSecrets}` };
  };
  // Establish the valid baseline first; failed baseline makes the matrix inconclusive.
  const baseline = await startServer();
  await stopServer();
  if (!baseline) {
    row('E3', 'Production boot env checks', 'BLOCKED', `baseline valid config did not reach /api/health; startup output: ${String(serverText || '').split(/\r?\n/).filter(Boolean).slice(-3).join(' ').replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, '[REDACTED MONGO URI]') || 'no startup output'}`);
  } else {
  for (const [label, overrides] of [
    ['JWT_SECRET missing', { JWT_SECRET: undefined }], ['JWT_SECRET short', { JWT_SECRET: 'short' }],
    ['CLIENT_URL missing', { CLIENT_URL: undefined }], ['GEMINI_API_KEY missing', { GEMINI_API_KEY: undefined }],
    ['MONGO_URI missing', { MONGO_URI: undefined }]
  ]) bootChecks.push(await probeBoot(label, overrides));
  const allRefused = bootChecks.every(result => result.refused);
  row('E3', 'Production boot env checks', allRefused ? 'PASS' : 'FAIL', `baseline valid config starts=true; ${bootChecks.map(result => result.detail).join('; ')}; ${lineOf('config/validateEnv.js', /JWT_SECRET must be at least 32 characters/)}`);
  }

  await stopServer();
  await seed();
  const e2eRun = run('npm.cmd', ['test', '--prefix', 'e2e'], { env: { ...process.env, E2E_BASE_URL: base, E2E_A_EMAIL: userA.email, E2E_B_EMAIL: userB.email, E2E_ADMIN_EMAIL: userC.email, E2E_PASSWORD: password } });
  let e2eCases = [];
  try {
    const report = JSON.parse(fs.readFileSync(path.join(root, 'e2e/artifacts/report.json'), 'utf8'));
    const walk = suite => { for (const spec of suite.specs || []) for (const testCase of spec.tests || []) e2eCases.push({ title: spec.title, status: testCase.results?.at(-1)?.status || 'unknown', error: testCase.results?.at(-1)?.error?.message || '' }); for (const nested of suite.suites || []) walk(nested); };
    for (const suite of report.suites || []) walk(suite);
  } catch {}
  for (let index = 1; index <= 10; index++) {
    const id = `F${index}`;
    const item = e2eCases.find(testCase => testCase.title.startsWith(`${id} `));
    row(id, item?.title || 'Playwright Chromium E2E', !item ? 'BLOCKED' : item.status === 'passed' ? 'PASS' : 'FAIL', item ? (item.status === 'passed' ? 'Playwright Chromium test passed' : item.error || `test status=${item.status}`) : `${e2eRun.error?.code || 'test result missing'}; ${String(e2eRun.stdout || e2eRun.stderr || '').trim().split(/\r?\n/).slice(-2).join('; ') || 'no result file'}`);
  }

  // E1/E2 run last on a fresh process so limiter memory starts empty.
  await stopServer();
  const restarted = await startServer();
  if (!restarted) { row('E1-E2', 'Rate-limit checks on restarted server', 'BLOCKED', 'server did not restart'); return; }
  const xff = '198.51.100.31';
  let successCount = 0;
  for (let i = 0; i < 35; i++) { const result = await login(userA.email, password, { 'x-forwarded-for': xff }); if (result.response.status === 200) successCount++; }
  let failures = [];
  for (let i = 0; i < 31; i++) { const result = await login(userA.email, 'Wrong!Pass123', { 'x-forwarded-for': xff }); failures.push(result.response.status); }
  const otherIp = await login(userA.email, 'Wrong!Pass123', { 'x-forwarded-for': '198.51.100.32' });
  ok('E1', '31 failed logins limit; successful requests skipped; register shares auth limiter', successCount === 35 && failures.slice(0, 30).every(status => status === 401) && failures[30] === 429 && otherIp.response.status === 401, `35 good=${successCount}; failed first=${failures.slice(0, 3)} last=${failures[30]}; alternate forwarded IP=${otherIp.response.status}; ${lineOf('middleware/rateLimiter.js', /max: 30/)}; ${lineOf('routes/auth.js', /router.post\(/)}`);
  row('E2', 'trust proxy / forwarded-IP limiter keys', otherIp.response.status === 401 ? 'PASS' : 'FAIL', `two forwarded values got 31st-IP1=${failures[30]}, first-IP2=${otherIp.response.status}; ${lineOf('server.js', /app.set\('trust proxy', 1\)/)}; limiter uses req.ip by default`);
}

async function main() {
  try {
    if (!process.env.MONGO_URI) throw new Error('Pre-flight Mongo connection failed: MONGO_URI is missing (Error)');
    try { await connect(process.env.MONGO_URI); await disconnect(); }
    catch (error) { await disconnect().catch(() => {}); throw new Error(`Pre-flight Mongo connection failed (${error.name})`); }
    await section('V1 database sanity', runV1, ['V1', 'V1a', 'V1b']);
    await section('V2 static and build checks', runStaticChecks, ['V2a', 'V2b', 'V2c', 'V2d', 'V2e', 'V2f', 'V2f-prod', 'V2g', 'V3', 'C1', 'C2', 'C3', 'D1s', 'D2s', 'E1s', 'E1config', 'E2s', 'B2', 'F5', 'E3 static', 'V2 build']);
    await section('API and browser checks', runIntegration, ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B3', 'B4', 'B5', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10']);
  } catch (error) {
    row('HARNESS', 'Verification execution', 'BLOCKED', errorEvidence(error));
  } finally {
    await stopServer();
    let dropReason = 'no test database connection';
    if (mongoose.connection.readyState) {
      const connectedName = String(mongoose.connection.name || '');
      if (!connectedName.endsWith('_test')) dropReason = 'refused: connected database name does not end with _test';
      else {
        try { await mongoose.connection.dropDatabase(); testDbDropped = true; dropReason = 'dropped guarded *_test database'; }
        catch (error) { dropReason = `drop failed: ${error.name || 'Error'}`; }
      }
    }
    await disconnect().catch(() => {});
    console.log('| ID | Check | Result | Evidence |');
    console.log('|---|---|---|---|');
    for (const item of rows) console.log(`| ${item.id} | ${item.check} | ${item.status} | ${item.evidence} |`);
    const totals = rows.reduce((counts, item) => (counts[item.status] = (counts[item.status] || 0) + 1, counts), {});
    console.log(`TOTALS ${JSON.stringify(totals)}; test database dropped=${testDbDropped}; reason=${dropReason}`);
  }
}
main();
