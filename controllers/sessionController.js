const crypto = require('crypto');
const Session = require('../models/Session');
const { getTopicScores, calculateSessionScore } = require('../services/scoringEngine');
const { SESSION_MODES } = require('../config/constants');

const createSession = async (req, res, next) => {
  try {
    const { company, role, mode = 'subjective', config = {} } = req.body;

    if (!company || !role) {
      return res.status(400).json({ success: false, message: 'company and role are required' });
    }

    if (mode && !SESSION_MODES.includes(mode)) {
      return res.status(400).json({
        success: false,
        message: `mode must be one of: ${SESSION_MODES.join(', ')}`
      });
    }

    const session = await Session.create({
      userId: req.user.userId,
      company,
      role,
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
    const sessions = await Session.find({ userId: req.user.userId }).sort({ completedAt: -1 });
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

const getSessionById = async (req, res, next) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user.userId });
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

const getPublicReport = async (req, res, next) => {
  try {
    const session = await Session.findOne({ shareToken: req.params.token });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const topicBreakdown = getTopicScores([session]);
    const score = session.overallScore || calculateSessionScore(session);

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

module.exports = { createSession, getSessions, getSessionById, shareSession, getPublicReport };
