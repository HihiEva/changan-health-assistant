// Run the installed EXE on a clean Windows runner; never call a real model.
const {spawn}=require('node:child_process');
const {mkdtempSync}=require('node:fs');
const path=require('node:path'), os=require('node:os');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const profile=mkdtempSync(path.join(os.tmpdir(),'changan-smoke-'));
 const proc=spawn(process.argv[2],['--remote-debugging-port=9234',`--user-data-dir=${profile}`],{stdio:'ignore'});
 let socket;
 try{
  let target;
  for(let i=0;i<100;i++){
   try{target=(await (await fetch('http://127.0.0.1:9234/json')).json()).find(t=>t.type==='page'&&t.url.startsWith('file:'));}catch{}
   if(target)break;await delay(300);
  }
  if(!target)throw new Error('Installed application did not open a page');
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject});
  let sequence=0; const pending=new Map();
  socket.onmessage=e=>{const m=JSON.parse(e.data);const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}};
  const evaluate=expression=>new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('UI evaluation timed out'));},10000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));}).then(r=>{if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;});
  for(let i=0;i<50;i++){if(await evaluate("Boolean(document.querySelector('.sidebar-bottom .nav-item'))"))break;await delay(100);}
  const bridge=await evaluate("typeof window.changanAI?.pickAttachments === 'function'");if(!bridge)throw new Error('Native attachment bridge missing');
  await evaluate("document.querySelector('.sidebar-bottom .nav-item').click()");await delay(200);
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='我的个人档案').click()");await delay(300);
  if(!(await evaluate("document.querySelector('dialog')?.textContent.includes('我的个人资料')")))throw new Error('Personal profile UI missing');
  console.log('WINDOWS_INSTALLED_APP_OK: installer, app launch, React UI, attachment bridge, personal profile');
 }finally{socket?.close();proc.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
