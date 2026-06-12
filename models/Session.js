// import mongoose
const mongoose = require('mongoose');

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
    questions: {
        type: Array,
        default: []
    },
    answers: [{    //this is an array of objects, each with its own structure.
        questionId: String,
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