const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
require('dotenv').config();
const Session = require('../models/Session');
const { calculateSessionScore } = require('../services/scoringEngine');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const sessions = await Session.find({});
  let touched = 0;

  for (const session of sessions) {
    const seen = new Set();
    for (let i = session.answers.length - 1; i >= 0; i--) {
      const a = session.answers[i];
      if (seen.has(a.questionId)) {
        a.isLatest = false;
      } else {
        a.isLatest = true;
        seen.add(a.questionId);
      }
    }
    session.overallScore = calculateSessionScore(session);
    await session.save();
    touched++;
  }

  console.log(`Backfilled ${touched} sessions.`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });