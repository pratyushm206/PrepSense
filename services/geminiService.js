const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { timeout: Number(process.env.GEMINI_TIMEOUT_MS) || 30000 }
});

function questionSchema(category, format) {
  const stringArray = { type: 'array', items: { type: 'string' } };
  const properties = {
    id: { type: 'integer' },
    question: { type: 'string' },
    topic: { type: 'string' },
    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
    expectedKeyPoints: stringArray
  };
  const required = ['id', 'question', 'topic', 'difficulty'];

  if (format === 'mcq') {
    Object.assign(properties, {
      options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
      correctOptionIndex: { type: 'integer', minimum: 0, maximum: 3 },
      explanation: { type: 'string' }
    });
    required.push('options', 'correctOptionIndex', 'explanation');
  } else {
    required.push('expectedKeyPoints');
    if (category === 'dsa') {
      Object.assign(properties, {
        problemStatement: { type: 'string' },
        examples: {
          type: 'array', minItems: 1, maxItems: 3,
          items: {
            type: 'object',
            properties: {
              input: { type: 'string' },
              output: { type: 'string' },
              explanation: { type: 'string' }
            },
            required: ['input', 'output']
          }
        },
        glossary: {
          type: 'array', items: {
            type: 'object',
            properties: { term: { type: 'string' }, meaning: { type: 'string' } },
            required: ['term', 'meaning']
          }
        },
        inputFormat: { type: 'string' },
        outputFormat: { type: 'string' },
        constraints: stringArray
      });
      required.push('problemStatement', 'examples', 'glossary', 'inputFormat', 'outputFormat', 'constraints');
    }
  }

  return {
    type: 'array',
    items: { type: 'object', properties, required, additionalProperties: false }
  };
}

function isTransientError(error) {
  const status = Number(error.status || error.statusCode || error.code);
  return status === 429 || status === 503 || /RESOURCE_EXHAUSTED|UNAVAILABLE/.test(`${error.code || ''} ${error.message || ''}`);
}

function makeBusyError() {
  const error = new Error('AI is busy. Please try again in a minute.');
  error.statusCode = 503;
  error.code = 'AI_BUSY';
  return error;
}

async function callGeminiWithRetry(model, prompt, schema) {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: schema ? { responseMimeType: 'application/json', responseJsonSchema: schema } : undefined
      });
      return response.text;
    } catch (error) {
      if (!isTransientError(error)) throw error;
      if (attempt === maxAttempts - 1) throw makeBusyError();
      await new Promise(resolve => setTimeout(resolve, 400 * (2 ** attempt)));
    }
  }
}

async function generateQuestions(prompt, options = {}) {
  return callGeminiWithRetry(
    process.env.GEMINI_QUESTION_MODEL || 'gemini-2.5-flash-lite',
    prompt,
    questionSchema(options.category, options.format || 'subjective')
  );
}

async function generateEvaluation(prompt) {
  const schema = {
    type: 'object',
    properties: {
      score: { type: 'number', minimum: 0, maximum: 100 },
      strengths: { type: 'array', items: { type: 'string' } },
      improvements: { type: 'array', items: { type: 'string' } },
      missedPoints: { type: 'array', items: { type: 'string' } },
      verdict: { type: 'string', enum: ['good', 'average', 'poor'] }
    },
    required: ['score', 'strengths', 'improvements', 'missedPoints', 'verdict'],
    additionalProperties: false
  };
  return callGeminiWithRetry(
    process.env.GEMINI_EVAL_MODEL || 'gemini-2.5-flash',
    prompt,
    schema
  );
}

module.exports = { generateQuestions, generateEvaluation };
