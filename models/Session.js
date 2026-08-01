// import mongoose
const mongoose = require('mongoose');
const { TOPICS, DIFFICULTIES, VERDICTS } = require('../config/constants');
// Defining schema
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
    questions: [{
        id: {
            type: Number,
            required: true
        },
        question: {
            type: String,
            required: true
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
            required: true
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
            enum: VERDICTS,
            required: true
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

const Session = mongoose.model('Session', SessionSchema);

module.exports = Session;