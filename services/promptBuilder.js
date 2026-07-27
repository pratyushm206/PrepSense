const { TOPICS, DIFFICULTIES, VERDICTS } = require('../config/constants');

function buildQuestionPrompt(company, role, difficulty, count) {
  if (!DIFFICULTIES.includes(difficulty)) {
    throw new Error(`Invalid difficulty: "${difficulty}". Must be one of: ${DIFFICULTIES.join(', ')}`);
  }

  return `You are generating technical interview questions for a candidate preparing for a "${role}" role at "${company}".

Generate exactly ${count} interview questions at "${difficulty}" difficulty level.

Return ONLY a valid JSON array. No markdown formatting, no code fences, no explanation text before or after the JSON. The response must start with [ and end with ].

Each object in the array must follow this exact structure:
{
  "id": <number, sequential starting from 1>,
  "question": "<the interview question text>",
  "topic": "<one of: ${TOPICS.join(', ')}>",
  "difficulty": "${difficulty}",
  "expectedKeyPoints": ["<key point 1>", "<key point 2>", "<key point 3>"]
}

Return only valid JSON. No markdown. No explanation.`;
}

function buildEvalPrompt(question, userAnswer, expectedKeyPoints) {
  return `You are evaluating a candidate's answer to a technical interview question.

Question: "${question}"

Candidate's Answer: "${userAnswer}"

Expected key points the answer should cover: ${expectedKeyPoints.join('; ')}

Evaluate the answer and return ONLY a valid JSON object, no markdown, no explanation, no code fences. The response must start with { and end with }.

The object must follow this exact structure:
{
  "score": <number 0-100>,
  "strengths": ["<specific thing the candidate did well>"],
  "improvements": ["<specific thing to improve>"],
  "missedPoints": ["<expected key point the answer did not cover>"],
  "verdict": "<one of: ${VERDICTS.join(', ')}>"
}

Return only valid JSON. No markdown. No explanation.`;
}

module.exports = { buildQuestionPrompt, buildEvalPrompt };