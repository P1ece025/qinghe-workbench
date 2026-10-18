/** 静态版浏览器本地归档：IndexedDB 保存上传原件与索引。
 *  返回结构与 server.mjs 的 /api/archive 接口对齐，便于 app.js 在两种模式下复用。
 */
(function (global) {
  'use strict';
  const DB_NAME = 'qinghe-archive-v1';
  const DB_VERSION = 1;
  const ENTRIES = 'entries';
  const FILES = 'files';
  const MAX = 10 * 1024 * 1024;
  const FOLDERS = { application: '入党申请书', thought: '思想汇报', cultivation: '培养教育考察写实簿', autobiography: '自传', volunteer: '入党志愿书', regularization: '转正申请书' };
  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('当前浏览器不支持本地归档（IndexedDB）'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(ENTRIES)) db.createObjectStore(ENTRIES, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('无法打开浏览器本地归档'));
      request.onblocked = () => reject(new Error('本地归档被其他页面占用，请关闭其他标签页后重试'));
    });
    return dbPromise;
  }

  function runTransaction(db, stores, mode, work) {
    return new Promise((resolve, reject) => {
      let tx;
      try { tx = db.transaction(stores, mode); } catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('本地归档写入失败'));
      tx.onabort = () => reject(tx.error || new Error('本地归档事务已取消'));
      try { work(tx); } catch (error) { try { tx.abort(); } catch {} reject(error); }
    });
  }

  async function list() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ENTRIES, 'readonly');
      const request = tx.objectStore(ENTRIES).getAll();
      request.onsuccess = () => {
        const rows = (request.result || []).slice();
        rows.sort((a, b) => String(a.archivedAt || '').localeCompare(String(b.archivedAt || '')));
        resolve(rows);
      };
      request.onerror = () => reject(request.error);
    });
  }

  function decodeBase64(base64) {
    const binary = global.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function encodeBase64(bytes) {
    let text = '';
    for (let i = 0; i < bytes.length; i += 32768) text += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return global.btoa(text);
  }

  async function sha256(bytes) {
    if (global.crypto && global.crypto.subtle) {
      const digest = await global.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    }
    // 非安全上下文（如 file://）下的去重指纹：4×32 位混合散列，仅用于判重。
    let h1 = 0x811c9dc5, h2 = 0x9e3779b9, h3 = 0x85ebca6b, h4 = 0xc2b2ae35;
    for (let i = 0; i < bytes.length; i++) {
      const value = bytes[i];
      h1 = Math.imul(h1 ^ value, 16777619);
      h2 = Math.imul(h2 + value + i, 2246822519);
      h3 = Math.imul(h3 ^ (value + (h1 >>> 13)), 3266489917);
      h4 = Math.imul(h4 + (h2 >>> 7) + value, 668265263);
    }
    return [h1, h2, h3, h4].map(value => (value >>> 0).toString(16).padStart(8, '0')).join('');
  }

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
      const random = Math.random() * 16 | 0;
      return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
    });
  }

  function validate(input) {
    if (!input
      || !/^[A-Za-z0-9_-]{1,80}$/.test(String(input.studentId || ''))
      || !Object.prototype.hasOwnProperty.call(FOLDERS, input.type)
      || typeof input.filename !== 'string'
      || input.filename.length > 180
      || !/\.(txt|pdf|docx?|png|jpe?g)$/i.test(input.filename)) {
      throw new Error('归档身份、材料类型或文件名无效');
    }
  }

  async function put(entry, bytes) {
    const db = await openDb();
    await runTransaction(db, [ENTRIES, FILES], 'readwrite', tx => {
      tx.objectStore(ENTRIES).put(entry);
      tx.objectStore(FILES).put(bytes, entry.id);
    });
  }

  async function add(input) {
    validate(input);
    if (typeof input.base64 !== 'string' || !input.base64) throw new Error('文件编码无效');
    const bytes = decodeBase64(input.base64);
    if (!bytes.length || bytes.length > MAX) throw new Error('文件为空或超过 10 MB');
    const hash = await sha256(bytes);
    const rows = await list();
    const existing = rows.find(entry => entry.hash === hash && entry.studentId === input.studentId && entry.type === input.type);
    if (existing) return { duplicate: true, entry: existing };
    const filename = String(input.filename).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').slice(0, 160);
    const extraction = global.BrowserExtract
      ? await global.BrowserExtract.extract(filename, bytes)
      : { status: 'failed', method: '', text: '', warnings: [], error: '浏览器正文提取组件未加载' };
    const entry = {
      id: uuid(),
      studentId: String(input.studentId),
      studentName: String(input.studentName || '').slice(0, 50),
      studentNumber: String(input.studentNumber || '').slice(0, 30),
      type: input.type,
      filename,
      relativePath: [input.studentId, FOLDERS[input.type], hash.slice(0, 12) + '-' + filename].join('/'),
      hash,
      size: bytes.length,
      date: /^\d{4}-\d{2}-\d{2}$/.test(input.date || '') ? input.date : '',
      text: extraction.text || '',
      source: extraction.status === 'extracted' ? (extraction.method === 'utf8' ? 'text' : 'extracted') : 'registered',
      extractionStatus: extraction.status,
      extractionMethod: extraction.method || '',
      extractionWarnings: Array.isArray(extraction.warnings) ? extraction.warnings.slice(0, 10) : [],
      extractionError: String(extraction.error || '').slice(0, 500),
      extractedAt: extraction.status === 'extracted' ? new Date().toISOString() : '',
      archivedAt: new Date().toISOString(),
      evidence: Array.isArray(input.evidence) ? input.evidence.map(item => String(item).slice(0, 200)).slice(0, 20) : []
    };
    await put(entry, bytes);
    return { duplicate: false, entry };
  }

  async function restore(entry, base64) {
    if (!entry || typeof entry.id !== 'string' || !entry.id) throw new Error('归档条目缺少 ID');
    const bytes = decodeBase64(base64);
    if (!bytes.length || bytes.length > MAX) throw new Error('归档原件为空或超过 10 MB');
    const rows = await list();
    if (rows.some(row => row.id === entry.id)) return entry;
    await put(entry, bytes);
    return entry;
  }

  async function file(id) {
    const db = await openDb();
    const entry = await new Promise((resolve, reject) => {
      const tx = db.transaction(ENTRIES, 'readonly');
      const request = tx.objectStore(ENTRIES).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    if (!entry) return null;
    const bytes = await new Promise((resolve, reject) => {
      const tx = db.transaction(FILES, 'readonly');
      const request = tx.objectStore(FILES).get(id);
      request.onsuccess = () => {
        const value = request.result;
        resolve(value ? (value instanceof Uint8Array ? value : new Uint8Array(value)) : null);
      };
      request.onerror = () => reject(request.error);
    });
    if (!bytes) return null;
    return { entry, bytes };
  }

  async function clear() {
    const db = await openDb();
    await runTransaction(db, [ENTRIES, FILES], 'readwrite', tx => {
      tx.objectStore(ENTRIES).clear();
      tx.objectStore(FILES).clear();
    });
  }

  global.LocalArchive = { list, add, restore, file, clear, encodeBase64 };
})(typeof window !== 'undefined' ? window : globalThis);
