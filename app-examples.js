<script>
/* ============================================================
   МОДУЛЬ: ОБУЧЕНИЕ ПО ПРИМЕРУ (представление)
   Пошаговый разбор: ситуация → выбор документа → норма →
   применение → действия → ошибка → ответственность → запомни.
   ============================================================ */
let EX = {id:null, sel:null, step:0};

const EX_STEPS = ['Ситуация','Норма','Разбор','Действия','Вывод'];

function vExamples(){
  const byDir = {};
  EXAMPLES.forEach(e=>{ (byDir[e.dir] = byDir[e.dir] || []).push(e); });
  const doneN = EXAMPLES.filter(e=>S.practice[e.id]).length;
  return `<h1>Обучение по примеру</h1>
  <p class="lede">Каждый разбор начинается с конкретной производственной ситуации. Сначала вы решаете, какой документ применяется,
   и только потом видите норму, разбор по шагам, порядок действий и ответственность. Так требование запоминается вместе с ситуацией, в которой оно работает.</p>
  <div class="hero" style="margin-bottom:18px">
    <div class="small">Разобрано примеров</div>
    <div class="v">${doneN} / ${EXAMPLES.length}</div>
    <div class="small" style="margin-top:8px">Разбор засчитывается в практическую часть уровня освоения.</div></div>
  ${Object.entries(byDir).map(([d,list])=>`
    <h2>${DIRS[d].ic} ${DIRS[d].t}</h2>
    <div class="list">${list.map(e=>{
      const done = S.practice[e.id];
      const doc = byId(DOCS, e.norm.doc);
      return `<button class="item" data-example="${e.id}">
        <span class="tag ${done?'ok':''}">${done?'✓':'●'.repeat(e.lvl)}</span>
        <span style="flex:1"><span class="t">${h(e.title)}</span>
          <div class="small">${h(e.tag)} · применяется ${h(doc.kind)} ${h(doc.num)}</div></span></button>`;
    }).join('')}</div>`).join('')}
  <div class="expl" style="margin-top:18px"><h4>Как читать эти разборы</h4>
   <p>Синим отмечено законодательное требование, жёлтым — объяснение приложения. Если у пункта указан точный номер, он назван прямо;
    если в первоисточнике нужно уточнить номер пункта, приложение об этом прямо пишет и ведёт к документу.</p></div>`;
}

function vExample(){
  const e = byId(EXAMPLES, EX.id); if(!e) return vExamples();
  const picked = EX.sel !== null;
  const right = picked && e.opts[EX.sel] && e.opts[EX.sel].ok;
  const correctIdx = e.opts.findIndex(o=>o.ok);
  const normDoc = byId(DOCS, e.norm.doc);

  const docChip = (docId, clause, exact) => {
    const d = byId(DOCS, docId);
    return `<div class="tiny" style="margin-bottom:4px">${jurFlag(d.jur)} ${h(d.kind)} ${h(d.num)}
      <span class="tag ${statusClass(d.status)}">${statusText(d.status)}</span></div>
      <b>${h(d.short)}</b> · ${h(clause)}
      ${exact===false?`<div class="tiny" style="margin-top:3px">Назван раздел документа. Точный номер пункта сверьте в первоисточнике — приложение не подставляет номера, в которых не уверено.</div>`:''}`;
  };

  let html = `<button class="btn ghost sm" data-v="examples">← Обучение по примеру</button>
  <div class="tiny" style="margin-top:12px">${DIRS[e.dir].ic} ${DIRS[e.dir].t} · ${h(e.tag)}</div>
  <h1 style="margin:4px 0 6px">${h(e.title)}</h1>
  <div class="row" style="gap:6px;margin-bottom:14px">${EX_STEPS.map((s,i)=>
    `<span class="chip" aria-pressed="${i<=EX.step}" style="pointer-events:none">${s}</span>`).join('')}</div>

  <div class="card"><h3 style="margin-top:0">Ситуация</h3>
    <p class="small" style="color:var(--muted)">${h(e.setting)}</p>
    <p>${h(e.story)}</p></div>`;

  /* ---- шаг 0: выбор применяемого документа ---- */
  html += `<h2>${h(e.ask)}</h2>
  <div class="list">${e.opts.map((o,i)=>{
    const d = byId(DOCS, o.doc);
    const state = picked ? (o.ok ? 'ok' : (EX.sel===i ? 'bad' : '')) : (EX.sel===i ? 'sel' : '');
    return `<button class="quiz-opt" data-exopt="${i}" data-state="${state}">
      <span class="mk">${picked && o.ok ? '✓' : (picked && EX.sel===i ? '✕' : '')}</span>
      <span><b>${h(d.short)}</b><div class="tiny">${h(d.kind)} ${h(d.num)}</div></span></button>`;
  }).join('')}</div>`;

  if(!picked){
    html += `<p class="tiny">Сначала решите сами — разбор откроется после ответа.</p>`;
    return html;
  }

  html += `<div class="${right?'expl':'warnstripe'}" style="margin-top:12px">
    <h4>${right?'Верно':'Не этот документ'}</h4>
    ${right?'':`<p><b>Применяется:</b> ${h(byId(DOCS, e.opts[correctIdx].doc).short)}.</p>`}
    <p>${h(e.why)}</p></div>`;

  /* ---- шаг 1: норма ---- */
  if(EX.step >= 1){
    html += `<h2>Норма, которая применяется</h2>
    <div class="norm"><div class="lbl">🟦 ЗАКОНОДАТЕЛЬНОЕ ТРЕБОВАНИЕ</div>
      ${docChip(e.norm.doc, e.norm.clause, e.norm.exact)}
      <p style="margin-top:8px">${h(e.norm.text)}</p>
      <div class="tiny" style="margin-top:6px">Изложение по первоисточнику, не дословная цитата.</div>
      ${e.norm.statusNote?`<div class="tiny" style="margin-top:6px"><b>Проверьте актуальность.</b> ${h(e.norm.statusNote)}</div>`:''}
      ${e.norm.note?`<div class="tiny" style="margin-top:6px">${h(e.norm.note)}</div>`:''}
      <div class="row" style="margin-top:10px">${sourceBtn(e.norm.doc, e.norm.exact===false?null:e.norm.clause)}
        <button class="btn ghost sm" data-doc="${e.norm.doc}">Карточка документа</button></div></div>`;

    if(e.support && e.support.length){
      html += `<h3>Что применяется вместе с ней</h3>
      ${e.support.map(s=>`<div class="card" style="margin-bottom:10px">
        ${docChip(s.doc, s.clause, s.exact)}
        <p class="small" style="margin-top:8px">${h(s.text)}</p>
        <div class="row">${sourceBtn(s.doc, s.exact===false?null:s.clause)}
          <button class="btn ghost sm" data-doc="${s.doc}">Открыть документ</button></div></div>`).join('')}`;
    }
  }

  /* ---- шаг 2: разбор по шагам ---- */
  if(EX.step >= 2){
    html += `<h2>Как норма ложится на эту ситуацию</h2>
    <div class="list">${e.apply.map((x,i)=>`<div class="item" style="cursor:default">
      <span class="mk">${i+1}</span><span>${h(x)}</span></div>`).join('')}</div>`;
  }

  /* ---- шаг 3: действия ---- */
  if(EX.step >= 3){
    html += `<h2>Что должен сделать специалист</h2>
    <ul>${e.action.map(x=>`<li>${h(x)}</li>`).join('')}</ul>`;
  }

  /* ---- шаг 4: ошибка, ответственность, вывод ---- */
  if(EX.step >= 4){
    const lawDoc = byId(DOCS, e.liability.doc);
    html += `<h2>Частая ошибка</h2>
    <div class="warnstripe"><p>${h(e.mistake)}</p></div>
    <h2>Чем это заканчивается</h2>
    <div class="card" style="border-left:3px solid var(--red)">
      ${docChip(e.liability.doc, e.liability.clause, e.liability.exact)}
      <p class="small" style="margin-top:8px">${h(e.liability.text)}</p>
      <div class="tiny">Конкретный размер санкции зависит от состава нарушения, субъекта и повторности — он определяется по действующей редакции ${h(lawDoc.short)}.</div>
      <div class="row" style="margin-top:8px">${sourceBtn(e.liability.doc, e.liability.clause)}</div></div>
    <div class="norm" style="margin-top:16px"><div class="lbl">🟦 ЗАПОМНИ</div><p style="margin:0"><b>${h(e.remember)}</b></p></div>`;
  }

  /* ---- управление ---- */
  const labels = ['Показать норму','Как это применяется','Что делать специалисту','Вывод и ответственность'];
  html += `<div class="row" style="margin-top:18px">`;
  if(EX.step < 4){
    html += `<button class="btn" id="ex-next">${labels[EX.step]}</button>`;
  } else {
    html += `<button class="btn" data-exdone="${e.id}">Разбор завершён</button>
      <button class="btn ghost" data-quiz='${JSON.stringify({dir:e.quizDir, n:5})}'>Проверить себя по теме</button>
      <button class="btn ghost" data-exnext="1">Следующий пример</button>`;
  }
  const spoken = (e.story + (EX.step>=1 ? ' Норма. ' + e.norm.text : '')).slice(0,700);
  html += `<button class="btn ghost" onclick="speak(${JSON.stringify(spoken).replace(/"/g,'&quot;')}, this)">▶ Слушать</button></div>`;
  return html;
}

function bindExamples(){
  const on = (sel, ev, fn) => APP.querySelectorAll(sel).forEach(x=>x.addEventListener(ev, fn));
  on('[data-example]','click', ev=>{ EX = {id: ev.currentTarget.dataset.example, sel:null, step:0}; go('example'); });
  on('[data-exopt]','click', ev=>{ if(EX.sel!==null) return; EX.sel = +ev.currentTarget.dataset.exopt; EX.step = 0; render(); });
  const n = $('#ex-next'); if(n) n.addEventListener('click', ()=>{ EX.step++; render(); });
  on('[data-exdone]','click', ev=>{
    const id = ev.currentTarget.dataset.exdone;
    const e = byId(EXAMPLES, id);
    const score = e.opts[EX.sel] && e.opts[EX.sel].ok ? 100 : 60;
    S.practice[id] = {score, date: today()};
    addXP(12); save();
    toast('Разбор засчитан в практику');
    go('examples');
  });
  on('[data-exnext]','click', ()=>{
    const i = EXAMPLES.findIndex(x=>x.id===EX.id);
    const next = EXAMPLES[(i+1) % EXAMPLES.length];
    EX = {id: next.id, sel:null, step:0}; go('example');
  });
}
</script>
