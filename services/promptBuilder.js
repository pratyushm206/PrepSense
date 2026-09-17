const { DIFFICULTIES, VERDICTS, CATEGORIES } = require('../config/constants');

function buildQuestionPrompt(company, role, difficulty, count, category) {
    if (!DIFFICULTIES.includes(difficulty)) {
      throw new Error(`Invalid difficulty: "${difficulty}". Must be one of: ${DIFFICULTIES.join(', ')}`);
    }

    const categoryConfig = CATEGORIES[category];
    if (!categoryConfig) {
      throw new Error(`Invalid category: "${category}". Must be one of: ${Object.keys(CATEGORIES).join(', ')}`);
    }

    const allowedTopics = categoryConfig.topics;

    if (category === 'dsa') {
      return `You are generating coding interview questions for a candidate preparing for a "${role}" role at "${company}".

  Generate exactly ${count} DSA (data structures & algorithms) questions at "${difficulty}" difficulty, using only these topics: ${allowedTopics.join(', ')}.

  Each question must read like a real coding-round problem statement, not a one-line prompt. Return ONLY a valid JSON array. No markdown, no code fences, no explanation text before or after. The response must start with [ and end with ].

  Each object must follow this exact structure:
  {
    "id": <number, sequential starting from 1>,
    "question": "<short problem title, e.g. 'Reverse a Linked List'>",
    "problemStatement": "<2-4 sentence full description of what must be solved>",
    "examples": [
      {
        "input": "<example input>",
        "output": "<expected output>",
        "explanation": "<REQUIRED for hard difficulty if the example isn't self-evident from input/output alone. Optional (empty string) for easy difficulty.>"
      }
    ],
    "glossary": [
      { "term": "<any non-obvious word or notation used in the statement>", "meaning": "<plain-English definition>" }
    ],
    "inputFormat": "<what the input looks like, e.g. 'A single string s'>",
    "outputFormat": "<what the output looks like, e.g. 'A string, the reversed input'>",
    "constraints": ["<e.g. 1 <= s.length <= 10^4>", "<e.g. s contains only lowercase letters>"],
    "topic": "<one of: ${allowedTopics.join(', ')}>",
    "difficulty": "${difficulty}",
    "expectedKeyPoints": ["<key point 1>", "<key point 2>", "<key point 3>"]
  }

  Rules:
  - Provide exactly 1 example for easy difficulty, 2 examples for medium and hard.
  - "glossary" must be an empty array [] if the problem statement uses only common, unambiguous words. Do not invent glossary entries for trivial terms like "array" or "string".
  - Constraints must be concrete (numeric bounds, character sets), not vague.

  Return only valid JSON. No markdown. No explanation.`;
    }

    return `You are generating technical interview questions for a candidate preparing for a "${role}" role at "${company}".

  Generate exactly ${count} interview questions at "${difficulty}" difficulty level, using only these topics: ${allowedTopics.join(', ')}.

  Return ONLY a valid JSON array. No markdown formatting, no code fences, no explanation text before or after the JSON. The response must start with [ and end with ].

  Each object in the array must follow this exact structure:
  {
    "id": <number, sequential starting from 1>,
    "question": "<the interview question text>",
    "topic": "<one of: ${allowedTopics.join(', ')}>",
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

function buildMCQPrompt(company, role, difficulty, count, category) {
  if (!DIFFICULTIES.includes(difficulty)) {
    throw new Error(`Invalid difficulty: "${difficulty}". Must be one of: ${DIFFICULTIES.join(', ')}`);
  }

  const categoryConfig = CATEGORIES[category];
  if (!categoryConfig) {
    throw new Error(`Invalid category: "${category}". Must be one of: ${Object.keys(CATEGORIES).join(', ')}`);
  }

  const allowedTopics = categoryConfig.topics;

  return `You are generating multiple-choice interview questions for a candidate preparing for a "${role}" role at "${company}".

Generate exactly ${count} MCQ questions at "${difficulty}" difficulty, using only these topics: ${allowedTopics.join(', ')}.

Return ONLY a valid JSON array. No markdown, no code fences, no explanation text before or after. The response must start with [ and end with ].

Each object must follow this exact structure:
{
  "id": <number, sequential starting from 1>,
  "question": "<the stem of the multiple-choice question>",
  "topic": "<one of: ${allowedTopics.join(', ')}>",
  "difficulty": "${difficulty}",
  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "correctOptionIndex": <integer 0-3 matching the correct entry in options>,
  "explanation": "<1-3 sentences explaining why that option is correct>"
}

Rules:
- options MUST contain exactly 4 distinct, non-empty strings.
- correctOptionIndex MUST be an integer 0, 1, 2, or 3.
- Distractors must be plausible. Do not make the correct answer obvious by length alone.

Return only valid JSON. No markdown. No explanation.`;
}

function buildDsaMCQPrompt(company, role, difficulty, count) {
  if (!DIFFICULTIES.includes(difficulty)) {
    throw new Error(`Invalid difficulty: "${difficulty}". Must be one of: ${DIFFICULTIES.join(', ')}`);
  }

  const allowedTopics = CATEGORIES.dsa.topics;

  return `You are generating DSA multiple-choice questions for a candidate preparing for a "${role}" role at "${company}".

Generate exactly ${count} DSA MCQ questions at "${difficulty}" difficulty, using only these topics: ${allowedTopics.join(', ')}.
These are knowledge/complexity/pattern questions, NOT full coding problems. Do not include a problemStatement, examples, or constraints.

Return ONLY a valid JSON array. No markdown, no code fences, no explanation text before or after. The response must start with [ and end with ].

Each object must follow this exact structure:
{
  "id": <number, sequential starting from 1>,
  "question": "<the stem, e.g. 'What is the time complexity of Dijkstra with a binary heap?'>",
  "topic": "<one of: ${allowedTopics.join(', ')}>",
  "difficulty": "${difficulty}",
  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "correctOptionIndex": <integer 0-3 matching the correct entry in options>,
  "explanation": "<1-3 sentences explaining why that option is correct>"
}

Rules:
- options MUST contain exactly 4 distinct, non-empty strings.
- correctOptionIndex MUST be an integer 0, 1, 2, or 3.

Return only valid JSON. No markdown. No explanation.`;
}

module.exports = { buildQuestionPrompt, buildEvalPrompt, buildMCQPrompt, buildDsaMCQPrompt };