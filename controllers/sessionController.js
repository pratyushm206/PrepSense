const Session = require('../models/Session');

const createSession = async (req, res, next) => {
  try {
    const { company, role } = req.body;

    if (!company || !role) {
      return res.status(400).json({ success: false, message: 'company and role are required' });
    }

    const session = await Session.create({
      userId: req.user.userId,
      company,
      role
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

module.exports = { createSession, getSessions, getSessionById };
