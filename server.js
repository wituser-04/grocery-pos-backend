const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { parseVoiceInput } = require('./aiParser');
const { getProductPrice } = require('./database');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

app.post('/process-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) throw new Error("No audio file received");

    // Call the AI Parser
    const aiData = await parseVoiceInput(req.file.path);
    console.log("AI Extracted:", aiData);

    // Look up price in your SQLite database
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
  } catch (error) {
    console.error("Server Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server live on port ${PORT}`));