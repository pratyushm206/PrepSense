const { TOPICS, DIFFICULTIES, VERDICTS, CATEGORIES } = require('../config/constants');

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

module.exports = { buildQuestionPrompt, buildEvalPrompt };