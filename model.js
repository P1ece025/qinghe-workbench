(function(root){
'use strict';
const MAT=root.QingheMaterials||(typeof module!=='undefined'&&typeof require==='function'?require('./materials.js'):null);
const STAGES=['申请入党','确定积极分子','确定发展对象','接收预备党员','预备党员转正'];
const FLOW=['学生自查','党支部初审','支部交叉互查','学院党委复审','学校组织部备案'];
const TYPES={application:'入党申请书',thought:'思想汇报',cultivation:'培养教育考察写实簿',autobiography:'自传',volunteer:'入党志愿书',regularization:'转正申请书'};
const DATE_KEYS=['application','active','development','admitted','regularized'];
const MATERIAL_STATUSES=['未提交','已归档','已提取','待人工核验','已核验','需补正','已确认'];
const RULE_SOURCES=[
 {id:'CCP-DEVELOP-2014',title:'《中国共产党发展党员工作细则》',issuer:'中共中央组织部',date:'2014-05-28',url:'https://www.ndrc.gov.cn/fggz/fgjh/djzc/201406/t20140612_1094764.html',note:'第七条、第十三条、第十四条、第十五条、第二十条等'},
 {id:'MOE-STUDENT-2017',title:'《普通高等学校学生党建工作标准》',issuer:'中共教育部党组',date:'2017-02-28',url:'http://ygb.hust.edu.cn/info/1015/5408.htm',note:'教育部党组教党〔2017〕8号，学校执行时应结合现行文件与本校制度'}
];
const PROCESS_REQUIREMENTS=[
 {id:'application-talk',stage:0,title:'收到入党申请书后 1 个月内谈话',mode:'可自动比对日期；谈话记录和谈话质量需人工核验',source:'CCP-DEVELOP-2014',clause:'第七条'},
 {id:'active-inspection',stage:1,title:'党支部每半年考察一次入党积极分子',mode:'考察次数、记录和意见由人工核对',source:'CCP-DEVELOP-2014',clause:'第十一条'},
 {id:'active-period',stage:2,title:'培养教育和考察一般应满 1 年以上',mode:'可自动比对起止日期；特殊情形由人工判断',source:'CCP-DEVELOP-2014',clause:'第十三条'},
 {id:'opinions-review',stage:2,title:'听取党小组、培养联系人、党员和群众意见并政治审查',mode:'必须人工核对意见记录和政审材料',source:'CCP-DEVELOP-2014',clause:'第十三条、第十六条'},
 {id:'introducers',stage:2,title:'确定 2 名正式党员作为入党介绍人',mode:'必须人工核对介绍人身份和意见',source:'CCP-DEVELOP-2014',clause:'第十四条'},
 {id:'training',stage:2,title:'发展对象集中培训一般不少于 3 天或 24 学时',mode:'培训记录和学时由人工核对',source:'CCP-DEVELOP-2014',clause:'第十五条'},
 {id:'political-standard',stage:2,title:'把政治标准放在首位，不把学习成绩作为唯一条件',mode:'必须人工综合研判，不做自动评分',source:'MOE-STUDENT-2017',clause:'学生党建工作标准相关要求'},
 {id:'approval-publicity',stage:3,title:'预审、公示、谈话、审批、接收等程序记录齐备',mode:'必须人工核对程序记录和审批权限',source:'MOE-STUDENT-2017',clause:'学生党建工作标准发展党员流程'},
 {id:'probation',stage:4,title:'预备党员预备期为 1 年',mode:'可自动比对日期；延期、取消资格等由人工判断',source:'CCP-DEVELOP-2014',clause:'第二十九条、第三十二条'}
];
const RULE_STATUSES=['草稿','已发布','已归档'];
const DEFAULT_RULES={schoolName:'示范大学',ruleName:'高校学生党建审核基线',activeMonths:12,probationMonths:12,applicationTalkDays:30,checkSignature:true,checkTerms:true,ruleVersion:'2026.10.17',versionStatus:'草稿',effectiveFrom:'2026-10-17',owner:'党委组织部',changeNote:'依据公开规章建立；学校材料数量和执行口径需按校内制度确认。',ruleSources:RULE_SOURCES.map(x=>x.id)};
function defaultProcess(){return {applicationTalkRecorded:false,activeInspectionCount:0,opinionsReview:false,politicalReview:false,introducers:0,trainingDays:0,trainingHours:0,preReview:false,publicity:false,organizationTalk:false,approval:false,acceptance:false,probationReview:false};}
function ensureProcess(s){s.process={...defaultProcess(),...(s.process||{})};return s.process;}
function seededProcess(stage){const p=defaultProcess();p.applicationTalkRecorded=true;if(stage>=1)p.activeInspectionCount=stage>=2?2:1;if(stage>=2){p.opinionsReview=true;p.politicalReview=true;p.introducers=2;p.trainingDays=3;}if(stage>=3){p.preReview=true;p.publicity=true;p.organizationTalk=true;p.approval=true;p.acceptance=true;}if(stage>=4)p.probationReview=true;return p;}
function required(stage){return [{type:'application',count:1,enforceCount:true,basis:'国家规章明确材料'},...(stage>=1?[{type:'thought',count:null,enforceCount:false,basis:'定期汇报；份数由学校党组织制度配置'},{type:'cultivation',count:1,enforceCount:true,basis:'培养教育考察记录'}]:[]),...(stage>=2?[{type:'autobiography',count:1,enforceCount:true,basis:'发展对象阶段材料'}]:[]),...(stage>=3?[{type:'volunteer',count:1,enforceCount:true,basis:'接收预备党员阶段材料'}]:[]),...(stage>=4?[{type:'regularization',count:1,enforceCount:true,basis:'转正阶段材料'}]:[])];}
function enforcedCount(req){return req.enforceCount===false||req.count==null?0:req.count;}
function sampleCount(req){return req.count==null&&req.type==='thought'?2:enforcedCount(req);}
function createDoc(type,i,student,date){
 const s=typeof student==='string'?{name:student}:student;
 const ctx={name:s.name,number:s.number||'',college:s.college||'',branch:s.branch||'',birthDate:s.birthDate||'',date,admitted:s.dates?.admitted||'',regularized:s.dates?.regularized||''};
 const title=MAT?MAT.title(type,i):TYPES[type]+(type==='thought'?'（第'+(i+1)+'篇）':'');
 const text=MAT?MAT.text(type,i,ctx):TYPES[type]+'\n\n姓名：'+ctx.name+'\n材料正文暂缺。';
 return {id:type+'-'+i,type,title,date,signed:true,stamped:true,reviewed:false,source:'sample',text};
}
function seed(){
 const names=['林沐','陈知远','许嘉宁','周予安','沈一禾','宋可欣','陆景行','顾思齐','苏星澜','江书言','唐亦可','程新语'];
 const stages=[2,3,1,4,2,0,1,3,4,2,0,1];
 const birthDates=['2005-03-12','2004-11-06','2005-01-25','2004-07-14','2005-01-03','2005-06-21','2004-10-09','2004-09-18','2005-05-27','2005-08-02','2005-02-16','2004-12-30'];
 const students=names.map((name,i)=>{
  const stage=stages[i];
  const number='2023'+String(i+1).padStart(9,'0');
  const college=i%3===0?'计算机学院':i%3===1?'信息管理学院':'文学院';
  const branch='本科生第'+(i%3+1)+'党支部';
  const birthDate=birthDates[i];
  const dates={application:'2023-09-10',applicationTalk:'2023-09-20',active:'2023-10-20',development:'2024-11-22',admitted:'2024-12-12',regularized:'2025-12-15'};
  for(let j=stage+1;j<5;j++)dates[DATE_KEYS[j]]='';
  const identity={name,number,college,branch,birthDate,dates};
  const docs=required(stage).flatMap(r=>Array.from({length:sampleCount(r)},(_,n)=>{
   let date;
   if(r.type==='application')date=dates.application;
   else if(r.type==='thought')date=addMonths(dates.active,n*3);
   else if(r.type==='autobiography')date=dates.development||dates.active;
   else if(r.type==='volunteer')date=dates.admitted;
   else if(r.type==='regularization')date=dates.regularized;
   else date=dates.active;
   return createDoc(r.type,n,identity,date||dates.application);
  }));
  return {id:'DEMO-'+String(i+1).padStart(3,'0'),name,number,college,branch,stage,dates,birthDate,flow:i%4+1,status:i>8?'待审核':i%3===0?'需补正':'待复核',checked:i<9,docs,process:seededProcess(stage),overrides:{},feedback:'',revision:1};
 });
 students[0].dates.active='2025-12-15';students[0].dates.development='2026-08-20';students[0].docs.find(d=>d.type==='cultivation').date='2025-12-15';students[0].docs.find(d=>d.type==='thought').signed=false;students[0].docs.find(d=>d.type==='autobiography').text+='\n组织名称：中国共产档。';
 students[1].docs=students[1].docs.filter(d=>d.type!=='autobiography');students[1].docs.find(d=>d.type==='volunteer').stamped=false;
 students[2].docs=students[2].docs.filter(d=>d.id!=='thought-1');
 students[3].dates.regularized='2025-10-12';students[3].docs.find(d=>d.type==='regularization').date='2025-10-12';
 students[4].docs.find(d=>d.type==='cultivation').signed=false;
 students[6].docs.find(d=>d.type==='thought').text+='\n实践情况补充：请填写。';
 students[7].dates.development='2023-09-01';
 students[8].status='材料已确认';students[8].flow=4;students[8].docs.forEach(d=>{d.reviewed=true;});
 students[0].process.politicalReview=false;
 students[1].process.preReview=false;
 students[2].process.activeInspectionCount=0;
 return {version:3,rules:{...DEFAULT_RULES},ruleHistory:[],students,logs:[{at:'2026-10-13 09:20',who:'演示审核员',action:'载入虚拟材料批次',detail:'12名虚拟学生 · 53份完整示例材料 · 2026年秋季批次'}]};
}
function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const d=new Date(s+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s;}
function addMonths(s,n){const d=new Date(s+'T00:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);}
function analyze(s,r=DEFAULT_RULES){const issues=[];const add=(id,category,severity,title,detail,suggestion,docId=null,rule='DEMO-01')=>{const ov=s.overrides?.[id];issues.push({id,studentId:s.id,category,severity,title,detail,suggestion,docId,rule,handled:!!ov,note:ov||''});};
 required(s.stage).forEach(req=>{const count=s.docs.filter(d=>d.type===req.type).length,minimum=enforcedCount(req);if(minimum&&count<minimum)add('missing-'+req.type,'材料缺项','重点核对',TYPES[req.type]+'缺少'+(minimum-count)+'份','依据 '+(req.basis||'规则')+'，当前登记'+count+'份，最低要求'+minimum+'份。','核对归档目录，补充对应材料后重新校验。',null,'M-01');});
 for(let i=0;i<=s.stage;i++){const k=DATE_KEYS[i];if(!validDate(s.dates[k]))add('date-'+k,'时间逻辑','待确认',STAGES[i]+'日期待核对','未录入有效的 YYYY-MM-DD 日期。','请对照原始记录校对提取日期，保留原始材料。',null,'T-01');else if(i>0&&validDate(s.dates[DATE_KEYS[i-1]])&&s.dates[k]<s.dates[DATE_KEYS[i-1]])add('order-'+k,'时间逻辑','重点核对','关键节点先后顺序异常',STAGES[i]+'日期 '+s.dates[k]+' 早于上一阶段 '+s.dates[DATE_KEYS[i-1]]+'。','由经办人员核实原始记录及实际程序，不应仅为满足校验而改写日期。',null,'T-02');}
 if(validDate(s.dates.application)&&s.dates.applicationTalk&&validDate(s.dates.applicationTalk)&&s.dates.applicationTalk>addMonths(s.dates.application,1))add('application-talk','程序材料','重点核对','申请谈话超过 1 个月','入党申请日期 '+s.dates.application+'，谈话日期 '+s.dates.applicationTalk+'。依据《中国共产党发展党员工作细则》第七条，党组织应在 1 个月内派人谈话。','对照谈话记录和原始登记核实；日期异常不应为满足校验而改写。',null,'CCP-DEVELOP-2014-07');
 [['active','development',r.activeMonths,'积极分子培养教育时间','active-cycle','CCP-DEVELOP-2014-13'],['admitted','regularized',r.probationMonths,'预备期','probation-cycle','CCP-DEVELOP-2014-29']].forEach(([a,b,n,label,id,rule])=>{if(validDate(s.dates[a])&&validDate(s.dates[b])&&s.dates[b]<addMonths(s.dates[a],n))add(id,'时间逻辑','重点核对',label+'未达到规则时长','从 '+s.dates[a]+' 至 '+s.dates[b]+'；按当前规则 '+n+' 个月，应达到 '+addMonths(s.dates[a],n)+'。','核实起止日期与适用规定，延长、特殊情形和程序后果由审核人员判断。',null,rule);});
 s.docs.forEach(d=>{
  const extractionPending=!d.text?.trim()||['ocr_required','ocr_unavailable','unsupported','failed','empty'].includes(d.extractionStatus)||(!d.extractionStatus&&d.source==='registered');
  if(extractionPending){const status=d.extractionStatus||'registered',reason={ocr_required:'PDF 没有文字层，等待 OCR。',ocr_unavailable:'当前机器未安装 OCR 引擎，图片已归档但正文尚未提取。',unsupported:'文件类型暂不支持正文提取。',failed:'正文提取失败，需要人工核对原件。',empty:'提取结果为空，需要人工核对原件。',registered:'材料已归档，尚未记录正文提取结果。'}[status]||'材料正文尚未提取。';add('unread-'+d.id,'内容待核','待确认','材料正文待提取',d.title+'：'+reason,'完成正文提取或对照原件人工录入正文；提取结果仍必须人工核验。',d.id,'F-00');return;}
  if(r.checkSignature&&d.signed!==true)add('sign-'+d.id,'形式规范','需补正','落款签字'+(d.signed===false?'缺失':'待确认'),d.title+'：'+(d.signed===false?'演示提取字段显示未签字。':'尚未人工确认签字字段。'),'核对原件，按适用要求补齐本人或相关责任人签字，再上传清晰材料。',d.id,'F-01');
  if(['cultivation','volunteer'].includes(d.type)&&d.stamped!==true)add('stamp-'+d.id,'形式规范','待确认','盖章字段待核对',d.title+'：未确认印章完整。','由审核人员核验应盖章栏位、印章完整性和原件。',d.id,'F-02');
  if(!d.text?.trim())add('empty-'+d.id,'内容待核','需补正','材料正文为空','当前提取结果未包含正文。','补充可读取的材料内容或校对提取结果。',d.id,'C-01');
  if(r.checkTerms&&d.text?.includes('中国共产档'))add('term-'+d.id,'表述校对','需补正','组织名称存在疑似错字','识别片段：“中国共产档”。','对照原件，确认是否应为“中国共产党”；由人工确认后修改。',d.id,'C-02');
  if(d.text?.includes('请填写'))add('placeholder-'+d.id,'内容待核','需补正','发现未填写的模板占位内容','识别片段：“请填写”。','结合本人实际经历补充相应栏目，提交人工复核。',d.id,'C-03');
 });return issues;}
function completeness(s){const req=required(s.stage);return {expected:req.reduce((n,r)=>n+enforcedCount(r),0),actual:req.reduce((n,r)=>n+Math.min(enforcedCount(r),s.docs.filter(d=>d.type===r.type).length),0),flexible:req.filter(r=>r.enforceCount===false).map(r=>({type:r.type,count:s.docs.filter(d=>d.type===r.type).length,basis:r.basis}))};}
function materialDocStatus(s,d,r=DEFAULT_RULES){
 if(!d)return '\u672a\u63d0\u4ea4';
 const pending=!d.text?.trim()||['ocr_required','ocr_unavailable','unsupported','failed','empty'].includes(d.extractionStatus)||(!d.extractionStatus&&d.source==='registered');
 if(pending)return '\u5df2\u5f52\u6863';
 if(!s.checked)return '\u5df2\u63d0\u53d6';
 if(analyze(s,r).some(i=>i.docId===d.id&&!i.handled))return '\u9700\u8865\u6b63';
 return d.reviewed===true?'\u5df2\u6838\u9a8c':'\u5f85\u4eba\u5de5\u6838\u9a8c';
}
function materialStatus(s,r=DEFAULT_RULES){
 if(!s.docs?.length)return '\u672a\u63d0\u4ea4';
 const c=completeness(s); if(c.actual===0)return '\u672a\u63d0\u4ea4';
 if(c.actual<c.expected||s.docs.some(d=>materialDocStatus(s,d,r)==='\u5df2\u5f52\u6863'))return '\u5df2\u5f52\u6863';
 if(!s.checked)return '\u5df2\u63d0\u53d6';
 if(analyze(s,r).some(i=>!i.handled))return '\u9700\u8865\u6b63';
 if(s.docs.some(d=>d.reviewed!==true))return '\u5f85\u4eba\u5de5\u6838\u9a8c';
 if(s.status==='材料已确认')return '\u5df2\u786e\u8ba4';
 return '\u5df2\u6838\u9a8c';
}
function materialChecklistStatus(s,type,count,r=DEFAULT_RULES){
 const docs=s.docs.filter(d=>d.type===type); if(!docs.length)return '\u672a\u63d0\u4ea4';
 if(count!=null&&docs.length<count)return '\u9700\u8865\u6b63';
 const statuses=docs.map(d=>materialDocStatus(s,d,r));
 if(statuses.includes('\u5df2\u5f52\u6863'))return '\u5df2\u5f52\u6863';
 if(statuses.includes('\u9700\u8865\u6b63'))return '\u9700\u8865\u6b63';
 if(statuses.includes('\u5f85\u4eba\u5de5\u6838\u9a8c'))return '\u5f85\u4eba\u5de5\u6838\u9a8c';
 return statuses.every(x=>x==='\u5df2\u63d0\u53d6')?'\u5df2\u63d0\u53d6':'\u5df2\u6838\u9a8c';
}
function stageGates(s,r=DEFAULT_RULES){
 const p=s.process||{},checks=[];
 const add=(id,title,stage,passed,detail,rule,manual=true)=>checks.push({id,title,stage,passed:!!passed,detail,rule,manual});
 const has=(type,min=1)=>s.docs.filter(d=>d.type===type).length>=min;
 add('gate-application','入党申请书已登记',0,has('application'),'材料清单至少登记 1 份入党申请书。','M-01',false);
 add('gate-application-talk','申请后谈话记录已核对',0,p.applicationTalkRecorded&&validDate(s.dates.applicationTalk),'需有谈话日期并由审核员确认谈话记录。','CCP-DEVELOP-2014-07');
 if(s.stage>=1){
  add('gate-cultivation','培养教育考察记录已登记',1,has('cultivation'),'需登记培养教育考察写实材料。','M-01',false);
  add('gate-active-inspection','积极分子考察记录已核对',1,Number(p.activeInspectionCount)>=(s.stage>=2?2:1),'党支部每半年考察一次；当前阶段至少记录 '+(s.stage>=2?2:1)+' 次。','CCP-DEVELOP-2014-11');
 }
 if(s.stage>=2){
  add('gate-autobiography','自传已登记',2,has('autobiography'),'发展对象阶段需核对自传。','M-01',false);
  add('gate-opinions','意见征求记录已核对',2,p.opinionsReview,'需核对党小组、培养联系人、党员和群众意见。','CCP-DEVELOP-2014-13');
  add('gate-political','政治审查已核对',2,p.politicalReview,'需核对政治审查材料，系统不自动评价政治表现。','CCP-DEVELOP-2014-16');
  add('gate-introducers','两名入党介绍人已核对',2,Number(p.introducers)>=2,'需登记并核对 2 名正式党员介绍人。','CCP-DEVELOP-2014-14');
  add('gate-training','发展对象培训已达标',2,Number(p.trainingDays)>=3||Number(p.trainingHours)>=24,'集中培训一般不少于 3 天或 24 学时。','CCP-DEVELOP-2014-15');
 }
 if(s.stage>=3){
  add('gate-volunteer','入党志愿书已登记',3,has('volunteer'),'接收预备党员阶段需登记入党志愿书。','M-01',false);
  add('gate-pre-review','发展对象预审已核对',3,p.preReview,'需核对预审材料和审查意见。','MOE-STUDENT-2017');
  add('gate-publicity','发展对象公示已核对',3,p.publicity,'需核对公示时间、范围和结果记录。','MOE-STUDENT-2017');
  add('gate-organization-talk','接收预备党员谈话已核对',3,p.organizationTalk,'需核对谈话记录。','MOE-STUDENT-2017');
  add('gate-approval','接收审批已核对',3,p.approval,'需核对支部大会、上级党组织审批等程序记录。','MOE-STUDENT-2017');
  add('gate-acceptance','接收手续已核对',3,p.acceptance,'需核对入党志愿书填写、宣誓等接收手续。','MOE-STUDENT-2017');
 }
 if(s.stage>=4){
  add('gate-regularization','转正申请书已登记',4,has('regularization'),'预备党员转正阶段需登记转正申请书。','M-01',false);
  add('gate-probation-review','预备党员转正考察已核对',4,p.probationReview,'需核对预备期考察、征求意见和转正程序记录。','CCP-DEVELOP-2014-29');
 }
 return {checks,passed:checks.filter(x=>x.passed).length,blocking:checks.filter(x=>!x.passed),complete:checks.every(x=>x.passed)};
}
function ageOf(s,ref){const bd=s&&s.birthDate;if(!validDate(bd))return null;const d=ref&&validDate(ref)?new Date(ref+'T00:00:00Z'):new Date();const b=new Date(bd+'T00:00:00Z');let a=d.getUTCFullYear()-b.getUTCFullYear();const m=d.getUTCMonth()-b.getUTCMonth();if(m<0||(m===0&&d.getUTCDate()<b.getUTCDate()))a--;return a>=0&&a<130?a:null;}
function allIssues(state){return state.students.flatMap(s=>analyze(s,state.rules));}
root.Qinghe={STAGES,FLOW,TYPES,DATE_KEYS,MATERIAL_STATUSES,RULE_SOURCES,PROCESS_REQUIREMENTS,RULE_STATUSES,DEFAULT_RULES,required,enforcedCount,seed,validDate,ageOf,addMonths,analyze,completeness,materialDocStatus,materialStatus,materialChecklistStatus,defaultProcess,ensureProcess,stageGates,allIssues,createDoc};
if(typeof module!=='undefined')module.exports=root.Qinghe;
})(typeof globalThis!=='undefined'?globalThis:this);
