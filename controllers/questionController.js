const { buildQuestionPrompt } = require('../services/promptBuilder');
const { generateQuestions } = require('../services/geminiService');
const { validateQuestions } = require('../services/responseValidator');
const Session = require('../models/Session');
const Cache = require('../models/Cache');

const generate = async (req, res, next) => {
  try {
    const { sessionId, company, role, difficulty, count } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId is required' });
    }

    const session = await Session.findOne({ _id: sessionId, userId: req.user.userId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const prompt = buildQuestionPrompt(company, role, difficulty, count);

    // count is part of the key — a cached batch of 3 must never be served
    // to a request asking for 5, even if company/role/difficulty match.
    const cacheKey = `questions:${company}:${role}:${difficulty}:${count}`;
    const cached = await Cache.findOne({ key: cacheKey });

    let result;
    if (cached) {
      result = cached.data;
    } else {
      try {
        const rawText = await generateQuestions(prompt);
        result = validateQuestions(rawText);
      } catch (validationErr) {
        console.warn('Question validation failed, retrying with stricter prompt:', validationErr.message);
        const strictPrompt = prompt + '\n\nYour previous response was invalid. You MUST return only valid JSON with no other text.';
        const retryRawText = await generateQuestions(strictPrompt);
        result = validateQuestions(retryRawText);
      }
      await Cache.create({ key: cacheKey, data: result });
    }

    session.questions = result.questions;
    await session.save();

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { generate };