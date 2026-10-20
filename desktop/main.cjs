const { app, BrowserWindow, Menu, dialog, session, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const codex = require('./codex.cjs');
const attachments = require('./attachments.cjs');
const livePreview = (app.isPackaged && fs.existsSync(path.join(__dirname, 'dev-mode.json'))) || (!app.isPackaged && process.argv.includes('--dev'));
const devURL = 'http://127.0.0.1:5178';
const { pathToFileURL } = require('node:url');
app.setName('ChangAn Health Prototype');
app.setAppUserModelId('cn.changan.health.prototype');
if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  let window;
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
  app.whenReady().then(() => {
    const entry = path.join(__dirname, '../dist/index.html');
    function checkSender(event) {
      if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('不允许的请求来源。');
      const url = event.senderFrame.url;
      if (url !== pathToFileURL(entry).href && !(livePreview && new URL(url).origin === devURL)) throw new Error('不允许的页面。');
    }
    ipcMain.handle('changan:personal-draft', event => { checkSender(event); const file = path.join(app.getPath('userData'), 'personal-draft.json'); if (!fs.existsSync(file)) return {}; const value = JSON.parse(fs.readFileSync(file, 'utf8')); return Object.fromEntries(['age','sex','goal','conditions','medications','allergies','symptoms','checks'].map(k => [k, typeof value[k] === 'string' ? value[k].slice(0, 2500) : ''])); });
    ipcMain.handle('changan:personal-draft-clear', event => { checkSender(event); const file = path.join(app.getPath('userData'), 'personal-draft.json'); if (fs.existsSync(file)) fs.unlinkSync(file); });
    const aiDirectory = path.join(app.getPath('userData'), 'ai-workspace');
    ipcMain.handle('changan:ai-status', async event => { checkSender(event); return codex.status(aiDirectory); });
    const selectedAttachments = new Map();
    ipcMain.handle('changan:attachments-pick', async event => {
      checkSender(event);
      const result = await dialog.showOpenDialog(window, { title: '添加聊天附件', properties: ['openFile','multiSelections'], filters: [{ name: '图片、PDF 与文本', extensions: ['png','jpg','jpeg','webp','pdf','txt','md','csv'] }] });
      if (result.canceled) return [];
      if (result.filePaths.length > attachments.MAX_FILES) throw new Error('一次最多选择 4 个附件。');
      const values = attachments.validateAttachments(await Promise.all(result.filePaths.map(attachments.readAttachment)));
      if (selectedAttachments.size + values.length > 8) throw new Error('暂存附件过多，请移除附件后再添加。');
      for (const a of values) selectedAttachments.set(a.id, a);
      return values.map(attachments.metadata);
    });
    ipcMain.handle('changan:attachments-remove', (event, ids) => {
      checkSender(event); if (Array.isArray(ids)) for (const id of ids) selectedAttachments.delete(id);
    });
    ipcMain.handle('changan:ai-chat', async (event, payload) => {
      checkSender(event);
      const ids = payload?.attachmentIds ?? [];
      if (!Array.isArray(ids) || ids.length > 4 || new Set(ids).size !== ids.length) throw new Error('附件选择无效。');
      const values = attachments.validateAttachments(ids.map(id => { const a = selectedAttachments.get(id); if (!a) throw new Error('附件已失效，请重新添加。'); return a; }));
      const reply = await codex.chat(aiDirectory, { ...payload, attachments: values });
      for (const id of ids) selectedAttachments.delete(id);
      return reply;
    });
    app.on('before-quit', () => selectedAttachments.clear());
    app.on('before-quit', () => codex.shutdown());
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const localDev = livePreview && ['http://127.0.0.1:5178', 'ws://127.0.0.1:5178'].includes(new URL(details.url).origin);
      callback({ cancel: !localDev && !['file:', 'blob:', 'data:', 'devtools:'].some(prefix => details.url.startsWith(prefix)) });
    });
    session.defaultSession.on('will-download', (_event, item) => {
      item.setSaveDialogOptions({ title: '导出虚构体验资料', defaultPath: path.join(app.getPath('downloads'), path.basename(item.getFilename())) });
    });
    function createWindow() {
      window = new BrowserWindow({ width: 1280, height: 900, minWidth: process.platform === 'darwin' ? 360 : 700, minHeight: process.platform === 'darwin' ? 360 : 600, title: '常安 · 家庭健康助手（体验原型）', backgroundColor: '#f6f7f2', icon: path.join(__dirname, '../dist/icon-512.png'), show: false, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
      window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      window.webContents.on('will-navigate', (event, url) => { if (url !== pathToFileURL(entry).href && !(livePreview && new URL(url).origin === devURL)) event.preventDefault(); });
      window.once('ready-to-show', () => window.show());
      (livePreview ? window.loadURL(devURL) : window.loadFile(entry)).catch(error => dialog.showErrorBox('常安无法打开', error.message));
      window.on('closed', () => { window = null; });
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: '常安', submenu: [{ label: '退出', role: 'quit' }] },
      { label: '编辑', submenu: [{ role: 'undo', label: '撤销' }, { role: 'redo', label: '重做' }, { type: 'separator' }, { role: 'cut', label: '剪切' }, { role: 'copy', label: '复制' }, { role: 'paste', label: '粘贴' }, { role: 'selectAll', label: '全选' }] },
      { label: '视图', submenu: [{ role: 'reload', label: '重新载入' }, { role: 'resetZoom', label: '实际大小' }, { role: 'zoomIn', label: '放大' }, { role: 'zoomOut', label: '缩小' }, { role: 'togglefullscreen', label: '全屏' }] }
    ]));
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
