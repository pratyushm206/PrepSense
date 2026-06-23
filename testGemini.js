require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const { buildQuestionPrompt } = require('./services/promptBuilder');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testGemini() {
  const prompt = buildQuestionPrompt('Walmart', 'SDE', 'medium', 3);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: prompt
  });

  console.log('Extracted text:', response.text);
}

testGemini();