const { app, BrowserWindow, Menu, dialog, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const livePreview = fs.existsSync(path.join(__dirname, 'dev-mode.json')) || (!app.isPackaged && process.argv.includes('--dev'));
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
      window = new BrowserWindow({ width: 1280, height: 900, minWidth: 700, minHeight: 600, title: '常安 · 家庭健康助手（体验原型）', backgroundColor: '#f6f7f2', icon: path.join(__dirname, '../dist/icon-512.png'), show: false, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
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
