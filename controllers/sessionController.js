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

module.exports = { createSession };