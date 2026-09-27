<script>
/* ============================================================
   МОДУЛЬ 7. ИНТЕРФЕЙС
   ============================================================ */
let R = {v:'home', p:{}};
function go(v,p={}){ R={v,p}; window.scrollTo(0,0); render(); }

const NAV = [
 {sect:'Обучение'},
 {v:'home', t:'Главная', ic:'🏠'},
 {v:'learn', t:'Обучение', ic:'📚'},
 {v:'examples', t:'Обучение по примеру', ic:'🧾'},
 {v:'daily', t:'15 минут сегодня', ic:'⏱'},
 {v:'review', t:'Повторение', ic:'🔄'},
 {v:'test', t:'Тесты и экзамены', ic:'📝'},
 {v:'practice', t:'Практика', ic:'🧠'},
 {sect:'Нормативная база'},
 {v:'docs', t:'Все документы', ic:'📖'},
 {v:'docs', p:{dir:'ot'}, t:'Охрана труда', ic:'🦺'},
 {v:'docs', p:{dir:'eb'}, t:'Электробезопасность', ic:'⚡'},
 {v:'docs', p:{dir:'pb'}, t:'Пожарная безопасность', ic:'🔥'},
 {v:'docs', p:{dir:'prb'}, t:'Промышленная безопасность', ic:'🏭'},
 {v:'docs', p:{dir:'eco'}, t:'Экология', ic:'🌱'},
 {v:'compare', t:'Россия / ЕАЭС / ЕС', ic:'🌍'},
 {sect:'Актуальность и поддержка'},
 {v:'changes', t:'Изменения', ic:'📰'},
 {v:'experts', t:'Мнения и практика', ic:'💬'},
 {v:'ai', t:'AI-помощник', ic:'🤖'},
 {v:'progress', t:'Мой прогресс', ic:'📊'},
 {v:'search', t:'Поиск', ic:'🔍'},
 {v:'arch', t:'Архитектура проекта', ic:'🧩'}
];
const MOBNAV = [{v:'home',t:'Главная',ic:'🏠'},{v:'learn',t:'Обучение',ic:'📚'},{v:'docs',t:'База',ic:'📖'},
  {v:'practice',t:'Практика',ic:'🧠'},{v:'more',t:'Ещё',ic:'⋯'}];

function render(){
  if(!S.onboarded){ APP.innerHTML = vOnboard(); bindOnboard(); return; }
  const unread = notifications().filter(n=>n.kind==='change').length;
  APP.innerHTML = `<div class="shell">
    <aside class="rail">
      <div class="brand"><div class="mark">Н</div><div><b>НОРМА</b><span>обучение требованиям безопасности</span></div></div>
      <nav class="nav">${NAV.map(n=> n.sect ? `<div class="sect">${n.sect}</div>` :
        `<button data-v="${n.v}" data-p='${JSON.stringify(n.p||{})}' aria-current="${R.v===n.v && JSON.stringify(n.p||{})===JSON.stringify(R.p)}">
          <span class="ic">${n.ic}</span>${n.t}${n.v==='changes'&&unread?`<span class="badge">${unread}</span>`:''}</button>`).join('')}
      </nav>
    </aside>
    <main class="main">
      <div class="topbar">
        <div class="mark">Н</div>
        <input class="searchbox" id="mobsearch" placeholder="Найти требование, документ, пункт" style="flex:1">
        <button class="btn ghost sm" data-v="progress">${pct(overall())}%</button>
      </div>
      ${view()}
    </main>
    <nav class="mobnav">${MOBNAV.map(n=>`<button data-v="${n.v}" aria-current="${R.v===n.v}"><span>${n.ic}</span>${n.t}</button>`).join('')}</nav>
  </div>`;
  APP.querySelectorAll('[data-v]').forEach(b=>b.addEventListener('click',()=>{
    const v=b.dataset.v; if(v==='more') return showMore();
    go(v, b.dataset.p?JSON.parse(b.dataset.p):{});
  }));
  const ms = $('#mobsearch');
  if(ms) ms.addEventListener('keydown', e=>{ if(e.key==='Enter') go('search',{q:ms.value}); });
  bindView();
}
function showMore(){
  modal(`<h2 style="margin-top:0">Разделы</h2><div class="list">
   ${NAV.filter(n=>!n.sect).map(n=>`<button class="item" data-mv="${n.v}" data-mp='${JSON.stringify(n.p||{})}'>
     <span>${n.ic}</span><span class="t">${n.t}</span></button>`).join('')}</div>`);
  LAYER.querySelectorAll('[data-mv]').forEach(b=>b.addEventListener('click',()=>{ closeModal(); go(b.dataset.mv, JSON.parse(b.dataset.mp)); }));
}
function view(){
  switch(R.v){
    case 'home': return vHome();
    case 'learn': return vLearn();
    case 'course': return vCourse();
    case 'lesson': return vLesson();
    case 'article': return vArticle();
    case 'docs': return vDocs();
    case 'doc': return vDoc();
    case 'test': return vTestHub();
    case 'quiz': return vQuiz();
    case 'review': return vReview();
    case 'daily': return vDaily();
    case 'practice': return vPractice();
    case 'examples': return vExamples();
    case 'example': return vExample();
    case 'inspect': return vInspect();
    case 'scenario': return vScenario();
    case 'case': return vCase();
    case 'changes': return vChanges();
    case 'experts': return vExperts();
    case 'ai': return vAI();
    case 'progress': return vProgress();
    case 'search': return vSearch();
    case 'compare': return vCompare();
    case 'arch': return vArch();
    default: return vHome();
  }
}

/* ---------------- онбординг ---------------- */
function vOnboard(){
  return `<div class="main" style="max-width:640px;margin:0 auto">
   <div class="row" style="margin:18px 0 22px"><div class="mark">Н</div><b style="font-family:var(--display)">НОРМА</b></div>
   <h1>Научиться понимать требования, а не заучивать их</h1>
   <p class="lede">Приложение построено по схеме: норма → объяснение простыми словами → практика → ошибки → тест → повторение. Настроим программу под вас — это займёт минуту.</p>
   <div class="card">
     <h3>Страна и юрисдикция</h3>
     <div class="row" id="ob-country">${[['RU','🇷🇺 Россия'],['DE','🇩🇪 Германия'],['FR','🇪🇺 Франция'],['PL','🇪🇺 Польша'],['IT','🇪🇺 Италия'],['EU','🇪🇺 Другая страна ЕС']].map(([k,t],i)=>`<button class="chip" data-k="${k}" aria-pressed="${i===0}">${t}</button>`).join('')}</div>
     <h3>Опыт работы</h3>
     <div class="row" id="ob-exp">${['Начинаю с нуля','До 1 года','1–3 года','Более 3 лет'].map((t,i)=>`<button class="chip" data-k="${t}" aria-pressed="${i===0}">${t}</button>`).join('')}</div>
     <h3>Должность</h3>
     <div class="row" id="ob-role">${['Специалист по охране труда','Руководитель подразделения','Инженер / технический специалист','Работник','Студент'].map((t,i)=>`<button class="chip" data-k="${t}" aria-pressed="${i===0}">${t}</button>`).join('')}</div>
     <h3>Направления (можно несколько)</h3>
     <div class="row" id="ob-dirs">${Object.entries(DIRS).map(([k,v],i)=>`<button class="chip" data-k="${k}" aria-pressed="${k==='ot'}">${v.ic} ${v.t}</button>`).join('')}</div>
     <h3>Сколько времени в день</h3>
     <div class="row" id="ob-min">${[[15,'15 минут'],[30,'30 минут'],[60,'1 час']].map(([k,t],i)=>`<button class="chip" data-k="${k}" aria-pressed="${i===0}">${t}</button>`).join('')}</div>
     <div class="hr"></div>
     <button class="btn" id="ob-go">Сформировать программу</button>
   </div>
   <p class="tiny" style="margin-top:14px">Приложение не гарантирует юридически «уровень знаний» и не заменяет обязательное обучение в аккредитованной организации. Оно показывает измеряемый уровень освоения материала и всегда ведёт к первоисточнику.</p>
  </div>`;
}
function bindOnboard(){
  const pick = (sel, multi=false) => {
    const box = $(sel); if(!box) return;
    box.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>{
      if(multi){ c.setAttribute('aria-pressed', c.getAttribute('aria-pressed')!=='true'); }
      else { box.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed','false')); c.setAttribute('aria-pressed','true'); }
    }));
  };
  pick('#ob-country'); pick('#ob-exp'); pick('#ob-role'); pick('#ob-min'); pick('#ob-dirs', true);
  const val = sel => $(sel)?.querySelector('[aria-pressed="true"]')?.dataset.k;
  const vals = sel => [...($(sel)?.querySelectorAll('[aria-pressed="true"]')||[])].map(x=>x.dataset.k);
  $('#ob-go')?.addEventListener('click', ()=>{
    S.profile.country = val('#ob-country')||'RU';
    S.profile.exp = val('#ob-exp'); S.profile.role = val('#ob-role');
    S.profile.minutes = +(val('#ob-min')||15);
    S.profile.dirs = vals('#ob-dirs').length ? vals('#ob-dirs') : ['ot'];
    S.profile.level = S.profile.exp==='Начинаю с нуля' ? 1 : S.profile.exp==='Более 3 лет' ? 3 : 2;
    S.plan = buildPlan(); S.onboarded = true; save(); go('home');
  });
}
function buildPlan(){
  const jur = S.profile.country==='RU' ? 'RU' : 'EU';
  const mine = COURSES.filter(c=> (c.jur===jur||c.jur==='RU'&&jur==='RU') && S.profile.dirs.includes(c.dir));
  const rest = COURSES.filter(c=>!mine.includes(c));
  const ordered = [...mine.sort((a,b)=>a.lvl-b.lvl), ...rest];
  return ordered.map((c,i)=>({week:i+1, c:c.id}));
}

/* ---------------- главная ---------------- */
function vHome(){
  const notif = notifications();
  const next = nextLesson();
  const w = weakest(3);
  return `
  <div class="between" style="margin-bottom:14px">
    <div><h1>Главная</h1><p class="lede" style="margin:0">${h(S.profile.role||'Специалист')} · ${jurFlag(S.profile.country==='RU'?'RU':'EU')} ${h(countryName())} · серия ${S.streak} дн. · ${S.xp} XP</p></div>
    <div class="row"><button class="btn ghost sm" data-v="search">🔍 Поиск</button><button class="btn sm" data-v="daily">⏱ ${S.profile.minutes} минут сегодня</button></div>
  </div>
  <div class="hero">
    <div class="small">Общий уровень освоения</div>
    <div class="v">${pct(overall())}%</div>
    <div class="bar" style="margin:12px 0 8px"><i style="width:${pct(overall())}%"></i></div>
    <div class="small">Показатель складывается из теории (25%), тестов с учётом сложности (40%), практических режимов (20%) и удержания через повторение (15%). Без повторения он снижается.</div>
  </div>
  ${notif.length?`<div class="list" style="margin-bottom:8px">${notif.slice(0,3).map(n=>`
    <button class="item" data-notif="${n.id}">
      <span>${n.kind==='change'?'⚠️':n.kind==='srs'?'🔄':'📉'}</span>
      <span><span class="t">${h(n.t)}</span><div class="small">${h(n.d)}</div></span><span class="spacer"></span><span>→</span></button>`).join('')}</div>`:''}
  <div class="grid g2">
    <div class="card">
      <h3 style="margin-top:0">Продолжить обучение</h3>
      ${next?`<div class="small">${h(byId(COURSES,next.c).title)}</div>
        <div style="font-weight:600;margin:4px 0 10px">${h(next.title)}</div>
        <button class="btn" data-lesson="${next.id}">Открыть урок</button>`:`<p class="small">Все уроки пройдены. Проверьте себя на итоговой аттестации.</p><button class="btn" data-v="test">К экзаменам</button>`}
    </div>
    <div class="card">
      <h3 style="margin-top:0">Мои слабые темы</h3>
      ${w.map(x=>`<div style="margin-bottom:8px"><div class="between" style="margin-bottom:3px"><span>${DIRS[x.d].ic} ${DIRS[x.d].t}</span><b class="num">${pct(x.m)}%</b></div>
        <div class="bar"><i style="width:${pct(x.m)}%;background:${x.m<0.5?'var(--red)':x.m<0.75?'var(--amber)':'var(--green)'}"></i></div></div>`).join('')}
      <button class="btn ghost sm" data-v="test" style="margin-top:6px">Тренировать слабые темы</button>
    </div>
  </div>
  ${(()=>{ const ex = EXAMPLES.find(x=>!S.practice[x.id]) || EXAMPLES[0]; const d = byId(DOCS, ex.norm.doc);
    return `<h2>Разбор по примеру</h2>
    <div class="card"><div class="tiny">${DIRS[ex.dir].ic} ${DIRS[ex.dir].t} · ${h(ex.tag)}</div>
      <h3 style="margin:4px 0 6px">${h(ex.title)}</h3>
      <p class="small">${h(ex.setting)}</p>
      <div class="row"><button class="btn" data-example="${ex.id}">Разобрать ситуацию</button>
        <button class="btn ghost" data-v="examples">Все примеры</button></div>
      <div class="tiny" style="margin-top:8px">Применяется: ${h(d.kind)} ${h(d.num)} — но сначала вы решаете сами.</div></div>`; })()}
  <h2>Что изменилось в законодательстве</h2>
  <div class="list">${CHANGES.slice(0,3).map(c=>`<button class="item" data-change="${c.id}">
     <span class="tag ${c.sev==='high'?'bad':'warn'}">${c.date}</span>
     <span><span class="t">${h(c.title)}</span><div class="small">${h(byId(DOCS,c.doc).short)}</div></span><span class="spacer"></span><span>→</span></button>`).join('')}</div>
  <h2>Разделы</h2>
  <div class="grid g3">
    ${[['examples','🧾','Обучение по примеру', EXAMPLES.length+' разборов с нормой'],
       ['review','🔄','Повторение', dueCards().length+' карточек готово'],
       ['practice','🧠','Практика','Инспектор · специалист · кейсы'],
       ['test','📝','Тесты и экзамены','Еженедельный и итоговый'],
       ['docs','📖','Нормативная база', DOCS.length+' документов'],
       ['experts','💬','Мнения и практика','Отделены от норм'],
       ['compare','🌍','Россия / ЕАЭС / ЕС','Без смешивания требований']]
      .map(([v,ic,t,d])=>`<button class="item" data-v="${v}"><span>${ic}</span><span><span class="t">${t}</span><div class="small">${d}</div></span></button>`).join('')}
  </div>`;
}
function countryName(){ return {RU:'Россия',DE:'Германия',FR:'Франция',PL:'Польша',IT:'Италия',EU:'ЕС'}[S.profile.country]||'Россия'; }
function nextLesson(){
  for(const p of (S.plan.length?S.plan:COURSES.map(c=>({c:c.id})))){
    const l = LESSONS.filter(x=>x.c===p.c).sort((a,b)=>a.n-b.n).find(x=>!S.done[x.id]);
    if(l) return l;
  }
  return LESSONS.find(l=>!S.done[l.id]);
}

/* ---------------- обучение ---------------- */
function vLearn(){
  const plan = S.plan.length?S.plan:COURSES.map((c,i)=>({week:i+1,c:c.id}));
  return `<h1>Обучение</h1>
  <p class="lede">Персональная программа собрана по вашим направлениям и опыту. Порядок можно не соблюдать — открывайте любой курс.</p>
  <div class="list">${plan.map(p=>{
    const c = byId(COURSES,p.c); if(!c) return '';
    const ls = LESSONS.filter(l=>l.c===c.id); const done = ls.filter(l=>S.done[l.id]).length;
    return `<button class="item" data-course="${c.id}">
      <span>${DIRS[c.dir].ic}</span>
      <span style="flex:1">
        <div class="tiny">Неделя ${p.week} · ${jurFlag(c.jur)} ${jurName(c.jur)} · уровень ${c.lvl}</div>
        <span class="t">${h(c.title)}</span>
        <div class="small">${h(c.about)}</div>
        <div class="bar" style="margin-top:7px;max-width:260px"><i style="width:${ls.length?Math.round(done/ls.length*100):0}%"></i></div>
      </span>
      <span class="small">${done}/${ls.length}</span></button>`;}).join('')}</div>`;
}
function vCourse(){
  const c = byId(COURSES, R.p.id); if(!c) return vLearn();
  const ls = LESSONS.filter(l=>l.c===c.id).sort((a,b)=>a.n-b.n);
  const qn = QUESTIONS.filter(q=>q.c===c.id).length;
  return `<button class="btn ghost sm" data-v="learn">← Обучение</button>
  <h1 style="margin-top:12px">${h(c.title)}</h1>
  <p class="lede">${h(c.about)}</p>
  <div class="row" style="margin-bottom:14px">
    <span class="tag">${DIRS[c.dir].ic} ${DIRS[c.dir].t}</span>
    <span class="tag law">${jurFlag(c.jur)} ${jurName(c.jur)}</span>
    <span class="tag">Уровень ${c.lvl}</span><span class="tag">${ls.length} уроков</span><span class="tag">${qn} вопросов</span>
  </div>
  <div class="list">${ls.map(l=>`<button class="item" data-lesson="${l.id}">
    <span class="tag ${S.done[l.id]?'ok':''}">${S.done[l.id]?'✓':l.n}</span>
    <span style="flex:1"><span class="t">${h(l.title)}</span><div class="small">${h(l.goal)}</div></span>
    <span class="small">${l.kind==='test'?'тест':l.kind==='practice'?'практика':l.kind==='review'?'повторение':'теория'}</span></button>`).join('')}</div>
  <div class="row" style="margin-top:14px">
    <button class="btn" data-quiz='${JSON.stringify({course:c.id})}'>Пройти тест по курсу</button>
    <button class="btn ghost" data-v="review">К повторению</button>
  </div>`;
}
function vLesson(){
  const l = byId(LESSONS, R.p.id); if(!l) return vLearn();
  const c = byId(COURSES, l.c);
  const audio = [l.title, l.goal, ...(l.blocks||[]).map(b=>(b.h?b.h+'. ':'')+(b.p||(b.list||[]).join('. ')))].join(' ');
  return `<button class="btn ghost sm" data-course="${c.id}">← ${h(c.title)}</button>
  <h1 style="margin-top:12px">${h(l.title)}</h1>
  <p class="lede">Цель урока: ${h(l.goal)}</p>
  <div class="row" style="margin-bottom:14px">
    <button class="btn soft sm" id="play-lesson">▶ Слушать</button>
    ${l.video.status==='none'
      ? `<span class="tag warn">Видео не добавлено</span>`
      : `<button class="btn ghost sm" id="video-script">🎬 Сценарий видео</button><span class="tag warn">Учебный материал приложения</span>`}
    <button class="btn ghost sm" data-save="${l.id}">${S.saved.includes(l.id)?'★ Сохранено':'☆ Сохранить тему'}</button>
  </div>
  ${(l.blocks||[]).map(b=>`<div class="expl"><h4>${h(b.h)}</h4>${b.p?`<p>${h(b.p)}</p>`:''}${b.list?`<ul>${b.list.map(x=>`<li>${h(x)}</li>`).join('')}</ul>`:''}</div>`).join('')}
  ${l.chain&&l.chain.length?`<h2>Откуда происходит требование</h2>${chainHTML(l.chain)}`:''}
  ${(l.arts||[]).map(id=>articleHTML(byId(ARTICLES,id))).join('')}
  <div class="hr"></div>
  <div class="row">
    <button class="btn" data-done="${l.id}">${S.done[l.id]?'Пройдено ✓ — отметить заново':'Отметить как изученное'}</button>
    <button class="btn ghost" data-quiz='${JSON.stringify({course:l.c})}'>Проверить себя</button>
    <button class="btn ghost" data-ai="${l.id}">🤖 Спросить по уроку</button>
  </div>`;
}
function chainHTML(chain){
  return `<div class="chain">${chain.map((s,i)=>`${i?'<div class="arw"></div>':''}
    <div class="step"><b>${h(s.lbl)}</b>${h(s.txt)}</div>`).join('')}</div>`;
}
function articleHTML(a){
  if(!a) return '';
  const d = byId(DOCS, a.doc);
  return `<div class="card" style="margin:16px 0">
    <div class="between"><h3 style="margin:0">${h(a.title)}</h3>
      <span class="tag ${statusClass(d.status)}">${statusText(d.status)}</span></div>
    <div class="norm">
      <div class="lbl">🟦 ЗАКОНОДАТЕЛЬНОЕ ТРЕБОВАНИЕ · ${h(d.short)} · ${h(a.clause)}
        <span class="tag ${a.mode==='verbatim'?'law':''}">${a.mode==='verbatim'?'официальная формулировка':'изложение по первоисточнику'}</span></div>
      <blockquote>${h(a.text)}</blockquote>
      <div class="row" style="margin-top:10px">${sourceBtn(a.doc, a.clause)}
        <button class="btn ghost sm" onclick="speak(${JSON.stringify(a.text).replace(/"/g,'&quot;')}, this)">▶ Слушать норму</button></div>
      ${a.mode!=='verbatim'?`<div class="tiny" style="margin-top:8px">Текст изложен в сокращении и не является дословной цитатой. Точная формулировка — в официальном источнике.</div>`:''}
    </div>
    <div class="expl"><h4>Простыми словами · объяснение приложения</h4><p>${h(a.simple)}</p></div>
    <div class="expl"><h4>Что это означает на предприятии</h4><p>${h(a.practice)}</p></div>
    <div class="expl"><h4>Пример</h4><p>${h(a.example)}</p></div>
    <div class="expl"><h4>Типичные ошибки</h4><ul>${(a.mistakes||[]).map(m=>`<li>${h(m)}</li>`).join('')}</ul></div>
    <div class="warnstripe"><b>Важно.</b> ${h(a.inspector)}</div>
    <div class="expl" style="border-left-color:var(--blue)"><h4>Запомни</h4><p><b>${h(a.remember)}</b></p></div>
    <div class="row">
      <button class="btn ghost sm" data-explain="${a.id}">Объясни проще</button>
      <button class="btn ghost sm" data-example="${a.id}">Приведи пример с предприятия</button>
      <button class="btn ghost sm" data-check="${a.id}">Проверь мои знания</button>
      <button class="btn ghost sm" data-links="${a.id}">Связи с другими документами</button>
    </div>
    <div id="ai-${a.id}"></div>
  </div>`;
}
function vArticle(){
  const a = byId(ARTICLES, R.p.id); if(!a) return vDocs();
  return `<button class="btn ghost sm" data-doc="${a.doc}">← ${h(byId(DOCS,a.doc).short)}</button>
    <h1 style="margin-top:12px">${h(a.title)}</h1>${articleHTML(a)}`;
}

/* ---------------- нормативная база ---------------- */
function vDocs(){
  const f = R.p;
  let list = DOCS.slice();
  if(f.dir) list = list.filter(d=>d.dir.includes(f.dir));
  if(f.jur) list = list.filter(d=>d.jur===f.jur || (f.jur==='EU'&&d.jur==='DE'));
  if(f.q) list = list.filter(d=>(d.title+d.short+d.num).toLowerCase().includes(f.q.toLowerCase()));
  const chip=(k,val,t)=>`<button class="chip" data-filter='${JSON.stringify({[k]:val})}' aria-pressed="${f[k]===val}">${t}</button>`;
  return `<h1>Нормативная база</h1>
  <p class="lede">${DOCS.length} документов. Каждая карточка хранит паспорт документа, статус, редакцию и ссылку на официальный источник. Требования России, ЕАЭС и ЕС не смешиваются.</p>
  <input class="searchbox" id="doc-search" placeholder="Название, номер, ключевое слово" value="${h(f.q||'')}" style="margin-bottom:10px">
  <div class="row" style="margin-bottom:6px">${chip('jur',null,'Все юрисдикции')}${chip('jur','RU','🇷🇺 Россия')}${chip('jur','EAEU','🌍 ЕАЭС')}${chip('jur','EU','🇪🇺 ЕС')}</div>
  <div class="row" style="margin-bottom:14px">${chip('dir',null,'Все направления')}${Object.entries(DIRS).filter(([k])=>DOCS.some(d=>d.dir.includes(k))).map(([k,v])=>chip('dir',k,v.ic+' '+v.t)).join('')}</div>
  <div class="list">${list.map(d=>`<button class="item" data-doc="${d.id}">
    <span style="min-width:74px"><span class="tag ${statusClass(d.status)}">${statusText(d.status).split(' ')[0]}</span></span>
    <span style="flex:1"><div class="tiny">${jurFlag(d.jur)} ${h(d.kind)} ${h(d.num)} от ${h(d.date)}</div>
      <span class="t">${h(d.short)}</span><div class="small">${h(d.title.slice(0,120))}${d.title.length>120?'…':''}</div></span>
    <span class="small">${d.dir.map(x=>DIRS[x]?DIRS[x].ic:'').join('')}</span></button>`).join('')}</div>
  ${list.length?'':'<p class="small">Ничего не найдено. Измените фильтры.</p>'}`;
}
function vDoc(){
  const d = byId(DOCS, R.p.id); if(!d) return vDocs();
  const arts = ARTICLES.filter(a=>a.doc===d.id);
  const lessons = LESSONS.filter(l=>(l.arts||[]).some(a=>arts.some(x=>x.id===a)));
  const changes = CHANGES.filter(c=>c.doc===d.id);
  const exp = EXPERTS.filter(x=>x.doc===d.id);
  return `<button class="btn ghost sm" data-v="docs">← Нормативная база</button>
  <h1 style="margin-top:12px">${h(d.short)}</h1>
  <p class="lede">${h(d.title)}</p>
  <div class="row" style="margin-bottom:12px">
    <span class="tag ${statusClass(d.status)}">${statusText(d.status)}</span>
    <span class="tag law">${jurFlag(d.jur)} ${jurName(d.jur)}</span>
    ${d.dir.map(x=>DIRS[x]?`<span class="tag">${DIRS[x].ic} ${DIRS[x].t}</span>`:'').join('')}
  </div>
  ${d.statusNote?`<div class="warnstripe"><b>Актуальность не подтверждена полностью.</b> ${h(d.statusNote)}</div>`:''}
  ${d.note?`<div class="warnstripe">${h(d.note)}</div>`:''}
  <div class="card">
    <dl class="kv">
      <dt>Вид документа</dt><dd>${h(d.kind)}</dd>
      <dt>Номер</dt><dd>${h(d.num)}</dd>
      <dt>Дата принятия</dt><dd>${h(d.date)}</dd>
      <dt>Вступление в силу</dt><dd>${h(d.eff||'—')}</dd>
      <dt>Редакция</dt><dd>${h(d.edition||'—')}</dd>
      <dt>Орган</dt><dd>${h(d.authority||'—')}</dd>
      <dt>Территория действия</dt><dd>${h(d.territory||jurName(d.jur))}</dd>
      <dt>Официальный источник</dt><dd><a href="${h(d.source.url)}" target="_blank" rel="noopener">${h(d.source.name)}</a></dd>
      <dt>Сверка карточки</dt><dd>${h(d.verified)}</dd>
    </dl>
  </div>
  <h2>Для чего нужен</h2><p>${h(d.scope)}</p>
  <h2>На кого распространяется</h2><p>${h(d.who)}</p>
  <h2>Самые важные пункты</h2><ul>${(d.key||[]).map(k=>`<li>${h(k)}</li>`).join('')}</ul>
  ${arts.length?`<h2>Разобранные пункты</h2>${arts.map(a=>articleHTML(a)).join('')}`:`<div class="card"><p class="small" style="margin:0">Отдельные пункты этого документа ещё не разобраны в учебном формате. Структура базы позволяет добавить их без изменения кода: документ → пункт → объяснение → тест.</p></div>`}
  <h2>Связи с другими документами</h2>
  ${graphHTML(d)}
  <div class="list" style="margin-top:10px">${(d.related||[]).map(id=>{const r=byId(DOCS,id); return r?`<button class="item" data-doc="${r.id}"><span class="tag ${statusClass(r.status)}">${jurFlag(r.jur)}</span><span><span class="t">${h(r.short)}</span><div class="small">${h(r.kind)} ${h(r.num)}</div></span></button>`:''}).join('')}</div>
  ${changes.length?`<h2>Изменения</h2><div class="list">${changes.map(c=>`<button class="item" data-change="${c.id}"><span class="tag warn">${c.date}</span><span class="t">${h(c.title)}</span></button>`).join('')}</div>`:''}
  ${exp.length?`<h2>Мнения экспертов по этому документу</h2>${exp.map(expertHTML).join('')}`:''}
  <div class="hr"></div>
  <div class="row">
    ${lessons.length?`<button class="btn" data-lesson="${lessons[0].id}">Изучить в учебном формате</button>`:''}
    <button class="btn ghost" data-quiz='${JSON.stringify({doc:d.id})}'>Тест по документу</button>
    <a class="btn ghost" href="${h(d.source.url)}" target="_blank" rel="noopener" style="text-decoration:none">Открыть официальный источник</a>
  </div>`;
}
function graphHTML(d){
  const nodes = [d.id, ...(d.related||[])].map(id=>byId(DOCS,id)).filter(Boolean).slice(0,6);
  const W=640, H=60+nodes.length*0, cy=110;
  const R0=86;
  const pts = nodes.slice(1).map((n,i)=>{ const ang = Math.PI*(0.15 + 0.7*(i/(Math.max(1,nodes.length-2)||1)));
    return {n, x: W/2 + Math.cos(ang+Math.PI)* (W/2-90), y: 30 + (i%2? 0:150)}; });
  return `<svg class="graph" viewBox="0 0 ${W} 220" role="img" aria-label="Схема связей документов">
   ${pts.map(p=>`<line x1="${W/2}" y1="${cy}" x2="${p.x}" y2="${p.y+22}" stroke="var(--line)" stroke-width="2"/>`).join('')}
   ${pts.map(p=>`<g><rect x="${p.x-80}" y="${p.y}" width="160" height="44" rx="8" fill="var(--card)" stroke="var(--line)"/>
     <text x="${p.x}" y="${p.y+20}" text-anchor="middle" font-size="12" font-family="Golos Text,sans-serif" fill="var(--ink)">${h(p.n.short.slice(0,22))}</text>
     <text x="${p.x}" y="${p.y+35}" text-anchor="middle" font-size="10" font-family="Golos Text,sans-serif" fill="var(--muted)">${h(p.n.kind.slice(0,24))}</text></g>`).join('')}
   <rect x="${W/2-92}" y="${cy-24}" width="184" height="50" rx="9" fill="var(--blue-soft)" stroke="var(--blue)" stroke-width="2"/>
   <text x="${W/2}" y="${cy-2}" text-anchor="middle" font-size="13" font-weight="600" font-family="Golos Text,sans-serif" fill="var(--blue)">${h(d.short.slice(0,24))}</text>
   <text x="${W/2}" y="${cy+15}" text-anchor="middle" font-size="10" font-family="Golos Text,sans-serif" fill="var(--blue)">${h(d.num)}</text>
  </svg>`;
}
</script>
