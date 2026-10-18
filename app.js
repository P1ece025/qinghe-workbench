'use strict';
const Q=Qinghe,KEY='qinghe-demo-v1';
const AUTH_KEY='qinghe-auth-v1';
const LOCAL_USERS_KEY='qinghe-local-users-v1';
const SYNC_KEY='qinghe-sync-v1';
const ACCOUNTS=[{user:'admin',pass:'123456',name:'演示审核员',role:'组织部管理视角'}];
const runtimeWindow=typeof window!=='undefined'?window:null;
const runtimeLocation=typeof location!=='undefined'?location:null;
const configuredApiBase=String(runtimeWindow?.QINGHE_API_BASE||'').replace(/\/$/,'');
const githubPagesMode=/\.github\.io$/i.test(runtimeLocation?.hostname||'')||runtimeLocation?.protocol==='file:';
let staticMode=(githubPagesMode||/[?&]static=1\b/.test(runtimeLocation?.search||'')||runtimeWindow?.QINGHE_STATIC===true)&&!configuredApiBase;
let apiEnabled=!staticMode;
const apiUrl=path=>configuredApiBase+path;
let authUser=null,loginMode='login',regPrefill='';
function localUsers(){try{const a=JSON.parse(localStorage.getItem(LOCAL_USERS_KEY));return Array.isArray(a)?a:[];}catch{return[];}}
function utf8Bytes(text){if(typeof TextEncoder!=='undefined')return new TextEncoder().encode(text);const escaped=unescape(encodeURIComponent(text));const bytes=new Uint8Array(escaped.length);for(let i=0;i<escaped.length;i++)bytes[i]=escaped.charCodeAt(i);return bytes;}
async function localPasswordHash(user,pass){const data=utf8Bytes('qinghe-local:'+user+':'+pass);if(runtimeWindow?.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}return 'plain:'+user+':'+pass;}
async function localVerify(user,pass){const built=ACCOUNTS.find(a=>a.user===user&&a.pass===pass);if(built)return{user:built.user,name:built.name};const hash=await localPasswordHash(user,pass);const found=localUsers().find(a=>a.user===user&&a.passHash===hash);return found?{user:found.user,name:found.name}:null;}
async function localRegister(input){const name=String(input.name||'').trim(),user=String(input.user||'').trim();if(ACCOUNTS.some(a=>a.user===user)||localUsers().some(a=>a.user===user))throw new Error('该账号已存在，请换一个账号。');const passHash=await localPasswordHash(user,String(input.password||''));const list=localUsers();list.push({user,name,passHash,createdAt:new Date().toISOString()});localStorage.setItem(LOCAL_USERS_KEY,JSON.stringify(list));return{user,name};}
try{const a=JSON.parse(localStorage.getItem(AUTH_KEY));if(a&&(ACCOUNTS.some(x=>x.user===a.user)||localUsers().some(x=>x.user===a.user)))authUser=a;}catch{}
const paths={grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',file:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',check:'M20 6 9 17l-5-5',checkcircle:'M22 11a10 10 0 1 1-6-9 M22 3 12 13l-3-3',clock:'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',alert:'M10.3 3.9 1.8 18.1A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0 M12 9v4 M12 17h.01',sliders:'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',history:'M3 11a9 9 0 1 1 2.8 7 M3 4v7h7 M12 7v5l4 2',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.9 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',building:'M3 21h18 M5 21V5l7-3 7 3v16 M9 7h.01 M15 7h.01 M9 11h.01 M15 11h.01 M9 15h.01 M15 15h.01 M10 21v-3h4v3',chevron:'m9 5 7 7-7 7',down:'m6 9 6 6 6-6',search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',upload:'M12 16V3 m-5 5 5-5 5 5 M3 16v4a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-4',download:'M12 3v13 m-5-5 5 5 5-5 M3 16v4a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-4',spark:'m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7z M21 2v4 M19 4h4',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',help:'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',leaf:'M20 3C9 2 3 8 5 16c8 4 16-2 15-13z M3 21 16 8',arrow:'M5 12h14 m-5-5 5 5-5 5',back:'M19 12H5 m5-5-5 5 5 5',x:'m6 6 12 12 M6 18 18 6',shield:'M12 22s9-4 9-11V4l-9-3-9 3v7c0 7 9 11 9 11 M8 11l3 3 5-5',menu:'M3 6h18 M3 12h18 M3 18h18',edit:'m16 3 5 5 M4 20l4-1L21 6a2.8 2.8 0 0 0-4-4L4 15z',copy:'M9 9h12v12H9z M15 5V3H3v12h2',send:'m22 2-7 20-4-9-9-4 20-7z M22 2 11 13'};
const icon=(name)=>`<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${paths[name]||paths.file}"/></svg>`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state;try{state=JSON.parse(localStorage.getItem(KEY));if(!state||state.version!==3||!Array.isArray(state.students))state=Q.seed();}catch{state=Q.seed();}
state.rules={...Q.DEFAULT_RULES,...(state.rules||{})};
state.ruleHistory=Array.isArray(state.ruleHistory)?state.ruleHistory:[];
state.students.forEach(Q.ensureProcess);
let workspaceVersion=0,workspaceConfigured=false,workspaceHydrating=false,workspacePushTimer=0,workspacePushBusy=false;
let page='dashboard',selected=state.students[0].id,detailTab='materials',docId='',stageFilter='',statusFilter='',search='',pageNo=1,issueFilter='全部',mobile=false,uploads=[],batch='2026年秋季发展批次';
const $=s=>document.querySelector(s),student=()=>state.students.find(s=>s.id===selected)||state.students[0];
const issues=s=>Q.analyze(s,state.rules),openIssues=s=>issues(s).filter(i=>!i.handled),all=()=>state.students.filter(s=>s.checked).flatMap(issues),allOpen=()=>all().filter(i=>!i.handled);
function normalizeWorkspaceState(next){if(!next||next.version!==3||!Array.isArray(next.students))return null;next.rules={...Q.DEFAULT_RULES,...(next.rules||{})};next.ruleHistory=Array.isArray(next.ruleHistory)?next.ruleHistory:[];next.students.forEach(Q.ensureProcess);return next;}
function scheduleWorkspacePush(){if(!workspaceConfigured||workspaceHydrating||typeof setTimeout!=='function')return;clearTimeout(workspacePushTimer);workspacePushTimer=setTimeout(pushWorkspaceState,350);}
async function pushWorkspaceState(){if(!apiEnabled||!workspaceConfigured||workspaceHydrating||workspacePushBusy)return;workspacePushBusy=true;try{const response=await fetch(apiUrl('/api/workspace/state'),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedVersion:workspaceVersion,state})});const data=await response.json().catch(()=>({}));if(response.status===409){workspaceHydrating=true;const remote=await fetch(apiUrl('/api/workspace/state'));const latest=remote.ok?await remote.json():null;const normalized=normalizeWorkspaceState(latest?.state);if(normalized){state=normalized;workspaceVersion=Number(latest.version||0);try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}render();toast('共享数据刚被其他用户修改，已刷新为服务器版本。');}return;}if(!response.ok)throw new Error(data.error||'共享数据保存失败');workspaceVersion=Number(data.version||workspaceVersion);}catch{workspaceConfigured=false;}finally{workspaceHydrating=false;workspacePushBusy=false;}}
async function hydrateWorkspace(){if(!apiEnabled)return;try{const response=await fetch(apiUrl('/api/workspace/state'));if(response.status===404)return; if(!response.ok)throw new Error();workspaceConfigured=true;const remote=await response.json();const normalized=normalizeWorkspaceState(remote.state);if(normalized){state=normalized;workspaceVersion=Number(remote.version||0);try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}render();}else{workspaceVersion=0;scheduleWorkspacePush();}}catch{workspaceConfigured=false;}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{toast('浏览器存储空间不足，本次操作暂存在当前页面。');}scheduleWorkspacePush();}
async function pollWorkspace(){if(!apiEnabled||!workspaceConfigured||workspacePushBusy||workspaceHydrating)return;try{const response=await fetch(apiUrl('/api/workspace/state'));if(!response.ok)return;const remote=await response.json();if(Number(remote.version||0)<=workspaceVersion||!remote.state)return;const normalized=normalizeWorkspaceState(remote.state);if(normalized){state=normalized;workspaceVersion=Number(remote.version);try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}render();toast('已同步其他审核员的最新修改。');}}catch{}}
if(typeof setInterval==='function')setInterval(pollWorkspace,10000);
function log(action,detail,who='演示审核员'){state.logs.unshift({at:new Date().toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'}),who,action,detail});persist();}
function pill(text){let cl=/需补正|重点/.test(text)?'red':/已确认|已核验|份数已齐|已核实|已启用/.test(text)?'green':/待复核|待确认|待人工核验/.test(text)?'amber':'blue';return `<span class="pill ${cl}">${esc(text)}</span>`;}
function ruleSource(rule){const id=String(rule||'');const source=Q.RULE_SOURCES.find(x=>id===x.id||id.startsWith(x.id+'-'));return source?`${source.title}（${source.issuer}，${source.date}）`:'当前学校配置';}
function btn(label,act,ic='',cl='',attrs=''){return `<button class="btn ${cl}" data-action="${act}" ${attrs}>${ic?icon(ic):''}${label}</button>`;}
function toast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),3600);}
function go(p){page=p;pageNo=1;mobile=false;render();window.scrollTo(0,0);}
function heading(title,sub,actions=''){return `<div class="page-heading"><div><h1>${title}</h1><div class="subtitle">${sub}</div></div><div class="heading-actions">${actions}</div></div>`;}
function shell(body){const nav=[['dashboard','grid','工作概览'],['review','file','材料审核'],['issues','alert','问题中心'],['student','users','学生整改'],['rules','sliders','审核规则库'],['logs','history','审核日志']];return `<div class="mobile-overlay ${mobile?'open':''}" data-action="menu"></div><aside class="sidebar ${mobile?'open':''}"><div class="brand"><div class="logo">${icon('leaf')}</div><div><strong>青禾</strong><small>QINGHE WORKSPACE</small></div></div><div class="org">${icon('building')}<div>示范大学 · 党委组织部<small>高校党建工作空间</small></div></div><div class="nav-title">工作空间</div><nav>${nav.map(([p,i,n])=>`<button class="nav-item ${(page===p||page==='detail'&&p==='review')?'active':''}" data-action="nav" data-page="${p}">${icon(i)}${n}${p==='issues'?`<span class="count">${allOpen().length}</span>`:''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="help-box"><b>${icon('spark').replace('<svg','<svg style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"')} 让审核有据可循</b>每一处问题，关联材料与规则。<br>每一次修改，留下清晰记录。<button data-action="help">了解演示工作台 ${icon('arrow').replace('<svg','<svg style="width:12px;height:12px;vertical-align:-3px"')}</button></div><div class="user"><div class="avatar rose">审</div><div><strong>${esc(authUser?.name||'演示审核员')}</strong><small>组织部管理视角 · 虚拟身份</small></div><button class="text-btn user-exit" data-action="logout" aria-label="退出登录">退出</button></div></div></aside><div class="main"><header class="topbar"><div class="breadcrumbs"><button class="icon-button mobile-menu" data-action="menu" aria-label="展开导航">${icon('menu')}</button>工作空间 ${icon('chevron').replace('<svg','<svg style="width:12px;height:12px"')}<b>${page==='detail'?'材料详情':nav.find(n=>n[0]===page)?.[2]||'工作概览'}</b></div><div class="top-actions"><span class="date">2026年10月13日 · 演示批次</span><button class="demo-badge" data-action="help">DEMO · 虚拟数据</button><button class="icon-button" data-action="export-data" aria-label="导出数据" title="导出数据">${icon('download')}</button><button class="icon-button" data-action="import-data" aria-label="导入数据" title="导入数据">${icon('upload')}</button><button class="icon-button" data-action="nav" data-page="issues" aria-label="查看待处理问题">${icon('bell')}</button><button class="icon-button" data-action="help" aria-label="使用说明">${icon('help')}</button></div></header><main class="content">${body}<div class="bottom-note">${icon('shield')} ${staticMode?'审核数据保存在当前浏览器，可随时导出备份 · 系统提供材料校验辅助，审核结论由人工确认':'审核状态保存在浏览器，上传原件保存在本地项目 · 系统提供材料校验辅助，审核结论由人工确认'}</div></main></div>`;}
function stats(){let reviewed=state.students.filter(s=>s.checked).length,total=state.students.reduce((n,s)=>n+s.docs.length,0),need=state.students.filter(s=>s.checked&&openIssues(s).length).length;return `<div class="stats">${[['本批次学生',state.students.length,'人','users','覆盖 5 个发展阶段',''],['已登记材料',total,'份','file','仅代表文件已归集',''],['已完成辅助校验',reviewed,'人','checkcircle',`${Math.round(reviewed/state.students.length*100)}% 的学生材料已运行校验 · 不等于人工核验`,''],['待处理问题',allOpen().length,'项','alert',`涉及 ${need} 名学生 · 等待人工核对`,'warn']].map(([l,n,u,i,f,c])=>`<div class="stat ${c}"><div class="label">${l}${icon(i)}</div><div class="number">${n}<small>${u}</small></div><div class="foot">${f}</div></div>`).join('')}</div>`;}
function dashboard(){const a=allOpen(),cats=[a.filter(x=>x.category==='时间逻辑').length,a.filter(x=>x.category==='材料缺项').length,a.filter(x=>!['时间逻辑','材料缺项'].includes(x.category)).length],sum=a.length||1;return heading('工作概览','把繁琐留给系统，把时间留给培养。',`<select id="batch-select" aria-label="演示批次"><option>${batch}</option><option>全部演示记录</option></select>${btn('自动归档','upload','upload','primary')}`)+`<section class="hero"><div><div class="eyebrow">${icon('spark')} AI 辅助审核 · 全流程协同</div><h2>每一份材料，都值得认真对待。</h2><p>材料完整性、时间逻辑与规范表述，一站式辅助校验。</p><button class="hero-link" data-action="run-all">运行本批次辅助校验 ${icon('arrow')}</button></div><div class="hero-art" aria-hidden="true"><svg viewBox="0 0 220 170"><path d="M6 150h205" stroke="#c8c7b3"/><path d="M115 153v-48h70v48 M121 105V82h56v23 M127 82V66h44v16 M117 66l32-19 32 19 M135 148v-29h10v29 M154 148v-29h10v29 M128 89h8m12 0h8m12 0h3 M132 98h8m12 0h8 M122 113h5m44 0h7 M84 153v-32h23 M184 153v-33h15" stroke="#bcbfa6" fill="#ebece0"/><path d="M50 154V86 M50 123C23 112 20 91 28 78c19 8 24 22 22 45 M50 105c21-4 31-18 27-34-22 6-30 16-27 34 M50 141c23-3 34-16 31-31-22 4-29 16-31 31" stroke="#adb997" fill="#e1e7d9"/><path d="M91 39h21v33H91z M98 44h8 M98 51h8 M98 59h5" stroke="#c5b9a9" fill="#f8f6f0"/><circle cx="187" cy="40" r="14" fill="#e4dbc7" stroke="none"/></svg></div></section>${stats()}<div class="two-columns"><section class="panel"><div class="panel-head"><h2><span class="dot"></span>发展阶段分布</h2><small>点击阶段查看材料</small></div><div class="stage-grid">${Q.STAGES.map((s,i)=>`<button class="stage-cell" data-action="stage" data-stage="${i}"><span class="stage-icon">${icon(['file','leaf','users','shield','checkcircle'][i])}</span><b>${s}</b><strong>${state.students.filter(x=>x.stage===i).length}<small>人</small></strong></button>`).join('')}</div></section><section class="panel"><div class="panel-head"><h2><span class="dot"></span>待处理问题分布</h2><button class="text-btn" data-action="nav" data-page="issues">查看全部 ${icon('chevron')}</button></div><div class="distribution"><div class="donut" style="background:conic-gradient(var(--red) 0 ${cats[0]/sum*100}%,#d6a561 ${cats[0]/sum*100}% ${(cats[0]+cats[1])/sum*100}%,#81a090 ${(cats[0]+cats[1])/sum*100}% 100%)"><div><strong>${a.length}</strong><small>待处理问题</small></div></div><div class="legend">${['时间逻辑','材料缺项','形式 / 内容'].map((n,i)=>`<div class="legend-row"><span><i></i>${n}</span><b>${cats[i]} <small>项</small></b></div>`).join('')}</div></div></section></div>${tablePanel(true)}`;}
function filtered(){return state.students.filter(s=>(stageFilter===''||s.stage===Number(stageFilter))&&(!statusFilter||Q.materialStatus(s,state.rules)===statusFilter)&&(!search||[s.name,s.number,s.college,s.branch].some(v=>v.includes(search))));}
function tablePanel(home=false){const rows=filtered(),limit=home?5:7,pages=Math.max(1,Math.ceil(rows.length/limit));pageNo=Math.min(pageNo,pages);return `<section class="panel"><div class="panel-head"><h2><span class="dot"></span>${home?'本批次审核任务':'学生材料档案'} <small>${rows.length} 人</small></h2>${home?`<button class="text-btn" data-action="nav" data-page="review">全部任务 ${icon('chevron')}</button>`:btn('批量校验当前筛选','run-filter','spark','small')}</div><div class="table-tools"><div class="filter-group"><label class="search-box">${icon('search')}<input id="student-search" placeholder="搜索姓名、学号或学院" value="${esc(search)}" aria-label="搜索学生"></label><select id="stage-filter" aria-label="筛选发展阶段"><option value="">全部发展阶段</option>${Q.STAGES.map((s,i)=>`<option value="${i}" ${String(i)===stageFilter?'selected':''}>${s}</option>`).join('')}</select><select id="status-filter" aria-label="筛选材料核验状态"><option value="">全部材料核验状态</option>${Q.MATERIAL_STATUSES.map(s=>`<option ${statusFilter===s?'selected':''}>${s}</option>`).join('')}</select></div>${btn('导出清单','export-csv','download','small')}</div><div class="status-guide">材料状态按“文件归集 → 正文识别 → 人工核验 → 需补正/已确认”推进；原件已归档不等于内容已审核。</div><div class="table-wrap"><table><thead><tr><th>学生信息</th><th>所属学院 / 支部</th><th>发展阶段</th><th>材料完整性</th><th>待处理问题</th><th>材料核验状态</th><th>操作</th></tr></thead><tbody>${rows.slice((pageNo-1)*limit,pageNo*limit).map((s,i)=>{const c=Q.completeness(s),n=openIssues(s).length;return `<tr><td><div class="person"><div class="avatar ${i%3===0?'rose':''}">${esc(s.name.slice(-2))}</div><div><b>${esc(s.name)}</b><small>${esc(s.number)} · 虚拟</small></div></div></td><td>${esc(s.college)}<div class="minor-label">${esc(s.branch)}</div></td><td>${Q.STAGES[s.stage]}</td><td>${c.actual}<span style="color:#b5bdb5"> / ${c.expected}</span><span class="mini-track"><i style="width:${c.actual/c.expected*100}%"></i></span></td><td><span class="issue-num ${n?'':'none'}">${s.checked?n?n+' 项':'—':'待校验'}</span></td><td>${pill(Q.materialStatus(s,state.rules))}</td><td><button class="text-btn" data-action="open" data-id="${s.id}">查看审核 ${icon('chevron')}</button></td></tr>`;}).join('')||'<tr><td colspan="7"><div class="empty">没有匹配的学生，请调整筛选条件。</div></td></tr>'}</tbody></table></div><div class="table-footer"><span>共 ${rows.length} 条记录 · 均为虚拟样本</span><div class="pagination"><button data-action="pagination" data-page="${pageNo-1}" ${pageNo<=1?'disabled':''} aria-label="上一页">‹</button>${Array.from({length:pages},(_,i)=>`<button class="${pageNo===i+1?'active':''}" data-action="pagination" data-page="${i+1}">${i+1}</button>`).join('')}<button data-action="pagination" data-page="${pageNo+1}" ${pageNo>=pages?'disabled':''} aria-label="下一页">›</button></div></div></section>`;}
function review(){return heading('材料审核','按人归集，按阶段核验。所有辅助校验结果均可追溯。',btn('导入学生名单','roster-import','users')+btn('同步本地归档','sync-archive','history')+btn('自动归档','upload','upload')+btn('校验全部材料','run-all','spark','primary'))+tablePanel();}
function issueCard(i,showStudent=false){const s=state.students.find(s=>s.id===i.studentId),d=s.docs.find(d=>d.id===i.docId);return `<article class="issue-card ${i.handled?'handled':''}"><div style="display:flex;justify-content:space-between;align-items:center">${pill(i.handled?'已核实':i.severity)}<span class="minor-label">${esc(i.category)}</span></div><h3>${esc(i.title)}</h3>${showStudent?`<div class="minor-label">${esc(s.name)} · ${esc(s.college)}</div>`:''}<p>${esc(i.detail)}</p><div class="suggestion">修改指引：${esc(i.suggestion)}</div><div class="source">依据：${esc(ruleSource(i.rule))} · ${d?esc(d.title)+' / 提取字段':'跨材料校验'}${i.rule?.startsWith('DEMO')?' · 旧演示规则':''}</div>${i.handled?`<p>人工记录：${esc(i.note)}</p>`:''}<div class="issue-actions"><button class="text-btn" data-action="locate" data-id="${s.id}" data-doc="${esc(i.docId||'')}" data-category="${esc(i.category)}">${icon('search')} ${i.docId?'定位材料':'查看依据'}</button><button class="text-btn" data-action="handle" data-id="${s.id}" data-issue="${esc(i.id)}">${i.handled?'重新打开':'人工核实'}</button></div></article>`;}
function canConfirm(s){return s.docs.length>0&&Q.completeness(s).actual===Q.completeness(s).expected&&s.checked&&!openIssues(s).length&&s.docs.every(d=>Q.materialDocStatus(s,d,state.rules)!=='已归档'&&d.text?.trim()&&d.reviewed===true);}
function gatePill(g){return g.passed?pill('已完成'):pill(g.manual?'待人工核对':'需补正');}
function gatePage(s){const g=Q.stageGates(s,state.rules),p=Q.ensureProcess(s);return `<section class="panel"><div class="panel-head"><div><h2>${Q.STAGES[s.stage]} · 程序闸门</h2><small>通过 ${g.passed} / ${g.checks.length} 项；未完成项不能确认当前环节</small></div>${g.complete?pill('闸门已通过'):pill('待人工核对')}</div><div class="gate-list">${g.checks.map(x=>`<div class="gate-row ${x.passed?'done':''}"><div><strong>${x.title}</strong><small>${x.detail} · 依据 ${esc(ruleSource(x.rule))}</small></div>${gatePill(x)}</div>`).join('')}</div><div class="rule-body gate-editor"><h3>登记程序核对结果</h3><p class="minor-label">材料和日期由系统辅助检查，程序记录需要审核员对照原件确认后保存。</p><div class="form-grid"><label class="form-group"><span>申请后谈话记录</span><select id="gate-applicationTalkRecorded" class="field"><option value="false" ${p.applicationTalkRecorded?'':'selected'}>待核对</option><option value="true" ${p.applicationTalkRecorded?'selected':''}>已核对</option></select></label>${s.stage>=1?`<label class="form-group"><span>积极分子考察次数</span><input id="gate-activeInspectionCount" class="field" type="number" min="0" max="99" value="${p.activeInspectionCount||0}"></label>`:''}${s.stage>=2?`<label class="form-group"><span>意见征求记录</span><select id="gate-opinionsReview" class="field"><option value="false" ${p.opinionsReview?'':'selected'}>待核对</option><option value="true" ${p.opinionsReview?'selected':''}>已核对</option></select></label><label class="form-group"><span>政治审查</span><select id="gate-politicalReview" class="field"><option value="false" ${p.politicalReview?'':'selected'}>待核对</option><option value="true" ${p.politicalReview?'selected':''}>已核对</option></select></label><label class="form-group"><span>入党介绍人数</span><input id="gate-introducers" class="field" type="number" min="0" max="2" value="${p.introducers||0}"></label><label class="form-group"><span>集中培训天数</span><input id="gate-trainingDays" class="field" type="number" min="0" max="365" value="${p.trainingDays||0}"></label><label class="form-group"><span>集中培训学时</span><input id="gate-trainingHours" class="field" type="number" min="0" max="999" value="${p.trainingHours||0}"></label>`:''}${s.stage>=3?`<label class="form-group"><span>发展对象预审</span><select id="gate-preReview" class="field"><option value="false" ${p.preReview?'':'selected'}>待核对</option><option value="true" ${p.preReview?'selected':''}>已核对</option></select></label><label class="form-group"><span>发展对象公示</span><select id="gate-publicity" class="field"><option value="false" ${p.publicity?'':'selected'}>待核对</option><option value="true" ${p.publicity?'selected':''}>已核对</option></select></label><label class="form-group"><span>接收谈话</span><select id="gate-organizationTalk" class="field"><option value="false" ${p.organizationTalk?'':'selected'}>待核对</option><option value="true" ${p.organizationTalk?'selected':''}>已核对</option></select></label><label class="form-group"><span>接收审批</span><select id="gate-approval" class="field"><option value="false" ${p.approval?'':'selected'}>待核对</option><option value="true" ${p.approval?'selected':''}>已核对</option></select></label><label class="form-group"><span>接收手续</span><select id="gate-acceptance" class="field"><option value="false" ${p.acceptance?'':'selected'}>待核对</option><option value="true" ${p.acceptance?'selected':''}>已核对</option></select></label>`:''}${s.stage>=4?`<label class="form-group"><span>转正考察</span><select id="gate-probationReview" class="field"><option value="false" ${p.probationReview?'':'selected'}>待核对</option><option value="true" ${p.probationReview?'selected':''}>已核对</option></select></label>`:''}</div><div style="margin-top:18px">${btn('保存程序核对结果','save-gates','check','primary')}</div></div></section>`;}function extractionLabel(u){const labels={extracted:'\u5df2\u63d0\u53d6',empty:'\u6b63\u6587\u4e3a\u7a7a',ocr_required:'\u9700\u8981 OCR',ocr_unavailable:'OCR \u4e0d\u53ef\u7528',unsupported:'\u683c\u5f0f\u6682\u4e0d\u652f\u6301',failed:'\u63d0\u53d6\u5931\u8d25'};return labels[u.extractionStatus]||'\u5f85\u63d0\u53d6';}
function docPaperLabel(s,d){const status=Q.materialDocStatus(s,d,state.rules);if(status==='\u5df2\u5f52\u6863')return d.archiveId?'\u5df2\u5f52\u6863 · \u539f\u4ef6\u5df2\u4fdd\u5b58 · \u5f85\u63d0\u53d6\u6216\u4eba\u5de5\u6838\u9a8c':'\u5df2\u5f52\u6863 · \u5f85\u63d0\u53d6';if(status==='\u5df2\u63d0\u53d6')return '\u5df2\u63d0\u53d6 · \u5f85\u8fd0\u884c\u8f85\u52a9\u6821\u9a8c';if(status==='\u5f85\u4eba\u5de5\u6838\u9a8c')return '\u5df2\u63d0\u53d6 · \u5f85\u4eba\u5de5\u6838\u9a8c';if(status==='\u5df2\u6838\u9a8c')return '\u5df2\u6838\u9a8c · \u4eba\u5de5\u8bb0\u5f55\u5df2\u4fdd\u5b58';return '\u4eba\u5de5\u6821\u5bf9 / \u63d0\u53d6\u7ed3\u679c';}
function detail(){const s=student(),a=issues(s);Q.ensureProcess(s);if(!s.docs.some(d=>d.id===docId))docId=s.docs[0]?.id||'';const d=s.docs.find(d=>d.id===docId);const tabs=[['materials','材料与问题'],['timeline','时间节点'],['checklist','材料清单'],['gates','程序闸门'],['record','审核记录']];const body=detailTab==='timeline'?timeline(s):detailTab==='checklist'?checklist(s):detailTab==='gates'?gatePage(s):detailTab==='record'?record(s):`<div class="review-layout"><section class="panel"><div class="panel-head"><select id="doc-select" aria-label="选择材料">${s.docs.map(x=>`<option value="${esc(x.id)}" ${x.id===docId?'selected':''}>${esc(x.title)}</option>`).join('')}</select><div class="heading-actions">${d?.archiveId?btn('下载原件','download-original','download','small'):''}${btn('校对提取结果','edit-doc','edit','small',d?'':'disabled')}</div></div><div class="document-body">${d?`<div class="paper"><div class="paper-label">${docPaperLabel(s,d)}</div><h2>${esc(d.title)}</h2><div class="paper-text">${esc(d.text||'尚未提取正文。')}</div>${(d.extractionWarnings?.length||d.extractionError)?`<div class="alert neutral" style="margin-top:14px">提取提示：${esc([...(d.extractionWarnings||[]),d.extractionError||''].filter(Boolean).join('；'))}</div>`:''}<div class="paper-footer">落款日期：${esc(d.date||'待确认')}<br>签字：${d.signed===true?'已确认':d.signed===false?'缺失':'待确认'}</div></div>`:'<div class="empty">暂无材料，请先导入。</div>'}</div></section><section class="panel"><div class="panel-head"><h2>${icon('spark')}辅助校验结果 <small>${Q.materialStatus(s,state.rules)} · ${openIssues(s).length} 项待处理</small></h2></div><div class="rule-body">${a.length?a.map(i=>issueCard(i)).join(''):`<div class="empty">${icon('checkcircle')}<br>当前公开规则未发现异常<br><small>请继续人工核对材料原件。</small></div>`}</div><div class="gate-summary">程序闸门：${Q.stageGates(s,state.rules).passed} / ${Q.stageGates(s,state.rules).checks.length} 项通过 · <button class="text-btn" data-action="detail-tab" data-tab="gates">查看闸门</button></div><div style="padding:15px;border-top:1px solid var(--line)">${btn('人工确认本环节材料','confirm-review','checkcircle','light',canConfirm(s)&&Q.stageGates(s,state.rules).complete?'':'disabled')}</div></section></div>`;return `<button class="text-btn" data-action="nav" data-page="review" style="margin-bottom:15px">${icon('back')} 返回材料审核</button><div class="detail-top"><div class="avatar rose">${esc(s.name.slice(-2))}</div><div><h1>${esc(s.name)} ${pill(Q.materialStatus(s,state.rules))}</h1><p>${esc(s.number)} · ${esc(s.college)} · ${esc(s.branch)} · 虚拟样本${Q.ageOf(s)!=null?' · '+Q.ageOf(s)+'岁':''}</p><small class="minor-label">审核流程：${esc(s.status)} · 当前规则：${esc(state.rules.ruleVersion)}</small></div><div class="heading-actions">${btn('重新校验','run-one','spark')}${btn('生成整改清单','feedback','file','primary')}</div></div><div class="workflow">${Q.FLOW.map((n,i)=>`<div class="flow-card ${i===s.flow?'current':''}"><b>0${i+1} ${i<s.flow?'✓':''}</b>${n}</div>`).join('')}</div><div class="tabs">${tabs.map(([k,l])=>`<button class="${detailTab===k?'active':''}" data-action="detail-tab" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;}function timeline(s){return `<div class="review-layout"><section class="panel"><div class="panel-head"><h2>关键时间节点</h2><small>校对原件后更新日期</small></div><div class="timeline"><div class="time-node"><span class="bubble">谈</span><div><h3>申请后谈话</h3><p>收到入党申请书后 1 个月内；缺少日期时请人工核对谈话记录</p><input class="field" type="date" id="date-applicationTalk" value="${esc(s.dates.applicationTalk||'')}" aria-label="申请后谈话日期"></div></div>${Q.STAGES.map((n,i)=>`<div class="time-node"><span class="bubble">${i+1}</span><div><h3>${n}</h3><p>${i<=s.stage?'阶段日期已纳入校验':'尚未进入该阶段'}</p>${i<=s.stage?`<input class="field" type="date" id="date-${Q.DATE_KEYS[i]}" value="${esc(s.dates[Q.DATE_KEYS[i]])}" aria-label="${n}日期">`:''}</div></div>`).join('')}${btn('保存日期并重新校验','save-dates','check','primary')}</div></section><section class="panel"><div class="panel-head"><h2>时间逻辑核对</h2></div>${issues(s).filter(i=>i.category==='时间逻辑').map(i=>issueCard(i)).join('')||'<div class="empty">当前公开时间规则未发现异常。</div>'}<div class="alert neutral" style="margin:15px">${icon('help')}月份按日历月计算；依据公开规章和学校配置，例外情形仍需人工核对。</div></section></div>`;}
function checklist(s){return `<section class="panel"><div class="panel-head"><h2>${Q.STAGES[s.stage]} · 材料清单</h2>${btn('补充材料','upload','upload','small')}</div>${Q.required(s.stage).map(r=>{const n=s.docs.filter(d=>d.type===r.type).length,status=Q.materialChecklistStatus(s,r.type,r.count,state.rules),requirement=r.count==null?'份数不作国家统一固定要求':`最低 ${r.count} 份`;return `<div class="checklist-row"><div><strong>${Q.TYPES[r.type]}</strong><small>${requirement} · 当前登记 ${n} 份 · ${r.basis||'学校配置项'}${r.count==null?'；请按本校制度和培养记录人工核对':''}</small></div>${pill(status)}</div>`;}).join('')}<div class="alert neutral" style="margin:20px">${icon('help')}原件已归档不等于正文已提取；已核验表示审核员已逐份对照原件。思想汇报属于定期汇报材料，系统不再按“固定 2 份”自动判缺项，具体频次以学校现行制度为准。</div></section>`;}
function record(s){const logs=state.logs.filter(l=>l.detail.includes(s.name));return `<section class="panel"><div class="panel-head"><h2>材料版本与处理记录</h2><small>当前第 ${s.revision} 版</small></div>${logs.length?logs.map(logRow).join(''):'<div class="empty">暂无该学生的操作记录。修改或复核后将在此留痕。</div>'}</section>`;}
function issuesPage(){let a=allOpen();if(issueFilter!=='全部')a=a.filter(x=>x.category===issueFilter);return heading('问题中心','集中查看待处理问题，关联原文位置与修改指引。',btn('导出问题清单','export-issues','download'))+`<div class="issue-filters">${['全部','时间逻辑','程序材料','材料缺项','形式规范','表述校对','内容待核'].map(c=>`<button data-action="issue-filter" data-filter="${c}" class="${issueFilter===c?'active':''}">${c} <span style="margin-left:5px;opacity:.6">${c==='全部'?allOpen().length:allOpen().filter(i=>i.category===c).length}</span></button>`).join('')}</div><div class="issue-board">${a.map(i=>issueCard(i,true)).join('')||'<div class="panel empty">此分类暂无待处理问题。</div>'}</div>`;}
function studentPage(){const s=student();return heading('学生整改','学生视角演示：查看问题、补充材料、提交复核。',`<select id="student-select" aria-label="选择虚拟学生">${state.students.map(x=>`<option value="${x.id}" ${s.id===x.id?'selected':''}>${esc(x.name)} · ${Q.STAGES[x.stage]}</option>`).join('')}</select>`)+`<div class="alert neutral">${icon('help')}当前为 ${esc(s.name)} 的演示视图。提交仅更新此浏览器中的流程记录，不发送外部通知。</div><div class="two-columns"><section class="panel"><div class="panel-head"><h2>我的整改清单</h2><small>${openIssues(s).length} 项待核对</small></div>${openIssues(s).map(i=>issueCard(i)).join('')||'<div class="empty">当前没有待处理的规则提示。</div>'}<div style="padding:20px;display:flex;gap:10px;flex-wrap:wrap">${btn('补充材料','upload','upload')}${btn('提交复核（演示）','submit-review','send','primary')}</div></section><div><section class="panel"><div class="panel-head"><h2>材料进度</h2>${pill(Q.materialStatus(s,state.rules))}</div><div class="rule-body"><p>当前材料状态：${Q.materialStatus(s,state.rules)}</p><p>审核流程状态：${esc(s.status)}</p><p>当前发展阶段：${Q.STAGES[s.stage]}</p><p>材料归集：${Q.completeness(s).actual} / ${Q.completeness(s).expected} 份</p><p>审核环节：${Q.FLOW[s.flow]}</p><p>材料版本：第 ${s.revision} 版</p>${btn('查看并校对我的材料','open','file','light',`data-id="${s.id}"`)}</div></section><section class="panel" style="margin-top:20px"><div class="panel-head"><h2>整改反馈草稿</h2>${btn('生成','feedback','','small')}</div><div class="rule-body"><div class="feedback-box">${esc(s.feedback||'尚未生成。点击“生成”汇总当前材料问题和修改建议。')}</div></div></section></div></div>`;}
function sourcePanel(){return `<section class="panel"><div class="panel-head"><h2>公开依据与人工核对项</h2><small>规则版本 ${esc(state.rules.ruleVersion||Q.DEFAULT_RULES.ruleVersion)}</small></div><div class="rule-body"><p>自动校验只处理日期、材料登记和字段提示；政治审查、听取意见、介绍人、培训学时、考察记录等必须由有权限的审核人员对照原件确认。</p>${Q.PROCESS_REQUIREMENTS.map(r=>{const s=Q.RULE_SOURCES.find(x=>x.id===r.source);return `<div class="rule-item"><div>${r.title}<small>${r.mode} · ${r.clause} · ${s?.title||r.source}</small></div><span>${r.mode.startsWith('可自动')?'辅助校验':'人工核对'}</span></div>`}).join('')}<div class="source-links">${Q.RULE_SOURCES.map(s=>`<p><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title)}</a><small>${esc(s.issuer)} · ${esc(s.date)} · ${esc(s.note)}</small></p>`).join('')}</div></div></section>`;}function rulesPage(){const r=state.rules;return heading('审核规则库','依据公开规章建立，学校材料清单和执行口径可配置。',btn('保存规则配置','save-rules','check','primary'))+`<div class="alert">${icon('alert')}规则版本必须先填写名称、版本号、生效日期和维护部门。发布前建议保持“草稿”，发布后形成可追溯快照；国家文件没有规定“思想汇报固定 2 份”。</div><div class="rule-grid"><section class="panel rule-version-panel"><div class="panel-head"><h2>规则版本与发布</h2><span class="pill ${r.versionStatus==='已发布'?'green':'amber'}">${esc(r.versionStatus||'草稿')}</span></div><div class="rule-body"><div class="form-grid"><label class="form-group"><span>规则名称</span><input id="rule-name" class="field" value="${esc(r.ruleName)}" maxlength="80"></label><label class="form-group"><span>版本号</span><input id="rule-version" class="field" value="${esc(r.ruleVersion)}" maxlength="30"></label><label class="form-group"><span>生效日期</span><input id="rule-effective" class="field" type="date" value="${esc(r.effectiveFrom)}"></label><label class="form-group"><span>发布状态</span><select id="rule-status" class="field">${Q.RULE_STATUSES.map(x=>`<option ${r.versionStatus===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="form-group"><span>维护部门</span><input id="rule-owner" class="field" value="${esc(r.owner)}" maxlength="80"></label><label class="form-group full"><span>变更说明</span><textarea id="rule-note" class="field" rows="2" maxlength="500">${esc(r.changeNote)}</textarea></label></div><p class="minor-label">当前学校：${esc(r.schoolName)} · 依据来源：${r.ruleSources?.length||0} 项 · 保存后会把旧版本写入历史。</p></div></section><section class="panel"><div class="panel-head"><h2>时间逻辑规则</h2><span class="pill green">公开依据</span></div><div class="rule-body"><div class="rule-item"><div>积极分子培养教育时间<small>通常不少于 1 年；比较积极分子确定日至发展对象确定日</small></div><label><input id="rule-active" class="field" type="number" min="1" max="60" value="${r.activeMonths}" aria-label="积极分子培养教育时间月数"> 月</label></div><div class="rule-item"><div>预备期时长<small>预备党员预备期为 1 年；延期等情形人工判断</small></div><label><input id="rule-probation" class="field" type="number" min="1" max="60" value="${r.probationMonths}" aria-label="预备期月数"> 月</label></div><div class="rule-item"><div>申请后谈话<small>收到入党申请书后 1 个月内；有谈话日期时自动提示超期</small></div>${pill('辅助校验')}</div><div class="rule-item"><div>关键节点先后顺序<small>按五阶段顺序比对有效日期</small></div>${pill('辅助校验')}</div><p>日期异常只触发核对，不得为满足校验而改写原始记录。</p></div></section><section class="panel"><div class="panel-head"><h2>形式与文本检查</h2><small>仅做材料辅助校对</small></div><div class="rule-body"><div class="rule-item"><div>签字字段核对<small>未填写或未确认时提示核验原件</small></div><input id="rule-signature" type="checkbox" class="switch" aria-label="启用签字校验" ${r.checkSignature?'checked':''}></div><div class="rule-item"><div>规范名称错字提示<small>仅提示疑似错字，不自动修改原文</small></div><input id="rule-terms" type="checkbox" class="switch" aria-label="启用名称错字提示" ${r.checkTerms?'checked':''}></div><div class="rule-item"><div>正文空白与模板占位<small>识别空正文及“请填写”占位内容</small></div>${pill('已启用')}</div><p>不对个人思想、政治表现或入党资格作自动评分或决定。</p></div></section><section class="panel"><div class="panel-head"><h2>分阶段材料要求</h2><small>国家文件项目 + 学校配置数量</small></div><div class="rule-body">${Q.STAGES.map((s,i)=>`<div class="rule-item"><div>${s}<small>${Q.required(i).map(x=>Q.TYPES[x.type]+' · '+(x.count==null?'份数由学校制度配置':'最低 '+x.count+' 份')).join('、')}</small></div><span>${Q.required(i).reduce((n,x)=>n+Q.enforcedCount(x),0)}项硬性清单</span></div>`).join('')}</div></section>${sourcePanel()}<section class="panel"><div class="panel-head"><h2>规则版本历史</h2><small>${state.ruleHistory.length} 条旧版本快照</small></div>${state.ruleHistory.length?state.ruleHistory.map(h=>`<div class="log-row"><time>${esc(h.savedAt)}</time><div>${esc(h.version)} · ${esc(h.status)}</div><div>${esc(h.ruleName)}<p>生效：${esc(h.effectiveFrom||'未记录')} · 维护：${esc(h.owner||'未记录')}</p></div></div>`).join(''):'<div class="empty">保存新版本后，旧配置会显示在这里。</div>'}</section><section class="panel"><div class="panel-head"><h2>数据备份与迁移</h2><small>${staticMode?'浏览器本地保存 · 在线静态版':'本地保存 · 可导出迁移'}</small></div><div class="rule-body"><p>审核数据自动保存在当前浏览器（localStorage）${staticMode?'，上传的原件保存在浏览器 IndexedDB':'，上传原件保存在 data/archive'}。换电脑或换浏览器时，请先「导出数据」生成一个 JSON 备份，在新设备打开本网站并登录后，点击「导入数据」恢复。</p><p>导入会覆盖当前浏览器中的全部审核数据，导入前可先导出留档。当前已实现：自动归档、原件保存、重复检测、文本读取、结构化日期校验、规则提示、程序闸门、整改清单与操作留痕。</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin:20px 0">${btn('导出数据','export-data','download','primary')}${btn('导入数据','import-data','upload')}${btn('恢复初始演示','reset','history')}</div><p class="minor-label">导出文件为 JSON，包含学生、材料、规则版本、日志与${staticMode?'浏览器内':'本地'}归档原件；文件内含材料正文，请妥善保管。</p></div></section>${syncSettingsPanel()}</div>`;}
function logRow(l){return `<div class="log-row"><time>${esc(l.at)}</time><div>${esc(l.who)}</div><div>${esc(l.action)}<p>${esc(l.detail)}</p></div></div>`;}
function logsPage(){return heading('审核日志','记录材料导入、校验、整改与人工复核，保留处理轨迹。',btn('导出日志','export-logs','download'))+`<section class="panel"><div class="panel-head"><h2>操作记录</h2><small>${state.logs.length} 条 · 仅当前浏览器</small></div>${state.logs.map(logRow).join('')}</section>`;}
function loginPage(){const reg=loginMode==='register';const form=reg?`<label class="form-group"><span>姓名</span><input id="reg-name" class="field" maxlength="30" placeholder="请输入姓名" aria-label="姓名"></label><label class="form-group"><span>账号</span><input id="reg-user" class="field" autocomplete="username" placeholder="3—20 位字母、数字或下划线" aria-label="注册账号"></label><label class="form-group"><span>密码</span><input id="reg-pass" class="field" type="password" autocomplete="new-password" placeholder="至少 6 位" aria-label="注册密码"></label><label class="form-group"><span>确认密码</span><input id="reg-pass2" class="field" type="password" autocomplete="new-password" placeholder="请再次输入密码" aria-label="确认密码"></label><div id="reg-error" class="login-error" role="alert"></div><button class="btn primary login-btn" data-action="register">注 册</button><div class="login-hint">${icon('help')}已有账号？<button class="text-btn" data-action="login-mode" data-mode="login">返回登录</button></div>`:`<label class="form-group"><span>账号</span><input id="login-user" class="field" autocomplete="username" placeholder="请输入账号" value="${esc(regPrefill)}" aria-label="账号"></label><label class="form-group"><span>密码</span><input id="login-pass" class="field" type="password" autocomplete="current-password" placeholder="请输入密码" aria-label="密码"></label><div id="login-error" class="login-error" role="alert"></div><button class="btn primary login-btn" data-action="login">登 录</button><div class="login-hint">${icon('help')}初始账号：<b>admin</b> · 密码：<b>123456</b><button class="text-btn" data-action="login-mode" data-mode="register">注册账号</button></div><p class="login-foot">${staticMode?'在线演示：账号与数据仅保存在当前浏览器，不会上传服务器；仅用于展示登录流程，不构成真实身份认证与权限控制。':'演示登录：账号保存在本机项目账号库（密码加盐哈希），仅用于展示登录流程，不构成真实身份认证与权限控制。'}</p>`;return `<div class="login-wrap"><section class="login-card" aria-label="${reg?'注册账号':'登录'}"><div class="login-brand"><div class="logo">${icon('leaf')}</div><div><strong>青禾</strong><small>QINGHE WORKSPACE</small></div></div><h1>${reg?'注册审核员账号':'发展党员材料审核工作台'}</h1><p class="login-sub">${reg?(staticMode?'账号将保存在当前浏览器，用于演示登录流程。':'账号将保存到本机项目的账号库，用于演示登录流程。'):'示范大学 · 党委组织部 · 高校党建工作空间'}</p>${form}</section><p class="login-quote">把繁琐留给系统，把时间留给培养。</p></div>`;}
function render(){if(!authUser){$('#app').innerHTML=loginPage();return;}const f=document.activeElement?.id,pos=document.activeElement?.selectionStart;$('#app').innerHTML=shell(({dashboard,review,detail,issues:issuesPage,student:studentPage,rules:rulesPage,logs:logsPage}[page]||dashboard)());if(f&&document.getElementById(f)){document.getElementById(f).focus();if(typeof pos==='number')try{document.getElementById(f).setSelectionRange(pos,pos);}catch{}}}
let previousFocus;
function modal(title,body,footer='',large=false){previousFocus=document.activeElement;$('#modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal ${large?'large':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="关闭弹窗">${icon('x')}</button></div><div class="modal-body">${body}</div>${footer?`<div class="modal-foot">${footer}</div>`:''}</section></div>`;setTimeout(()=>$('#modal-root button, #modal-root input, #modal-root select')?.focus(),0);}
function closeModal(){if(runBusy || uploadBusy || uploadReading || rosterBusy)return;$('#modal-root').innerHTML='';previousFocus?.focus();}
function feedbackText(s){const a=openIssues(s);return `材料整改清单（演示草稿）\n学生：${s.name}（虚拟） / ${s.number}\n发展阶段：${Q.STAGES[s.stage]}\n规则版本：公开依据 · 待校方确认\n材料版本：第 ${s.revision} 版\n\n${a.length?a.map((i,n)=>`${n+1}. 【${i.category}】${i.title}\n位置：${s.docs.find(d=>d.id===i.docId)?.title||'跨材料 / 清单核对'}\n依据：${ruleSource(i.rule)}\n问题：${i.detail}\n修改建议：${i.suggestion}`).join('\n\n'):'当前公开规则与学校配置未发现未处理问题，请审核人员继续核对原件。'}\n\n请结合原始材料与本人实际情况核实。涉及时间与程序的问题请联系经办人员，不应为满足校验改写真实记录。\n本清单为辅助校验结果，最终由人工复核确认。`;}
function feedback(){const s=student();s.feedback=feedbackText(s);log('生成整改清单',s.name+' · '+openIssues(s).length+'项待处理');modal('整改清单 · '+esc(s.name),`<div class="alert neutral">${icon('file')}已生成可复制或下载的反馈草稿。当前不会向学生发送消息。</div><textarea id="feedback-text" class="field" style="width:100%;height:350px" aria-label="整改清单草稿">${esc(s.feedback)}</textarea>`,btn('复制内容','copy-feedback','copy')+btn('下载 TXT','download-feedback','download','primary'),true);}
function editDoc(){const s=student(),d=s.docs.find(d=>d.id===docId);if(!d)return;modal('校对提取结果',`<div class="alert neutral">${icon('help')}请对照原件录入。此处修改提取结果，不自动修改已上传的原始文件。</div><div class="form-grid"><label class="form-group">材料名称<input id="edit-title" class="field" value="${esc(d.title)}" maxlength="100"></label><label class="form-group">落款日期<input id="edit-date" class="field" type="date" value="${esc(d.date)}"></label><label class="form-group">签字核对<select id="edit-signed"><option value="unknown" ${d.signed==null?'selected':''}>待确认</option><option value="yes" ${d.signed===true?'selected':''}>已核对，签字完整</option><option value="no" ${d.signed===false?'selected':''}>缺失</option></select></label><label class="form-group">盖章核对<select id="edit-stamped"><option value="unknown" ${d.stamped==null?'selected':''}>待确认</option><option value="yes" ${d.stamped===true?'selected':''}>已核对，盖章完整</option><option value="no" ${d.stamped===false?'selected':''}>缺失</option></select></label><label class="form-group full">提取正文<textarea id="edit-text" class="field" style="height:220px" maxlength="100000">${esc(d.text)}</textarea></label></div>`,btn('取消','close-modal')+btn('保存并重新校验','save-doc','check','primary'),true);}
let uploadBusy = false, uploadReading = 0, uploadSession = 0, archiveAvailable = false, archiveIndex = [];
async function listArchiveEntries() {
  if (staticMode) return { entries: await LocalArchive.list() };
  try {
    const response = await fetch(apiUrl('/api/archive'));
    if (!response.ok) throw new Error('Archive unavailable');
    const result = await response.json();
    if (!Array.isArray(result.entries)) throw new Error('Wrong server');
    return result;
  } catch (error) {
    if (!configuredApiBase && !githubPagesMode) { staticMode = true; apiEnabled = false; return { entries: await LocalArchive.list() }; }
    throw error;
  }
}
async function addArchiveEntry(payload) {
  if (staticMode) return LocalArchive.add(payload);
  const response = await fetch(apiUrl('/api/archive'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || '归档失败');
  return result;
}
async function readArchiveFile(id) {
  if (staticMode) return LocalArchive.file(id);
  const response = await fetch(apiUrl('/api/archive/' + id + '/file'));
  if (!response.ok) throw new Error('归档不存在');
  return { bytes: new Uint8Array(await response.arrayBuffer()) };
}
async function refreshArchiveConnection() {
  try {
    const result = await listArchiveEntries();
    archiveIndex = result.entries; archiveAvailable = true;
  } catch { archiveAvailable = false; }
  renderUploadQueue();
}
function uploadModal() {
  uploads = []; uploadSession++; archiveAvailable = false;
  modal('自动归档 · 批量导入材料', `<div class="alert neutral">${icon('spark')}自动提取 TXT、DOCX 和有文字层的 PDF；扫描 PDF、DOC、图片按环境能力提取或等待 OCR。${staticMode?'原件与正文保存在当前浏览器（IndexedDB），并随「导出数据」一起备份。':'确认后保存原件到本地归档目录。'}</div><div id="archive-service"></div><div class="dropzone" id="dropzone" tabindex="0" role="button" aria-label="选择或拖入多名学生的材料">${icon('upload')}<b>将多名学生的材料一起拖入，自动匹配归档位置</b><p>推荐命名：2023000000001_林沐_思想汇报_2026-10-13.txt</p><p>PDF / Word / JPG / PNG / UTF-8 TXT · 自动提取正文，扫描件和图片依赖 OCR · 单文件 10 MB · 每批最多 30 个、合计 100 MB</p></div><input id="upload-files" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" multiple hidden><div class="archive-batch-tools"><label>为未匹配项指定学生 <select id="archive-default-student"><option value="">选择学生…</option>${state.students.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} · ${esc(s.number)}</option>`).join('')}</select></label>${btn('应用到待确认项','archive-apply-student','','small')}</div><div id="upload-summary"></div><div id="upload-list"></div><div class="alert neutral" style="margin-top:18px;margin-bottom:0">${icon('help')}正文提取结果只作为辅助依据，必须人工核验正文、签字、盖章和日期。OCR 不可用时仍可归档原件，但状态会保留为“已归档”，不会伪装成已提取。未知或冲突线索不会自动选人；重复内容在同一学生、同一类别下自动跳过。</div>`, btn('取消','close-modal') + btn('确认归档','confirm-upload','upload','primary'), true);
  const z = $('#dropzone');
  z.onclick = () => { if (!uploadBusy) $('#upload-files').click(); };
  z.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); z.click(); } };
  z.ondragover = e => { e.preventDefault(); z.classList.add('drag'); };
  z.ondragleave = () => z.classList.remove('drag');
  z.ondrop = e => { e.preventDefault(); z.classList.remove('drag'); if (!uploadBusy) addFiles(e.dataTransfer.files); };
  $('#upload-files').onchange = e => addFiles(e.target.files);
  refreshArchiveConnection();
}
async function addFiles(files) {
  const session = uploadSession; uploadReading++;
  for (const f of files) {
    if (uploads.length >= 30) { toast('\u6bcf\u6279\u6700\u591a30\u4e2a\u6587\u4ef6\uff0c\u8bf7\u5206\u6279\u4e0a\u4f20\u3002'); break; }
    if (!/\.(pdf|docx?|png|jpe?g|txt)$/i.test(f.name) || !f.size || f.size > 10*1024*1024 || f.name.length>180) { toast('\u5df2\u8df3\u8fc7\u683c\u5f0f\u3001\u540d\u79f0\u957f\u5ea6\u6216\u5927\u5c0f\u4e0d\u7b26\u5408\u8981\u6c42\u7684\u6587\u4ef6\uff1a'+f.name); continue; }
    if (uploads.reduce((n,u)=>n+u.file.size,0)+f.size>100*1024*1024) { toast('\u672c\u6279\u6b21\u8d85\u8fc7100 MB\uff0c\u8bf7\u5206\u6279\u5bfc\u5165\u3002'); break; }
    const u={file:f,studentId:'',type:'',evidence:[],warnings:[],reading:true,hash:'',manual:false,extractionStatus:'',extractionMethod:'',extractionError:''}; uploads.push(u); renderUploadQueue();
    try { const buffer=await f.arrayBuffer(); if(session!==uploadSession)break; u.buffer=buffer; const hash=await crypto.subtle.digest('SHA-256',buffer); u.hash=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
      if (/\.txt$/i.test(f.name)) { u.text=new TextDecoder('utf-8',{fatal:true}).decode(buffer).slice(0,100000); u.extractionStatus=u.text?'extracted':'empty'; u.extractionMethod='utf8'; }
      else { const result=staticMode?await BrowserExtract.extract(f.name,buffer):await (async()=>{const response=await fetch(apiUrl('/api/extract'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:f.name,base64:uploadBase64(buffer)})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'正文提取接口失败');return data;})();u.text=result.text||'';u.extractionStatus=result.status||'failed';u.extractionMethod=result.method||'';u.extractionWarnings=Array.isArray(result.warnings)?result.warnings:[];u.extractionError=result.error||'';u.warnings.push(...u.extractionWarnings,...(u.extractionError?[u.extractionError]:[])); }
      Object.assign(u,ArchiveMatcher.classify(f.name,u.text,state.students));
    } catch(error) { u.error=error.message||'\u6587\u4ef6\u8bfb\u53d6\u6216\u6b63\u6587\u63d0\u53d6\u5931\u8d25\uff0c\u8bf7\u79fb\u9664\u540e\u91cd\u8bd5\u3002'; }
    u.reading=false; renderUploadQueue();
  } uploadReading--; renderUploadQueue();
}
function markDuplicateUploads() {
  const seen = new Set(archiveIndex.map(e=>[e.studentId,e.type,e.hash].join('|')));
  for (const u of uploads) {
    const key = [u.studentId,u.type,u.hash].join('|');
    u.duplicate = !!(u.studentId && u.type && u.hash && seen.has(key));
    if(u.studentId && u.type && u.hash) seen.add(key);
  }
}
function renderUploadQueue() {
  if (!$('#upload-list')) return; markDuplicateUploads();
  $('#archive-service').innerHTML=archiveAvailable?`<div class="archive-connected">${icon('checkcircle')}${staticMode?'浏览器本地归档已就绪 · 原件保存在当前浏览器':'本地归档服务已连接 · 原件保存到 data/archive'}</div>`:`<div class="alert">${icon('alert')}${staticMode?'浏览器本地归档尚未就绪，请确认未使用无痕/隐私模式，然后点“重新连接”。':'正在连接或未连接归档服务。'}${btn('重新连接','archive-reconnect','','small')}</div>`;
  const waiting=uploads.filter(u=>!u.saved&&(!u.studentId||!u.type||u.reading||u.error)).length,ready=uploads.filter(u=>!u.saved&&!u.duplicate&&u.studentId&&u.type&&!u.reading&&!u.error).length;
  $('#upload-summary').innerHTML=`<div class="archive-summary"><b>${uploads.length} \u4e2a\u6587\u4ef6</b><span>${ready} \u4e2a\u5c31\u7eea</span><span>${waiting} \u4e2a\u5f85\u786e\u8ba4</span><span>${uploads.filter(u=>u.duplicate&&!u.saved).length} \u4e2a\u91cd\u590d</span><span>${uploads.filter(u=>u.saved).length} \u4e2a\u5df2\u5904\u7406</span></div>`;
  $('#upload-list').innerHTML=uploads.map((u,i)=>{const s=state.students.find(s=>s.id===u.studentId),status=u.saved?'\u5df2\u5f52\u6863':u.reading?'\u8bc6\u522b\u4e2d':u.error?'\u8bfb\u53d6/\u63d0\u53d6\u5931\u8d25':u.duplicate?'\u91cd\u590d\uff0c\u8df3\u8fc7':(!u.studentId||!u.type)?'\u5f85\u786e\u8ba4':u.manual?'\u4eba\u5de5\u6307\u5b9a':extractionLabel(u),method=/\.txt$/i.test(u.file.name)?'UTF-8 \u6b63\u6587 + \u6587\u4ef6\u540d':(u.extractionMethod?u.extractionMethod+' + \u6587\u4ef6\u540d':'\u6587\u4ef6\u540d\u5339\u914d');return `<div class="archive-row"><div class="archive-file"><b>${icon('file')}${esc(u.file.name)}</b><small>${(u.file.size/1024).toFixed(1)} KB · ${esc(method)}</small></div><div class="archive-fields"><label>\u5f52\u5c5e\u5b66\u751f<select data-archive-field="studentId" data-upload-index="${i}" ${uploadBusy||u.saved?'disabled':''}><option value="">\u5f85\u786e\u8ba4\uff1a\u9009\u62e9\u5b66\u751f</option>${state.students.map(s=>`<option value="${esc(s.id)}" ${s.id===u.studentId?'selected':''}>${esc(s.name)} · ${esc(s.number)}</option>`).join('')}</select></label><label>\u6750\u6599\u7c7b\u578b<select data-archive-field="type" data-upload-index="${i}" ${uploadBusy||u.saved?'disabled':''}><option value="">\u5f85\u786e\u8ba4\uff1a\u9009\u62e9\u7c7b\u522b</option>${Object.entries(Q.TYPES).map(([k,v])=>`<option value="${k}" ${k===u.type?'selected':''}>${v}</option>`).join('')}</select></label><span class="pill ${waiting&&(!u.studentId||!u.type)?'amber':u.saved?'green':''}">${status}</span><button class="icon-button" data-action="remove-upload" data-index="${i}" ${uploadBusy||u.reading||u.saved?'disabled':''} aria-label="\u79fb\u9664\u6587\u4ef6">${icon('x')}</button></div><div class="archive-destination">归档位置：${s&&u.type?esc((staticMode?'浏览器归档 · ':'data/archive/')+s.id+'/'+Q.TYPES[u.type]+'/（文件指纹）-'+u.file.name):'等待确认学生及材料类别'}</div><details><summary>\u67e5\u770b\u5339\u914d\u4f9d\u636e</summary><p>${esc(u.evidence.join('；')||'\u6ca1\u6709\u53ef\u7528\u7684\u81ea\u52a8\u5339\u914d\u7ebf\u7d22')}</p>${u.warnings.length?`<p>${esc(u.warnings.join('；'))}</p>`:''}</details>${u.error?`<p class="archive-error">${esc(u.error)}</p>`:''}</div>`;}).join('');
  const button=$('[data-action="confirm-upload"]');if(button){button.disabled=uploadBusy||!!uploadReading||!archiveAvailable||!uploads.length||!!waiting;button.textContent=uploadBusy?'\u6b63\u5728\u4fdd\u5b58\u539f\u4ef6…':`\u786e\u8ba4\u5f52\u6863${ready?'（'+ready+'）':''}`;}
}
function archiveEntryToDocument(entry) {
  return {id:'archive-'+entry.id,archiveId:entry.id,fileHash:entry.hash,archivePath:entry.relativePath,archivedAt:entry.archivedAt,originalFilename:entry.filename,type:entry.type,title:entry.filename,date:entry.date,signed:null,stamped:null,text:entry.text,source:entry.source,extractionStatus:entry.extractionStatus||'',extractionMethod:entry.extractionMethod||'',extractionWarnings:Array.isArray(entry.extractionWarnings)?entry.extractionWarnings:[],extractionError:entry.extractionError||'',extractedAt:entry.extractedAt||'',reviewed:false};
}
function attachArchiveEntry(entry) {
  const s = state.students.find(s=>s.id===entry.studentId && (!entry.studentNumber || s.number===entry.studentNumber));
  if(!s || s.docs.some(d=>d.archiveId===entry.id)) return false;
  s.docs.push(archiveEntryToDocument(entry));s.checked=false;s.status='待审核';s.revision++;persist();return true;
}
function uploadBase64(buffer) {
  const bytes = new Uint8Array(buffer); let text='';
  for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return btoa(text);
}
async function confirmUpload() {
  if(uploadBusy || uploadReading || !archiveAvailable || uploads.some(u=>!u.saved && (!u.studentId||!u.type||u.error)))return;
  uploadBusy=true;renderUploadQueue();let completed=0,duplicates=0,failed=0;const owners=new Set();
  for(const u of uploads) {
    if(u.saved)continue;
    try {
      const s=state.students.find(s=>s.id===u.studentId);
      const result=await addArchiveEntry({studentId:s.id,studentName:s.name,studentNumber:s.number,type:u.type,filename:u.file.name,date:u.date,evidence:[...u.evidence,...(u.manual?['归属或材料类型经人工调整']:[])],base64:uploadBase64(u.buffer)});
      if(!archiveIndex.some(e=>e.id===result.entry.id))archiveIndex.push(result.entry);
      attachArchiveEntry(result.entry);
      u.saved=true;u.error='';owners.add(s.id);result.duplicate?duplicates++:completed++;
      log(result.duplicate?'跳过重复原件':'自动归档材料',s.name+' · '+u.file.name+' → '+Q.TYPES[u.type]);
    } catch(e) { u.error=e.message||'归档失败，请确认服务已启动后移除并重试。';failed++; }
    renderUploadQueue();
  }
  uploadBusy=false;renderUploadQueue();render();
  if(!failed){closeModal();if(owners.size===1){selected=[...owners][0];page='detail';detailTab='checklist';render();}else go('review');}
  toast(`归档完成：新增 ${completed}，重复跳过 ${duplicates}${failed?'，失败 '+failed+'（已成功项目保留）':''}。`);
}
async function syncArchiveRecords() {
  try {
    const data=await listArchiveEntries();
    let count=0,unknown=0;
    for(const e of data.entries){const s=state.students.find(s=>s.id===e.studentId&&(!e.studentNumber||s.number===e.studentNumber));if(!s){unknown++;continue;}if(attachArchiveEntry(e))count++;}
    log('同步本地归档','恢复 '+count+'份材料'+(unknown?'；'+unknown+'份归属不在当前名册，未导入':''));render();toast(`已同步 ${count} 份归档材料${unknown?'，另有 '+unknown+'份需核对名册':''}。`);
  } catch { toast(staticMode?'浏览器本地归档暂不可用，请确认未使用无痕/隐私模式。':'未连接本地归档服务，请使用新版 node server.mjs 启动项目。'); }
}
let rosterBusy = false, rosterFileName = '', rosterPlan = null, rosterErrorRows = null;

function rosterModal() {
  rosterBusy = false; rosterFileName = ''; rosterPlan = null;
  modal('导入学生名单', `<div class="alert neutral">${icon('users')}按学号合并：已有学生更新资料，新学号新增为「空白材料清单」学生；有错误的行不会导入。</div><div class="dropzone" id="roster-dropzone" tabindex="0" role="button" aria-label="选择或拖入学生名单 Excel">${icon('upload')}<b>将学生名单 Excel 拖到这里，或点击选择文件</b><p>支持 .xlsx / .csv · 表头需包含「姓名」「学号」 · 单次最多 500 行 · 单文件 5 MB</p><p>其余列：学院、党支部、当前阶段、出生日期（或年龄）、关键日期</p></div><input id="roster-files" type="file" accept=".xlsx,.csv" hidden><div class="roster-toolbar"><a class="btn small" href="templates/学生名单导入模板.xlsx" download="学生名单导入模板.xlsx">${icon('download')}下载导入模板</a></div><div id="roster-preview"></div>`, btn('取消', 'close-modal') + btn('确认导入', 'roster-confirm', 'check', 'primary', 'id="roster-confirm-btn" disabled'), true);
  const z = $('#roster-dropzone');
  if (z) {
    z.onclick = () => { if (!rosterBusy) $('#roster-files').click(); };
    z.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); z.click(); } };
    z.ondragover = e => { e.preventDefault(); z.classList.add('drag'); };
    z.ondragleave = () => z.classList.remove('drag');
    z.ondrop = e => { e.preventDefault(); z.classList.remove('drag'); if (!rosterBusy) loadRosterFile(e.dataTransfer.files[0]); };
    $('#roster-files').onchange = e => loadRosterFile(e.target.files[0]);
  }
  renderRosterPreview();
}

async function loadRosterFile(file) {
  if (!file) return;
  if (!/\.(xlsx|csv)$/i.test(file.name)) { toast('请选择 .xlsx 或 .csv 文件。'); return; }
  if (file.size > 5 * 1024 * 1024) { toast('文件超过 5 MB，请精简名单后重试。'); return; }
  rosterBusy = true; rosterFileName = file.name; rosterPlan = null;
  renderRosterPreview();
  try {
    const buffer = await file.arrayBuffer();
    const book = await RosterImport.readWorkbook(buffer, file.name);
    rosterPlan = RosterImport.planImport(book.rows, state.students);
  } catch (e) {
    rosterPlan = { fatal: e && e.message ? e.message : '文件解析失败', items: [], summary: { add: 0, update: 0, error: 0 } };
  }
  rosterBusy = false;
  renderRosterPreview();
  if (rosterPlan.fatal) toast('解析失败：' + rosterPlan.fatal);
}

function renderRosterPreview() {
  const box = $('#roster-preview');
  if (!box) return;
  const button = $('#roster-confirm-btn');
  if (!rosterFileName) { box.innerHTML = ''; if (button) button.disabled = true; return; }
  if (rosterBusy || !rosterPlan) { box.innerHTML = `<div class="alert neutral">${icon('clock')}正在解析 ${esc(rosterFileName)}…</div>`; if (button) button.disabled = true; return; }
  if (rosterPlan.fatal) { box.innerHTML = `<div class="alert">${icon('alert')}${esc(rosterPlan.fatal)}</div>`; if (button) button.disabled = true; return; }
  const s = rosterPlan.summary;
  const shown = rosterPlan.items.slice(0, 200);
  box.innerHTML = `<div class="roster-summary"><b>${esc(rosterFileName)}</b><span>共 ${rosterPlan.items.length} 行</span><span class="ok">新增 ${s.add}</span><span class="upd">更新 ${s.update}</span><span class="err">跳过 ${s.error}</span></div><div class="roster-table-wrap"><table><thead><tr><th>行</th><th>姓名</th><th>学号</th><th>当前阶段</th><th>动作</th><th>提示</th></tr></thead><tbody>${shown.map(it => {
    const tag = it.action === 'error' ? `<span class="pill red">错误</span>` : it.action === 'add' ? `<span class="pill green">新增</span>` : `<span class="pill blue">更新</span>`;
    const tip = [it.error, ...(it.warnings || [])].filter(Boolean).join('；') || '—';
    return `<tr class="${it.action === 'error' ? 'roster-row-error' : ''}"><td>${it.row}</td><td>${esc(it.name || '—')}</td><td>${esc(it.number || '—')}</td><td>${esc(it.stageText || '—')}</td><td>${tag}</td><td class="roster-tip">${esc(tip)}</td></tr>`;
  }).join('')}</tbody></table></div>${rosterPlan.items.length > shown.length ? `<p class="roster-note">仅显示前 200 行，其余 ${rosterPlan.items.length - shown.length} 行仍按相同规则导入。</p>` : ''}<p class="roster-note">更新仅覆盖 Excel 中填写了内容的单元格，留空单元格保留系统原值${s.error ? '；错误行将被跳过' : ''}。</p>`;
  if (button) { button.disabled = rosterBusy || (s.add + s.update === 0); button.textContent = `确认导入（新增 ${s.add} · 更新 ${s.update}）`; }
}

function uniqueStudentId(number) {
  let id = 'IMP-' + number, n = 1;
  while (state.students.some(s => s.id === id)) { n++; id = 'IMP-' + number + '-' + n; }
  return id;
}

function confirmRoster() {
  if (rosterBusy || !rosterPlan || rosterPlan.fatal) return;
  let added = 0, updated = 0;
  for (const it of rosterPlan.items) {
    if (it.action === 'error') continue;
    if (it.action === 'add') {
      const dates = { application: '', applicationTalk: '', active: '', development: '', admitted: '', regularized: '' };
      Object.assign(dates, it.data.dates);
      state.students.push({ id: uniqueStudentId(it.data.number), name: it.data.name, number: it.data.number, college: it.data.college || '', branch: it.data.branch || '', stage: it.data.stage, dates, flow: 0, status: '待审核', checked: false, docs: [], process: Q.defaultProcess(), overrides: {}, feedback: '', revision: 1, birthDate: it.data.birthDate || '' });
      added++;
    } else {
      const st = state.students.find(x => x.number === it.data.number);
      if (!st) continue;
      st.name = it.data.name || st.name;
      if ('college' in it.data) st.college = it.data.college;
      if ('branch' in it.data) st.branch = it.data.branch;
      if ('stage' in it.data) st.stage = it.data.stage;
      if ('birthDate' in it.data) st.birthDate = it.data.birthDate;
      for (const [k, v] of Object.entries(it.data.dates)) st.dates[k] = v;
      st.overrides = {};
      st.revision++;
      Q.ensureProcess(st);
      if (st.checked) st.status = openIssues(st).length || !Q.stageGates(st, state.rules).complete ? '需补正' : '待复核';
      updated++;
    }
  }
  const errs = rosterPlan.items.filter(it => it.action === 'error').map(it => ({ row: it.row, name: it.name || '', number: it.number || '', error: it.error || '未知原因' }));
  rosterErrorRows = errs.length ? { file: rosterFileName, rows: errs } : null;
  const skipped = errs.length;
  const detail = errs.slice(0, 8).map(e => `第${e.row}行：${e.error}`).join('；') + (errs.length > 8 ? '；等' : '');
  log('导入学生名单', '文件 ' + rosterFileName + ' · 新增 ' + added + ' 人，更新 ' + updated + ' 人，跳过 ' + skipped + ' 行' + (detail ? '（' + detail + '）' : ''));
  persist();
  closeModal();
  search = ''; stageFilter = ''; statusFilter = ''; pageNo = 1;
  go('review');
  toast(`导入完成：新增 ${added} 人，更新 ${updated} 人${skipped ? '，跳过 ' + skipped + ' 行' : ''}。`);
  if (rosterErrorRows) rosterErrorModal();
}

function rosterErrorModal() {
  if (!rosterErrorRows) return;
  const errs = rosterErrorRows.rows;
  modal('导入结果 · ' + errs.length + ' 行未导入', `<div class="alert">${icon('alert')}以下 ${errs.length} 行因信息缺失或有误没有写入系统；同一文件中已成功的行不受影响。</div><div class="roster-table-wrap"><table><thead><tr><th>行</th><th>姓名</th><th>学号</th><th>原因</th></tr></thead><tbody>${errs.map(e => `<tr class="roster-row-error"><td>${e.row}</td><td>${esc(e.name || '—')}</td><td>${esc(e.number || '—')}</td><td class="roster-tip">${esc(e.error)}</td></tr>`).join('')}</tbody></table></div><p class="roster-note">按提示修正 Excel 后重新导入即可；已存在的学号会走更新，不会重复新增。</p>`, btn('关闭', 'close-modal') + btn('复制未导入清单', 'copy-roster-errors', 'copy') + btn('下载 CSV', 'download-roster-errors', 'download', 'primary'), true);
}

async function downloadOriginal() {
  const d=student().docs.find(d=>d.id===docId);if(!d?.archiveId)return;
  try { const file=await readArchiveFile(d.archiveId);const blob=new Blob([file.bytes]);const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=d.originalFilename||d.title;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000); }
  catch { toast(staticMode?'无法读取原件，浏览器本地归档可能已被清理。':'无法读取原件，请检查归档服务和 data/archive 目录。'); }
}
let runBusy=false;
async function run(students){if(!students.length){toast('当前筛选下没有学生。');return;}runBusy=true;modal('正在运行辅助校验',`<p class="subtitle">校验 ${students.length} 名学生的材料、日期与阶段闸门</p><div class="progress"><i id="run-progress" style="width:0%"></i></div><div id="run-steps">${['核对分阶段材料清单','比较关键日期与培养周期','检查形式字段与文本占位','汇总问题与程序闸门'].map((s,i)=>`<div class="progress-step" id="step-${i}">${icon('clock')}${s}</div>`).join('')}</div>`);for(let i=0;i<4;i++){await new Promise(r=>setTimeout(r,260));$('#run-progress').style.width=(i+1)*25+'%';$('#step-'+i).classList.add('done');}for(const s of students){Q.ensureProcess(s);s.checked=true;s.status=openIssues(s).length||!Q.stageGates(s,state.rules).complete?'需补正':'待复核';}log('运行辅助校验',students.length===1?students[0].name+' · '+openIssues(students[0]).length+'项问题 / '+Q.stageGates(students[0],state.rules).blocking.length+'项闸门待核对':students.length+'名学生 · 批次校验完成');runBusy=false;closeModal();render();toast('校验完成，结果已关联到材料、问题中心和程序闸门。');}
function download(name,text,type='text/plain;charset=utf-8'){const b=new Blob([text],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function csv(rows){return '\uFEFF'+rows.map(r=>r.map(x=>'"'+String(x??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');}
let pendingImport=null;
async function buildBackupPayload(){
  const archive=[];let skipped=0;
  try{const result=await listArchiveEntries();for(const entry of result.entries){try{const file=await readArchiveFile(entry.id);archive.push({entry,base64:uploadBase64(file.bytes)});}catch{skipped++;}}}catch{}
  return {backup:{app:'青禾 · 发展党员材料审核工作台',format:'qinghe-backup',formatVersion:1,exportedAt:new Date().toISOString(),state,archive},skipped};
}
async function exportBackup(){
  try{
    toast('正在整理导出数据…');
    const {backup,skipped}=await buildBackupPayload();
    const text=JSON.stringify(backup,null,2);
    const sizeMb=text.length/1024/1024;
    download('qinghe-data-'+new Date().toLocaleDateString('sv-SE')+'.json',text,'application/json');
    toast('已导出数据：'+sizeMb.toFixed(2)+' MB'+(backup.archive.length?' · 含 '+backup.archive.length+' 份原件':'')+(skipped?' · '+skipped+' 份原件读取失败':''));
  }catch(e){toast('导出失败：'+(e.message||'未知错误'));}
}
function normalizeImportedState(next){if(!next||next.version!==3||!Array.isArray(next.students))return null;if(!next.students.every(s=>s&&typeof s.id==='string'&&typeof s.name==='string'&&Array.isArray(s.docs)))return null;next.rules={...Q.DEFAULT_RULES,...(next.rules||{})};next.ruleHistory=Array.isArray(next.ruleHistory)?next.ruleHistory:[];next.logs=Array.isArray(next.logs)?next.logs:[];next.students.forEach(Q.ensureProcess);return next;}
function pickImportFile(){let input=$('#qinghe-import-file');if(!input){input=document.createElement('input');input.type='file';input.id='qinghe-import-file';input.accept='.json,application/json';input.hidden=true;input.addEventListener('change',()=>{const file=input.files&&input.files[0];input.value='';if(file)loadImportFile(file);});document.body.appendChild(input);}input.click();}
async function loadImportFile(file){
  if(file.size>300*1024*1024){toast('文件超过 300 MB，演示版不支持导入。');return;}
  let data;try{data=JSON.parse(await file.text());}catch{toast('文件不是有效的 JSON，请选择由本系统「导出数据」生成的文件。');return;}
  const backup=data&&data.format==='qinghe-backup'?data:null;
  const next=normalizeImportedState(backup?backup.state:data);
  if(!next){toast('数据格式不符：未找到 version=3 的学生数据，请确认文件来自本系统「导出数据」。');return;}
  const archive=Array.isArray(backup?.archive)?backup.archive.filter(item=>item&&item.entry&&typeof item.base64==='string'):[];
  pendingImport={state:next,archive,exportedAt:backup?.exportedAt||'',fileName:file.name};
  const docs=next.students.reduce((n,student)=>n+(Array.isArray(student.docs)?student.docs.length:0),0);
  modal('导入数据 · 确认恢复',`<div class="alert">${icon('alert')}<span>导入将<b>覆盖当前浏览器的全部审核数据</b>（学生、材料、规则、日志${archive.length?'，以及本地归档原件':'；该文件不含原件，导入后会清空当前浏览器的本地归档原件'}）。建议先导出当前数据留作备份。</span></div><div class="rule-body"><p>文件：${esc(file.name)}</p><p>导出时间：${esc(backup?.exportedAt?new Date(backup.exportedAt).toLocaleString('zh-CN'):'未记录（旧版数据文件）')}</p><p>学生 ${next.students.length} 人 · 材料 ${docs} 份 · 日志 ${next.logs.length} 条${archive.length?' · 原件 '+archive.length+' 份':''}</p></div>`,btn('取消','close-modal')+btn('确认导入并覆盖','confirm-import','upload','primary'));
}
async function restoreBackupData(nextState,archiveItems){
  const idMap={};
  if(staticMode)await LocalArchive.clear();
  for(const item of archiveItems){
    try{
      if(staticMode){await LocalArchive.restore(item.entry,item.base64);idMap[item.entry.id]=item.entry.id;}
      else{const result=await addArchiveEntry({studentId:item.entry.studentId,studentName:item.entry.studentName,studentNumber:item.entry.studentNumber,type:item.entry.type,filename:item.entry.filename,date:item.entry.date,evidence:item.entry.evidence,base64:item.base64});if(result?.entry?.id)idMap[item.entry.id]=result.entry.id;}
    }catch{}
  }
  state=nextState;
  if(Object.keys(idMap).length)state.students.forEach(s=>s.docs.forEach(d=>{if(d.archiveId&&idMap[d.archiveId]&&idMap[d.archiveId]!==d.archiveId)d.archiveId=idMap[d.archiveId];}));
  return state;
}
async function applyPendingImport(){
  if(!pendingImport)return;
  const pending=pendingImport;
  try{
    await restoreBackupData(pending.state,pending.archive);
    persist();
    pendingImport=null;
    selected=state.students[0]?.id||'';search='';stageFilter='';statusFilter='';pageNo=1;detailTab='materials';docId='';
    closeModal();go('dashboard');
    log('导入数据','文件 '+pending.fileName+' · 学生 '+state.students.length+' 人'+(pending.archive.length?' · 原件 '+pending.archive.length+' 份':''));
    toast('导入完成：已恢复 '+state.students.length+' 名学生的数据'+(pending.archive.length?'，含 '+pending.archive.length+' 份原件':'')+'。');
  }catch(e){toast('导入失败：'+(e.message||'未知错误'));}
}
let syncBusy=false;
function syncConfig(){const empty={token:'',gistId:'',autoPull:true,lastRemote:'',lastSyncedSignature:''};let stored={};try{const value=JSON.parse(localStorage.getItem(SYNC_KEY));if(value&&typeof value==='object')stored=value;}catch{}const config={...empty,...stored};const built=runtimeWindow?.QINGHE_SYNC&&typeof runtimeWindow.QINGHE_SYNC==='object'?runtimeWindow.QINGHE_SYNC:null;if(built){if(built.token)config.token=String(built.token);if(built.gistId)config.gistId=normalizeGistId(built.gistId);if(typeof built.autoPull==='boolean')config.autoPull=built.autoPull;}return config;}
function saveSyncConfig(next){try{localStorage.setItem(SYNC_KEY,JSON.stringify(next));}catch{}}
function syncSignature(value){const text=JSON.stringify({students:value.students,rules:value.rules,ruleHistory:value.ruleHistory});let h1=0x811c9dc5,h2=0x9e3779b9;for(let i=0;i<text.length;i++){const code=text.charCodeAt(i);h1=Math.imul(h1^code,16777619);h2=Math.imul(h2+code,2246822519);}return (h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0')+'-'+text.length;}
function normalizeGistId(value){const text=String(value||'').trim();if(!text)return '';const match=text.match(/([a-f0-9]{20,})/i);if(match)return match[1];return text.split('/').filter(Boolean).pop()||'';}
function captureSyncInputs(){return syncConfig();}
async function githubFetch(pathname,options={}){
  const config=syncConfig();
  if(!config.token)throw new Error('请先填写 GitHub Token。');
  const response=await fetch('https://api.github.com'+pathname,{method:options.method||'GET',headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+config.token,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:options.body});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    if(response.status===401)throw new Error('Token 无效或已过期');
    if(response.status===404)throw new Error('Gist 不存在，请核对 Gist ID 和 Token 权限');
    throw new Error(data.message||('GitHub 接口错误 '+response.status));
  }
  return data;
}
async function findCloudGist(){
  for(let page=1;page<=5;page++){
    const gists=await githubFetch('/gists?per_page=100&page='+page);
    if(!Array.isArray(gists)||!gists.length)return null;
    const found=gists.find(gist=>gist&&gist.files&&gist.files['qinghe-data.json']);
    if(found)return found;
    if(gists.length<100)return null;
  }
  return null;
}
function syncSettingsPanel(){
  const config=syncConfig();
  const hasToken=!!config.token;
  const syncing=!!(config.token&&config.gistId);
  const dirty=!!(syncing&&(!config.lastSyncedSignature||syncSignature(state)!==config.lastSyncedSignature));
  const last=config.lastRemote?new Date(config.lastRemote).toLocaleString('zh-CN'):'尚未同步';
  return `<section class="panel sync-panel"><div class="panel-head"><h2>云端同步 · GitHub Gist</h2><small>${syncing?'自动拉取 · 手动上传':hasToken?'首次上传会创建 Gist':'未配置'}</small></div><div class="rule-body">${hasToken?'':'<div class="alert">'+icon('alert')+'<span>尚未配置云端同步。请打开网站目录中的 <b>sync-config.js</b>，填写 token 和 gistId 后重新上传到 GitHub；所有设备会共用这一份配置。</span></div>'}<p>所有设备共用程序内置的 GitHub 账户：打开网页时自动拉取最新数据；修改完成后点「上传到云端」保存，另一台设备刷新即可看到。</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin:18px 0">${btn('上传到云端','sync-upload','upload','primary',hasToken?'':'disabled')}${dirty?btn('拉取云端覆盖本地','sync-pull','download','small'):''}</div><p class="minor-label">状态：${hasToken?'Token 已内置':'未配置 Token'} · ${config.gistId?'Gist '+esc(config.gistId.slice(0,10))+'…':'首次上传时自动查找或创建云端备份'} · 最近同步：${esc(last)}${dirty?' · <b>本地有未上传修改</b>':''}</p><p class="minor-label">Token 写在 sync-config.js 中并随网站公开，请只使用仅含 Gists 读写权限的专用账号 Token，并设置有效期；云端文件含材料正文，请只放演示数据。</p></div></section>`;
}
async function uploadCloud(force=false){
  const config=captureSyncInputs();
  if(!config.token){toast('请先在“云端同步”中填写 GitHub Token。');return;}
  if(syncBusy){toast('正在同步，请稍候。');return;}
  syncBusy=true;
  try{
    if(!config.gistId){
      const existing=await findCloudGist();
      if(existing){config.gistId=existing.id;const stored=syncConfig();stored.gistId=existing.id;saveSyncConfig(stored);}
    }
    if(config.gistId&&!force){
      const remote=await githubFetch('/gists/'+config.gistId);
      if(remote.updated_at&&remote.updated_at!==config.lastRemote){
        modal('云端已有更新',`<p>云端 Gist 在另一台设备上更新过（${esc(new Date(remote.updated_at).toLocaleString('zh-CN'))}）。继续上传会用当前浏览器的数据覆盖云端。</p><p class="subtitle">建议先取消并点「从云端拉取」核对；确认当前浏览器数据才是最新时再上传。</p>`,btn('取消','close-modal')+btn('仍然上传','sync-upload-force','upload','primary'));
        return;
      }
    }
    toast('正在上传到云端…');
    const {backup,skipped}=await buildBackupPayload();
    const content=JSON.stringify(backup);
    let gist;
    if(config.gistId)gist=await githubFetch('/gists/'+config.gistId,{method:'PATCH',body:JSON.stringify({files:{'qinghe-data.json':{content}}})});
    else gist=await githubFetch('/gists',{method:'POST',body:JSON.stringify({description:'青禾工作台云端备份（私有，请勿公开）',public:false,files:{'qinghe-data.json':{content}}})});
    const next=syncConfig();
    const created=!config.gistId;
    next.token=config.token;next.gistId=gist.id||config.gistId;next.autoPull=config.autoPull;next.lastRemote=gist.updated_at||new Date().toISOString();next.lastSyncedSignature=syncSignature(state);
    saveSyncConfig(next);
    log('上传云端备份','Gist '+(next.gistId||'').slice(0,10)+'… · '+(content.length/1024).toFixed(0)+' KB'+(skipped?' · '+skipped+' 份原件读取失败':''));
    render();
    toast(created?'已创建私有 Gist：'+next.gistId+'。其他设备使用同一个 Token 打开网页会自动找到它，无需再填 Gist ID。':'已上传到云端（'+(content.length/1024).toFixed(0)+' KB）。另一台设备打开网页会自动拉取。');
  }catch(e){toast('云端上传失败：'+e.message);}
  finally{syncBusy=false;}
}
async function pullCloud(options={}){
  const manual=!!options.manual;
  const config=captureSyncInputs();
  if(!config.token){if(manual)toast('尚未配置云端同步，请先在 sync-config.js 中填写 Token。');return false;}
  if(syncBusy){if(manual)toast('正在同步，请稍候。');return false;}
  syncBusy=true;
  try{
    let gist;
    if(config.gistId)gist=await githubFetch('/gists/'+config.gistId);
    else{
      gist=await findCloudGist();
      if(!gist){if(manual)toast('云端还没有备份，请先点「上传到云端」创建。');return false;}
      const stored=syncConfig();stored.gistId=gist.id;saveSyncConfig(stored);
    }
    if(!manual&&config.lastRemote&&gist.updated_at===config.lastRemote)return false;
    const file=gist.files&&gist.files['qinghe-data.json'];
    if(!file)throw new Error('Gist 中没有 qinghe-data.json');
    let content=file.content||'';
    if(file.truncated&&file.raw_url){const response=await fetch(file.raw_url,{headers:{'Authorization':'Bearer '+config.token}});if(!response.ok)throw new Error('读取云端文件失败');content=await response.text();}
    let data;try{data=JSON.parse(content);}catch{throw new Error('云端文件不是有效的 JSON');}
    const backup=data&&data.format==='qinghe-backup'?data:null;
    const next=normalizeImportedState(backup?backup.state:data);
    if(!next)throw new Error('云端数据格式不符');
    const archive=Array.isArray(backup?.archive)?backup.archive.filter(item=>item&&item.entry&&typeof item.base64==='string'):[];
    const localChanged=!config.lastSyncedSignature||syncSignature(state)!==config.lastSyncedSignature;
    if(localChanged&&!options.force){
      if(manual)modal('本地有未上传修改',`<p>当前浏览器有尚未上传到云端的修改。用云端数据覆盖会丢失这些修改。</p><p class="subtitle">云端更新：${esc(gist.updated_at?new Date(gist.updated_at).toLocaleString('zh-CN'):'未知')} · 学生 ${next.students.length} 人 · 原件 ${archive.length} 份</p>`,btn('取消','close-modal')+btn('用云端覆盖本地','sync-pull-force','download','primary'));
      else toast('云端有较新数据，但本地也有未上传的修改；请到「审核规则库 → 云端同步」手动拉取。');
      return false;
    }
    await restoreBackupData(next,archive);
    try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}
    const nextConfig=syncConfig();
    nextConfig.lastRemote=gist.updated_at||new Date().toISOString();
    nextConfig.lastSyncedSignature=syncSignature(state);
    saveSyncConfig(nextConfig);
    selected=state.students[0]?.id||'';search='';stageFilter='';statusFilter='';pageNo=1;detailTab='materials';docId='';
    log('从云端拉取','学生 '+state.students.length+' 人 · 原件 '+archive.length+' 份');
    closeModal();render();
    toast('已从云端拉取最新数据'+(archive.length?'，含 '+archive.length+' 份原件':'')+'。');
    return true;
  }catch(e){if(manual)toast('云端拉取失败：'+e.message);return false;}
  finally{syncBusy=false;}
}
async function syncAutoPull(){
  const config=syncConfig();
  if(!config.token||config.autoPull===false)return;
  await pullCloud({manual:false});
}
const actions={
 nav:e=>go(e.dataset.page),menu:()=>{mobile=!mobile;render();},pagination:e=>{pageNo=Number(e.dataset.page);render();},stage:e=>{stageFilter=e.dataset.stage;statusFilter='';search='';go('review');},open:e=>{selected=e.dataset.id;docId='';detailTab='materials';go('detail');},'detail-tab':e=>{detailTab=e.dataset.tab;render();},'issue-filter':e=>{issueFilter=e.dataset.filter;render();},'close-modal':closeModal,login:async()=>{const u=($('#login-user')?.value||'').trim(),p=$('#login-pass')?.value||'';const fail=m=>{const err=$('#login-error');if(err)err.textContent=m;};if(!u||!p){fail('请输入账号和密码。');return;}const done=a=>{authUser={user:a.user,name:a.name};try{localStorage.setItem(AUTH_KEY,JSON.stringify({user:a.user,name:a.name,at:new Date().toISOString()}));}catch{}log('登录系统','账号 '+a.user);render();hydrateWorkspace();syncAutoPull();toast('欢迎回来，'+(a.name||a.user)+'。');};try{if(staticMode)throw new Error('static');const r=await fetch(apiUrl('/api/login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:u,password:p})});if(r.ok){done(await r.json());return;}if(r.status===401){fail('账号或密码不正确，请核对后重试。');return;}throw new Error('api');}catch{const acc=await localVerify(u,p);if(acc){done(acc);return;}fail('账号或密码不正确，请核对后重试。');}},register:async()=>{const name=($('#reg-name')?.value||'').trim(),user=($('#reg-user')?.value||'').trim(),p1=$('#reg-pass')?.value||'',p2=$('#reg-pass2')?.value||'';const fail=m=>{const err=$('#reg-error');if(err)err.textContent=m;};if(!name){fail('请填写姓名。');return;}if(!/^[A-Za-z0-9_]{3,20}$/.test(user)){fail('账号需为 3—20 位字母、数字或下划线。');return;}if(p1.length<6){fail('密码至少 6 位。');return;}if(p1!==p2){fail('两次输入的密码不一致。');return;}if(staticMode){try{const acc=await localRegister({name,user,password:p1});regPrefill=acc.user;loginMode='login';render();toast('注册成功：账号已保存在当前浏览器，请使用新账号登录。');}catch(e){fail(e.message||'注册失败，请稍后重试。');}return;}try{const r=await fetch(apiUrl('/api/register'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user,name,password:p1})});if(r.ok){const d=await r.json().catch(()=>({}));regPrefill=d.user||user;loginMode='login';render();toast('注册成功，请使用新账号登录。');return;}const d=await r.json().catch(()=>({}));fail(d.error||'注册失败，请稍后重试。');}catch{if(!configuredApiBase){staticMode=true;apiEnabled=false;try{const acc=await localRegister({name,user,password:p1});regPrefill=acc.user;loginMode='login';render();toast('注册成功：账号已保存在当前浏览器，请使用新账号登录。');}catch(e){fail(e.message||'注册失败，请稍后重试。');}return;}fail('注册服务不可用：请使用新版 node server.mjs 启动项目。');}},'login-mode':e=>{loginMode=e.dataset.mode==='register'?'register':'login';render();},logout:()=>{fetch(apiUrl('/api/logout'),{method:'POST'}).catch(()=>{});try{localStorage.removeItem(AUTH_KEY);}catch{}authUser=null;workspaceConfigured=false;page='dashboard';mobile=false;render();toast('已退出登录。');},'roster-import':rosterModal,'roster-confirm':confirmRoster,'copy-roster-errors':async()=>{if(!rosterErrorRows)return;const t=rosterErrorRows.rows.map(e=>'第'+e.row+'行\t'+(e.name||'（无姓名）')+'\t'+(e.number||'')+'\t'+e.error).join('\n');try{await navigator.clipboard.writeText(t);toast('未导入清单已复制。');}catch{toast('复制失败，请改用下载 CSV。');}},'download-roster-errors':()=>{if(!rosterErrorRows)return;download('未导入名单行.csv',csv([['行号','姓名','学号','原因'],...rosterErrorRows.rows.map(e=>[e.row,e.name,e.number,e.error])]),'text/csv;charset=utf-8');},upload:uploadModal,'confirm-upload':confirmUpload,'remove-upload':e=>{uploads.splice(Number(e.dataset.index),1);renderUploadQueue();},'archive-reconnect':refreshArchiveConnection,'sync-archive':syncArchiveRecords,'download-original':downloadOriginal,'archive-apply-student':()=>{const id=$('#archive-default-student').value;if(!id)return;for(const u of uploads)if(!u.studentId&&!u.saved){u.studentId=id;u.manual=true;}renderUploadQueue();},'run-all':()=>run(state.students),'run-one':()=>run([student()]),'run-filter':()=>run(filtered()),feedback,'edit-doc':editDoc,
 locate:e=>{selected=e.dataset.id;docId=e.dataset.doc;detailTab=e.dataset.category==='时间逻辑'?'timeline':e.dataset.category==='材料缺项'?'checklist':'materials';go('detail');},
 'save-doc':()=>{const s=student(),d=s.docs.find(d=>d.id===docId),title=$('#edit-title').value.trim();if(!title){toast('\u6750\u6599\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a\u3002');return;}d.title=title;d.date=$('#edit-date').value;d.text=$('#edit-text').value;d.signed=$('#edit-signed').value==='unknown'?null:$('#edit-signed').value==='yes';d.stamped=$('#edit-stamped').value==='unknown'?null:$('#edit-stamped').value==='yes';d.source=d.source==='sample'?'sample':'manual';d.extractionStatus=d.text.trim()?'extracted':'empty';d.extractionMethod='manual';d.extractionError='';d.extractionWarnings=[];d.extractedAt=new Date().toISOString();d.reviewed=true;s.overrides={};s.revision++;s.checked=true;s.status=openIssues(s).length?'\u9700\u8865\u6b63':'\u5f85\u590d\u6838';log('\u6821\u5bf9\u63d0\u53d6\u7ed3\u679c',s.name+' · '+d.title+' · \u7b2c'+s.revision+'\u7248');closeModal();render();toast('\u63d0\u53d6\u7ed3\u679c\u5df2\u66f4\u65b0\uff1b\u8be5\u6750\u6599\u5df2\u8bb0\u5f55\u4e3a\u4eba\u5de5\u6838\u9a8c\uff0c\u5e76\u91cd\u65b0\u8ba1\u7b97\u6821\u9a8c\u7ed3\u679c\u3002');},
 'save-dates':()=>{const s=student(),talk=$('#date-applicationTalk')?.value||'';for(let i=0;i<=s.stage;i++){const k=Q.DATE_KEYS[i],v=$('#date-'+k).value;if(!Q.validDate(v)){toast('请填写完整有效的阶段日期。');return;}}if(talk&&!Q.validDate(talk)){toast('申请后谈话日期格式无效，请对照原件核对。');return;}for(let i=0;i<=s.stage;i++){const k=Q.DATE_KEYS[i];s.dates[k]=$('#date-'+k).value;}s.dates.applicationTalk=talk;s.overrides={};s.revision++;s.checked=true;s.status=openIssues(s).length?'需补正':'待复核';log('校对时间节点',s.name+' · 日期已更新，待按原件复核');render();toast('日期已保存，时间规则已重新计算。')},
 'save-gates':()=>{const s=student(),p=Q.ensureProcess(s);const bool=id=>$('#gate-'+id)?.value==='true';const num=id=>Math.max(0,Number($('#gate-'+id)?.value||0));p.applicationTalkRecorded=bool('applicationTalkRecorded');if(s.stage>=1)p.activeInspectionCount=num('activeInspectionCount');if(s.stage>=2){p.opinionsReview=bool('opinionsReview');p.politicalReview=bool('politicalReview');p.introducers=Math.min(2,num('introducers'));p.trainingDays=num('trainingDays');p.trainingHours=num('trainingHours');}if(s.stage>=3){p.preReview=bool('preReview');p.publicity=bool('publicity');p.organizationTalk=bool('organizationTalk');p.approval=bool('approval');p.acceptance=bool('acceptance');}if(s.stage>=4)p.probationReview=bool('probationReview');s.revision++;s.overrides={};s.status=Q.stageGates(s,state.rules).complete&&openIssues(s).length===0?'待复核':'需补正';log('更新程序闸门',s.name+' · 已保存 '+Q.stageGates(s,state.rules).passed+'/'+Q.stageGates(s,state.rules).checks.length+' 项');render();toast('程序核对结果已保存；未通过项仍需人工核对。');},
 handle:e=>{const s=state.students.find(x=>x.id===e.dataset.id),i=issues(s).find(x=>x.id===e.dataset.issue);selected=s.id;if(i.handled){delete s.overrides[i.id];s.status='需补正';log('重新打开问题',s.name+' · '+i.title);render();return;}modal('人工核实 · '+esc(i.title),`<p class="subtitle">${esc(i.detail)}</p><label class="form-group" style="margin-top:18px">核实依据或处理说明（必填）<textarea id="handle-note" class="field" placeholder="例如：已对照原件确认签字完整，属于提取遗漏。请说明实际核实依据。" maxlength="1000"></textarea></label><input type="hidden" id="handle-issue" value="${esc(i.id)}"><div class="alert neutral" style="margin-top:16px">${icon('help')}此操作记录人工处理意见；不会更改材料原文或自动决定发展资格。</div>`,btn('取消','close-modal')+btn('记录核实结果','save-handle','check','primary'));},
 'save-handle':()=>{const note=$('#handle-note').value.trim();if(!note){toast('请填写核实依据或处理说明。');return;}const s=student(),id=$('#handle-issue').value,i=issues(s).find(x=>x.id===id);s.overrides[id]=note;if(i?.docId){const d=s.docs.find(x=>x.id===i.docId);if(d&&d.source!=='registered'&&d.text?.trim())d.reviewed=true;}s.status=openIssues(s).length?'需补正':'待复核';log('人工核实问题',s.name+' · '+note);closeModal();render();toast('核实意见已留痕；材料状态已按人工核验结果更新。');},
 'confirm-review':()=>{const s=student(),g=Q.stageGates(s,state.rules);if(!canConfirm(s)||!g.complete){toast('请先完成材料核验和当前阶段程序闸门。');return;}modal('确认本环节材料',`<p>学生：${esc(s.name)}（虚拟）</p><p class="subtitle">当前环节：${Q.FLOW[s.flow]}。材料和程序闸门均已满足确认条件。</p><label class="form-group" style="margin-top:18px">人工审核意见<textarea id="review-note" class="field" placeholder="填写本环节材料复核意见" maxlength="1000"></textarea></label>`,btn('取消','close-modal')+btn('确认并记录','save-review','check','primary'));},
 'save-review':()=>{const s=student(),note=$('#review-note').value.trim();if(!note){toast('请填写审核意见。');return;}if(!canConfirm(s)||!Q.stageGates(s,state.rules).complete){toast('材料或程序闸门尚未满足人工确认条件，请先完成当前阶段核对。');return;}const prev=Q.FLOW[s.flow];s.flow=Math.min(4,s.flow+1);s.status=s.flow===4?'材料已确认':'待复核';s.docs.forEach(d=>{if(d.source!=='registered'&&d.text?.trim())d.reviewed=true;});log('人工确认材料',s.name+' · '+prev+' · '+note);closeModal();render();toast('材料与程序闸门已确认，审核流程状态已更新。');},
 'submit-review':()=>{const s=student();s.flow=1;s.status='待复核';log('提交复核（演示）',s.name+' · 第'+s.revision+'版 · '+openIssues(s).length+'项供人工继续核对','演示学生');render();toast('已提交至演示复核队列，可在材料审核中查看。');},
 'save-rules':()=>{const a=Number($('#rule-active').value),p=Number($('#rule-probation').value),name=$('#rule-name').value.trim(),version=$('#rule-version').value.trim(),effective=$('#rule-effective').value,status=$('#rule-status').value,owner=$('#rule-owner').value.trim(),note=$('#rule-note').value.trim();if(!name||!version||!owner||!Q.validDate(effective)){toast('请完整填写规则名称、版本号、生效日期和维护部门。');return;}if(!Number.isInteger(a)||!Number.isInteger(p)||a<1||p<1||a>60||p>60){toast('周期须为1—60之间的整数月。');return;}const previous={...state.rules};state.rules={...Q.DEFAULT_RULES,...state.rules,ruleName:name,ruleVersion:version,effectiveFrom:effective,versionStatus:status,owner,changeNote:note,activeMonths:a,probationMonths:p,checkSignature:$('#rule-signature').checked,checkTerms:$('#rule-terms').checked};state.ruleHistory.unshift({savedAt:new Date().toISOString(),version:previous.ruleVersion||'未知',status:previous.versionStatus||'未知',ruleName:previous.ruleName||'旧配置',effectiveFrom:previous.effectiveFrom||'',owner:previous.owner||'',snapshot:previous});state.students.forEach(s=>{s.overrides={};if(s.checked)s.status=openIssues(s).length||!Q.stageGates(s,state.rules).complete?'需补正':'待复核';});log('更新规则配置',state.rules.ruleName+' · '+state.rules.ruleVersion+' · '+state.rules.versionStatus);render();toast('规则版本已保存并留痕，学生结果已按新配置重新计算。');},
 'copy-feedback':async()=>{const t=$('#feedback-text');student().feedback=t.value;persist();try{await navigator.clipboard.writeText(t.value);toast('整改清单已复制。');}catch{t.focus();t.select();toast('请按 Ctrl+C 或 Command+C 复制已选中的清单。');}},
 'download-feedback':()=>{student().feedback=$('#feedback-text').value;persist();download('整改清单-'+student().name+'.txt',student().feedback);},
 'export-csv':()=>download('青禾-学生材料清单.csv',csv([['姓名（虚拟）','学号','学院','发展阶段','材料已登记','材料要求','待处理问题','材料核验状态','审核流程状态'],...filtered().map(s=>[s.name,s.number,s.college,Q.STAGES[s.stage],Q.completeness(s).actual,Q.completeness(s).expected,s.checked?openIssues(s).length:'待校验',Q.materialStatus(s,state.rules),s.status])]),'text/csv;charset=utf-8'),
 'export-issues':()=>download('青禾-待处理问题.csv',csv([['学生（虚拟）','类别','问题','详情','建议','规则依据'],...allOpen().map(i=>[state.students.find(s=>s.id===i.studentId).name,i.category,i.title,i.detail,i.suggestion,i.rule])]),'text/csv;charset=utf-8'),
 'export-data':()=>exportBackup(),
 'sync-upload':()=>uploadCloud(false),
 'sync-upload-force':()=>uploadCloud(true),
 'sync-pull':()=>pullCloud({manual:true}),
 'sync-pull-force':()=>pullCloud({manual:true,force:true}),
 'import-data':()=>pickImportFile(),
 'confirm-import':()=>applyPendingImport(),
 'export-logs':()=>download('青禾-审核日志.csv',csv([['时间','操作人','操作','详情'],...state.logs.map(l=>[l.at,l.who,l.action,l.detail])]),'text/csv;charset=utf-8'),
 reset:()=>modal('恢复初始演示',`<p>此操作将清除当前浏览器的材料导入、规则修改和审核记录，恢复12名虚拟学生。磁盘上的归档文件不会删除。</p><p class="subtitle">需要保留当前修改时，可先返回并导出演示数据。</p>`,btn('取消','close-modal')+btn('确认恢复','confirm-reset','history','primary')),
 'confirm-reset':()=>{state=Q.seed();persist();selected=state.students[0].id;search='';stageFilter='';statusFilter='';closeModal();go('dashboard');toast('已恢复初始演示数据。');},
 help:()=>modal('欢迎使用青禾工作台',`<div class="alert neutral">${icon('leaf')}发展党员材料审核 · 交互小样 v0.1</div><p>建议体验路径：</p><ol style="font-size:13px;line-height:2.2;color:#748571"><li>进入“材料审核”，打开虚拟学生 <b>林沐</b>。</li><li>查看时间逻辑、签字缺失与规范名称错字提示。</li><li>点击“定位材料”或“时间节点”查看依据。</li><li>校对提取结果、记录人工核实意见，生成整改清单。</li><li>进入“学生整改”，体验提交复核与操作留痕。</li></ol><p class="subtitle">样本、规则和审核身份均为虚构。自动归档匹配文件名和正文线索，保存原件并检测重复；TXT、DOCX 和可读 PDF 可提取正文，扫描件和图片依赖 Tesseract OCR。所有提取结果仍需人工核验；版式分析、大模型语义核查、账号权限及消息通知尚未接入。${staticMode?'审核状态与上传原件均保存在此浏览器，可在「审核规则库 → 数据备份与迁移」导出 JSON 备份。':'审核状态保存在此浏览器；上传原件与归档索引保存在本地项目 data/archive。'}</p>`,btn('开始体验','close-modal','arrow','primary'))
};
document.addEventListener('click',e=>{const t=e.target.closest('[data-action]');if(t&&!t.disabled){const fn=actions[t.dataset.action];if(fn)fn(t);}});
document.addEventListener('input',e=>{if(e.target.id==='student-search'){search=e.target.value;pageNo=1;render();}});
document.addEventListener('change',e=>{const t=e.target;if(t.id==='stage-filter'){stageFilter=t.value;pageNo=1;render();}if(t.id==='status-filter'){statusFilter=t.value;pageNo=1;render();}if(t.id==='doc-select'){docId=t.value;render();}if(t.id==='student-select'){selected=t.value;render();}if(t.id==='batch-select'){batch=t.value;toast('本小样仅包含一组虚拟记录。');}if(t.dataset.uploadIndex!==undefined&&t.dataset.archiveField){const u=uploads[Number(t.dataset.uploadIndex)];u[t.dataset.archiveField]=t.value;u.manual=true;renderUploadQueue();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if(e.key==='Enter'&&!authUser){if(['login-user','login-pass'].includes(e.target.id))actions.login();else if(['reg-name','reg-user','reg-pass','reg-pass2'].includes(e.target.id))actions.register();}if(e.key==='Tab'&&$('#modal-root .modal')){const list=[...document.querySelectorAll('#modal-root button:not(:disabled),#modal-root input:not([hidden]),#modal-root textarea,#modal-root select,[role="dialog"] [tabindex="0"]')].filter(x=>x.type!=='hidden');const first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&authUser)syncAutoPull();});
render();
if(authUser)hydrateWorkspace();
if(authUser)syncAutoPull();

