// Development smoke check: runs this project's own window in an isolated profile.
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const profile = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'changan-electron-check-'));
fs.mkdirSync(profile, { recursive: true }); app.setPath('userData', profile);
require('./main.cjs');
app.whenReady().then(async () => {
  const deadline = Date.now() + 65000;
  const win = BrowserWindow.getAllWindows()[0];
  try {
    while (win.webContents.isLoading()) await new Promise(r => setTimeout(r, 100));
    await win.webContents.executeJavaScript(`document.querySelector('.sidebar-bottom .nav-item').click()`);
    while (Date.now() < deadline && !(await win.webContents.executeJavaScript(`Boolean([...document.querySelectorAll('button')].find(b=>b.textContent==='检查订阅连接'))`))) await new Promise(r => setTimeout(r, 100));
    await win.webContents.executeJavaScript(`[...document.querySelectorAll('button')].find(b=>b.textContent==='检查订阅连接').click()`);
    let status;
    while (Date.now() < deadline) {
      status = await win.webContents.executeJavaScript(`document.body.innerText`);
      if (status.includes('已识别 ChatGPT')) break;
      await new Promise(r => setTimeout(r, 300));
    }
    if (!status?.includes('已识别 ChatGPT plus')) throw new Error('Desktop IPC subscription status was not rendered');
    await win.webContents.executeJavaScript(`(() => { const select = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'codex')); select.value = 'codex'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await win.webContents.executeJavaScript(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='聊一聊').click()`);
    await win.webContents.executeJavaScript(`(() => { const input = document.querySelector('#chat-input'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, '虚构连接体验：今天散步20分钟。请简短回复，并说明档案是否已保存。'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await win.webContents.executeJavaScript(`document.querySelector('.composer').requestSubmit()`);
    const replyDeadline = Date.now() + 135000;
    let received = false;
    while (Date.now() < replyDeadline) {
      received = await win.webContents.executeJavaScript(`Boolean(document.querySelector('.message.assistant .message-label')?.textContent.includes('ChatGPT 订阅'))`);
      if (received) break;
      const error = await win.webContents.executeJavaScript(`document.querySelector('.error-banner')?.textContent`);
      if (error) throw new Error(error);
      await new Promise(r => setTimeout(r, 300));
    }
    if (!received) throw new Error('Desktop chat reply timed out');
    const persisted = await win.webContents.executeJavaScript(`JSON.parse(localStorage.getItem('changan-demo-v1'))`);
    if (persisted.pending.length !== 0 || persisted.messages.at(-1).provider !== 'codex') throw new Error('Unexpected automatic archive or provider');
    console.log('DESKTOP_CHAT_CHECK_OK: real subscription reply; no automatic archive');
    const screenshot = await win.webContents.capturePage();
    fs.writeFileSync(path.join(__dirname, '../../常安-订阅聊天.png'), screenshot.toPNG());
    console.log('DESKTOP_UI_CHECK_OK: sandbox preload → main IPC → Codex subscription → settings UI');
  } catch (e) { console.error(e.message); process.exitCode = 1; } finally { app.quit(); }
});
