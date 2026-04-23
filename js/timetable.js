/**
 * timetable.js - ホーム画面（週間グリッド）
 */

const todayStr = getTodayStr();

/* ---- 初期化 ---- */
function initTimetable() {
  initDateHeader();
  renderAll();
}

/* ---- 日付ヒーローヘッダー ---- */
function initDateHeader() {
  const dayEl      = document.getElementById('header-day');
  const dateEl     = document.getElementById('header-date');
  const semesterEl = document.getElementById('header-semester');

  if (dayEl) dayEl.textContent = DOW_LABELS[getTodayDow()] + '曜日';
  if (dateEl) {
    const m = TODAY.getMonth() + 1;
    const d = TODAY.getDate();
    dateEl.textContent = `${m}月${d}日`;
  }
  if (semesterEl) {
    const s = getSettings();
    semesterEl.textContent = `${s.grade}年生 ${s.semester}`;
  }
}

function renderAll() {
  const settings = getSettings();
  renderWeekGrid(settings);
  initGridSwipeHandlers(settings);  // 設定を渡してスワイプ/ダブルタップ/確認を制御
  if (window.lucide) lucide.createIcons();
}

/* ---- 週間グリッド ---- */
function renderWeekGrid(settings) {
  const container = document.getElementById('week-grid-container');
  if (!container) return;

  const lectures = getLectures();
  const today = getTodayDow();

  // 表示する曜日
  let dows = [1, 2, 3, 4, 5];
  if (settings.displayDays === 'sat') dows.push(6);
  if (settings.displayDays === 'sun') dows.push(6, 0);

  // 最大時限
  const maxPeriod = Math.max(
    settings.periodsCount,
    ...lectures.map(l => l.period || 0),
    1
  );

  // 曜日×時限 のマップ
  const map = {};
  lectures.forEach(l => { map[`${l.dayOfWeek}-${l.period}`] = l; });

  // 時限→開始時刻・終了時刻マップ（講義データ優先、なければ設定から計算）
  const periodTimeMap    = buildPeriodTimeMap(lectures, settings, maxPeriod);
  const periodEndTimeMap = buildPeriodEndTimeMap(lectures, settings, maxPeriod);

  // グリッドの列テンプレート
  const cols = `44px repeat(${dows.length}, 1fr)`;

  let html = `<div class="week-grid">`;

  // ヘッダー行
  html += `<div class="wg-header-row" style="grid-template-columns:${cols}">`;
  html += `<div class="wg-corner"></div>`;
  dows.forEach(dow => {
    const isToday = dow === today;
    html += `<div class="wg-day-header${isToday ? ' today' : ''}">${DOW_LABELS[dow]}</div>`;
  });
  html += `</div>`;

  // 時限行
  for (let p = 1; p <= maxPeriod; p++) {
    html += `<div class="wg-row" style="grid-template-columns:${cols}">`;
    html += `<div class="wg-period-label"><div class="wg-period-num">${p}</div><div class="wg-period-time">${periodTimeMap[p]}</div><div class="wg-period-time">${periodEndTimeMap[p]}</div></div>`;
    dows.forEach(dow => {
      const lecture = map[`${dow}-${p}`];
      if (lecture) {
        const record = getRecordByDate(lecture.id, todayStr);
        const status = record?.status ?? null;
        const statusCls = status ? `status-${status}` : '';
        const todayCls = dow === today ? 'today-col' : '';
        html += `
          <div class="wg-cell ${statusCls} ${todayCls}" data-id="${lecture.id}">
            <div class="wg-cell-name">${escHtml(lecture.name)}</div>
            ${lecture.room ? `<div class="wg-cell-room">${escHtml(lecture.room)}</div>` : ''}
          </div>`;
      } else {
        const todayCls = dow === today ? 'today-col' : '';
        html += `<div class="wg-cell empty ${todayCls}"></div>`;
      }
    });
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  // セルクリック → 講義詳細
  container.querySelectorAll('.wg-cell:not(.empty)').forEach(cell => {
    cell.addEventListener('click', () => {
      navigate(`lecture.html?id=${cell.dataset.id}`);
    });
  });
}

/* ---- 時限→開始時刻マップ ---- */
function buildPeriodTimeMap(lectures, settings, maxPeriod) {
  const times = settings.periodTimes || [];
  const map = {};
  for (let p = 1; p <= maxPeriod; p++) {
    map[p] = times[p - 1]?.start || '—';
  }
  // 講義個別の startTime があれば上書き
  lectures.forEach(l => { if (l.startTime) map[l.period] = l.startTime; });
  return map;
}

/* ---- 時限→終了時刻マップ ---- */
function buildPeriodEndTimeMap(lectures, settings, maxPeriod) {
  const times = settings.periodTimes || [];
  const map = {};
  for (let p = 1; p <= maxPeriod; p++) {
    map[p] = times[p - 1]?.end || '—';
  }
  lectures.forEach(l => { if (l.endTime) map[l.period] = l.endTime; });
  return map;
}

// escHtml は app.js で定義
