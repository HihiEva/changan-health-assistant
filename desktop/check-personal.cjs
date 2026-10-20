// Personal-mode UI verification with entirely fictional fixtures and no model calls.
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const profile = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'changan-personal-check-'));
app.setPath('userData', profile);
fs.writeFileSync(path.join(profile,'personal-draft.json'), JSON.stringify({ age: '41', sex: '不提供', symptoms: '测试用资料，请勿视为真实健康信息。' }));
let calls=0;
const txt = path.join(profile,'fixture.txt'); fs.writeFileSync(txt,'Fictional attachment: TEST-734.');
dialog.showOpenDialog = async () => ({ canceled:false, filePaths:[txt] });
require('./codex.cjs').chat = async (_cwd,payload) => {
  calls++;
  if(payload.dataMode!=='personal' || payload.context.includes('体验药') || payload.attachments[0]?.text!=='Fictional attachment: TEST-734.') throw new Error('Incorrect context or attachment');
  return {text:'```markdown\n## 测试回复\n\n- **测试项目**\n\n| 项目 | 结果 |\n| --- | --- |\n| 附件 | TEST-734 |\n```',model:'test'};
};
require('./main.cjs');
app.whenReady().then(async () => {
  const win=BrowserWindow.getAllWindows()[0];
  ipcMain.removeHandler('changan:ai-status'); ipcMain.handle('changan:ai-status',()=>({plan:'test',viaProxy:false,models:[{id:'test',name:'test',isDefault:true}]}));
  const pause=()=>new Promise(r=>setTimeout(r,100));
  const click = text => win.webContents.executeJavaScript(`(() => { const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}); if(!button)throw new Error('Missing button');button.click()})()`);
  try {
    while(win.webContents.isLoading())await pause();
    await win.webContents.executeJavaScript(`document.querySelector('.sidebar-bottom .nav-item').click()`);await pause();
    await click('我的个人档案');await pause();await pause();
    const input=await win.webContents.executeJavaScript(`document.querySelector('dialog input').value`);if(input!=='41')throw new Error('Prefill failed');
    await click('整理为待确认资料');await pause();
    let state=await win.webContents.executeJavaScript(`JSON.parse(localStorage.getItem('changan-personal-v1'))`);
    if(state.records.length || state.pending.length!==8 || calls)throw new Error('Confirmation gate failed');
    await click('确认这些个人资料');await pause();
    await win.webContents.executeJavaScript(`document.querySelector('.sidebar .nav-item').click()`);await pause();
    await click('连接并启用 ChatGPT');await pause();await pause();
    if(!(await win.webContents.executeJavaScript(`document.querySelector('dialog')?.textContent.includes('启用个人资料对话')`)) || calls)throw new Error('Consent gate failed');
    await click('同意并开启本次聊天');await pause();
    await click('添加附件');await pause();await pause();
    if(calls || !(await win.webContents.executeJavaScript(`document.querySelector('.attachment-list').textContent.includes('fixture.txt')`)))throw new Error('Attachment preview gate failed');
    await win.webContents.executeJavaScript(`(() => { const input=document.querySelector('#chat-input');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'测试用提问');input.dispatchEvent(new Event('input',{bubbles:true})); })()`);await pause();
    await win.webContents.executeJavaScript(`document.querySelector('.composer').requestSubmit()`);await pause();await pause();
    state=await win.webContents.executeJavaScript(`JSON.parse(localStorage.getItem('changan-personal-v1'))`);
    if(!(await win.webContents.executeJavaScript(`Boolean(document.querySelector('.markdown-message h2') && document.querySelector('.markdown-message table'))`)))throw new Error('Markdown rendering failed');
    if(state.messages[0].attachments?.[0]?.name!=='fixture.txt' || await win.webContents.executeJavaScript(`Boolean(document.querySelector('.attachment-list'))`))throw new Error('Attachment history/cleanup failed');
    if(calls!==1 || state.messages.length!==2 || state.records.length!==8)throw new Error('Personal chat routing failed');
    if(fs.existsSync(path.join(profile,'personal-draft.json')))throw new Error('Initial draft not consumed');
    await win.webContents.executeJavaScript(`document.querySelector('.sidebar-bottom .nav-item').click()`);await pause();await click('虚构演示');await pause();
    if(!(await win.webContents.executeJavaScript(`document.body.innerText.includes('体验药')`)))throw new Error('Demo mode missing');
    await win.webContents.executeJavaScript(`document.querySelector('.sidebar-bottom .nav-item').click()`);await pause();await click('我的个人档案');await pause();
    if(await win.webContents.executeJavaScript(`document.body.innerText.includes('体验药')`))throw new Error('Demo data leaked into personal mode');
    console.log('PERSONAL_UI_OK: separate modes, prefill, confirmation, consent, chat routing, local draft cleanup');
  } catch(e) { console.error(e.message);process.exitCode=1; } finally {app.quit();}
});
