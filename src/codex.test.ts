import { createRequire } from 'node:module';
import { it, expect } from 'vitest';
const { systemProxy, chat, windowsExecutable } = createRequire(import.meta.url)('../desktop/codex.cjs');
it('仅在 HTTPS 代理启用时继承系统代理，拒绝无效端口', () => {
  expect(systemProxy('HTTPSEnable : 1\nHTTPSProxy : 127.0.0.1\nHTTPSPort : 6880')).toBe('http://127.0.0.1:6880');
  expect(systemProxy('HTTPSEnable : 0\nHTTPSProxy : 127.0.0.1\nHTTPSPort : 6880')).toBeUndefined();
  expect(systemProxy('HTTPSEnable : 1\nHTTPSProxy : 127.0.0.1\nHTTPSPort : 99999')).toBeUndefined();
});
it('过长或无效请求在启动订阅调用前被拒绝', async () => {
  await expect(chat('/private/tmp/changan-invalid-test', { text: 'x'.repeat(3001), context: '', model: 'test' })).rejects.toThrow('过长');
});

it('Windows 找到原生程序，支持 npm 安装而不执行 cmd 脚本', () => {
  const native = String.raw`C:\Users\test\AppData\Roaming\npm\node_modules\@openai\codex-win32-x64\vendor\x86_64-pc-windows-msvc\codex\codex.exe`;
  expect(windowsExecutable({ APPDATA: String.raw`C:\Users\test\AppData\Roaming`, PATH: '' }, (file: string) => file === native)).toBe(native);
  expect(() => windowsExecutable({ PATH: '' }, () => false)).toThrow('未找到');
});
