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

function stampType(questions, category, format) {
  const type = format === 'mcq'
    ? (category === 'dsa' ? 'dsa-mcq' : 'mcq')
    : (category === 'dsa' ? 'dsa-subjective' : 'behavioral');

  return questions.map(question => ({ ...question, type }));
}

async function generateValidated(prompt, category, format) {
  try {
    const rawText = await generateQuestions(prompt);
    return validateQuestions(rawText, category, { format });
  } catch (validationErr) {
    console.warn('Question validation failed, retrying with stricter prompt:', validationErr.message);
    const strictPrompt = prompt + '\n\nYour previous response was invalid. You MUST return only valid JSON with no other text.';
    const retryRawText = await generateQuestions(strictPrompt);
    return validateQuestions(retryRawText, category, { format });
  }
}

async function generateMcqQuestions({ company, role, difficulty, count, category }) {
  // No Cache lookup: MCQ rounds must stay freshly generated.
  const prompt = category === 'dsa'
    ? buildDsaMCQPrompt(company, role, difficulty, count)
    : buildMCQPrompt(company, role, difficulty, count, category);
  const result = await generateValidated(prompt, category, 'mcq');
  return stampType(result.questions, category, 'mcq');
}

async function generateSubjectiveQuestions({ company, role, difficulty, count, category }) {
  const prompt = buildQuestionPrompt(company, role, difficulty, count, category);
  const cacheKey = `questions:${company}:${role}:${difficulty}:${count}:${category}`;
  const cached = await Cache.findOne({ key: cacheKey });

  let result;
  if (cached) {
    result = cached.data;
  } else {
    result = await generateValidated(prompt, category, 'subjective');
    await Cache.create({ key: cacheKey, data: result });
  }

  return stampType(result.questions || [], category, 'subjective');
}

function reindex(questions) {
  return questions.map((question, index) => ({ ...question, id: index + 1 }));
}

const generate = async (req, res, next) => {
  try {
    const { sessionId, company, role, difficulty, count, category, mode = 'subjective' } = req.body;
    const mcqCount = Number(req.body.mcqCount ?? req.body.config?.mcqCount ?? 0);
    const subjectiveCount = Number(req.body.subjectiveCount ?? req.body.config?.subjectiveCount ?? 0);

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

    let questions = [];
    if (mode === 'mcq') {
      questions = await generateMcqQuestions({
        company, role, difficulty, count: Number(count) || 5, category
      });
    } else if (mode === 'mixed') {
      const nextMcqCount = mcqCount || 5;
      const nextSubjectiveCount = subjectiveCount || 2;
      const [mcqQuestions, subjectiveQuestions] = await Promise.all([
        generateMcqQuestions({ company, role, difficulty, count: nextMcqCount, category }),
        generateSubjectiveQuestions({ company, role, difficulty, count: nextSubjectiveCount, category })
      ]);
      questions = [...mcqQuestions, ...subjectiveQuestions];
    } else {
      questions = await generateSubjectiveQuestions({
        company, role, difficulty, count: Number(count) || 5, category
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
        requested: questions.length,
        delivered: questions.length
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { generate };
