const mongoose = require('mongoose');
const { TOPICS, DIFFICULTIES, VERDICTS, QUESTION_TYPES, SESSION_MODES } = require('../config/constants');

const SessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    enum: SESSION_MODES,
    default: 'subjective'
  },
  config: {
    mcqCount: { type: Number, default: 0 },
    subjectiveCount: { type: Number, default: 0 }
  },
  shareToken: {
    type: String,
    default: null
  },
  questions: [{
    id: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: QUESTION_TYPES,
      default: 'behavioral'
    },
    question: {
      type: String,
      required: true
    },
    problemStatement: {
      type: String,
      default: ''
    },
    examples: [{
      input: { type: String, required: true },
      output: { type: String, required: true },
      explanation: { type: String, default: '' }
    }],
    glossary: [{
      term: { type: String, required: true },
      meaning: { type: String, required: true }
    }],
    inputFormat: {
      type: String,
      default: ''
    },
    outputFormat: {
      type: String,
      default: ''
    },
    constraints: {
      type: [String],
      default: []
    },
    options: {
      type: [String],
      default: []
    },
    correctOptionIndex: {
      type: Number,
      default: null
    },
    explanation: {
      type: String,
      default: ''
    },
    topic: {
      type: String,
      enum: TOPICS,
      required: true
    },
    difficulty: {
      type: String,
      enum: DIFFICULTIES,
      required: true
    },
    expectedKeyPoints: {
      type: [String],
      default: []
    }
  }],
  answers: [{
    questionId: {
      type: Number,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      default: 0
    },
    strengths: {
      type: [String],
      default: []
    },
    improvements: {
      type: [String],
      default: []
    },
    missedPoints: {
      type: [String],
      default: []
    },
    verdict: {
      type: String,
      enum: VERDICTS
    },
    evaluationStatus: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'success'
    },
    failureReason: {
      type: String,
      default: ''
    },
    isLatest: {
      type: Boolean,
      default: true
    }
  }],
  overallScore: {
    type: Number,
    default: 0
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
});

SessionSchema.index({ userId: 1 });
SessionSchema.index({ company: 1 });
SessionSchema.index({ shareToken: 1 }, { unique: true, sparse: true });

const Session = mongoose.model('Session', SessionSchema);

module.exports = Session;
