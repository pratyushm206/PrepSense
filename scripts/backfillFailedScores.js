const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
require('dotenv').config();
const Session = require('../models/Session');
const { calculateSessionScore } = require('../services/scoringEngine');

const shouldWrite = process.argv.includes('--write');

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const sessions = await Session.find({
    answers: {
      $elemMatch: {
        evaluationStatus: 'failed',
        $or: [
          { score: 0 },
          { verdict: 'poor' }
        ]
      }
    }
  });

  let answersMatched = 0;
  let sessionsChanged = 0;

  for (const session of sessions) {
    let changed = false;

    session.answers.forEach(answer => {
      if (answer.evaluationStatus !== 'failed') return;
      const needsScoreBackfill = answer.score === 0;
      const needsVerdictBackfill = answer.verdict === 'poor';

      if (!needsScoreBackfill && !needsVerdictBackfill) return;
      answersMatched += 1;
      changed = true;

      if (shouldWrite) {
        answer.score = null;
        answer.verdict = null;
      }
    });

    if (!changed) continue;
    sessionsChanged += 1;

    if (shouldWrite) {
      session.overallScore = calculateSessionScore(session);
      await session.save();
    }
  }

  console.log(`Mode: ${shouldWrite ? 'write' : 'dry-run'}`);
  console.log(`Sessions affected: ${sessionsChanged}`);
  console.log(`Failed answers affected: ${answersMatched}`);

  await mongoose.disconnect();
}

if (require.main === module) {
  run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { run };
