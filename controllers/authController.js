const User = require('../models/User');
const Session = require('../models/Session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const registerUser = async (req, res, next) => {
    try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          const details = errors.array();
          return res.status(400).json({ success: false, message: details[0].msg, errors: details });
        }

        const {name, password, targetCompanies = []} = req.body;
        const email = String(req.body.email || '').trim().toLowerCase();
        // prevents duplicate accounts and matches the Guide's consistent response shape (success/message).
        const existingUser = await User.findOne({ email }).collation({ locale: 'en', strength: 2 });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        //  never store plaintext passwords. 10 is the salt rounds — standard value, balances security vs speed.
        const hashedPassword = await bcrypt.hash(password, 10);

        // create the user in MongoDB
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            targetCompanies
        });

        // sign a JWT for the new user
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // sending response back
        // Notice password is deliberately absent — never send it back, even hashed.
        res.status(201).json({
            success: true,
            token,
            data: { id: user._id, name: user.name, email: user.email, targetCompanies: user.targetCompanies }
        });
    } catch(error){
        next(error);
    }

};

const loginUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const details = errors.array();
      return res.status(400).json({ success: false, message: details[0].msg, errors: details });
    }
    
    const { password } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    const user = await User.findOne({ email }).collation({ locale: 'en', strength: 2 });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.isActive === false) {
      return res.status(401).json({ success: false, message: 'This account has been deactivated' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      success: true,
      token,
      data: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-password').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const { name, targetCompanies, college, graduationYear, githubUrl, linkedinUrl } = req.body;
    const updates = {};

    if (typeof name === 'string' && name.trim()) {
      updates.name = name.trim();
    }

    if (targetCompanies !== undefined) {
      if (!Array.isArray(targetCompanies) || targetCompanies.some(company => typeof company !== 'string')) {
        return res.status(400).json({
          success: false,
          message: 'targetCompanies must be an array of strings'
        });
      }
      if (targetCompanies.some(company => company.trim().length > 80)) {
        return res.status(400).json({ success: false, message: 'Company names must be 80 characters or fewer' });
      }
      updates.targetCompanies = targetCompanies.map(company => company.trim()).filter(Boolean);
    }

    if (college !== undefined) {
      if (typeof college !== 'string' || college.trim().length > 120) {
        return res.status(400).json({ success: false, message: 'College must be 120 characters or fewer' });
      }
      updates.college = college.trim();
    }
    if (graduationYear !== undefined) {
      const currentYear = new Date().getFullYear();
      const year = Number(graduationYear);
      if (graduationYear !== null && (!Number.isInteger(year) || year < currentYear - 10 || year > currentYear + 10)) {
        return res.status(400).json({ success: false, message: `Graduation year must be between ${currentYear - 10} and ${currentYear + 10}` });
      }
      updates.graduationYear = graduationYear === null ? null : year;
    }
    for (const [field, value] of [['githubUrl', githubUrl], ['linkedinUrl', linkedinUrl]]) {
      if (value === undefined) continue;
      if (typeof value !== 'string' || value.length > 300) {
        return res.status(400).json({ success: false, message: `${field} must be a URL of 300 characters or fewer` });
      }
      if (value.trim()) {
        try {
          if (new URL(value.trim()).protocol !== 'https:') throw new Error('https required');
        } catch {
          return res.status(400).json({ success: false, message: `${field} must be a valid HTTPS URL` });
        }
      }
      updates[field] = value.trim();
    }

    const user = await User.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const exportMyData = async (req, res, next) => {
  try {
    const [user, sessions] = await Promise.all([
      User.findById(req.user.userId).select('-password').lean(),
      Session.find({ userId: req.user.userId }).lean()
    ]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: { exportedAt: new Date().toISOString(), user, sessions } });
  } catch (error) {
    next(error);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'currentPassword and newPassword are required'
      });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ success: true, data: { message: 'Password updated' } });
  } catch (error) {
    next(error);
  }
};

const deactivateMe = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: { message: 'Account deactivated' } });
  } catch (error) {
    next(error);
  }
};

const deleteMe = async (req, res, next) => {
  try {
    const { password, confirm } = req.body || {};
    if (typeof password !== 'string' || confirm !== 'DELETE') {
      return res.status(400).json({ success: false, message: 'Password and confirmation DELETE are required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Account no longer exists' });
    }
    if (!await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ success: false, message: 'Password is incorrect' });
    }

    if (user.isAdmin) {
      const adminCount = await User.countDocuments({ isAdmin: true });
      if (adminCount <= 1) {
        return res.status(409).json({ success: false, message: 'The last remaining admin account cannot be deleted' });
      }
    }

    // Idempotent ordering lets a retry finish if session deletion succeeds but user deletion fails.
    await Session.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });

    return res.status(200).json({ success: true, data: { message: 'Account permanently deleted' } });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerUser, loginUser, getMe, updateMe, exportMyData, updatePassword, deactivateMe, deleteMe };
