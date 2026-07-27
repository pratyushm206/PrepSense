const { buildEvalPrompt } = require('../services/promptBuilder');
const { generateEvaluation } = require('../services/geminiService');
const { validateEvaluation } = require('../services/responseValidator');
const Session = require('../models/Session');

const evaluate = async (req, res, next) => {
  try {
    const { sessionId, questionId, answerText } = req.body;

    if (!sessionId || questionId === undefined || !answerText) {
      return res.status(400).json({ success: false, message: 'sessionId, questionId, and answerText are required' });
    }

    const session = await Session.findOne({ _id: sessionId, userId: req.user.userId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const question = session.questions.find(q => q.id === questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found in this session' });
    }

    const prompt = buildEvalPrompt(question.question, answerText, question.expectedKeyPoints);
    const rawText = await generateEvaluation(prompt);
    const evaluation = validateEvaluation(rawText);

    session.answers.push({
      questionId,
      text: answerText,
      score: evaluation.score,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      missedPoints: evaluation.missedPoints,
      verdict: evaluation.verdict
    });
    await session.save();

    res.status(200).json({ success: true, data: evaluation });
  } catch (error) {
    next(error);
  }
};

module.exports = { evaluate };