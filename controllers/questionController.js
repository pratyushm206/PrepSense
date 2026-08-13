const { buildQuestionPrompt } = require('../services/promptBuilder');
const { generateQuestions } = require('../services/geminiService');
const { validateQuestions } = require('../services/responseValidator');
const Session = require('../models/Session');
const Cache = require('../models/Cache');
const { CATEGORIES } = require('../config/constants');

const generate = async (req, res, next) => {
  try {
    const { sessionId, company, role, difficulty, count, category } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId is required' });
    }

    if (!CATEGORIES[category]) {
      return res.status(400).json({
        success: false,
        message: `category is required and must be one of: ${Object.keys(CATEGORIES).join(', ')}`
      });
    }

    const session = await Session.findOne({ _id: sessionId, userId: req.user.userId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const prompt = buildQuestionPrompt(company, role, difficulty, count, category);

    // count AND category are part of the key — a cached batch of 3 DSA
    // questions must never be served to a request asking for 5, or asking
    // for system_design, even if company/role/difficulty match. DSA and
    // conceptual categories also return differently-shaped question
    // objects, so a category mismatch here would serve the wrong schema.
    const cacheKey = `questions:${company}:${role}:${difficulty}:${count}:${category}`;
    const cached = await Cache.findOne({ key: cacheKey });

    let result;
    if (cached) {
      result = cached.data;
    } else {
      try {
        const rawText = await generateQuestions(prompt);
        result = validateQuestions(rawText, category);
      } catch (validationErr) {
        console.warn('Question validation failed, retrying with stricter prompt:', validationErr.message);
        const strictPrompt = prompt + '\n\nYour previous response was invalid. You MUST return only valid JSON with no other text.';
        const retryRawText = await generateQuestions(strictPrompt);
        result = validateQuestions(retryRawText, category);
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