const Groq = require('groq-sdk');
const fs = require('fs');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function parseVoiceInput(audioPath) {
  try {
    // 1. Transcribe the audio using Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-large-v3",
    });

    console.log("AI Heard:", transcription.text);

    // 2. Extract product details using Llama 3
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a grocery POS assistant. Convert text to JSON. Extract: productName (string), quantity (number), unit (string). Return ONLY JSON." 
        },
        { role: "user", content: transcription.text }
      ],
      model: "llama3-8b-8192",
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("AI Error:", error);
    throw error;
  }
}

// Ensure this name matches what server.js uses
module.exports = { parseVoiceInput };