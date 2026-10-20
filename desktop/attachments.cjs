const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { TextDecoder } = require('node:util');
const MAX_FILES = 4, MAX_BYTES = 8 * 1024 * 1024;
async function readAttachment(file) {
  const stat = await fs.stat(file), name = path.basename(file), ext = path.extname(file).toLowerCase();
  if (!stat.isFile() || stat.size > MAX_BYTES || !stat.size) throw new Error(`${name}：文件为空或超过 8 MB。`);
  const data = await fs.readFile(file);
  if (data.length > MAX_BYTES) throw new Error(`${name}：超过 8 MB。`);
  const meta = { id: randomUUID(), name, size: data.length };
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[ext];
  if (mime) {
    const valid = ext === '.png' ? data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : ext === '.webp' ? data.toString('ascii',0,4)==='RIFF' && data.toString('ascii',8,12)==='WEBP' : data[0]===255 && data[1]===216;
    if (!valid) throw new Error(`${name}：图片格式不正确。`);
    return { ...meta, kind: '图片', url: `data:${mime};base64,${data.toString('base64')}` };
  }
  let text;
  if (ext === '.pdf') {
    if (data.toString('ascii',0,5) !== '%PDF-') throw new Error(`${name}：不是有效 PDF。`);
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = pdfjs.getDocument({ data: new Uint8Array(data), useSystemFonts: true, isEvalSupported: false });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 30) throw new Error('PDF 超过 30 页，请拆分后添加。');
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i), content = await page.getTextContent();
        const value = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('');
        if (!value.trim()) throw new Error(`第 ${i} 页没有可提取文字，请把扫描页另存为照片添加。`);
        pages.push(`第 ${i} 页\n${value}`);
        if (pages.join('\n').length > 50000) throw new Error('PDF 文字超过 5 万字，请拆分后添加。');
      }
      text = pages.join('\n\n');
    } catch (error) { throw new Error(`${name}：${error.message}`); }
    finally { await task.destroy(); }
  } else if (['.txt','.md','.csv'].includes(ext)) {
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(data); } catch { throw new Error(`${name}：请保存为 UTF-8 文本后添加。`); }
    if (text.includes('\0')) throw new Error(`${name}：不是文本文件。`);
  } else throw new Error(`${name}：支持 PNG、JPG、WebP、PDF、TXT、Markdown、CSV。`);
  if (!text?.trim() || text.length > 50000) throw new Error(`${name}：文字为空或超过 5 万字，请拆分。`);
  return { ...meta, kind: ext === '.pdf' ? 'PDF文字' : '文本', text };
}
function metadata(a) { return { id: a.id, name: a.name, kind: a.kind, size: a.size }; }
function validateAttachments(values) {
  if (!Array.isArray(values) || values.length > MAX_FILES || values.reduce((n,a)=>n+a.size,0) > 20*1024*1024 || values.reduce((n,a)=>n+(a.text?.length || 0),0)>60000) throw new Error('一次最多 4 个附件、合计 20 MB 或 6 万字。请分次发送。');
  return values;
}
module.exports = { readAttachment, metadata, validateAttachments, MAX_FILES };
