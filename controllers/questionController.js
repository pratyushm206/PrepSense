const { buildQuestionPrompt } = require('../services/promptBuilder');
const { generateQuestions } = require('../services/geminiService');
const { validateQuestions } = require('../services/responseValidator');
const Session = require('../models/Session');

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
    const rawText = await generateQuestions(prompt);
    const { questions, requested, delivered } = validateQuestions(rawText);

    session.questions = questions;
    await session.save();

    res.status(200).json({ success: true, data: { questions, requested, delivered } });
  } catch (error) {
    next(error);
  }
};

module.exports = { generate };