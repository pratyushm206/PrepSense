function buildQuestionPrompt(company, role, difficulty, count) {
  return `You are generating technical interview questions for a candidate preparing for a "${role}" role at "${company}".

Generate exactly ${count} interview questions at "${difficulty}" difficulty level.

Return ONLY a valid JSON array. No markdown formatting, no code fences, no explanation text before or after the JSON. The response must start with [ and end with ].

Each object in the array must follow this exact structure:
{
  "id": <number, sequential starting from 1>,
  "question": "<the interview question text>",
  "topic": "<one of: arrays, strings, trees, graphs, dynamic programming, OS, DBMS, networks, system design, behavioral>",
  "difficulty": "${difficulty}",
  "expectedKeyPoints": ["<key point 1>", "<key point 2>", "<key point 3>"]
}

Return only valid JSON. No markdown. No explanation.`;
}

module.exports = { buildQuestionPrompt };