const {
  buildQuestionPrompt,
  buildMCQPrompt,
  buildDsaMCQPrompt
} = require('../services/promptBuilder');
const { generateQuestions } = require('../services/geminiService');
const { validateQuestions } = require('../services/responseValidator');
const Session = require('../models/Session');
const Cache = require('../models/Cache');
const { CATEGORIES, SESSION_MODES } = require('../config/constants');
const { normalizeCompany } = require('../services/normalization');

function stampType(questions, category, format) {
  const type = format === 'mcq'
    ? (category === 'dsa' ? 'dsa-mcq' : 'mcq')
    : (category === 'dsa' ? 'dsa-subjective' : 'behavioral');

  return questions.map(question => ({ ...question, type }));
}

async function generateValidated(prompt, category, format, requestedCount) {
  async function requestAndValidate(nextPrompt, count) {
    const rawText = await generateQuestions(nextPrompt, { category, format });
    return validateQuestions(rawText, category, { format, requestedCount: count });
  }

  let result;
  try {
    result = await requestAndValidate(prompt, requestedCount);
  } catch (validationErr) {
    if (validationErr.statusCode) throw validationErr;
    console.warn('Question validation failed, retrying with stricter prompt:', validationErr.message);
    const strictPrompt = prompt + '\n\nYour previous response was invalid. You MUST return only valid JSON with no other text.';
    result = await requestAndValidate(strictPrompt, requestedCount);
  }

  if (result.questions.length < requestedCount) {
    const missingCount = requestedCount - result.questions.length;
    const alreadyGenerated = result.questions.map(question => question.question);
    const topUpPrompt = `${prompt}\n\nThis is a targeted top-up. Generate exactly ${missingCount} additional questions. Do not repeat or closely paraphrase any of these existing questions: ${JSON.stringify(alreadyGenerated)}.`;
    const topUp = await requestAndValidate(topUpPrompt, missingCount);
    const seen = new Set(alreadyGenerated.map(question => question.trim().toLowerCase()));
    const uniqueTopUp = topUp.questions.filter(question => {
      const key = question.question.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    result = {
      questions: [...result.questions, ...uniqueTopUp],
      requested: requestedCount,
      delivered: result.questions.length + uniqueTopUp.length
    };
  }
  return result;
}

async function generateMcqQuestions({ company, role, difficulty, count, category }) {
  // No Cache lookup: MCQ rounds must stay freshly generated.
  const prompt = category === 'dsa'
    ? buildDsaMCQPrompt(company, role, difficulty, count)
    : buildMCQPrompt(company, role, difficulty, count, category);
  const result = await generateValidated(prompt, category, 'mcq', count);
  return stampType(result.questions, category, 'mcq');
}

async function generateSubjectiveQuestions({ company, role, difficulty, count, category }) {
  const prompt = buildQuestionPrompt(company, role, difficulty, count, category);
  const cacheKey = `questions:${normalizeCompany(company)}:${String(role).trim().toLowerCase()}:${difficulty}:${count}:${category}`;
  const cached = await Cache.findOne({ key: cacheKey }).lean();

  let result;
  if (cached && (cached.data?.questions?.length || 0) >= count) {
    result = cached.data;
  } else {
    result = await generateValidated(prompt, category, 'subjective', count);
    await Cache.findOneAndUpdate(
      { key: cacheKey },
      { $set: { data: result }, $setOnInsert: { key: cacheKey } },
      { upsert: true, new: true }
    );
  }

  return stampType(result.questions || [], category, 'subjective');
}

function reindex(questions) {
  return questions.map((question, index) => ({ ...question, id: index + 1 }));
}

const generate = async (req, res, next) => {
  try {
    const { sessionId, company, role, difficulty, count, category, mode = 'subjective' } = req.body;
    if (typeof company !== 'string' || typeof role !== 'string' || !company.trim() || !role.trim() || company.trim().length > 80 || role.trim().length > 80) {
      return res.status(400).json({ success: false, message: 'Company and role must be 80 characters or fewer' });
    }
    const mcqCount = Number(req.body.mcqCount ?? req.body.config?.mcqCount ?? 0);
    const subjectiveCount = Number(req.body.subjectiveCount ?? req.body.config?.subjectiveCount ?? 0);
    const requestedQuestionCount = mode === 'mixed'
      ? (mcqCount || 5) + (subjectiveCount || 2)
      : Number(count) || 5;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId is required' });
    }

    if (!CATEGORIES[category]) {
      return res.status(400).json({
        success: false,
        message: `category is required and must be one of: ${Object.keys(CATEGORIES).join(', ')}`
      });
    }

    if (!SESSION_MODES.includes(mode)) {
      return res.status(400).json({
        success: false,
        message: `mode must be one of: ${SESSION_MODES.join(', ')}`
      });
    }

    const session = await Session.findOne({ _id: sessionId, userId: req.user.userId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const targetCompany = session.company;
    const targetRole = session.role;

    let questions = [];
    if (mode === 'mcq') {
      questions = await generateMcqQuestions({
        company: targetCompany, role: targetRole, difficulty, count: Number(count) || 5, category
      });
    } else if (mode === 'mixed') {
      const nextMcqCount = mcqCount || 5;
      const nextSubjectiveCount = subjectiveCount || 2;
      const [mcqQuestions, subjectiveQuestions] = await Promise.all([
        generateMcqQuestions({ company: targetCompany, role: targetRole, difficulty, count: nextMcqCount, category }),
        generateSubjectiveQuestions({ company: targetCompany, role: targetRole, difficulty, count: nextSubjectiveCount, category })
      ]);
      questions = [...mcqQuestions, ...subjectiveQuestions];
    } else {
      questions = await generateSubjectiveQuestions({
        company: targetCompany, role: targetRole, difficulty, count: Number(count) || 5, category
      });
    }

    questions = reindex(questions);
    session.questions = questions;
    session.mode = mode;
    session.config = {
      mcqCount: mode === 'subjective' ? 0 : (mcqCount || Number(count) || questions.filter(q => q.type?.includes('mcq')).length),
      subjectiveCount: mode === 'mcq' ? 0 : (subjectiveCount || (mode === 'subjective' ? Number(count) || questions.length : questions.filter(q => !q.type?.includes('mcq')).length))
    };
    await session.save();

    res.status(200).json({
      success: true,
      data: {
        questions,
        requested: requestedQuestionCount,
        delivered: questions.length
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { generate };
