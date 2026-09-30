const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('changanAI', {
  status: () => ipcRenderer.invoke('changan:ai-status'),
  chat: payload => ipcRenderer.invoke('changan:ai-chat', payload),
});
