const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path');
app.setPath('userData', fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'changan-layout-')));
require('./main.cjs');
app.whenReady().then(async () => {
  const win = BrowserWindow.getAllWindows()[0];
  try {
    while (win.webContents.isLoading()) await new Promise(r => setTimeout(r, 100));
    for (const [width, height] of [[1280, 800], [900, 500], [700, 400], [480, 400], [360, 400]]) {
      win.setContentSize(width, height);
      for (const index of [0, 1, 2, 3]) {
        await win.webContents.executeJavaScript(`document.querySelectorAll('.sidebar .nav-item')[${index}].click()`);
        await new Promise(r => setTimeout(r, 120));
        const measurement = await win.webContents.executeJavaScript(`({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,slogans:/健康的变化|值得慢慢看见|少一点繁琐|慢慢来，每一步|YOUR EVERYDAY/.test(document.body.innerText),sidebar: getComputedStyle(document.querySelector('.sidebar')).overflowY})`);
        if (measurement.scroll > measurement.width + 1 || measurement.body > measurement.width + 1 || measurement.slogans) throw new Error(JSON.stringify({ width, height, page: index, ...measurement }));
        console.log('LAYOUT_OK', width, height, index, measurement.sidebar);
      }
    }
    win.setContentSize(900, 500);
    await win.webContents.executeJavaScript(`document.querySelectorAll('.sidebar .nav-item')[0].click(); window.scrollTo(0,0)`);
    await new Promise(r => setTimeout(r, 120));
    fs.writeFileSync(path.join(__dirname, '../../常安-Mac简洁界面.png'), (await win.webContents.capturePage()).toPNG());
  } catch (e) { console.error('LAYOUT_FAILED', e.message); process.exitCode = 1; } finally { app.quit(); }
});
