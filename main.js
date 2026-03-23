const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { parseVoiceInput, transcribeAudio } = require('./aiParser');
const { searchProductByName } = require('./database');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }
}

// Existing text voice processing
ipcMain.handle('process-voice', async (event, text) => {
  try {
    console.log('🔊 Processing voice text:', text);
    
    const parsed = await parseVoiceInput(text);
    console.log('🤖 AI Parsed:', parsed);
    
    const products = await searchProductByName(parsed.productName);
    if (products.length === 0) {
      return { error: `❌ Product "${parsed.productName}" not found` };
    }
    
    const product = products[0];
    const total = parsed.quantity * product.price_per_unit;
    
    console.log('✅ Returning product:', product.name);
    return {
      success: true,
      productName: parsed.productName,
      quantity: parsed.quantity,
      unit: parsed.unit,
      price_per_unit: product.price_per_unit,
      stock: product.stock,
      total
    };
  } catch (error) {
    console.error('❌ Voice error:', error);
    return { error: error.message };
  }
});

// NEW: Audio → Whisper → Processing
ipcMain.handle('process-audio', async (event, audioBuffer) => {
  let tempFile;
  try {
    console.log('🎙️ Processing audio buffer');
    
    // Save temp webm file
    const tempDir = os.tmpdir();
    tempFile = path.join(tempDir, `voice-${Date.now()}.webm`);
    fs.writeFileSync(tempFile, Buffer.from(audioBuffer));
    console.log('💾 Temp file:', tempFile);

    // Whisper transcription
    const transcript = await transcribeAudio(tempFile);
    console.log('🗣️ Whisper got:', transcript);

    // Delete temp file
    fs.unlinkSync(tempFile);
    tempFile = null;

    // Chain to existing voice processing
    return await ipcMain.handle('process-voice', event, transcript);
  } catch (error) {
    console.error('❌ Audio processing error:', error);
    if (tempFile) fs.unlinkSync(tempFile);
    return { error: error.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

