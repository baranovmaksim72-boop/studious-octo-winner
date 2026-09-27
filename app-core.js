<script>
/* ============================================================
   МОДУЛЬ 6. ЯДРО: состояние, хранение, расчёт освоения
   ============================================================ */
const $ = s => document.querySelector(s);
const APP = $('#app'), LAYER = $('#layer');
const h = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId = (arr,id) => arr.find(x=>x.id===id);
const DAY = 86400000;
const today = () => new Date().toISOString().slice(0,10);
const daysBetween = (a,b) => Math.round((new Date(b)-new Date(a))/DAY);

const DEFAULT_STATE = {
  v:1, onboarded:false,
  profile:{name:'', country:'RU', role:'', exp:'', dirs:['ot'], level:1, minutes:15},
  done:{},        // lessonId -> ISO date
  qstats:{},      // questionId -> {ok, bad, last, streak}
  srs:{},         // cardId -> {due, ivl, reps, lapses}
  practice:{},    // scenarioId/inspectionId -> {score, date}
  exams:[],       // {date, scope, score, total}
  saved:[],       // сохранённые темы
  xp:0, streak:0, lastDay:null, ach:[], readChanges:[], notes:{},
  plan:[]         // персональный план: [{week, courseId}]
};
let S = JSON.parse(JSON.stringify(DEFAULT_STATE));
let DB=null, USERID=null, SAMPLE=null, saveTimer=null, storageMode='local';

async function boot(){
  try{ const raw = localStorage.getItem('norma-state'); if(raw) S = merge(S, JSON.parse(raw)); }catch(e){}
  render();
  if(typeof window.claude?.use === 'function'){
    try{
      const user = await window.claude.use('user');
      const db = await window.claude.use('db');
      if(db){
        USERID = user ? await user.id() : null;
        DB = db;
        storageMode = 'cloud';
        const ref = DB.doc(statePath());
        const snap = await ref.get();
        if(snap.exists && snap.data() && snap.data().payload){
          S = merge(JSON.parse(JSON.stringify(DEFAULT_STATE)), JSON.parse(snap.data().payload));
          render();
        }
      }
    }catch(e){ storageMode='local'; }
    try{ SAMPLE = await window.claude.use('sample'); }catch(e){ SAMPLE = null; }
  }
  touchStreak();
}
function statePath(){ return USERID ? `data/users/${USERID}/state` : 'data/users/me/state'; }
function merge(base, add){ const o = {...base}; for(const k in add){ o[k] = (add[k] && typeof add[k]==='object' && !Array.isArray(add[k])) ? merge(base[k]||{}, add[k]) : add[k]; } return o; }
function save(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async ()=>{
    try{ localStorage.setItem('norma-state', JSON.stringify(S)); }catch(e){}
    if(DB){ try{ await DB.doc(statePath()).set({payload:JSON.stringify(S), updated:new Date().toISOString()}); }catch(e){} }
  }, 400);
}
function touchStreak(){
  const t = today();
  if(S.lastDay === t) return;
  if(S.lastDay && daysBetween(S.lastDay, t) === 1) S.streak++;
  else if(S.lastDay) S.streak = 1; else S.streak = 1;
  S.lastDay = t; save();
}
function addXP(n){ S.xp += n; checkAch(); save(); }
function checkAch(){
  const add = id => { if(!S.ach.includes(id)){ S.ach.push(id); toast('Достижение: ' + byId(ACHIEVEMENTS,id).t); } };
  if(Object.keys(S.done).length >= 1) add('ac1');
  if(Object.keys(S.done).length >= 6) add('ac2');
  if(S.streak >= 7) add('ac3');
  const best = Object.values(S.qstats).reduce((m,v)=>Math.max(m,v.streak||0),0);
  if(best >= 20) add('ac4');
  if(Object.keys(S.practice).some(k=>k.startsWith('i'))) add('ac5');
  if(S.exams.some(e=>e.score/e.total>=0.8)) add('ac6');
}

/* ---------- уровень освоения темы ----------
   Не «гарантия знаний», а измеряемый показатель:
   теория 25% · тесты 40% · практика 20% · удержание 15%, с затуханием без повторения. */
function mastery(dir){
  const ls = LESSONS.filter(l => byId(COURSES,l.c).dir === dir);
  const theory = ls.length ? ls.filter(l=>S.done[l.id]).length / ls.length : 0;

  const qs = QUESTIONS.filter(q=>q.dir===dir);
  let w=0, got=0, lapses=0;
  qs.forEach(q=>{ const st=S.qstats[q.id]; if(!st||(!st.ok&&!st.bad)) return;
    const weight = q.diff; const total = st.ok+st.bad;
    w += weight; got += weight * (st.ok/total); if(st.bad>1) lapses++; });
  const coverage = qs.length ? Math.min(1, w / qs.reduce((a,q)=>a+q.diff,0)) : 0;
  const tests = w ? (got/w) * (0.55 + 0.45*coverage) : 0;

  const pr = [...SCENARIOS,...INSPECTIONS,...EXAMPLES].filter(p=>p.dir===dir);
  const practice = pr.length ? pr.filter(p=>S.practice[p.id]).length / pr.length : 0;

  const cards = CARDS.filter(c=>c.dir===dir);
  let ret=0;
  if(cards.length){
    const now = Date.now();
    ret = cards.reduce((a,c)=>{ const r=S.srs[c.id]; if(!r) return a;
      const overdue = (now - new Date(r.due).getTime())/DAY;
      return a + (overdue<=0 ? 1 : Math.max(0, 1 - overdue/14)); },0)/cards.length;
  }
  const penalty = Math.min(0.12, lapses*0.02);
  let m = 0.25*theory + 0.40*tests + 0.20*practice + 0.15*ret - penalty;

  const last = lastActivity(dir);
  if(last){ const idle = daysBetween(last, today()); if(idle>14) m *= Math.max(0.85, 1 - (idle-14)/200); }
  return Math.max(0, Math.min(1, m));
}
function lastActivity(dir){
  let d=null;
  LESSONS.filter(l=>byId(COURSES,l.c).dir===dir).forEach(l=>{ if(S.done[l.id] && (!d||S.done[l.id]>d)) d=S.done[l.id]; });
  QUESTIONS.filter(q=>q.dir===dir).forEach(q=>{ const st=S.qstats[q.id]; if(st?.last && (!d||st.last>d)) d=st.last; });
  return d;
}
function overall(){ const ds=Object.keys(DIRS).filter(d=>LESSONS.some(l=>byId(COURSES,l.c).dir===d));
  return ds.reduce((a,d)=>a+mastery(d),0)/ds.length; }
function weakest(n=3){
  return Object.keys(DIRS).filter(d=>COURSES.some(c=>c.dir===d))
    .map(d=>({d, m:mastery(d)})).sort((a,b)=>a.m-b.m).slice(0,n);
}
function pct(x){ return Math.round(x*100); }

/* ---------- интервальные повторения ---------- */
const IVL = [1,3,7,16,35,75];
function dueCards(){
  const now = Date.now();
  return CARDS.filter(c => {
    if(!S.profile.dirs.includes(c.dir) && S.profile.dirs.length) { /* показываем всё, но приоритет ниже */ }
    const r = S.srs[c.id];
    return !r || new Date(r.due).getTime() <= now;
  }).sort((a,b)=>{ const ra=S.srs[a.id], rb=S.srs[b.id];
    if(!ra) return -1; if(!rb) return 1; return new Date(ra.due)-new Date(rb.due); });
}
function gradeCard(id, grade){ // 0 не знаю · 1 плохо · 2 знаю · 3 отлично
  const r = S.srs[id] || {ivl:0, reps:0, lapses:0};
  if(grade===0){ r.ivl=0; r.lapses++; }
  else if(grade===1) r.ivl = Math.max(1, Math.round(IVL[Math.max(0,Math.min(IVL.length-1,r.reps))]*0.5));
  else { r.reps = Math.min(IVL.length-1, r.reps+1); r.ivl = IVL[r.reps] * (grade===3?1.3:1); }
  r.due = new Date(Date.now() + Math.max(1,Math.round(r.ivl))*DAY).toISOString();
  S.srs[id] = r; addXP(grade>=2?4:2);
}

/* ---------- уведомления ---------- */
function notifications(){
  const out = [];
  CHANGES.forEach(ch=>{ if(!S.readChanges.includes(ch.id)){
    const studied = (ch.affected||[]).some(a=>S.done[a] || S.qstats[a]);
    out.push({id:ch.id, kind:'change', sev:ch.sev, t:ch.title,
      d: studied ? 'Затронуты материалы, которые вы изучали. Проверьте новую редакцию.' : 'Изменение в нормативной базе по вашим направлениям.',
      go:()=>go('changes')});
  }});
  const due = dueCards().length;
  if(due>0) out.push({id:'srs', kind:'srs', sev:'mid', t:`К повторению готово карточек: ${due}`, d:'Повторение удерживает уровень освоения от снижения.', go:()=>go('review')});
  weakest(1).forEach(w=>{ if(w.m<0.7 && lastActivity(w.d)) out.push({id:'weak-'+w.d, kind:'weak', sev:'low',
    t:`Слабая тема: ${DIRS[w.d].t}`, d:`Уровень освоения ${pct(w.m)}%. Рекомендуется повторить и пройти тест.`, go:()=>go('test',{dir:w.d})}); });
  return out;
}

/* ---------- поиск ---------- */
function searchAll(qs){
  const q = qs.trim().toLowerCase(); if(q.length<2) return [];
  const words = q.split(/\s+/);
  const score = (txt, boost=1) => { const t=(txt||'').toLowerCase();
    let s=0; words.forEach(w=>{ if(t.includes(w)) s += (t.indexOf(w)<40?2:1); }); return s*boost; };
  const res = [];
  DOCS.forEach(d=>{ const s = score(d.title,2)+score(d.short,3)+score(d.num,3)+score(d.scope)+score((d.key||[]).join(' '));
    if(s) res.push({s, kind:'Документ', t:d.short, d:d.title, go:()=>go('doc',{id:d.id})}); });
  ARTICLES.forEach(a=>{ const s = score(a.title,2)+score(a.text)+score(a.simple)+score(a.practice)+score(a.remember,2);
    if(s) res.push({s, kind:'Пункт документа', t:a.title, d:byId(DOCS,a.doc).short+' · '+a.clause, go:()=>go('article',{id:a.id})}); });
  LESSONS.forEach(l=>{ const s = score(l.title,2)+score(l.goal)+score(JSON.stringify(l.blocks));
    if(s) res.push({s, kind:'Урок', t:l.title, d:byId(COURSES,l.c).title, go:()=>go('lesson',{id:l.id})}); });
  QUESTIONS.forEach(qq=>{ const s = score(qq.q)+score(qq.why);
    if(s) res.push({s:s*0.7, kind:'Вопрос', t:qq.q, d:'Тест · '+DIRS[qq.dir].t, go:()=>go('test',{dir:qq.dir})}); });
  CASES.forEach(c=>{ const s = score(c.title,2)+score(c.story);
    if(s) res.push({s, kind:'Кейс', t:c.title, d:DIRS[c.dir].t, go:()=>go('case',{id:c.id})}); });
  EXAMPLES.forEach(e=>{ const s = score(e.title,2)+score(e.story)+score(e.remember,2)+score(e.tag)+score(e.mistake);
    if(s) res.push({s, kind:'Разбор по примеру', t:e.title, d:DIRS[e.dir].t+' · '+byId(DOCS,e.norm.doc).short, go:()=>{ EX={id:e.id,sel:null,step:0}; go('example'); }}); });
  EXPERTS.forEach(x=>{ const s = score(x.thesis)+score(x.author);
    if(s) res.push({s:s*0.6, kind:'Мнение эксперта', t:x.thesis.slice(0,90)+'…', d:x.author, go:()=>go('experts')}); });
  return res.sort((a,b)=>b.s-a.s).slice(0,25);
}

/* ---------- аудио ---------- */
let speaking = false;
function speak(text, btn){
  if(!('speechSynthesis' in window)){ toast('Аудио недоступно в этом браузере'); return; }
  if(speaking){ window.speechSynthesis.cancel(); speaking=false; document.querySelectorAll('.audio-on').forEach(b=>b.classList.remove('audio-on')); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang='ru-RU'; u.rate=0.98;
  const v = window.speechSynthesis.getVoices().find(x=>/ru/i.test(x.lang));
  if(v) u.voice=v;
  u.onend = ()=>{ speaking=false; btn && btn.classList.remove('audio-on'); };
  speaking=true; btn && btn.classList.add('audio-on');
  window.speechSynthesis.speak(u);
}

/* ---------- AI-помощник ---------- */
const AI_RULES = `Ты — помощник внутри обучающего приложения по охране труда, промышленной, пожарной, электробезопасности и экологии.
ЖЁСТКИЕ ПРАВИЛА:
1) Не выдумывай нормативные документы, номера приказов, номера пунктов и формулировки. Ссылайся только на документы и пункты, переданные тебе в КОНТЕКСТЕ.
2) Если ответа нет в контексте — ответь: «Недостаточно данных для подтверждения. Проверьте официальный источник.» и объясни, где искать.
3) Не смешивай законодательство России, ЕАЭС и ЕС. Всегда указывай юрисдикцию.
4) Не выдавай мнение эксперта за норму.
5) Отвечай по-русски, коротко и практично.`;
async function ask(prompt, ctx, onText){
  if(!SAMPLE) return {err:'off'};
  try{
    const input = `${AI_RULES}\n\nКОНТЕКСТ (только эти данные считай подтверждёнными):\n${ctx}\n\nВОПРОС ПОЛЬЗОВАТЕЛЯ:\n${prompt}`;
    const r = await SAMPLE(input, {modelTier:'default', onText: onText ? ({text})=>onText(text) : undefined});
    return {text:r.text};
  }catch(e){ return {err:e.code||'error'}; }
}
function ctxForArticle(a){
  const d = byId(DOCS,a.doc);
  return `Документ: ${d.title} (${d.kind} ${d.num} от ${d.date}). Статус: ${statusText(d.status)}. Редакция: ${d.edition||'—'}. Юрисдикция: ${jurName(d.jur)}.
Пункт: ${a.clause}. ${a.mode==='verbatim'?'Официальная формулировка':'Изложение по первоисточнику (не цитата)'}: ${a.text}
Объяснение приложения: ${a.simple}
На практике: ${a.practice}
Типичные ошибки: ${(a.mistakes||[]).join('; ')}`;
}

/* ---------- вспомогательное ---------- */
function statusText(s){ return {active:'Действует', active_amended:'Действует с изменениями', check:'Требует проверки актуальности',
  repealed:'Утратил силу', replaced:'Заменён', draft:'Проект'}[s] || s; }
function statusClass(s){ return {active:'ok', active_amended:'ok', check:'warn', repealed:'bad', replaced:'bad', draft:'warn'}[s]||''; }
function jurName(j){ return {RU:'Россия', EAEU:'ЕАЭС', EU:'Европейский союз', DE:'Германия'}[j]||j; }
function jurFlag(j){ return {RU:'🇷🇺', EAEU:'🌍', EU:'🇪🇺', DE:'🇩🇪'}[j]||''; }
function toast(msg){
  const t = document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2600);
}
function modal(html){
  LAYER.innerHTML = `<div class="modal-bg" data-close="1"><div class="modal">
    <button class="modal-x" id="modal-x" aria-label="Закрыть">✕</button>${html}</div></div>`;
  LAYER.querySelector('[data-close]').addEventListener('click', e=>{ if(e.target.dataset.close) closeModal(); });
  LAYER.querySelector('#modal-x').addEventListener('click', closeModal);
  LAYER.querySelector('.modal').focus?.();
}
function closeModal(){ LAYER.innerHTML=''; }
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && LAYER && LAYER.innerHTML) closeModal(); });
function sourceBtn(docId, clause){
  return `<button class="btn ghost sm" onclick="showSource('${docId}', ${clause?`'${clause.replace(/'/g,"\\'")}'`:'null'})">Откуда это?</button>`;
}
function showSource(docId, clause){
  const d = byId(DOCS, docId); if(!d) return;
  modal(`<h2 style="margin-top:0">Нормативное основание</h2>
   <div class="norm"><div class="lbl">🟦 ЗАКОНОДАТЕЛЬНОЕ ТРЕБОВАНИЕ</div>
    <b>${h(d.kind)} ${h(d.num)}</b><div style="margin-top:4px">${h(d.title)}</div></div>
   <dl class="kv">
    <dt>Пункт / статья</dt><dd>${h(clause||'документ в целом')}</dd>
    <dt>Дата принятия</dt><dd>${h(d.date)}</dd>
    <dt>Вступление в силу</dt><dd>${h(d.eff||'—')}</dd>
    <dt>Статус</dt><dd><span class="tag ${statusClass(d.status)}">${statusText(d.status)}</span></dd>
    <dt>Редакция</dt><dd>${h(d.edition||'—')}</dd>
    <dt>Территория</dt><dd>${jurFlag(d.jur)} ${h(d.territory||jurName(d.jur))}</dd>
    <dt>Орган</dt><dd>${h(d.authority||'—')}</dd>
    <dt>Официальный источник</dt><dd><a href="${h(d.source.url)}" target="_blank" rel="noopener">${h(d.source.name)}</a></dd>
    <dt>Сверка карточки</dt><dd>${h(d.verified)}</dd>
   </dl>
   ${d.note?`<div class="warnstripe">${h(d.note)}</div>`:''}
   <div class="row" style="margin-top:14px"><button class="btn" onclick="closeModal();go('doc',{id:'${d.id}'})">Открыть карточку документа</button>
   <button class="btn ghost" onclick="closeModal()">Закрыть</button></div>`);
}
</script>
