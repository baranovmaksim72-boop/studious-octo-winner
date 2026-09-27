#!/bin/bash
# Сборка приложения НОРМА из исходных модулей.
# Порядок склейки обязателен: данные объявляются раньше, чем код, который их читает.
#
#   part1.html       — <head>, дизайн-токены, CSS, контейнеры #app и #layer
#   data-docs.js     — DOCS (нормативная база) + ARTICLES (разобранные пункты)
#   data-learn.js    — DIRS, COURSES, LESSONS, QUESTIONS, CARDS, CASES, EXPERTS,
#                      CHANGES, INSPECTIONS, SCENARIOS, COMPARE, ACHIEVEMENTS
#   data-examples.js — EXAMPLES (модуль «Обучение по примеру»)
#   app-core.js      — состояние, db/localStorage, mastery(), SRS, поиск, speak(), ask()
#   app-views.js     — роутер, NAV, онбординг, главная, обучение, карточка документа
#   app-examples.js  — экраны модуля «Обучение по примеру» (vExamples/vExample/bindExamples)
#   app-views2.js    — тесты, повторение, практика, изменения, AI, прогресс, bindView(), boot()

set -e
OUT="${1:-norma-app.html}"

cat part1.html \
    data-docs.js \
    data-learn.js \
    data-examples.js \
    app-core.js \
    app-views.js \
    app-examples.js \
    app-views2.js > "$OUT"

# Проверка синтаксиса JS: снимаем обёртки <script> и закрывающие теги документа.
cat data-docs.js data-learn.js data-examples.js app-core.js app-views.js \
    app-examples.js app-views2.js \
  | sed 's|</\?script>||g' \
  | grep -v '^</body>\|^</html>' > /tmp/norma-check.js

node --check /tmp/norma-check.js && echo "Синтаксис: OK"
echo "Собрано: $OUT ($(wc -c < "$OUT") байт)"
