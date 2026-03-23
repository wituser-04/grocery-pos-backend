const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { parseVoiceInput } = require('./aiParser'); // <-- Matching name
const { getProductPrice } = require('./database');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

app.post('/process-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) throw new Error("No audio file!");

    // WE ARE CALLING THE NEW NAME HERE
    const aiData = await parseVoiceInput(req.file.path);
    
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
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Cloud Server active on port ${PORT}`));