/** 学生名单 Excel/CSV 解析与导入计划；仅使用浏览器/Node 内置能力，不依赖第三方库。
 *  浏览器：DecompressionStream('deflate-raw') 解压 xlsx；Node（测试）：node:zlib。
 *  返回的导入计划只做“新增 / 更新 / 错误”判定，不修改任何学生数据。 */
(function (root) {
  'use strict';

  const HEADERS = {
    name: ['姓名', '学生姓名', '名字'],
    number: ['学号', '学生学号', '学籍号'],
    college: ['学院', '院系', '所在学院', '学院（系）'],
    branch: ['党支部', '所在党支部', '支部'],
    stage: ['当前阶段', '发展阶段', '阶段', '身份', '当前身份', '培养阶段'],
    birthDate: ['出生日期', '出生年月', '生日'],
    age: ['年龄'],
    application: ['申请入党日期', '申请入党时间', '入党申请日期', '递交入党申请书日期', '申请日期'],
    applicationTalk: ['申请后谈话日期', '谈话日期', '申请后谈话时间'],
    active: ['确定为积极分子日期', '确定为入党积极分子日期', '确定为积极分子时间', '积极分子日期'],
    development: ['确定为发展对象日期', '确定为发展对象时间', '发展对象日期'],
    admitted: ['接收预备党员日期', '成为预备党员日期', '接收日期', '入党日期', '接收预备党员时间'],
    regularized: ['转正日期', '转正时间', '转为正式党员日期'],
  };

  const DATE_COLUMNS = ['application', 'applicationTalk', 'active', 'development', 'admitted', 'regularized'];
  const DATE_LABELS = {
    application: '申请入党日期',
    applicationTalk: '申请后谈话日期',
    active: '确定为积极分子日期',
    development: '确定为发展对象日期',
    admitted: '接收预备党员日期',
    regularized: '转正日期',
  };

  const STAGE_ALIASES = [
    ['申请入党', '入党申请人', '申请人', '普通学生', '未确定'],
    ['入党积极分子', '积极分子', '确定积极分子', '确定为入党积极分子', '确定为积极分子'],
    ['发展对象', '入党发展对象', '确定发展对象', '确定为发展对象'],
    ['预备党员', '中共预备党员', '接收预备党员', '预备期'],
    ['正式党员', '预备党员转正', '转正', '已转正', '正式'],
  ];

  const MAX_ROWS = 500;

  function normHeader(value) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/[（(][^）)]*[）)]/g, '')
      .replace(/[*＊\s]/g, '')
      .trim();
  }

  function headerKey(value) {
    const h = normHeader(value);
    if (!h) return '';
    for (const [key, aliases] of Object.entries(HEADERS)) {
      if (aliases.some(a => normHeader(a) === h)) return key;
    }
    return '';
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function validDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
    const d = new Date(s + 'T00:00:00Z');
    return !isNaN(d) && d.toISOString().slice(0, 10) === s;
  }

  function isoOf(y, m, d) {
    const iso = `${y}-${pad2(m)}-${pad2(d)}`;
    return validDate(iso) ? iso : '';
  }

  function serialToIso(value) {
    const days = Math.round(value);
    if (days < 1 || days > 73415) return ''; // Excel 日期序列号（约 1900—2100 年）
    const date = new Date(Date.UTC(1899, 11, 30) + days * 86400000);
    const iso = date.toISOString().slice(0, 10);
    return validDate(iso) ? iso : '';
  }

  /** 支持 2024-03-01 / 2024/3/1 / 2024.3.1 / 2024年3月1日 / 20240301 / Excel 序列号 / Date 对象。 */
  function normalizeDate(value) {
    if (value === null || value === undefined || value === '') return '';
    if (value instanceof Date) {
      return isNaN(value) ? '' : isoOf(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
    }
    if (typeof value === 'number') return serialToIso(value);
    const text = String(value).normalize('NFKC').trim();
    if (!text) return '';
    let m = text.match(/^(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?$/);
    if (m) return isoOf(m[1], m[2], m[3]);
    m = text.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (m) return isoOf(m[1], m[2], m[3]);
    return '';
  }

  /** 返回 0—4；空白返回 null；无法识别返回 -1。 */
  function stageIndex(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Number.isInteger(value) && value >= 0 && value <= 4 ? value : -1;
    const text = String(value).normalize('NFKC').replace(/\s/g, '').trim();
    if (!text) return null;
    if (/^\d$/.test(text)) return Number(text) >= 0 && Number(text) <= 4 ? Number(text) : -1;
    for (let i = 0; i < STAGE_ALIASES.length; i++) {
      if (STAGE_ALIASES[i].some(a => text === a)) return i;
    }
    for (const i of [4, 3, 2, 1, 0]) {
      if (STAGE_ALIASES[i].some(a => text.includes(a))) return i;
    }
    return -1;
  }

  // ---------- ZIP / XLSX ----------

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream !== 'undefined') {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      const zlib = await import('node:zlib');
      return new Uint8Array(zlib.inflateRawSync(Buffer.from(bytes)));
    }
    throw new Error('当前浏览器不支持直接解析 xlsx，请改用新版 Chrome/Edge，或将文件另存为 CSV 后导入。');
  }

  function u16(dv, o) { return dv.getUint16(o, true); }
  function u32(dv, o) { return dv.getUint32(o, true); }

  async function unzip(buffer) {
    const bytes = new Uint8Array(buffer);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eocd = -1;
    const floor = Math.max(0, bytes.length - 66000);
    for (let i = bytes.length - 22; i >= floor; i--) {
      if (u32(dv, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('文件不是有效的 xlsx（找不到 ZIP 目录）。');
    const count = u16(dv, eocd + 10);
    let ptr = u32(dv, eocd + 16);
    const decoder = new TextDecoder('utf-8');
    const files = new Map();
    for (let n = 0; n < count; n++) {
      if (u32(dv, ptr) !== 0x02014b50) throw new Error('xlsx 目录结构损坏。');
      const method = u16(dv, ptr + 10);
      const compSize = u32(dv, ptr + 20);
      const nameLen = u16(dv, ptr + 28);
      const extraLen = u16(dv, ptr + 30);
      const commentLen = u16(dv, ptr + 32);
      const localOffset = u32(dv, ptr + 42);
      const name = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
      ptr += 46 + nameLen + extraLen + commentLen;
      if (name.endsWith('/')) continue;
      if (u32(dv, localOffset) !== 0x04034b50) throw new Error('xlsx 文件条目损坏。');
      const lNameLen = u16(dv, localOffset + 26);
      const lExtraLen = u16(dv, localOffset + 28);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      const raw = bytes.subarray(dataStart, dataStart + compSize);
      let content;
      if (method === 0) content = raw;
      else if (method === 8) content = await inflateRaw(raw);
      else throw new Error('xlsx 使用了不支持的压缩方式。');
      files.set(name, content);
    }
    return files;
  }

  function textOf(files, name) {
    const data = files.get(name);
    if (!data) return '';
    return new TextDecoder('utf-8').decode(data);
  }

  function decodeEntities(s) {
    return s
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }

  function parseSharedStrings(xml) {
    const out = [];
    if (!xml) return out;
    for (const si of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
      let text = '';
      for (const t of si[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) text += t[1];
      out.push(decodeEntities(text));
    }
    return out;
  }

  function colIndex(ref) {
    let n = 0;
    for (const ch of ref) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  }

  function parseSheetXml(xml, strings) {
    const rows = [];
    for (const rm of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
      const rowNum = Number((rm[1].match(/\br="(\d+)"/) || [])[1] || rows.length + 1);
      const cells = {};
      for (const cm of rm[2].matchAll(/<c\b([^>]*?)\/>|<c\b([^>]*?)>([\s\S]*?)<\/c>/g)) {
        const attrs = cm[1] !== undefined ? cm[1] : cm[2];
        const inner = cm[3] || '';
        const ref = (attrs.match(/\br="([A-Z]+)\d+"/) || [])[1];
        if (!ref) continue;
        const type = (attrs.match(/\bt="([^"]+)"/) || [])[1] || '';
        let value = '';
        if (type === 'inlineStr') {
          const m = inner.match(/<t\b[^>]*>([\s\S]*?)<\/t>/);
          value = m ? decodeEntities(m[1]) : '';
        } else {
          const m = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
          const raw = m ? decodeEntities(m[1]) : '';
          if (type === 's') {
            const idx = Number(raw);
            value = Number.isInteger(idx) && idx >= 0 ? (strings[idx] ?? '') : '';
          } else if (type === 'b') {
            value = raw === '1' ? 'TRUE' : 'FALSE';
          } else if (type === 'str' || type === 'e' || type === 'd') {
            value = raw;
          } else {
            const num = Number(raw);
            value = raw !== '' && !Number.isNaN(num) ? num : raw;
          }
        }
        cells[colIndex(ref)] = value;
      }
      rows.push({ num: rowNum, cells });
    }
    return rows;
  }

  function sheetMatrix(rows) {
    const list = rows.filter(r => Object.keys(r.cells).length);
    if (!list.length) return [];
    const maxRow = Math.max(...list.map(r => r.num));
    const maxCol = Math.max(...list.map(r => Math.max(...Object.keys(r.cells).map(Number))));
    const byNum = new Map(list.map(r => [r.num, r.cells]));
    const matrix = [];
    for (let r = 1; r <= maxRow; r++) {
      const cells = byNum.get(r);
      if (!cells) continue;
      const arr = Array.from({ length: maxCol + 1 }, (_, i) => cells[i] ?? '');
      if (arr.some(v => v !== '')) matrix.push({ row: r, cells: arr });
    }
    return matrix;
  }

  function firstSheetPath(files) {
    const rels = textOf(files, 'xl/_rels/workbook.xml.rels');
    const workbook = textOf(files, 'xl/workbook.xml');
    const first = workbook.match(/<sheet\b[^>]*r:id="([^"]+)"/);
    if (first) {
      const rel = rels.match(new RegExp('<Relationship\\b[^>]*Id="' + first[1] + '"[^>]*>'));
      if (rel) {
        const target = (rel[0].match(/Target="([^"]+)"/) || [])[1] || '';
        const name = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
        if (files.has(name)) return name;
      }
    }
    const any = [...files.keys()].filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
    return any[0] || '';
  }

  function parseCsv(text) {
    const source = String(text ?? '').replace(/^﻿/, '');
    const rows = [];
    let row = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < source.length; i++) {
      const c = source[i];
      if (quoted) {
        if (c === '"') {
          if (source[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
        } else cur += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c !== '\r') cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows
      .map((cells, i) => ({ row: i + 1, cells }))
      .filter(r => r.cells.some(v => String(v).trim() !== ''));
  }

  /** 读取名单文件：返回 { sheet, rows: [{row, cells}] }。 */
  async function readWorkbook(buffer, filename) {
    const name = String(filename || '');
    if (/\.csv$/i.test(name)) {
      const text = new TextDecoder('utf-8').decode(new Uint8Array(buffer)).replace(/^﻿/, '');
      return { sheet: 'CSV', rows: parseCsv(text) };
    }
    if (!/\.xlsx$/i.test(name)) {
      throw new Error('仅支持 .xlsx 或 .csv；旧版 .xls 请先在 Excel 中另存为 .xlsx。');
    }
    const files = await unzip(buffer);
    const sheetPath = firstSheetPath(files);
    if (!sheetPath) throw new Error('xlsx 中找不到工作表。');
    const strings = parseSharedStrings(textOf(files, 'xl/sharedStrings.xml'));
    const rows = sheetMatrix(parseSheetXml(textOf(files, sheetPath), strings));
    if (!rows.length) throw new Error('工作表是空的。');
    return { sheet: sheetPath.replace(/^xl\/worksheets\//, '').replace(/\.xml$/, ''), rows };
  }

  // ---------- 导入计划 ----------

  function cellText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.normalize('NFKC').trim();
    return String(value).trim();
  }

  function planImport(rows, students) {
    const result = { header: [], columns: {}, items: [], summary: { add: 0, update: 0, error: 0 }, fatal: '' };
    const list = Array.isArray(rows) ? rows : [];

    let headerIndex = -1;
    for (let i = 0; i < list.length; i++) {
      const cells = list[i].cells.map(headerKey);
      if (cells.includes('name') && cells.includes('number')) { headerIndex = i; break; }
    }
    if (headerIndex < 0) {
      result.fatal = '没有找到表头行：第一行需包含「姓名」「学号」两列（可从模板开始填写）。';
      return result;
    }
    for (const [ci, key] of list[headerIndex].cells.map(headerKey).entries()) {
      if (key && !(key in result.columns)) result.columns[key] = ci;
    }
    result.header = list[headerIndex].cells.map(v => cellText(v));

    const dataRows = list.slice(headerIndex + 1).filter(r => r.cells.some(v => cellText(v) !== ''));
    if (dataRows.length > MAX_ROWS) {
      result.fatal = `单次最多导入 ${MAX_ROWS} 行，当前 ${dataRows.length} 行，请分批导入。`;
      return result;
    }

    const get = (cells, key) => (key in result.columns ? cells[result.columns[key]] : '');
    const known = new Set((students || []).map(s => String(s.number)));
    const seen = new Map();

    for (const entry of dataRows) {
      const warnings = [];
      const item = { row: entry.row, action: 'error', name: '', number: '', stageText: '', warnings, error: '', data: { dates: {} } };

      const name = cellText(get(entry.cells, 'name')).slice(0, 60);
      item.name = name;
      const number = cellText(get(entry.cells, 'number')).replace(/\s/g, '').replace(/\.0+$/, '');
      item.number = number;
      if (!name) { item.error = '缺少姓名'; result.items.push(item); result.summary.error++; continue; }
      if (!/^\d{13}$/.test(number)) {
        item.error = '学号应为 13 位数字';
        result.items.push(item); result.summary.error++; continue;
      }
      if (seen.has(number)) {
        item.error = `学号与第 ${seen.get(number)} 行重复`;
        result.items.push(item); result.summary.error++; continue;
      }
      seen.set(number, entry.row);

      const stageRaw = cellText(get(entry.cells, 'stage'));
      item.stageText = stageRaw;
      const stage = stageIndex(get(entry.cells, 'stage'));
      if (stage === -1) {
        item.error = `当前阶段「${stageRaw}」无法识别（可选：申请入党 / 入党积极分子 / 发展对象 / 预备党员 / 正式党员）`;
        result.items.push(item); result.summary.error++; continue;
      }
      const exists = known.has(number);
      if (stage === null && !exists) {
        item.error = '新学生必须填写当前阶段';
        result.items.push(item); result.summary.error++; continue;
      }

      const data = item.data;
      data.name = name;
      data.number = number;
      const college = cellText(get(entry.cells, 'college'));
      if (college) data.college = college.slice(0, 60);
      const branch = cellText(get(entry.cells, 'branch'));
      if (branch) data.branch = branch.slice(0, 60);
      if (stage !== null) data.stage = stage;

      const birthRaw = get(entry.cells, 'birthDate');
      const birthText = cellText(birthRaw);
      if (birthText !== '') {
        const iso = normalizeDate(birthRaw);
        if (iso) data.birthDate = iso;
        else warnings.push(`出生日期「${birthText}」无法识别，已留空`);
      }
      const ageRaw = get(entry.cells, 'age');
      const ageText = cellText(ageRaw);
      const ageNum = ageText === '' ? null : Number(ageText);
      if (ageText !== '' && (!Number.isFinite(ageNum) || ageNum < 10 || ageNum > 120)) {
        warnings.push(`年龄「${ageText}」无效，已忽略`);
      }
      if (ageText !== '' && Number.isFinite(ageNum) && ageNum >= 10 && ageNum <= 120) {
        if (!data.birthDate) warnings.push('未提供出生日期：年龄列不会随年份自动更新，请后补出生日期');
        else {
          const birth = new Date(data.birthDate + 'T00:00:00Z');
          const now = new Date();
          let real = now.getUTCFullYear() - birth.getUTCFullYear();
          const m = now.getUTCMonth() - birth.getUTCMonth();
          if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) real--;
          if (Math.abs(real - ageNum) > 1) warnings.push(`年龄列（${ageNum}）与出生日期推算（${real}）不一致，以出生日期为准`);
        }
      }

      let anyDate = false;
      for (const key of DATE_COLUMNS) {
        if (!(key in result.columns)) continue;
        const raw = get(entry.cells, key);
        const text = cellText(raw);
        if (text === '') continue;
        const iso = normalizeDate(raw);
        if (iso) { data.dates[key] = iso; anyDate = true; }
        else warnings.push(`${DATE_LABELS[key]}「${text}」无法识别，该字段保留原值`);
      }
      if (item.error) { result.items.push(item); result.summary.error++; continue; }

      item.action = exists ? 'update' : 'add';
      item.stageText = stageRaw || (exists ? '保持不变' : '');
      if (anyDate && stage === null && !exists) warnings.push('存在日期但没有阶段');
      result.summary[item.action]++;
      result.items.push(item);
    }
    return result;
  }

  root.RosterImport = { HEADERS, STAGE_ALIASES, DATE_COLUMNS, normalizeDate, stageIndex, parseCsv, readWorkbook, planImport };
  if (typeof module !== 'undefined') module.exports = root.RosterImport;
})(globalThis);
