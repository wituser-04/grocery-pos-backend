const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { transcribeAudioGroq, parseVoiceInputGroq } = require('./aiParser');
const { searchProductByName } = require('./database');

const app = express();
const upload = multer({ dest: os.tmpdir() });

app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// POST /process-audio
app.post('/process-audio', upload.single('audio'), async (req, res) => {
  let tempFile;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file' });
    }

    tempFile = req.file.path;
    console.log('📁 Received audio:', tempFile);

    // 1. Groq Whisper transcription
    const transcript = await transcribeAudioGroq(tempFile);
    console.log('🗣️ Transcript:', transcript);

    // 2. Groq Llama parsing
    const parsed = await parseVoiceInputGroq(transcript);
    console.log('🤖 Parsed:', parsed);

    // 3. Database search
    const products = await searchProductByName(parsed.productName);
    if (products.length === 0) {
      return res.status(404).json({ error: `Product "${parsed.productName}" not found` });
    }

    const product = products[0];
    const total = parsed.quantity * product.price_per_unit;

    res.json({
      success: true,
      productName: parsed.productName,
      quantity: parsed.quantity,
      unit: parsed.unit,
      price_per_unit: product.price_per_unit,
      stock: product.stock,
      total
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // Cleanup
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('Test: POST /process-audio with audio file');
});

