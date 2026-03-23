require('dotenv').config();
const { Groq } = require("groq-sdk");
const fs = require('fs');


const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `
You are a helpful assistant that extracts shopping item data from voice input.
Analyze the text and return ONLY a valid JSON object with this EXACT structure, no extra text or explanations:

{
  "productName": "exact product name from input",
  "quantity": number (numeric value, infer if possible),
  "unit": "unit like kg, piece, packet, liter, etc. (infer or use 'piece' if unclear)"
}

Examples:
- "add two packets of salt" -> {"productName": "salt", "quantity": 2, "unit": "packet"}
- "buy apples" -> {"productName": "apples", "quantity": 1, "unit": "piece"}
- "3 kg milk" -> {"productName": "milk", "quantity": 3, "unit": "kg"}

If unclear, use reasonable defaults. Always respond with ONLY the JSON.
`;

async function parseVoiceInput(text) {
  try {
const completion = await groq.chat.completions.create({
      model: 'llama-3.2-1b-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('OpenAI parsing error:', error);
    throw error;
  }
}

async function transcribeAudio(filePath) {
  try {
const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3",
      language: "en"
    });
    return transcription.text;
  } catch (error) {
    console.error('Whisper transcription error:', error);
    throw error;
  }
}

module.exports = { parseVoiceInput, transcribeAudio };


