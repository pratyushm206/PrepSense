const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function callGeminiWithRetry(model, prompt, strictPrompt) {
  try {
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text;
  } catch (err) {
    console.warn('Gemini call failed, retrying with stricter prompt:', err.message);
    try {
      const retryResponse = await ai.models.generateContent({ model, contents: strictPrompt });
      return retryResponse.text;
    } catch (retryErr) {
      console.error('Gemini retry also failed:', retryErr.message);
      throw new Error('Gemini API failed after retry');
    }
  }
}

async function generateQuestions(prompt) {
  const strictPrompt = prompt + '\n\nYou MUST return only valid JSON with no other text.';
  return callGeminiWithRetry('gemini-2.5-flash-lite', prompt, strictPrompt);
}

async function generateEvaluation(prompt) {
  const strictPrompt = prompt + '\n\nYou MUST return only valid JSON with no other text.';
  return callGeminiWithRetry('gemini-2.5-flash', prompt, strictPrompt);
}

module.exports = { generateQuestions, generateEvaluation };