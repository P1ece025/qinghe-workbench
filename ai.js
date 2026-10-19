/** 青禾 · AI 语义核查（浏览器直连 OpenAI 兼容接口）
 *  - 配置只保存在当前浏览器 localStorage，不进入导出数据/云端状态
 *  - 只返回“待人工核对”的文本线索，不改变材料、不作政治评价
 */
(function (root) {
  'use strict';
  const KEY = 'qinghe-ai-v1';
  const PRESETS = {
    deepseek: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' },
    zhipu: { label: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' },
    moonshot: { label: 'Kimi（Moonshot）', baseUrl: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
    qwen: { label: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
    custom: { label: '自定义 OpenAI 兼容接口', baseUrl: '', model: '' }
  };
  const MATERIAL_TYPES = { application: '入党申请书', thought: '思想汇报', cultivation: '培养教育考察写实簿', autobiography: '自传', volunteer: '入党志愿书', regularization: '转正申请书' };

  function empty() { return { provider: 'deepseek', baseUrl: PRESETS.deepseek.baseUrl, model: PRESETS.deepseek.model, key: '' }; }

  function load() {
    const config = empty();
    try {
      const saved = JSON.parse((typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : '') || '{}');
      if (saved && typeof saved === 'object') {
        if (saved.provider) config.provider = saved.provider;
        if (saved.baseUrl) config.baseUrl = saved.baseUrl;
        if (saved.model) config.model = saved.model;
        if (saved.key) config.key = saved.key;
      }
    } catch {}
    return config;
  }

  function save(config) {
    const next = {
      provider: String(config.provider || 'custom'),
      baseUrl: String(config.baseUrl || '').trim(),
      model: String(config.model || '').trim(),
      key: String(config.key || '').trim()
    };
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }

  function preset(name) { return PRESETS[name] || PRESETS.custom; }

  function buildMaterialText(student, maxPerDoc = 3500, maxTotal = 28000) {
    const parts = [];
    let total = 0;
    const dates = student.dates || {};
    const dateLines = Object.keys(dates).filter(k => dates[k]).map(k => k + '：' + dates[k]);
    parts.push('学生：' + (student.name || '') + '（虚拟样本）\n学号：' + (student.number || '') + '\n学院：' + (student.college || '') + '\n党支部：' + (student.branch || '') + '\n发展阶段：' + (student.stage != null ? student.stage + '（0 申请入党 … 4 预备党员转正）' : '') + (dateLines.length ? '\n关键日期：\n' + dateLines.join('\n') : ''));
    const docs = (student.docs || []).filter(d => d && d.text && String(d.text).trim());
    for (const doc of docs) {
      if (total >= maxTotal) break;
      const label = MATERIAL_TYPES[doc.type] || doc.type || '材料';
      const text = String(doc.text).replace(/\s+/g, ' ').trim().slice(0, maxPerDoc);
      const block = '\n\n【' + label + '】' + (doc.date ? '（落款 ' + doc.date + '）' : '') + '\n' + text;
      if (total + block.length > maxTotal) {
        const remain = Math.max(0, maxTotal - total);
        if (remain > 200) parts.push(block.slice(0, remain) + '……（已截断）');
        break;
      }
      parts.push(block);
      total += block.length;
    }
    return parts.join('');
  }

  function buildPrompt(student, materialText) {
    const system = [
      '你是中国高校党委组织部使用的党员发展材料审核助手。你只做保守的文本核对，不评价申请人的政治立场或是否应当入党，不编造材料中没有的事实，不替申请人改写真实经历。',
      '请检查：',
      '1. 政治术语和规范表述是否准确，例如党的性质、指导思想、“四个意识”“四个自信”“两个维护”等；',
      '2. 材料内部或材料之间是否有明显事实矛盾，例如时间、身份、经历、家庭情况；',
      '3. 思想汇报、自传是否明显模板化、空洞、与本人经历脱节；',
      '4. 是否存在不宜出现在发展材料中的表述，例如娱乐化、网络化、抄袭痕迹。',
      '只报告有明确文本依据的问题；没有把握就不要报告；最多 6 条。',
      '输出必须是 JSON 对象，格式：',
      '{"findings":[{"severity":"重点核对|待核","category":"政治术语|事实一致性|前后一致|内容质量","title":"不超过20字","detail":"问题说明，必须说明依据","quote":"原文片段，不超过60字","suggestion":"修改建议，不得要求改写真实经历"}]}',
      '不要输出 JSON 以外的任何文字。'
    ].join('\n');
    return [
      { role: 'system', content: system },
      { role: 'user', content: '请核对以下学生材料，只输出 JSON：\n\n' + materialText }
    ];
  }

  function parseFindings(text) {
    let raw = String(text || '').trim();
    raw = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    let data;
    try { data = JSON.parse(raw); } catch {
      const objectStart = raw.indexOf('{');
      const arrayStart = raw.indexOf('[');
      const isArray = arrayStart >= 0 && (objectStart < 0 || arrayStart < objectStart);
      const start = isArray ? arrayStart : objectStart;
      const end = isArray ? raw.lastIndexOf(']') : raw.lastIndexOf('}');
      if (start < 0 || end <= start) throw new Error('AI 返回内容不是有效 JSON');
      try { data = JSON.parse(raw.slice(start, end + 1)); } catch { throw new Error('AI 返回内容不是有效 JSON'); }
    }
    const list = Array.isArray(data) ? data : Array.isArray(data.findings) ? data.findings : [];
    const allowed = new Set(['政治术语', '事实一致性', '前后一致', '内容质量']);
    return list.map(item => {
      if (!item || typeof item !== 'object' || !item.title) return null;
      const severity = /重点|高/.test(String(item.severity || '')) ? '重点核对' : '待核';
      const category = allowed.has(String(item.category)) ? String(item.category) : '内容质量';
      return {
        severity,
        category,
        title: String(item.title).trim().slice(0, 40),
        detail: String(item.detail || '').trim().slice(0, 600),
        quote: String(item.quote || '').trim().slice(0, 120),
        suggestion: String(item.suggestion || '').trim().slice(0, 600)
      };
    }).filter(Boolean).slice(0, 8);
  }

  async function chat(config, messages, timeoutMs = 120000) {
    if (!config || !config.key || !config.baseUrl || !config.model) throw new Error('AI 服务未配置完整，请填写接口地址、模型和 API Key。');
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    let response;
    try {
      response = await fetch(config.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.key },
        body: JSON.stringify({ model: config.model, messages, temperature: 0.2, stream: false }),
        signal: controller ? controller.signal : undefined
      });
    } catch (error) {
      if (timer) clearTimeout(timer);
      if (error && error.name === 'AbortError') throw new Error('AI 请求超时，请稍后重试。');
      throw new Error('无法连接 AI 接口。可能是服务商不允许浏览器直连（CORS），请换用支持的接口或部署代理。');
    }
    if (timer) clearTimeout(timer);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (data && data.error && (data.error.message || data.error.code)) || data.message || ('HTTP ' + response.status);
      if (response.status === 401 || response.status === 403) throw new Error('API Key 无效或没有权限：' + message);
      throw new Error('AI 接口错误：' + message);
    }
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error('AI 接口没有返回内容。');
    return typeof content === 'string' ? content : JSON.stringify(content);
  }

  async function review(config, student) {
    const materialText = buildMaterialText(student);
    const content = await chat(config, buildPrompt(student, materialText));
    return parseFindings(content);
  }

  async function test(config) {
    const content = await chat(config, [
      { role: 'system', content: '只输出 JSON。' },
      { role: 'user', content: '回复 {"ok":true}' }
    ], 30000);
    return content.slice(0, 200);
  }

  const api = { PRESETS, load, save, preset, buildMaterialText, buildPrompt, parseFindings, chat, review, test };
  root.QingheAI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
