const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { parseVoiceInput } = require('./aiParser');
const { getProductPrice } = require('./database');

const app = express();

// 1. Create the 'uploads' folder if it doesn't exist
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 2. Tell Multer to keep the original file extension (.m4a)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Keeps the extension so Groq can recognize the file type
    const ext = path.extname(file.originalname) || '.m4a';
    cb(null, Date.now() + ext);
  }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

app.post('/process-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) throw new Error("No audio file received");

    console.log("📁 File saved as:", req.file.path);

    // Call the AI Parser
    const aiData = await parseVoiceInput(req.file.path);
    console.log("🧠 AI Extracted:", aiData);

    const product = await getProductPrice(aiData.productName);

    if (product) {
      res.json({
        success: true,
        productName: product.name,
        price_per_unit: product.price,
        quantity: aiData.quantity || 1,
        unit: aiData.unit || 'unit',
        total: product.price * (aiData.quantity || 1)
      });
    } else {
      res.status(404).json({ success: false, error: `Product '${aiData.productName}' not found.` });
    }
    
    // Optional: Delete the file after processing to save space on Render
    fs.unlinkSync(req.file.path);

  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Cloud Server live on port ${PORT}`));