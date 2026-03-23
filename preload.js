const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  processVoice: (text) => ipcRenderer.invoke('process-voice', text),
  processAudio: (buffer) => ipcRenderer.invoke('process-audio', buffer)
});

