import { it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import MarkdownMessage from './MarkdownMessage';
const require = createRequire(import.meta.url);
const { readAttachment, validateAttachments } = require('../desktop/attachments.cjs');
it('renders fenced Markdown as headings, lists and tables without executing HTML or loading images', () => {
  const html = renderToStaticMarkup(createElement(MarkdownMessage, {text:'```markdown\n## 测试\n\n- **项目**\n\n| 名称 | 数值 |\n| --- | --- |\n| 测试 | 1 |\n\n<script>alert(1)</script>\n\n![test](https://example.com/a.png)\n```'}));
  expect(html).toContain('<h2>测试</h2>'); expect(html).toContain('<strong>项目</strong>'); expect(html).toContain('<table>'); expect(html).not.toContain('<script>'); expect(html).not.toContain('<img'); expect(html).not.toContain('```');
});
it('reads only supported attachments and rejects oversize, unsupported and binary files', async () => {
  const dir = mkdtempSync(join(tmpdir(),'changan-files-test-'));
  try {
    const txt = join(dir,'fixture.txt'); writeFileSync(txt,'Fictional attachment test');
    const value = await readAttachment(txt); expect(value.text).toBe('Fictional attachment test');
    expect(() => validateAttachments(Array(5).fill(value))).toThrow('最多');
    const binary = join(dir,'bad.txt'); writeFileSync(binary,Buffer.from([255,255])); await expect(readAttachment(binary)).rejects.toThrow('UTF-8');
    const image = join(dir,'bad.png'); writeFileSync(image,'not an image'); await expect(readAttachment(image)).rejects.toThrow('格式');
    const large = join(dir,'large.txt');writeFileSync(large,Buffer.alloc(8*1024*1024+1));await expect(readAttachment(large)).rejects.toThrow('8 MB');
    const exe = join(dir,'bad.exe'); writeFileSync(exe,'test');await expect(readAttachment(exe)).rejects.toThrow('支持');
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
