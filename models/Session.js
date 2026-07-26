// import mongoose
const mongoose = require('mongoose');
const { TOPICS, DIFFICULTIES } = require('../config/constants');
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
    answers: [{    //this is an array of objects, each with its own structure.
        questionId: Number,
        text: String,
        score: Number,
        feedback: String
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

const Session = mongoose.model('Session', SessionSchema);

module.exports = Session;