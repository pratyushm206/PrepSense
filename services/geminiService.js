const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateQuestions(prompt) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: prompt
  });
  return response.text;
}

async function generateEvaluation(prompt) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });
  return response.text;
}

module.exports = { generateQuestions, generateEvaluation };