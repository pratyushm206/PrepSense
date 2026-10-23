const crypto = require('crypto');
const Session = require('../models/Session');
const { getTopicScores, calculateSessionScore } = require('../services/scoringEngine');
const { SESSION_MODES } = require('../config/constants');
const { normalizeCompany } = require('../services/normalization');

const failedSessionsFilter = userId => ({
  userId,
  answers: { $exists: true, $ne: [] },
  $expr: { $allElementsTrue: { $map: { input: '$answers', as: 'answer', in: { $eq: ['$$answer.evaluationStatus', 'failed'] } } } }
});

const createSession = async (req, res, next) => {
  try {
    const { company, role, mode = 'subjective', config = {} } = req.body;

    if (typeof company !== 'string' || typeof role !== 'string' || !company.trim() || !role.trim()) {
      return res.status(400).json({ success: false, message: 'company and role are required' });
    }
    if (company.trim().length > 80 || role.trim().length > 80) {
      return res.status(400).json({ success: false, message: 'Company and role must be 80 characters or fewer' });
    }

    if (mode && !SESSION_MODES.includes(mode)) {
      return res.status(400).json({
        success: false,
        message: `mode must be one of: ${SESSION_MODES.join(', ')}`
      });
    }

    const session = await Session.create({
      userId: req.user.userId,
      company: company.trim(),
      companyKey: normalizeCompany(company),
      role: role.trim(),
      mode,
      config: {
        mcqCount: Number(config.mcqCount) || 0,
        subjectiveCount: Number(config.subjectiveCount) || 0
      }
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

const getSessions = async (req, res, next) => {
  try {
    const { topic = '', company = '', status = '' } = req.query;
    const normalizedTopic = String(topic).trim().toLowerCase();
    const normalizedCompany = String(company).trim().toLowerCase();
    if (status && !['all', 'completed', 'needs-attention', 'failed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be all, completed, or needs-attention' });
    }

    const sessions = await Session.find({ userId: req.user.userId, 'questions.0': { $exists: true } })
      .sort({ completedAt: -1, createdAt: -1 })
      .select('company role overallScore completedAt createdAt mode questions.id questions.question questions.topic questions.difficulty answers.questionId answers.evaluationStatus answers.isLatest')
      .lean();
    const summaries = sessions.map(session => {
      const latestAnswers = new Map();
      (session.answers || []).filter(answer => answer.isLatest !== false)
        .forEach(answer => latestAnswers.set(answer.questionId, answer));
      const questions = (session.questions || []).map(question => ({
        id: question.id,
        question: question.question,
        topic: question.topic,
        difficulty: question.difficulty
      }));
      const matchingQuestions = normalizedTopic
        ? questions.filter(question => String(question.topic || '').trim().toLowerCase() === normalizedTopic)
        : questions;
      return {
        _id: session._id,
        company: session.company,
        role: session.role,
        overallScore: session.overallScore,
        completedAt: session.completedAt || session.createdAt,
        questionCount: session.questions?.length || 0,
        answerCount: latestAnswers.size,
        failedEvaluation: [...latestAnswers.values()].some(answer => answer.evaluationStatus === 'failed'),
        fullyFailed: (session.answers || []).length > 0 && session.answers.every(answer => answer.evaluationStatus === 'failed'),
        completed: session.questions?.length > 0 && [...latestAnswers.values()].filter(answer => answer.evaluationStatus === 'success').length >= session.questions.length,
        difficulty: session.questions?.[0]?.difficulty || 'medium',
        topics: [...new Set(questions.map(question => question.topic).filter(Boolean))],
        matchingQuestions
      };
    }).filter(session => {
      if (normalizedCompany && session.company.trim().toLowerCase() !== normalizedCompany) return false;
      if (normalizedTopic && session.matchingQuestions.length === 0) return false;
      if (status === 'completed' && !session.completed) return false;
      if (['needs-attention', 'failed'].includes(status) && !session.failedEvaluation) return false;
      return true;
    });
    res.status(200).json({ success: true, data: summaries });
  } catch (error) {
    next(error);
  }
};

const deleteSession = async (req, res, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }
    const result = await Session.deleteOne({ _id: req.params.id, userId: req.user.userId });
    if (!result.deletedCount) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    res.status(200).json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
};

const deleteFailedSessions = async (req, res, next) => {
  try {
    const result = await Session.deleteMany(failedSessionsFilter(req.user.userId));
    res.status(200).json({ success: true, data: { deletedCount: result.deletedCount || 0 } });
  } catch (error) {
    next(error);
  }
};

const deleteEmptySession = async (req, res, next) => {
  try {
    const result = await Session.deleteOne({
      _id: req.params.id,
      userId: req.user.userId,
      questions: { $size: 0 },
      answers: { $size: 0 }
    });
    res.status(result.deletedCount ? 200 : 404).json({
      success: Boolean(result.deletedCount),
      ...(result.deletedCount ? { data: { deleted: true } } : { message: 'Empty session not found' })
    });
  } catch (error) {
    next(error);
  }
};

const getSessionById = async (req, res, next) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user.userId }).lean();
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

const shareSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!session.shareToken) {
      session.shareToken = crypto.randomBytes(24).toString('hex');
      await session.save();
    }

    res.status(200).json({
      success: true,
      data: {
        shareToken: session.shareToken,
        path: `/report/${session.shareToken}`
      }
    });
  } catch (error) {
    next(error);
  }
};

const revokeShare = async (req, res, next) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    session.shareToken = undefined;
    await session.save();
    res.status(200).json({ success: true, data: { revoked: true } });
  } catch (error) {
    next(error);
  }
};

const getPublicReport = async (req, res, next) => {
  try {
    const session = await Session.findOne({ shareToken: req.params.token }).lean();
    if (!session) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const topicBreakdown = getTopicScores([session]);
    const score = session.overallScore ?? calculateSessionScore(session);

    res.status(200).json({
      success: true,
      data: {
        company: session.company,
        role: session.role,
        score,
        completedAt: session.completedAt,
        questionCount: session.questions.length,
        topicBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createSession, getSessions, getSessionById, deleteEmptySession, deleteSession, deleteFailedSessions, failedSessionsFilter, shareSession, revokeShare, getPublicReport };
