<script>
/* ============================================================
   МОДУЛЬ 8. ТЕСТИРОВАНИЕ
   ============================================================ */
let QZ = null;
function pickQuestions(cfg){
  let pool = QUESTIONS.slice();
  if(cfg.course) pool = pool.filter(q=>q.c===cfg.course);
  if(cfg.dir) pool = pool.filter(q=>q.dir===cfg.dir);
  if(cfg.doc) pool = pool.filter(q=>q.basis && q.basis.doc===cfg.doc);
  if(cfg.weak){ const w = weakest(2).map(x=>x.d); pool = pool.filter(q=>w.includes(q.dir)); }
  if(cfg.studied) pool = pool.filter(q=> S.done[ (LESSONS.find(l=>l.c===q.c)||{}).id ] || S.qstats[q.id]);
  if(!pool.length) pool = QUESTIONS.slice();
  // адаптивность: чаще показываем вопросы с ошибками и давно не встречавшиеся
  const w = q => { const st=S.qstats[q.id];
    let base = 1 + (q.diff-1)*0.2;
    if(st){ base += (st.bad||0)*1.6; base -= Math.min(1.2,(st.ok||0)*0.35);
      if(st.last) base += Math.min(1.5, daysBetween(st.last, today())/20); }
    else base += 0.8;
    return Math.max(0.2, base); };
  const out=[], src=pool.slice();
  const n = Math.min(cfg.n||8, src.length);
  for(let k=0;k<n;k++){
    const total = src.reduce((a,q)=>a+w(q),0); let r = Math.random()*total;
    let idx = 0; for(let i=0;i<src.length;i++){ r-=w(src[i]); if(r<=0){ idx=i; break; } }
    out.push(src.splice(idx,1)[0]);
  }
  return out;
}
function startQuiz(cfg){
  QZ = {cfg, qs:pickQuestions(cfg), i:0, res:[], sel:null, shown:false};
  go('quiz');
}
function vTestHub(){
  const last = S.exams.slice(-3).reverse();
  return `<h1>Тесты и экзамены</h1>
  <p class="lede">Вопросы не сводятся к определениям: здесь есть ситуации, поиск нарушений, последовательности действий и вопрос «каким документом это регулируется».</p>
  <div class="grid g2">
    <div class="card"><h3 style="margin-top:0">Тренировка слабых тем</h3>
      <p class="small">Вопросы выбираются с учётом ваших ошибок и давности повторения.</p>
      <button class="btn" data-quiz='${JSON.stringify({weak:true,n:8})}'>Начать · 8 вопросов</button></div>
    <div class="card"><h3 style="margin-top:0">Еженедельный экзамен</h3>
      <p class="small">Комплексный тест по изученным темам с разбором слабых мест и рекомендациями.</p>
      <button class="btn" data-quiz='${JSON.stringify({exam:'week',n:12})}'>Начать · 12 вопросов</button></div>
  </div>
  <h2>По направлениям</h2>
  <div class="grid g3">${Object.entries(DIRS).filter(([k])=>QUESTIONS.some(q=>q.dir===k)).map(([k,v])=>`
    <button class="item" data-quiz='${JSON.stringify({dir:k,n:8})}'><span>${v.ic}</span>
      <span><span class="t">${v.t}</span><div class="small">${QUESTIONS.filter(q=>q.dir===k).length} вопросов · освоено ${pct(mastery(k))}%</div></span></button>`).join('')}</div>
  <h2>Итоговая аттестация</h2>
  <div class="card">
    <p class="small">Расширенный экзамен по всем изученным направлениям. Часть вопросов — ситуационные: нужно решить, что делать специалисту.</p>
    <button class="btn" data-quiz='${JSON.stringify({exam:'final',n:Math.min(20,QUESTIONS.length)})}'>Начать итоговую аттестацию</button>
  </div>
  ${last.length?`<h2>Последние результаты</h2><div class="list">${last.map(e=>`<div class="item" style="cursor:default">
    <span class="tag ${e.score/e.total>=0.8?'ok':e.score/e.total>=0.6?'warn':'bad'}">${Math.round(e.score/e.total*100)}%</span>
    <span><span class="t">${e.scope}</span><div class="small">${e.date} · ${e.score} из ${e.total}</div></span></div>`).join('')}</div>`:''}`;
}
function vQuiz(){
  if(!QZ) return vTestHub();
  if(QZ.i >= QZ.qs.length) return vResult();
  const q = QZ.qs[QZ.i];
  const prog = Math.round(QZ.i/QZ.qs.length*100);
  return `<div class="between"><button class="btn ghost sm" data-v="test">← Выйти</button>
    <span class="small">Вопрос ${QZ.i+1} из ${QZ.qs.length} · сложность ${'●'.repeat(q.diff)}</span></div>
  <div class="bar" style="margin:12px 0 18px"><i style="width:${prog}%"></i></div>
  <div class="card">
    <div class="tiny">${DIRS[q.dir].ic} ${DIRS[q.dir].t} · ${typeName(q.type)}</div>
    <h2 style="margin:6px 0 14px">${h(q.q)}</h2>
    <div id="qbody">${qBody(q)}</div>
    <div id="qfeed"></div>
    <div class="row" style="margin-top:14px" id="qctl">
      ${QZ.shown?`<button class="btn" id="q-next">${QZ.i+1<QZ.qs.length?'Следующий вопрос':'Показать результат'}</button>
        <button class="btn ghost" id="q-explain">Объяснить подробнее</button>
        <button class="btn ghost" id="q-later">Повторить позже</button>`
      :`<button class="btn" id="q-check">Ответить</button>`}
    </div>
    <div id="q-ai"></div>
  </div>`;
}
function typeName(t){ return {single:'один ответ', multi:'несколько ответов', tf:'верно / неверно', match:'сопоставление',
  order:'последовательность', violation:'найди нарушение', situation:'производственная ситуация',
  whichdoc:'какой документ применяется', whichclause:'какое требование применяется'}[t]||t; }
function qBody(q){
  const st = i => QZ.shown ? (isOptCorrect(q,i) ? 'ok' : (selected(i) ? 'bad':'')) : (selected(i)?'sel':'');
  const selected = i => Array.isArray(QZ.sel) ? QZ.sel.includes(i) : QZ.sel===i;
  switch(q.type){
    case 'tf':
      return `<div class="list">${[['Верно',true],['Неверно',false]].map(([t,v],i)=>`
        <button class="quiz-opt" data-opt="${v}" data-state="${QZ.shown?(q.a===v?'ok':(QZ.sel===v?'bad':'')):(QZ.sel===v?'sel':'')}">
        <span class="mk">${v?'В':'Н'}</span><span>${t}</span></button>`).join('')}</div>`;
    case 'multi':
      return `<div class="list">${q.opts.map((o,i)=>`<button class="quiz-opt" data-opt="${i}" data-state="${st(i)}">
        <span class="mk">${(QZ.sel||[]).includes(i)?'✓':''}</span><span>${h(o)}</span></button>`).join('')}</div>
        <p class="tiny">Можно выбрать несколько вариантов.</p>`;
    case 'order':
      return `<p class="tiny">Нажимайте пункты в правильном порядке.</p><div class="list">${q.items.map((o,i)=>{
        const pos = (QZ.sel||[]).indexOf(i);
        return `<button class="quiz-opt" data-opt="${i}" data-state="${QZ.shown?(pos===q.a.indexOf(i)?'ok':'bad'):(pos>=0?'sel':'')}">
          <span class="mk">${pos>=0?pos+1:''}</span><span>${h(o)}</span></button>`;}).join('')}</div>`;
    case 'violation':
      return `<p class="tiny">Отметьте все нарушения.</p><div class="list">${q.items.map((o,i)=>{
        const sel = (QZ.sel||[]).includes(i);
        return `<button class="quiz-opt" data-opt="${i}" data-state="${QZ.shown?(o.v?'ok':(sel?'bad':'')):(sel?'sel':'')}">
          <span class="mk">${sel?'✓':''}</span><span>${h(o.t)}${QZ.shown?`<div class="tiny">${o.v?'Нарушение':'Соответствует'} · ${h(o.b)}</div>`:''}</span></button>`;}).join('')}</div>`;
    case 'match':
      return `<div class="list">${q.pairs.map((p,i)=>`<div class="quiz-opt" style="cursor:default" data-state="${QZ.shown?((QZ.sel||{})[i]===i?'ok':'bad'):''}">
        <span style="flex:1"><b>${h(p[0])}</b></span>
        <select data-match="${i}" style="flex:1;padding:6px;border-radius:7px;border:1px solid var(--line);background:var(--card)">
          <option value="">— выберите —</option>
          ${q.pairs.map((x,j)=>`<option value="${j}" ${(QZ.sel||{})[i]===j?'selected':''}>${h(x[1])}</option>`).join('')}
        </select></div>`).join('')}</div>`;
    default:
      return `<div class="list">${q.opts.map((o,i)=>`<button class="quiz-opt" data-opt="${i}" data-state="${st(i)}">
        <span class="mk">${'АБВГД'[i]}</span><span>${h(o)}</span></button>`).join('')}</div>`;
  }
}
function isOptCorrect(q,i){
  if(q.type==='multi') return q.a.includes(i);
  if(q.type==='violation') return q.items[i].v;
  if(q.type==='order') return true;
  return q.a===i;
}
function gradeQuestion(q){
  const s = QZ.sel;
  switch(q.type){
    case 'tf': return s===q.a;
    case 'multi': { const a=[...q.a].sort().join(), b=[...(s||[])].sort().join(); return a===b; }
    case 'order': return JSON.stringify(s||[])===JSON.stringify(q.a);
    case 'violation': { const right = q.items.map((x,i)=>x.v?i:null).filter(x=>x!==null);
      return JSON.stringify([...(s||[])].sort())===JSON.stringify(right.sort()); }
    case 'match': return q.pairs.every((p,i)=>(s||{})[i]===i);
    default: return s===q.a;
  }
}
function feedbackHTML(q, ok){
  const d = q.basis ? byId(DOCS, q.basis.doc) : null;
  return `<div class="${ok?'expl':'warnstripe'}" style="margin-top:16px">
    <h4 style="margin:0 0 6px">${ok?'Верно':'Неверно'}</h4>
    <p><b>Почему так.</b> ${h(q.why)}</p>
    ${q.trap?`<p><b>Почему легко ошибиться.</b> ${h(q.trap)}</p>`:''}
    ${d?`<p style="margin-bottom:6px"><b>Нормативное основание.</b> ${h(d.kind)} ${h(d.num)} — ${h(q.basis.cl)} <span class="tag ${statusClass(d.status)}">${statusText(d.status)}</span></p>
      ${sourceBtn(q.basis.doc, q.basis.cl)}`:''}
  </div>`;
}
function vResult(){
  const total = QZ.qs.length, score = QZ.res.filter(r=>r.ok).length;
  const p = score/total;
  const byDir = {};
  QZ.res.forEach(r=>{ const q=byId(QUESTIONS,r.id); byDir[q.dir]=byDir[q.dir]||{ok:0,n:0}; byDir[q.dir].n++; if(r.ok) byDir[q.dir].ok++; });
  const wrong = QZ.res.filter(r=>!r.ok).map(r=>byId(QUESTIONS,r.id));
  const docs = [...new Set(wrong.map(q=>q.basis&&q.basis.doc).filter(Boolean))];
  if(QZ.cfg.exam && !QZ.saved){ QZ.saved=true;
    S.exams.push({date:today(), scope: QZ.cfg.exam==='final'?'Итоговая аттестация':'Еженедельный экзамен', score, total}); save(); }
  return `<h1>Результат</h1>
  <div class="hero"><div class="small">${QZ.cfg.exam==='final'?'Итоговая аттестация':QZ.cfg.exam?'Еженедельный экзамен':'Тест'}</div>
    <div class="v">${Math.round(p*100)}%</div>
    <div class="small" style="margin-top:8px">${score} из ${total} · ${p>=0.8?'Уровень уверенного применения':p>=0.6?'База есть, нужна практика':'Материал требует повторного изучения'}</div></div>
  <h2>По направлениям</h2>
  <div class="grid g3">${Object.entries(byDir).map(([d,v])=>`<div class="stat"><div class="v">${Math.round(v.ok/v.n*100)}%</div>
    <div class="l">${DIRS[d].ic} ${DIRS[d].t} · ${v.ok}/${v.n}</div></div>`).join('')}</div>
  ${wrong.length?`<h2>Разбор ошибок</h2><div class="list">${wrong.map(q=>`
    <div class="card"><div class="tiny">${DIRS[q.dir].t} · ${typeName(q.type)}</div>
      <b>${h(q.q)}</b>
      <p class="small" style="margin-top:8px">${h(q.why)}</p>
      <div class="row">${q.basis?sourceBtn(q.basis.doc,q.basis.cl):''}
        <button class="btn ghost sm" data-later="${q.id}">Повторить позже</button>
        ${q.art?`<button class="btn ghost sm" data-article="${q.art}">Изучить пункт</button>`:''}</div></div>`).join('')}</div>`
    :`<div class="expl"><h4>Ошибок нет</h4><p>Стабильный результат повышает уровень освоения сильнее, чем один удачный тест. Вернитесь к этим темам через несколько дней.</p></div>`}
  <h2>Что делать дальше</h2>
  <ul>
    ${docs.length?`<li>Повторить документы: ${docs.map(id=>h(byId(DOCS,id).short)).join(', ')}.</li>`:''}
    ${weakest(1).map(w=>`<li>Слабое направление — ${DIRS[w.d].t} (${pct(w.m)}%). Пройдите уроки и тест по нему.</li>`).join('')}
    <li>Через 1–3 дня пройдите повторение карточек: без него уровень освоения снижается.</li>
  </ul>
  <div class="row"><button class="btn" data-v="test">К тестам</button><button class="btn ghost" data-v="review">Повторение</button>
   <button class="btn ghost" data-v="home">На главную</button></div>`;
}

/* ============================================================
   МОДУЛЬ 9. ПОВТОРЕНИЕ, ЕЖЕДНЕВНЫЙ РЕЖИМ
   ============================================================ */
let CARD = {id:null, open:false};
function vReview(){
  const due = dueCards();
  if(!due.length) return `<h1>Повторение</h1>
    <div class="card"><p>Сейчас карточек к повторению нет. Ближайшие вернутся по расписанию — интервалы растут: 1 → 3 → 7 → 16 → 35 дней.</p>
    <button class="btn" data-v="learn">Продолжить обучение</button></div>
    <h2>Все карточки</h2><div class="list">${CARDS.map(c=>`<div class="item" style="cursor:default"><span>${DIRS[c.dir].ic}</span>
      <span><span class="t">${h(c.f)}</span><div class="small">Повтор: ${S.srs[c.id]?new Date(S.srs[c.id].due).toLocaleDateString('ru-RU'):'не начато'}</div></span></div>`).join('')}</div>`;
  const c = byId(CARDS, CARD.id) && due.some(x=>x.id===CARD.id) ? byId(CARDS,CARD.id) : due[0];
  CARD.id = c.id;
  const d = byId(DOCS, c.basis.doc);
  return `<div class="between"><h1 style="margin:0">Повторение</h1><span class="small">Осталось: ${due.length}</span></div>
  <p class="lede">Интервальное повторение удерживает знание формулировок и не даёт уровню освоения снижаться.</p>
  <div class="flash">
    <div class="tiny">${DIRS[c.dir].ic} ${DIRS[c.dir].t}</div>
    <div style="font-size:19px;font-weight:600">${h(c.f)}</div>
    ${CARD.open?`<div class="hr" style="margin:10px 0"></div><div>${h(c.b)}</div>
      <div class="tiny" style="margin-top:8px">Основание: ${h(d.kind)} ${h(d.num)} · ${h(c.basis.cl)}</div>`:''}
  </div>
  <div class="row" style="margin-top:14px">
    ${CARD.open
      ? `<button class="btn ghost" data-grade="0">Не знаю</button><button class="btn ghost" data-grade="1">Знаю плохо</button>
         <button class="btn soft" data-grade="2">Знаю</button><button class="btn" data-grade="3">Знаю отлично</button>
         ${sourceBtn(c.basis.doc, c.basis.cl)}`
      : `<button class="btn" id="card-open">Показать ответ</button>
         <button class="btn ghost" onclick="speak(${JSON.stringify(c.f).replace(/"/g,'&quot;')}, this)">▶ Слушать</button>`}
  </div>`;
}
function vDaily(){
  const m = S.profile.minutes;
  const l = nextLesson();
  const a = ARTICLES[Math.floor(Date.now()/DAY) % ARTICLES.length];
  const n = m===15?4:m===30?8:14;
  const due = dueCards().slice(0, m===15?3:m===30?6:12);
  return `<h1>${m} минут сегодня</h1>
  <p class="lede">Короткая программа на день: теория → норма → вопросы → ситуация → карточки. Серия: ${S.streak} дней подряд.</p>
  <div class="list">
    ${l?`<button class="item" data-lesson="${l.id}"><span>1</span><span><span class="t">Теория: ${h(l.title)}</span><div class="small">${h(byId(COURSES,l.c).title)}</div></span></button>`:''}
    <button class="item" data-article="${a.id}"><span>2</span><span><span class="t">Норма дня: ${h(a.title)}</span><div class="small">${h(byId(DOCS,a.doc).short)} · ${h(a.clause)}</div></span></button>
    <button class="item" data-quiz='${JSON.stringify({weak:true,n:n})}'><span>3</span><span><span class="t">${n} вопросов по слабым темам</span><div class="small">Подбираются адаптивно</div></span></button>
    <button class="item" data-scenario="${SCENARIOS[Math.floor(Date.now()/DAY)%SCENARIOS.length].id}"><span>4</span><span><span class="t">Практическая ситуация</span><div class="small">Режим «Ты — специалист»</div></span></button>
    <button class="item" data-v="review"><span>5</span><span><span class="t">Карточки: ${due.length}</span><div class="small">Интервальное повторение</div></span></button>
  </div>
  <div class="row" style="margin-top:14px">${[15,30,60].map(x=>`<button class="chip" data-min="${x}" aria-pressed="${m===x}">${x===60?'1 час':x+' минут'}</button>`).join('')}</div>`;
}

/* ============================================================
   МОДУЛЬ 10. ПРАКТИКА
   ============================================================ */
let INS = {id:null, sel:[], done:false};
let SCN = {id:null, step:0, answers:[]};
function vPractice(){
  return `<h1>Практика</h1>
  <p class="lede">Здесь проверяется не память, а способность действовать: найти нарушение, назвать требование и принять решение.</p>
  <h2>Ты — инспектор</h2>
  <div class="list">${INSPECTIONS.map(i=>`<button class="item" data-inspect="${i.id}"><span>🔎</span>
    <span style="flex:1"><span class="t">${h(i.title)}</span><div class="small">${h(i.intro)}</div></span>
    ${S.practice[i.id]?`<span class="tag ok">${S.practice[i.id].score}%</span>`:''}</button>`).join('')}</div>
  <h2>Ты — специалист по охране труда</h2>
  <div class="list">${SCENARIOS.map(s=>`<button class="item" data-scenario="${s.id}"><span>🦺</span>
    <span style="flex:1"><span class="t">${h(s.title)}</span><div class="small">${h(s.intro)}</div></span>
    ${S.practice[s.id]?`<span class="tag ok">${S.practice[s.id].score}%</span>`:''}</button>`).join('')}</div>
  <h2>Обучение по примеру</h2>
  <p class="small">Ситуация — какой документ применяется — норма — разбор — действия — ответственность.</p>
  <div class="list">${EXAMPLES.slice(0,4).map(e=>`<button class="item" data-example="${e.id}"><span>${DIRS[e.dir].ic}</span>
    <span style="flex:1"><span class="t">${h(e.title)}</span><div class="small">${h(e.tag)} · ${h(byId(DOCS,e.norm.doc).short)}</div></span>
    ${S.practice[e.id]?`<span class="tag ok">✓</span>`:''}</button>`).join('')}</div>
  <div class="row" style="margin:8px 0 4px"><button class="btn ghost sm" data-v="examples">Все примеры (${EXAMPLES.length})</button></div>
  <h2>Разбор реальных ситуаций</h2>
  <div class="list">${CASES.map(c=>`<button class="item" data-case="${c.id}"><span>${DIRS[c.dir].ic}</span>
    <span style="flex:1"><span class="t">${h(c.title)}</span><div class="small">${h(c.story.slice(0,110))}…</div></span></button>`).join('')}</div>`;
}
function vInspect(){
  const i = byId(INSPECTIONS, INS.id); if(!i) return vPractice();
  const total = i.items.filter(x=>x.v).length;
  const found = INS.sel.filter(k=>i.items[k].v).length;
  const wrong = INS.sel.filter(k=>!i.items[k].v).length;
  return `<button class="btn ghost sm" data-v="practice">← Практика</button>
  <h1 style="margin-top:12px">${h(i.title)}</h1><p class="lede">${h(i.intro)}</p>
  <div class="list">${i.items.map((x,k)=>{
    const sel = INS.sel.includes(k);
    const state = INS.done ? (x.v?'ok':(sel?'bad':'')) : (sel?'sel':'');
    return `<button class="quiz-opt" data-ins="${k}" data-state="${state}">
      <span class="mk">${sel?'✓':''}</span>
      <span style="flex:1">${h(x.t)}
        ${INS.done?`<div class="tiny" style="margin-top:6px">${x.v?'🟥 Нарушение':'🟩 Соответствует'} · ${h(byId(DOCS,x.doc).short)}, ${h(x.cl)}</div>
          <div class="small" style="margin-top:4px"><b>Что нужно сделать:</b> ${h(x.fix)}</div>`:''}</span>
      ${INS.done&&x.v?sourceBtn(x.doc,x.cl):''}</button>`;}).join('')}</div>
  <div class="row" style="margin-top:14px">
    ${INS.done
      ? `<span class="tag ${found===total&&!wrong?'ok':'warn'}">Найдено ${found} из ${total}${wrong?`, лишних отметок: ${wrong}`:''}</span>
         <button class="btn" data-v="practice">Завершить</button>`
      : `<button class="btn" id="ins-check">Завершить проверку</button>`}
  </div>`;
}
function vScenario(){
  const s = byId(SCENARIOS, SCN.id); if(!s) return vPractice();
  if(SCN.step >= s.steps.length){
    const ok = SCN.answers.filter(a=>a).length;
    const score = Math.round(ok/s.steps.length*100);
    if(!S.practice[s.id] || S.practice[s.id].score<score){ S.practice[s.id]={score, date:today()}; addXP(12); save(); }
    return `<h1>Разбор действий</h1>
    <div class="hero"><div class="small">${h(s.title)}</div><div class="v">${score}%</div>
      <div class="small" style="margin-top:8px">Верных решений: ${ok} из ${s.steps.length}</div></div>
    ${s.steps.map((st,i)=>`<div class="card" style="margin-bottom:10px"><div class="tiny">Шаг ${i+1}</div><b>${h(st.q)}</b>
      <div class="${SCN.answers[i]?'expl':'warnstripe'}" style="margin-top:10px">
        <p style="margin:0">${SCN.answers[i]?'Вы выбрали верное действие.':'Здесь решение было неверным.'} ${h(st.opts.find(o=>o.ok).why)}</p></div></div>`).join('')}
    <div class="row"><button class="btn" data-v="practice">К практике</button><button class="btn ghost" data-scenario="${s.id}" data-restart="1">Пройти заново</button></div>`;
  }
  const st = s.steps[SCN.step];
  return `<button class="btn ghost sm" data-v="practice">← Практика</button>
  <h1 style="margin-top:12px">${h(s.title)}</h1>
  <div class="warnstripe">${h(s.intro)}</div>
  <div class="card"><div class="tiny">Шаг ${SCN.step+1} из ${s.steps.length}</div>
    <h2 style="margin:6px 0 12px">${h(st.q)}</h2>
    <div class="list">${st.opts.map((o,i)=>`<button class="quiz-opt" data-scn="${i}"><span class="mk">${'АБВ'[i]}</span><span>${h(o.t)}</span></button>`).join('')}</div>
  </div>`;
}
function vCase(){
  const c = byId(CASES, R.p.id); if(!c) return vPractice();
  return `<button class="btn ghost sm" data-v="practice">← Практика</button>
  <h1 style="margin-top:12px">${h(c.title)}</h1>
  <div class="card"><h3 style="margin-top:0">Что произошло</h3><p>${h(c.story)}</p></div>
  <h2>Какие требования применяются</h2><ul>${c.reqs.map(x=>`<li>${h(x)}</li>`).join('')}</ul>
  <h2>Какие ошибки были допущены</h2><ul>${c.errors.map(x=>`<li>${h(x)}</li>`).join('')}</ul>
  <h2>Что необходимо было сделать</h2><ul>${c.should.map(x=>`<li>${h(x)}</li>`).join('')}</ul>
  <h2>Документы, регулирующие ситуацию</h2>
  <div class="list">${c.docs.map(id=>{const d=byId(DOCS,id); return `<button class="item" data-doc="${id}">
    <span class="tag ${statusClass(d.status)}">${jurFlag(d.jur)}</span><span><span class="t">${h(d.short)}</span><div class="small">${h(d.kind)} ${h(d.num)}</div></span></button>`;}).join('')}</div>
  <div class="row" style="margin-top:14px"><button class="btn" data-quiz='${JSON.stringify({dir:c.dir,n:5})}'>Проверить себя по теме</button></div>`;
}

/* ============================================================
   МОДУЛЬ 11. ИЗМЕНЕНИЯ, ЭКСПЕРТЫ, AI, ПРОГРЕСС, ПОИСК
   ============================================================ */
function vChanges(){
  return `<h1>Изменения законодательства</h1>
  <p class="lede">Система отслеживает редакции документов, показывает «было → стало», объясняет смысл изменения и отмечает затронутые учебные материалы.</p>
  ${CHANGES.map(c=>{
    const d = byId(DOCS,c.doc);
    const mine = (c.affected||[]).some(a=>S.done[a]||S.qstats[a]);
    return `<div class="card" style="margin-bottom:12px">
      <div class="between"><div><div class="tiny">${c.date} · ${h(d.short)}</div><h3 style="margin:2px 0">${h(c.title)}</h3></div>
        <span class="tag ${c.sev==='high'?'bad':'warn'}">${c.sev==='high'?'важное':'информационное'}</span></div>
      ${mine?`<div class="warnstripe" style="margin:8px 0"><b>Затронуты материалы, которые вы изучали.</b> Рекомендуется повторить тему и пройти обновлённый тест.</div>`:''}
      <p class="small">${h(c.what)}</p>
      <div class="grid g2">
        <div class="expl" style="border-left-color:var(--red)"><h4>Было</h4><p>${h(c.before)}</p></div>
        <div class="expl" style="border-left-color:var(--green)"><h4>Стало</h4><p>${h(c.after)}</p></div>
      </div>
      <div class="expl"><h4>Что это значит простыми словами</h4><p>${h(c.plain)}</p></div>
      <div class="expl"><h4>Что теперь нужно сделать</h4><ul>${c.todo.map(t=>`<li>${h(t)}</li>`).join('')}</ul></div>
      <div class="row">${sourceBtn(c.doc,null)}<button class="btn ghost sm" data-doc="${c.doc}">Карточка документа</button>
        <button class="btn ghost sm" data-readch="${c.id}">${S.readChanges.includes(c.id)?'Отмечено как прочитанное':'Отметить как прочитанное'}</button></div>
    </div>`;}).join('')}
  <div class="card"><h3 style="margin-top:0">Как это работает в полной версии</h3>
    <p class="small">Модуль мониторинга сравнивает редакции документов из официальных источников, выделяет изменённые пункты, помечает затронутые уроки, вопросы и карточки и ставит их в очередь на обновление и на повторение пользователю. В демонстрационной сборке изменения внесены как проверенные записи.</p></div>`;
}
function expertHTML(x){
  const d = byId(DOCS, x.doc);
  return `<div class="opinion">
    <div class="lbl">🟨 МНЕНИЕ / КОММЕНТАРИЙ ЭКСПЕРТА — НЕ НОРМАТИВНОЕ ТРЕБОВАНИЕ</div>
    <p style="margin:0 0 8px">${h(x.thesis)}</p>
    <div class="tiny">${h(x.author)} · ${h(x.src)} · ${h(x.date)} · по документу: ${h(d.short)}, ${h(x.cl)}</div>
    <div class="expl" style="margin-top:10px;background:var(--card)"><h4>Как это соотносится с нормой</h4><p>${h(x.status)}</p></div>
    ${x.counter?`<div class="expl" style="background:var(--card)"><h4>Противоположная позиция</h4><p>${h(x.counter)}</p></div>`:''}
    <div class="row">${sourceBtn(x.doc, x.cl)}${x.url?`<a class="btn ghost sm" href="${h(x.url)}" target="_blank" rel="noopener">Источник</a>`:'<span class="tiny">Ссылка на источник не подтверждена</span>'}</div>
  </div>`;
}
function vExperts(){
  return `<h1>Мнения и практика</h1>
  <p class="lede">Материалы специалистов из открытых источников. Они помогают понять практику, но не являются нормой. Приложение всегда разделяет два цвета: синий — требование, жёлтый — мнение.</p>
  <div class="grid g2" style="margin-bottom:14px">
    <div class="norm"><div class="lbl">🟦 ЗАКОНОДАТЕЛЬНОЕ ТРЕБОВАНИЕ</div><p class="small" style="margin:0">Обязательно к исполнению. Имеет документ, пункт, редакцию и официальный источник.</p></div>
    <div class="opinion"><div class="lbl">🟨 МНЕНИЕ ЭКСПЕРТА</div><p class="small" style="margin:0">Практика и трактовка. Может не совпадать у разных специалистов и не заменяет норму.</p></div>
  </div>
  ${EXPERTS.map(expertHTML).join('')}
  <div class="card"><h3 style="margin-top:0">Подключение источников</h3>
    <p class="small">Структура записи: канал · автор · дата · ссылка · тема · документ · пункт · краткое содержание · признак «мнение/норма». Закрытые каналы и материалы без разрешённого доступа не используются, большие объёмы защищённого контента не копируются — только ссылка и краткая выдержка.</p>
    <p class="small">Приоритет источников: 1) официальные правовые системы и сайты госорганов → 2) официальные разъяснения → 3) стандарты → 4) профессиональные эксперты → 5) Telegram, форумы, блоги. Чем ниже уровень, тем заметнее пометка «это не норма».</p></div>`;
}
let AIC = [];
function vAI(){
  return `<h1>AI-помощник</h1>
  <p class="lede">Помощник объясняет пункты, строит примеры и проверяет вас. Он работает только с материалами приложения и не придумывает нормы: если подтверждения нет, он прямо об этом скажет.</p>
  <div class="warnstripe">AI не является источником права. Любой ответ проверяйте по карточке документа и официальному источнику.</div>
  <div class="row" style="margin-bottom:10px">
    ${['Объясни, что такое наряд-допуск','Чем инструктаж отличается от обучения по программе','Дай пример нарушения на складе','Проверь меня по электробезопасности'].map(q=>`<button class="chip" data-aiq="${h(q)}">${h(q)}</button>`).join('')}
  </div>
  <div class="card" id="ai-log" style="min-height:120px">${AIC.length?AIC.map(m=>`
    <div style="margin-bottom:12px"><div class="tiny">${m.role==='user'?'Вы':'Помощник'}</div>
    <div style="white-space:pre-wrap">${h(m.text)}</div></div>`).join(''):'<p class="small" style="margin:0">Задайте вопрос — например, попросите объяснить пункт «как новичку», а затем «как специалисту».</p>'}</div>
  <div class="row" style="margin-top:10px">
    <input class="searchbox" id="ai-input" placeholder="Ваш вопрос" style="flex:1">
    <button class="btn" id="ai-send">Спросить</button>
  </div>`;
}
function aiContextAll(){
  return DOCS.map(d=>`${d.kind} ${d.num} «${d.short}» от ${d.date}. Статус: ${statusText(d.status)}. Юрисдикция: ${jurName(d.jur)}. Предмет: ${d.scope}`).join('\n')
   + '\n\nРАЗОБРАННЫЕ ПУНКТЫ:\n' + ARTICLES.map(a=>`${byId(DOCS,a.doc).short} ${a.clause}: ${a.text} | Простыми словами: ${a.simple}`).join('\n');
}
async function aiSend(q){
  if(!q.trim()) return;
  AIC.push({role:'user', text:q}); AIC.push({role:'ai', text:'Думаю…'}); render();
  const res = await ask(q, aiContextAll(), (t)=>{ AIC[AIC.length-1].text = t; const log=$('#ai-log');
    if(log) log.lastElementChild.lastElementChild.textContent = t; });
  AIC[AIC.length-1].text = res.err
    ? (res.err==='off' || res.err==='not_granted'
       ? 'AI-помощник недоступен в этом режиме просмотра. Все объяснения, примеры и тесты доступны без него — они подготовлены заранее и привязаны к документам.'
       : 'Не удалось получить ответ. Повторите позже.')
    : res.text;
  render();
}
function vProgress(){
  const dirs = Object.keys(DIRS).filter(d=>COURSES.some(c=>c.dir===d));
  const lessons = Object.keys(S.done).length, arts = new Set();
  Object.keys(S.done).forEach(id=>{ const l=byId(LESSONS,id); (l?.arts||[]).forEach(a=>arts.add(a)); });
  const answered = Object.values(S.qstats).reduce((a,v)=>a+(v.ok||0)+(v.bad||0),0);
  return `<h1>Мой прогресс</h1>
  <p class="lede">Уровень освоения — не оценка знаний по закону, а измеряемый показатель: теория, тесты с учётом сложности, практика, стабильность и повторение.</p>
  <div class="hero"><div class="small">Общий уровень освоения</div><div class="v">${pct(overall())}%</div>
    <div class="bar" style="margin-top:12px"><i style="width:${pct(overall())}%"></i></div></div>
  <div class="grid g3" style="margin-bottom:8px">
    <div class="stat"><div class="v">${lessons}</div><div class="l">уроков пройдено</div></div>
    <div class="stat"><div class="v">${arts.size}</div><div class="l">нормативных пунктов изучено</div></div>
    <div class="stat"><div class="v">${answered}</div><div class="l">ответов на вопросы</div></div>
    <div class="stat"><div class="v">${S.streak}</div><div class="l">дней подряд</div></div>
    <div class="stat"><div class="v">${S.xp}</div><div class="l">XP · уровень ${Math.floor(S.xp/100)+1}</div></div>
    <div class="stat"><div class="v">${dueCards().length}</div><div class="l">карточек к повторению</div></div>
  </div>
  <h2>По направлениям</h2>
  ${dirs.map(d=>{const m=mastery(d); return `<div style="margin-bottom:12px">
    <div class="between" style="margin-bottom:4px"><span>${DIRS[d].ic} ${DIRS[d].t}</span><b class="num">${pct(m)}%</b></div>
    <div class="bar"><i style="width:${pct(m)}%;background:${m<0.5?'var(--red)':m<0.75?'var(--amber)':'var(--green)'}"></i></div>
    <div class="tiny">${lastActivity(d)?'Последняя активность: '+lastActivity(d):'Ещё не изучалось'}</div></div>`;}).join('')}
  ${weakest(1)[0]&&weakest(1)[0].m<0.75?`<div class="warnstripe"><b>Рекомендация.</b> Повторите направление «${DIRS[weakest(1)[0].d].t}» — там уровень освоения ниже всего.</div>`:''}
  <h2>Достижения</h2>
  <div class="grid g3">${ACHIEVEMENTS.map(a=>`<div class="stat" style="opacity:${S.ach.includes(a.id)?1:.45}">
    <div style="font-size:22px">${a.ic}</div><div style="font-weight:600;margin-top:4px">${a.t}</div><div class="l">${a.d}</div></div>`).join('')}</div>
  <h2>Сохранённые темы</h2>
  ${S.saved.length?`<div class="list">${S.saved.map(id=>{const l=byId(LESSONS,id); return l?`<button class="item" data-lesson="${id}"><span>★</span><span class="t">${h(l.title)}</span></button>`:'';}).join('')}</div>`:'<p class="small">Пока ничего не сохранено. На странице урока есть кнопка «Сохранить тему».</p>'}
  <div class="hr"></div>
  <div class="row"><span class="tiny">Данные хранятся ${storageMode==='cloud'?'в вашем защищённом хранилище приложения':'локально в этом браузере'}.</span>
   <button class="btn ghost sm" id="reset">Сбросить прогресс</button></div>`;
}
function vSearch(){
  const q = R.p.q||'';
  const res = searchAll(q);
  const docHits = res.filter(r=>r.kind==='Документ'||r.kind==='Пункт документа');
  return `<h1>Умный поиск</h1>
  <p class="lede">Спросите как на работе: «требования к работам на высоте», «что делать при поражении током», «огневые работы».</p>
  <input class="searchbox" id="search-input" placeholder="Например: работы на высоте" value="${h(q)}">
  <div class="row" style="margin:10px 0">${['работы на высоте','наряд-допуск','огневые работы','СИЗ','отходы','инструктаж'].map(x=>`<button class="chip" data-sq="${h(x)}">${h(x)}</button>`).join('')}</div>
  ${q?`<div class="small" style="margin-bottom:8px">Найдено: ${res.length}</div>`:''}
  ${res.length?`<div class="list">${res.map((r,i)=>`<button class="item" data-sres="${i}">
    <span class="tag ${r.kind==='Документ'?'law':r.kind==='Мнение эксперта'?'warn':''}">${r.kind}</span>
    <span style="flex:1"><span class="t">${h(r.t)}</span><div class="small">${h(r.d)}</div></span></button>`).join('')}</div>`
   : q?`<div class="card"><p>По запросу ничего не найдено в базе приложения.</p>
       <p class="small">Это честный ответ: приложение не показывает выдуманные требования. Проверьте формулировку или откройте нормативную базу.</p>
       <button class="btn ghost" data-v="docs">Открыть базу документов</button></div>`:''}
  ${q&&docHits.length?`<div class="card" style="margin-top:12px"><h3 style="margin-top:0">Что дальше</h3>
    <div class="row"><button class="btn ghost sm" data-quiz='${JSON.stringify({n:5})}'>Проверить себя по теме</button>
    <button class="btn ghost sm" data-v="ai">Спросить AI-помощника</button></div></div>`:''}`;
}
function vCompare(){
  return `<h1>Россия / ЕАЭС / Европейский союз</h1>
  <p class="lede">Требования разных правопорядков сравниваются, но никогда не смешиваются: у каждой строки свой источник. Ссылка на директиву ЕС не является нормативным основанием в России и наоборот.</p>
  <div class="row" style="margin-bottom:12px">
    <button class="btn ghost sm" data-filter='${JSON.stringify({jur:'RU'})}' data-gov="docs">🇷🇺 Документы России</button>
    <button class="btn ghost sm" data-filter='${JSON.stringify({jur:'EAEU'})}' data-gov="docs">🌍 Документы ЕАЭС</button>
    <button class="btn ghost sm" data-filter='${JSON.stringify({jur:'EU'})}' data-gov="docs">🇪🇺 Документы ЕС</button>
  </div>
  <div style="overflow-x:auto"><table>
    <thead><tr><th style="width:130px">Требование</th><th>🇷🇺 Россия</th><th>🇪🇺 ЕС / страна ЕС</th></tr></thead>
    <tbody>${COMPARE.map(c=>`<tr><td><b>${h(c.topic)}</b></td>
      <td>${h(c.ru.t)}<div class="tiny" style="margin-top:6px">Источник: ${h(c.ru.s)}</div></td>
      <td>${h(c.eu.t)}<div class="tiny" style="margin-top:6px">Источник: ${h(c.eu.s)}</div></td></tr>`).join('')}</tbody>
  </table></div>
  <div class="warnstripe" style="margin-top:14px">В ЕС директива обязывает государство, а работодателя — национальный закон. Поэтому для Германии, Франции, Италии или Польши всегда проверяйте национальный акт: ArbSchG и BetrSichV, Code du travail и аналогичные документы.</div>`;
}
function vArch(){
  return `<h1>Архитектура проекта</h1>
  <p class="lede">Это не одноразовый макет: перед вами работающее ядро с той же моделью данных, что и в целевой системе. Раздел показывает, как приложение устроено и как его расширять.</p>
  <h2>Стек</h2>
  <ul>
    <li><b>Клиент:</b> React Native / Expo для iOS и Android + React (Next.js) для веба; общий слой доменной логики на TypeScript.</li>
    <li><b>Бэкенд:</b> Node.js (NestJS или Fastify), REST/GraphQL API, очереди для фоновых задач.</li>
    <li><b>Данные:</b> PostgreSQL (основная база) + полнотекстовый поиск (pg_trgm / OpenSearch) + объектное хранилище для видео и аудио.</li>
    <li><b>AI:</b> Claude API через серверный шлюз с обязательным RAG по собственной базе документов и жёстким запретом на ответы без источника.</li>
    <li><b>Инфраструктура:</b> авторизация (OAuth/OIDC), push-уведомления, планировщик задач мониторинга редакций, аналитика обучения.</li>
  </ul>
  <h2>Модули</h2>
  <div class="grid g3">${[
    ['Нормативная база','documents, articles, статусы, источники, связи'],
    ['Учебный контент','courses, lessons, blocks, медиа'],
    ['Тестирование','questions, попытки, типы вопросов, разбор ошибок'],
    ['Прогресс','mastery, SRS, стабильность, рекомендации'],
    ['Мониторинг изменений','сбор редакций, диффы, влияние на контент'],
    ['Экспертные источники','opinions с обязательной маркировкой'],
    ['Поиск','индекс по документам, пунктам, урокам, вопросам'],
    ['AI-шлюз','RAG, ограничения, отказ при отсутствии подтверждения'],
    ['Уведомления','изменения, повторения, слабые темы']
  ].map(([t,d])=>`<div class="stat"><div style="font-weight:600">${t}</div><div class="l">${d}</div></div>`).join('')}</div>
  <h2>Модель данных</h2>
  <pre style="overflow:auto;background:var(--sunk);border:1px solid var(--line);border-radius:10px;padding:14px;font-size:12.5px">documents(id, title, short, kind, number, adopted_at, effective_at,
          status, status_note, edition, jurisdiction, territory,
          authority, source_name, source_url, verified_at, category[])
document_links(from_id, to_id, relation)   -- related | replaces | replaced_by
articles(id, document_id, clause, title, text, text_mode, simple,
         practice, example, mistakes[], inspector_note, remember)
courses(id, title, direction, jurisdiction, level, about)
lessons(id, course_id, order_no, title, kind, goal, blocks jsonb,
        article_ids[], chain jsonb, video jsonb, audio_text)
questions(id, direction, course_id, type, difficulty, payload jsonb,
          answer jsonb, why, trap, basis_document_id, basis_clause)
cards(id, direction, front, back, basis_document_id, basis_clause)
expert_opinions(id, author, source_type, source_url, published_at,
                document_id, clause, thesis, relation_to_norm, counter)
changes(id, document_id, happened_at, severity, before_text, after_text,
        plain, todo[], affected_ids[])
users(id, role, experience, country, directions[], daily_minutes)
user_progress(user_id, direction, mastery, updated_at)
user_answers(user_id, question_id, correct, answered_at)
user_cards(user_id, card_id, due_at, interval_days, reps, lapses)</pre>
  <h2>Конвейер добавления документа</h2>
  <div class="chain">${['Импорт из официального источника','Проверка: существует · номер · дата · статус · редакция',
    'Разметка пунктов и связей','Написание слоёв объяснения','Генерация вопросов и карточек','Ревизия специалистом',
    'Публикация и включение в мониторинг изменений'].map((t,i)=>`${i?'<div class="arw"></div>':''}<div class="step"><b>Шаг ${i+1}</b>${t}</div>`).join('')}</div>
  <h2>Защита от ошибок AI</h2>
  <ul>
    <li>AI отвечает только по переданному контексту базы; запрос всегда содержит запрет на изобретение документов и пунктов.</li>
    <li>Если подтверждения нет — ответ «Недостаточно данных для подтверждения. Проверьте официальный источник».</li>
    <li>Юрисдикции разделены на уровне данных: документ не может одновременно относиться к РФ и ЕС.</li>
    <li>Мнение эксперта хранится в отдельной сущности и визуально маркируется жёлтым.</li>
    <li>Каждый учебный тезис привязан к документу и пункту — кнопка «Откуда это?» есть в каждом блоке.</li>
  </ul>
  <h2>Что уже работает в этой сборке</h2>
  <ul>
    <li>${DOCS.length} документов с паспортами и статусами, ${ARTICLES.length} разобранных пунктов, ${LESSONS.length} уроков, ${QUESTIONS.length} вопросов девяти типов, ${CARDS.length} карточек, ${CASES.length} кейсов, ${INSPECTIONS.length + SCENARIOS.length} практических режимов.</li>
    <li>Адаптивный подбор вопросов, интервальное повторение, расчёт уровня освоения, поиск, мониторинг изменений, уведомления, аудиоозвучка, AI-помощник с ограничениями.</li>
    <li>Прогресс сохраняется между сессиями и устройствами.</li>
  </ul>`;
}

/* ============================================================
   МОДУЛЬ 12. СОБЫТИЯ
   ============================================================ */
function bindView(){
  if(!S.onboarded){ bindOnboard(); return; }
  bindExamples();
  const on = (sel, ev, fn) => APP.querySelectorAll(sel).forEach(e=>e.addEventListener(ev, fn));
  on('[data-course]','click', e=>go('course',{id:e.currentTarget.dataset.course}));
  on('[data-lesson]','click', e=>go('lesson',{id:e.currentTarget.dataset.lesson}));
  on('[data-doc]','click', e=>go('doc',{id:e.currentTarget.dataset.doc}));
  on('[data-article]','click', e=>go('article',{id:e.currentTarget.dataset.article}));
  on('[data-case]','click', e=>go('case',{id:e.currentTarget.dataset.case}));
  on('[data-change]','click', ()=>go('changes'));
  on('[data-filter]','click', e=>{ const f=JSON.parse(e.currentTarget.dataset.filter);
    go(e.currentTarget.dataset.gov||R.v, {...R.p, ...f}); });
  on('[data-quiz]','click', e=>startQuiz(JSON.parse(e.currentTarget.dataset.quiz)));
  on('[data-notif]','click', e=>{ const n=notifications().find(x=>x.id===e.currentTarget.dataset.notif); n&&n.go(); });
  on('[data-readch]','click', e=>{ const id=e.currentTarget.dataset.readch;
    if(!S.readChanges.includes(id)) S.readChanges.push(id); save(); render(); });
  on('[data-save]','click', e=>{ const id=e.currentTarget.dataset.save;
    S.saved.includes(id) ? S.saved.splice(S.saved.indexOf(id),1) : S.saved.push(id); save(); render(); });
  on('[data-done]','click', e=>{ const id=e.currentTarget.dataset.done; S.done[id]=today(); addXP(10); touchStreak(); save();
    toast('Урок отмечен как изученный'); const l=byId(LESSONS,id);
    const nx = LESSONS.filter(x=>x.c===l.c).sort((a,b)=>a.n-b.n).find(x=>!S.done[x.id]);
    nx ? go('lesson',{id:nx.id}) : go('course',{id:l.c}); });
  on('[data-min]','click', e=>{ S.profile.minutes=+e.currentTarget.dataset.min; save(); render(); });

  // поиск
  const si = $('#search-input');
  if(si){ si.addEventListener('input', ()=>{ R.p.q=si.value; const pos=si.selectionStart; render();
    const n=$('#search-input'); if(n){ n.focus(); n.setSelectionRange(pos,pos);} }); }
  on('[data-sq]','click', e=>go('search',{q:e.currentTarget.dataset.sq}));
  on('[data-sres]','click', e=>{ const r=searchAll(R.p.q||'')[+e.currentTarget.dataset.sres]; r&&r.go(); });
  const ds = $('#doc-search');
  if(ds){ ds.addEventListener('input', ()=>{ R.p.q=ds.value; const pos=ds.selectionStart; render();
    const n=$('#doc-search'); if(n){ n.focus(); n.setSelectionRange(pos,pos);} }); }

  // аудио
  const pl = $('#play-lesson');
  if(pl){ const l=byId(LESSONS,R.p.id);
    pl.addEventListener('click', ()=>speak([l.title, l.goal, ...(l.blocks||[]).map(b=>(b.h?b.h+'. ':'')+(b.p||(b.list||[]).join('. ')))].join(' '), pl)); }
  const vs = $('#video-script');
  if(vs){ const l=byId(LESSONS,R.p.id);
    vs.addEventListener('click', ()=>modal(`<h2 style="margin-top:0">Сценарий учебного видео</h2>
      <div class="warnstripe">Это учебный материал приложения, а не официальный документ. Видео не заменяет нормативный текст.</div>
      <ol>${l.video.frames.map(f=>`<li>${h(f)}</li>`).join('')}</ol>
      <button class="btn ghost" onclick="closeModal()">Закрыть</button>`)); }

  // кнопки «Объясни мне»
  window.aiOnArticle = async function(artId, prompt){
    const a = byId(ARTICLES, artId); if(!a) return;
    const d = byId(DOCS, a.doc);
    modal(`<h2 style="margin-top:0">Объяснение приложения</h2>
      <div class="norm"><div class="lbl">🟦 ЗАКОНОДАТЕЛЬНОЕ ТРЕБОВАНИЕ</div>
        <b>${h(d.kind)} ${h(d.num)}</b> · п. ${h(a.clause)}
        <div class="small" style="margin-top:4px">${h(d.short)}</div></div>
      <div class="expl"><div class="lbl">🟨 ОБЪЯСНЕНИЕ ПРИЛОЖЕНИЯ</div>
        <p id="ai-art-t">Готовлю объяснение…</p></div>
      <div class="row" style="margin-top:12px">${sourceBtn(a.doc, a.clause)}</div>
      <p class="tiny" style="margin-top:10px">Помощник работает только с данными карточки пункта и не добавляет норм от себя.
        Всё, что важно для работы, сверяйте с первоисточником.</p>`);
    const set = t => { const el = $('#ai-art-t'); if(el) el.textContent = t; };
    const r = await ask(prompt, ctxForArticle(a), set);
    if(r.err){
      set('');
      const el = $('#ai-art-t'); if(!el) return;
      el.innerHTML = `<b>Помощник недоступен в этом режиме.</b><br>Ниже — подготовленное заранее объяснение, привязанное к пункту.
        <div class="hr"></div><b>Простыми словами.</b> ${h(a.simple)}
        <div style="margin-top:8px"><b>На практике.</b> ${h(a.practice)}</div>
        ${a.example?`<div style="margin-top:8px"><b>Пример.</b> ${h(a.example)}</div>`:''}`;
    } else set(r.text);
  };
  on('[data-explain]','click', e=>aiOnArticle(e.currentTarget.dataset.explain,'Объясни этот пункт максимально просто, как новичку, в 4–6 предложениях.'));
  on('[data-example]','click', e=>aiOnArticle(e.currentTarget.dataset.example,'Приведи один реалистичный пример ситуации на предприятии по этому пункту и покажи, что должен сделать специалист.'));
  on('[data-check]','click', e=>aiOnArticle(e.currentTarget.dataset.check,'Задай мне три вопроса по этому пункту разной сложности, без ответов. В конце укажи, что ответы можно проверить в тесте приложения.'));
  on('[data-links]','click', e=>{ const a=byId(ARTICLES,e.currentTarget.dataset.links); const d=byId(DOCS,a.doc);
    modal(`<h2 style="margin-top:0">Связи документа</h2>${graphHTML(d)}
      <div class="list" style="margin-top:10px">${(d.related||[]).map(id=>{const r=byId(DOCS,id);
        return `<button class="item" onclick="closeModal();go('doc',{id:'${r.id}'})"><span class="tag ${statusClass(r.status)}">${jurFlag(r.jur)}</span>
        <span><span class="t">${h(r.short)}</span><div class="small">${h(r.kind)} ${h(r.num)}</div></span></button>`;}).join('')}</div>`); });
  on('[data-ai]','click', ()=>go('ai'));

  // тест
  on('[data-opt]','click', e=>{
    if(QZ.shown) return;
    const q = QZ.qs[QZ.i], raw = e.currentTarget.dataset.opt;
    if(q.type==='tf') QZ.sel = raw==='true';
    else if(q.type==='multi'||q.type==='violation'){ const i=+raw; QZ.sel=QZ.sel||[];
      QZ.sel.includes(i) ? QZ.sel.splice(QZ.sel.indexOf(i),1) : QZ.sel.push(i); }
    else if(q.type==='order'){ const i=+raw; QZ.sel=QZ.sel||[];
      QZ.sel.includes(i) ? QZ.sel.splice(QZ.sel.indexOf(i),1) : QZ.sel.push(i); }
    else QZ.sel = +raw;
    render();
  });
  on('[data-match]','change', e=>{ QZ.sel = QZ.sel||{}; QZ.sel[+e.currentTarget.dataset.match] = +e.currentTarget.value; });
  const qc = $('#q-check');
  if(qc) qc.addEventListener('click', ()=>{
    const q = QZ.qs[QZ.i];
    if(QZ.sel===null||QZ.sel===undefined||(Array.isArray(QZ.sel)&&!QZ.sel.length)){ toast('Выберите ответ'); return; }
    const ok = gradeQuestion(q);
    const st = S.qstats[q.id] || {ok:0,bad:0,streak:0};
    ok ? (st.ok++, st.streak=(st.streak||0)+1) : (st.bad++, st.streak=0);
    st.last = today(); S.qstats[q.id]=st; QZ.res.push({id:q.id, ok}); QZ.shown=true;
    addXP(ok? (2+q.diff) : 1); touchStreak(); save(); render();
    const f=$('#qfeed'); if(f){ f.innerHTML = feedbackHTML(q, ok); f.scrollIntoView({behavior:'smooth', block:'nearest'}); }
  });
  if(QZ && QZ.shown && $('#qfeed') && !$('#qfeed').innerHTML){
    $('#qfeed').innerHTML = feedbackHTML(QZ.qs[QZ.i], QZ.res[QZ.res.length-1]?.ok);
  }
  const qn = $('#q-next');
  if(qn) qn.addEventListener('click', ()=>{ QZ.i++; QZ.sel=null; QZ.shown=false; render(); });
  const ql = $('#q-later');
  if(ql) ql.addEventListener('click', ()=>{ scheduleLater(QZ.qs[QZ.i]); });
  on('[data-later]','click', e=>scheduleLater(byId(QUESTIONS, e.currentTarget.dataset.later)));
  const qe = $('#q-explain');
  if(qe) qe.addEventListener('click', async ()=>{
    const q = QZ.qs[QZ.i], box = $('#q-ai'); if(!box) return;
    box.innerHTML = '<div class="expl"><h4>Помощник</h4><p id="q-ai-t">Готовлю объяснение…</p></div>';
    const a = q.art ? byId(ARTICLES,q.art) : null;
    const ctx = (a?ctxForArticle(a)+'\n\n':'') + `Вопрос теста: ${q.q}\nПравильный ответ и обоснование: ${q.why}\nТипичная ошибка: ${q.trap||'—'}\nОснование: ${q.basis?byId(DOCS,q.basis.doc).short+' '+q.basis.cl:'—'}`;
    const r = await ask('Объясни подробно, почему правильный ответ именно такой, и как это запомнить. Не добавляй норм, которых нет в контексте.', ctx,
      t=>{ const el=$('#q-ai-t'); if(el) el.textContent=t; });
    const el=$('#q-ai-t'); if(el) el.textContent = r.err ? 'Помощник недоступен в этом режиме. Разбор выше подготовлен заранее и привязан к документу.' : r.text;
  });

  // карточки
  const co = $('#card-open'); if(co) co.addEventListener('click', ()=>{ CARD.open=true; render(); });
  on('[data-grade]','click', e=>{ gradeCard(CARD.id, +e.currentTarget.dataset.grade); CARD.open=false; CARD.id=null; render(); });

  // практика
  on('[data-inspect]','click', e=>{ INS={id:e.currentTarget.dataset.inspect, sel:[], done:false}; go('inspect'); });
  on('[data-ins]','click', e=>{ if(INS.done) return; const i=+e.currentTarget.dataset.ins;
    INS.sel.includes(i) ? INS.sel.splice(INS.sel.indexOf(i),1) : INS.sel.push(i); render(); });
  const ic = $('#ins-check');
  if(ic) ic.addEventListener('click', ()=>{ const insp=byId(INSPECTIONS,INS.id);
    const need = insp.items.filter(x=>x.v).length;
    const found = INS.sel.filter(k=>insp.items[k].v).length;
    const wrong = INS.sel.filter(k=>!insp.items[k].v).length;
    const score = Math.max(0, Math.round((found - wrong*0.5)/need*100));
    INS.done = true;
    if(!S.practice[INS.id] || S.practice[INS.id].score<score){ S.practice[INS.id]={score, date:today()}; }
    addXP(10); save(); render(); });
  on('[data-scenario]','click', e=>{ SCN={id:e.currentTarget.dataset.scenario, step:0, answers:[]}; go('scenario'); });
  on('[data-scn]','click', e=>{ const s=byId(SCENARIOS,SCN.id), st=s.steps[SCN.step], o=st.opts[+e.currentTarget.dataset.scn];
    SCN.answers.push(!!o.ok);
    modal(`<div class="${o.ok?'expl':'warnstripe'}"><h4 style="margin-top:0">${o.ok?'Верное решение':'Неверное решение'}</h4><p>${h(o.why)}</p></div>
      <button class="btn" id="scn-next">${SCN.step+1<s.steps.length?'Дальше':'К разбору'}</button>`);
    $('#scn-next').addEventListener('click', ()=>{ closeModal(); SCN.step++; render(); }); });

  // AI
  const ai = $('#ai-send'), aii = $('#ai-input');
  if(ai) ai.addEventListener('click', ()=>{ const v=aii.value; aii.value=''; aiSend(v); });
  if(aii) aii.addEventListener('keydown', e=>{ if(e.key==='Enter'){ const v=aii.value; aii.value=''; aiSend(v); } });
  on('[data-aiq]','click', e=>aiSend(e.currentTarget.dataset.aiq));

  const rs = $('#reset');
  if(rs) rs.addEventListener('click', ()=>{ modal(`<h2 style="margin-top:0">Сбросить прогресс?</h2>
    <p>Будут удалены отметки об изученном, статистика ответов, карточки повторения и достижения. Отменить нельзя.</p>
    <div class="row"><button class="btn" id="rs-yes">Сбросить</button><button class="btn ghost" onclick="closeModal()">Отмена</button></div>`);
    $('#rs-yes').addEventListener('click', ()=>{ const p=S.profile; S=JSON.parse(JSON.stringify(DEFAULT_STATE));
      S.profile=p; S.onboarded=true; S.plan=buildPlan(); save(); closeModal(); go('home'); }); });
}
function scheduleLater(q){
  const st = S.qstats[q.id] || {ok:0,bad:0,streak:0};
  st.bad = (st.bad||0) + 0.5; st.last = today(); S.qstats[q.id]=st; save();
  toast('Вопрос вернётся в ближайших тестах');
}
boot();
</script>
</body>
</html>
