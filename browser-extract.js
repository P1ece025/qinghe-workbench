/** 浏览器端正文提取：TXT（UTF-8）与 DOCX（ZIP/XML）。
 *  PDF、图片、旧版 DOC 不做前端识别，返回“待人工录入”状态，原件仍会保存。
 *  与 document-extractor.mjs 的返回结构保持一致：{status, method, text, warnings, error}。
 */
(function (global) {
  'use strict';
  const MAX_TEXT = 100000;
  const MAX_ZIP_ENTRIES = 2000;

  function clampText(value) {
    return String(value || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').slice(0, MAX_TEXT);
  }

  function decodeXml(value) {
    return String(value)
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  }

  function xmlText(xml) {
    return clampText(String(xml)
      .replace(/<w:(?:tab|ptab)\b[^>]*\/?\s*>/gi, '\t')
      .replace(/<w:br\b[^>]*\/?\s*>/gi, '\n')
      .replace(/<w:cr\b[^>]*\/?\s*>/gi, '\n')
      .replace(/<\/w:p\s*>/gi, '\n')
      .replace(/<\/w:tr\s*>/gi, '\n')
      .replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t\s*>/gi, (_, text) => decodeXml(text))
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim());
  }

  const u16 = (view, offset) => view.getUint16(offset, true);
  const u32 = (view, offset) => view.getUint32(offset, true);

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('当前浏览器不支持直接解析 DOCX，请改用新版 Chrome/Edge 或将正文粘贴到“校对提取结果”。');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function unzip(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eocd = -1;
    const floor = Math.max(0, bytes.length - 66000);
    for (let i = bytes.length - 22; i >= floor; i--) {
      if (i >= 0 && u32(view, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('DOCX 不是有效的 ZIP 文件');
    const count = u16(view, eocd + 10);
    const directorySize = u32(view, eocd + 12);
    const directoryOffset = u32(view, eocd + 16);
    if (count > MAX_ZIP_ENTRIES || directoryOffset + directorySize > bytes.length) throw new Error('DOCX 目录结构无效');
    const decoder = new TextDecoder('utf-8');
    const files = new Map();
    let cursor = directoryOffset;
    for (let i = 0; i < count; i++) {
      if (cursor + 46 > bytes.length || u32(view, cursor) !== 0x02014b50) throw new Error('DOCX 条目无效');
      const method = u16(view, cursor + 10);
      const compressedSize = u32(view, cursor + 20);
      const nameLength = u16(view, cursor + 28);
      const extraLength = u16(view, cursor + 30);
      const commentLength = u16(view, cursor + 32);
      const localOffset = u32(view, cursor + 42);
      const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
      cursor += 46 + nameLength + extraLength + commentLength;
      if (name.endsWith('/')) continue;
      if (localOffset + 30 > bytes.length || u32(view, localOffset) !== 0x04034b50) throw new Error('DOCX 本地条目无效');
      const localNameLength = u16(view, localOffset + 26);
      const localExtraLength = u16(view, localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const raw = bytes.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) files.set(name, raw);
      else if (method === 8) files.set(name, await inflateRaw(raw));
      else throw new Error('DOCX 使用了不支持的压缩方式');
    }
    return files;
  }

  async function extractDocx(bytes) {
    const files = await unzip(bytes);
    const data = files.get('word/document.xml');
    if (!data) throw new Error('DOCX 缺少 word/document.xml');
    return xmlText(new TextDecoder('utf-8').decode(data));
  }

  async function extract(filename, buffer) {
    const name = String(filename || '');
    const extension = (name.match(/\.[^.\\/]+$/) || [''])[0].toLowerCase();
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer || 0);
    if (!bytes.length) return { status: 'failed', method: '', text: '', warnings: [], error: '文件为空' };
    if (extension === '.txt') {
      try {
        const text = clampText(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
        return text
          ? { status: 'extracted', method: 'utf8', text, warnings: [] }
          : { status: 'empty', method: 'utf8', text: '', warnings: ['TXT 文件没有正文。'] };
      } catch {
        return { status: 'failed', method: 'utf8', text: '', warnings: [], error: 'TXT 不是有效的 UTF-8 编码' };
      }
    }
    if (extension === '.docx') {
      try {
        const text = await extractDocx(bytes);
        return text
          ? { status: 'extracted', method: 'docx-xml', text, warnings: [] }
          : { status: 'empty', method: 'docx-xml', text: '', warnings: ['DOCX 正文为空。'] };
      } catch (error) {
        return { status: 'failed', method: 'docx-xml', text: '', warnings: [], error: error.message };
      }
    }
    if (extension === '.pdf') {
      return { status: 'unsupported', method: '', text: '', warnings: ['在线静态版不解析 PDF 正文（原件仍会保存）。请下载原件后人工录入，或使用本地版提取。'] };
    }
    if (extension === '.doc') {
      return { status: 'unsupported', method: '', text: '', warnings: ['旧版 DOC 请在本地版提取，或另存为 DOCX 后重新导入。'] };
    }
    if (['.png', '.jpg', '.jpeg'].includes(extension)) {
      return { status: 'ocr_unavailable', method: '', text: '', warnings: ['在线静态版不支持 OCR；图片原件已保存，正文请人工录入。'] };
    }
    return { status: 'unsupported', method: '', text: '', warnings: ['不支持的文件类型：' + (extension || '未知')] };
  }

  global.BrowserExtract = { extract };
})(typeof window !== 'undefined' ? window : globalThis);
