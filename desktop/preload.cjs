const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('changanAI', {
  clearPersonalDraft: () => ipcRenderer.invoke('changan:personal-draft-clear'),
  personalDraft: () => ipcRenderer.invoke('changan:personal-draft'),
  pickAttachments: () => ipcRenderer.invoke('changan:attachments-pick'),
  removeAttachments: ids => ipcRenderer.invoke('changan:attachments-remove', ids),
  status: () => ipcRenderer.invoke('changan:ai-status'),
  chat: payload => ipcRenderer.invoke('changan:ai-chat', payload),
});
