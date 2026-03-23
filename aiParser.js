const Groq = require('groq-sdk');
const fs = require('fs');

// The AI Brain
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function parseVoiceInput(audioPath) {
  try {
    // 1. Convert Voice to Text
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-large-v3",
    });

    console.log("AI Heard:", transcription.text);

    // 2. Extract Data
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "Extract: productName (string), quantity (number), unit (string). Return ONLY JSON." 
        },
        { role: "user", content: transcription.text }
      ],
      model: "llama3-8b-8192",
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("AI Parser Error:", error);
    throw error;
  }
}

// THIS MUST MATCH THE FUNCTION NAME ABOVE
module.exports = { parseVoiceInput };