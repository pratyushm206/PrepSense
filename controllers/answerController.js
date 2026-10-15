const { buildEvalPrompt } = require('../services/promptBuilder');
const { generateEvaluation } = require('../services/geminiService');
const { validateEvaluation } = require('../services/responseValidator');
const Session = require('../models/Session');
const { calculateSessionScore } = require('../services/scoringEngine');
const { scoreMcq } = require('../services/mcqScoring');

function isMcqType(type) {
  return type === 'mcq' || type === 'dsa-mcq';
}

async function scoreSubjective(question, answerText) {
  const prompt = buildEvalPrompt(question.question, answerText, question.expectedKeyPoints || []);

  try {
    const rawText = await generateEvaluation(prompt);
    return { ...validateEvaluation(rawText), evaluationStatus: 'success', failureReason: '' };
  } catch (validationErr) {
    console.warn('Evaluation validation failed, retrying with stricter prompt:', validationErr.message);
    const strictPrompt = prompt + '\n\nYour previous response was invalid. You MUST return only valid JSON with no other text.';
    const retryRawText = await generateEvaluation(strictPrompt);
    return { ...validateEvaluation(retryRawText), evaluationStatus: 'success', failureReason: '' };
  }
}

function persistAnswer(session, { questionId, text, evaluation }) {
  const answeredBefore = new Set(
    session.answers.filter(answer => answer.isLatest !== false).map(answer => answer.questionId)
  );
  session.answers.forEach(answer => {
    if (answer.questionId === questionId) answer.isLatest = false;
  });

  session.answers.push({
    questionId,
    text,
    score: evaluation.score ?? 0,
    strengths: evaluation.strengths || [],
    improvements: evaluation.improvements || [],
    missedPoints: evaluation.missedPoints || [],
    verdict: evaluation.verdict,
    evaluationStatus: evaluation.evaluationStatus || 'success',
    failureReason: evaluation.failureReason || '',
    isLatest: true
  });

  session.overallScore = calculateSessionScore(session);
  const answeredAfter = new Set(
    session.answers.filter(answer => answer.isLatest !== false).map(answer => answer.questionId)
  );
  if (session.questions.length > 0 && answeredBefore.size < session.questions.length && answeredAfter.size >= session.questions.length) {
    session.completedAt = new Date();
  }
}

async function runEvaluation(session, question, answerText, selectedOptionIndex) {
  if (isMcqType(question.type)) {
    const index = selectedOptionIndex === undefined || selectedOptionIndex === null
      ? Number(answerText)
      : Number(selectedOptionIndex);
    if (!Number.isInteger(index) || index < 0 || index > 3) {
      throw new Error('selectedOptionIndex must be an integer 0-3');
    }
    const optionText = question.options?.[index] || String(index);
    return {
      evaluation: scoreMcq(question, index),
      storedText: optionText
    };
  }

  try {
    const evaluation = await scoreSubjective(question, answerText);
    return { evaluation, storedText: answerText };
  } catch (error) {
    return {
      evaluation: {
        score: null,
        strengths: [],
        improvements: [],
        missedPoints: [],
        verdict: null,
        evaluationStatus: 'failed',
        failureReason: error.message || 'Evaluation failed'
      },
      storedText: answerText
    };
  }
}

const evaluate = async (req, res, next) => {
  try {
    const { sessionId, questionId, answerText, selectedOptionIndex } = req.body;

    if (!sessionId || questionId === undefined) {
      return res.status(400).json({ success: false, message: 'sessionId and questionId are required' });
    }

    const session = await Session.findOne({ _id: sessionId, userId: req.user.userId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const question = session.questions.find(item => item.id === questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found in this session' });
    }

    if (!isMcqType(question.type) && !answerText) {
      return res.status(400).json({ success: false, message: 'answerText is required' });
    }
    if (typeof answerText === 'string' && answerText.length > 5000) {
      return res.status(400).json({ success: false, message: 'Answer must be 5,000 characters or fewer' });
    }

    const { evaluation, storedText } = await runEvaluation(
      session,
      question,
      answerText,
      selectedOptionIndex
    );

    persistAnswer(session, { questionId, text: storedText, evaluation });
    await session.save();

    const saved = session.answers[session.answers.length - 1];
    res.status(200).json({
      success: true,
      data: {
        ...evaluation,
        _id: saved._id,
        questionId,
        text: storedText,
        isLatest: true
      }
    });
  } catch (error) {
    next(error);
  }
};

const retryEvaluation = async (req, res, next) => {
  try {
    const { sessionId, answerId } = req.params;
    const session = await Session.findOne({ _id: sessionId, userId: req.user.userId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const answer = session.answers.id(answerId);
    if (!answer) {
      return res.status(404).json({ success: false, message: 'Answer not found in this session' });
    }

    const question = session.questions.find(item => item.id === answer.questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found in this session' });
    }

    const selectedOptionIndex = isMcqType(question.type)
      ? question.options.findIndex(option => option === answer.text)
      : undefined;

    const { evaluation, storedText } = await runEvaluation(
      session,
      question,
      answer.text,
      selectedOptionIndex >= 0 ? selectedOptionIndex : undefined
    );

    persistAnswer(session, {
      questionId: answer.questionId,
      text: storedText,
      evaluation
    });
    await session.save();

    const saved = session.answers[session.answers.length - 1];
    res.status(200).json({
      success: true,
      data: {
        ...evaluation,
        _id: saved._id,
        questionId: answer.questionId,
        text: storedText,
        isLatest: true
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { evaluate, retryEvaluation };
