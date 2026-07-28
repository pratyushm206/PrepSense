const { normalizeScore, getTopicScores, detectTrend, calculateReadiness } = require('./services/scoringEngine');

// Test normalizeScore
console.log('normalizeScore(80, "hard"):', normalizeScore(80, 'hard'));   // expect 100 (80*1.3=104, capped)
console.log('normalizeScore(80, "easy"):', normalizeScore(80, 'easy'));   // expect 64
console.log('normalizeScore(50, "medium"):', normalizeScore(50, 'medium')); // expect 50

// Test detectTrend
console.log('detectTrend([50,55,60,70,80]):', detectTrend([50,55,60,70,80])); // expect improving
console.log('detectTrend([80,70,60,55,50]):', detectTrend([80,70,60,55,50])); // expect declining
console.log('detectTrend([60,61,59,60]):', detectTrend([60,61,59,60]));       // expect stable

const testSession = {
  company: "Walmart",
  questions: [
    { id: 1, topic: "system design", difficulty: "medium" },
    { id: 2, topic: "strings", difficulty: "medium" },
    { id: 3, topic: "dynamic programming", difficulty: "medium" }
  ],
  answers: [
    { questionId: 1, score: 5 },
    { questionId: 1, score: 10 }
  ]
};

console.log('getTopicScores:', JSON.stringify(getTopicScores([testSession]), null, 2));
console.log('calculateReadiness:', calculateReadiness([testSession], 'Walmart'));