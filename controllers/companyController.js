const Session = require('../models/Session');
const { hasLatestSuccessfulAnswer, normalizeTopic } = require('../services/scoringEngine');

const getInsights = async (req, res, next) => {
  try {
    const { name } = req.params;

    const sessions = (await Session.find({ company: name })).filter(hasLatestSuccessfulAnswer);

    const topicCounts = new Map();
    const distinctTopics = new Set();

    sessions.forEach(session => {
      session.questions.forEach(q => {
        const topic = normalizeTopic(q.topic);
        if (!topic) return;
        const normalizedQuestion = String(q.question || '').trim().toLowerCase();
        const key = `${session.company}:${topic}:${normalizedQuestion}`;
        if (distinctTopics.has(key)) return;
        distinctTopics.add(key);
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });
    });

    const topTopics = Array.from(topicCounts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      data: { company: name, totalSessionsAnalyzed: sessions.length, topTopics }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getInsights };
