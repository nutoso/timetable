/**
 * settings.js - 設定ページ
 */

function initSettingsPage() {
  const s = getSettings();

  // テーマ選択
  const swatches = document.querySelectorAll('.theme-swatch');
  swatches.forEach(sw => {
    if (sw.dataset.theme === (s.theme || 'midnight')) sw.classList.add('active');
    sw.addEventListener('click', () => {
      const theme = sw.dataset.theme;
      if (theme === 'shinmen') {
        saveSettings({ theme: 'shinmen' });
        window.location.replace('shinmen.html');
        return;
      }
      if (theme === 'flyer') {
        saveSettings({ theme: 'flyer' });
        window.location.replace('flyer.html');
        return;
      }
      saveSettings({ theme });
      applyTheme(theme);
      swatches.forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
    });
  });

  // 表示曜日
  const selDays = document.getElementById('s-display-days');
  if (selDays) {
    selDays.value = s.displayDays;
    selDays.addEventListener('change', () => {
      saveSettings({ displayDays: selDays.value });
    });
  }

  // 時限数
  const selPeriods = document.getElementById('s-periods-count');
  if (selPeriods) {
    selPeriods.value = s.periodsCount;
    selPeriods.addEventListener('change', () => {
      saveSettings({ periodsCount: Number(selPeriods.value) });
    });
  }

  // 学年
  const selGrade = document.getElementById('s-grade');
  if (selGrade) {
    selGrade.value = s.grade || 1;
    selGrade.addEventListener('change', () => saveSettings({ grade: Number(selGrade.value) }));
  }

  // 学期
  const selSemester = document.getElementById('s-semester');
  if (selSemester) {
    selSemester.value = s.semester || '前期';
    selSemester.addEventListener('change', () => saveSettings({ semester: selSemester.value }));
  }

  // 授業開始日
  const selStartDate = document.getElementById('s-start-date');
  if (selStartDate) {
    selStartDate.value = s.schoolStartDate || '';
    selStartDate.addEventListener('change', () => saveSettings({ schoolStartDate: selStartDate.value }));
  }

  // 時限別時刻グリッド
  renderPeriodTimesGrid(s);

  // トグル群
  bindToggle('s-gesture', 'gestureEnabled', s);
  bindToggle('s-double-tap', 'doubleTapEnabled', s);
  bindToggle('s-confirm', 'confirmOnRecord', s);

  // JSONエクスポート
  const btnExport = document.getElementById('btn-export');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const data = {
        lectures:   getLectures(),
        records:    getRecords(),
        settings:   getSettings(),
        exportedAt: new Date().toISOString(),
        version:    1,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `timetable-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('バックアップを書き出しました');
    });
  }

  // JSONインポート
  const btnImport = document.getElementById('btn-import');
  if (btnImport) {
    btnImport.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const raw = JSON.parse(ev.target.result);
            processLectureImport(raw);
          } catch {
            showToast('JSONの読み込みに失敗しました');
          }
        };
        reader.readAsText(file, 'UTF-8');
      });
      input.click();
    });
  }

  // データリセット
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      const ok = confirm('すべての講義・出席記録を削除します。この操作は元に戻せません。\n本当に削除しますか？');
      if (ok) {
        localStorage.removeItem('tt_lectures');
        localStorage.removeItem('tt_records');
        navigate('index.html');
      }
    });
  }
}

/* ---- JSONインポート処理（複数フォーマット対応） ---- */
function processLectureImport(raw) {

  // ===== フォーマット判定 =====

  // 形式A: { document_type: "time_table", regular_classes: { 月: [...], ... } }
  if (raw.document_type === 'time_table' && raw.regular_classes) {
    return processTimetableFormat(raw);
  }

  // 形式B: 配列 or { lectures: [...] }（独自エクスポート形式）
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.lectures)
      ? raw.lectures
      : null;

  if (!list || list.length === 0) {
    showToast('講義データが見つかりませんでした');
    return;
  }

  // name・dayOfWeek・period が揃っているものだけ受け入れる
  const valid = list.filter(l =>
    l.name &&
    l.dayOfWeek !== undefined && l.dayOfWeek !== null &&
    l.period    !== undefined && l.period    !== null
  );

  if (valid.length === 0) {
    showToast('有効な講義データがありません\n（name・dayOfWeek・period が必要です）');
    return;
  }

  applyImport(valid.map(l => ({
    name:         String(l.name).trim(),
    teacher:      String(l.teacher      ?? '').trim(),
    room:         String(l.room         ?? '').trim(),
    dayOfWeek:    Number(l.dayOfWeek),
    period:       Number(l.period),
    maxAbsences:  Number(l.maxAbsences) || 5,
    totalClasses: Number(l.totalClasses) || 15,
    memo:         String(l.memo         ?? '').trim(),
  })));
}

/* ---- 時間割PDF形式のインポート処理 ---- */
function processTimetableFormat(raw) {
  const DAY_MAP = { '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6, '日': 0 };

  const lectures = [];
  let skipped = 0;

  // 通常授業
  for (const [dayStr, classes] of Object.entries(raw.regular_classes || {})) {
    const dayOfWeek = DAY_MAP[dayStr];
    if (dayOfWeek === undefined || !Array.isArray(classes)) continue;

    for (const cls of classes) {
      // period は数値 or "5/①" のような文字列 → 整数部分を取り出す
      const period = parseInt(String(cls.period), 10);
      if (!cls.course_name || isNaN(period)) { skipped++; continue; }

      lectures.push({
        name:         String(cls.course_name).trim(),
        teacher:      String(cls.instructor ?? '').trim(),
        room:         String(cls.room       ?? '').trim(),
        dayOfWeek,
        period,
        maxAbsences:  5,
        totalClasses: 15,
        memo:         '',
      });
    }
  }

  // オンデマンド等（曜日・時限なし）は登録不可 → カウントだけ
  const otherCount = (raw.other_classes || []).length;

  if (lectures.length === 0) {
    showToast('インポートできる講義がありませんでした');
    return;
  }

  // 学年・学期を設定に反映
  if (raw.term) {
    const termVal = raw.term === '後期' ? '後期' : '前期';
    saveSettings({ semester: termVal });
  }
  if (raw.grade) {
    const gradeNum = parseInt(String(raw.grade), 10);
    if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 6) {
      saveSettings({ grade: gradeNum });
    }
  }

  const skippedMsg = [
    skipped    > 0 ? `時限不明 ${skipped} 件スキップ` : '',
    otherCount > 0 ? `オンデマンド ${otherCount} 件スキップ（曜日・時限なしのため）` : '',
  ].filter(Boolean).join(' / ');

  applyImport(lectures, skippedMsg);
}

/* ---- 実際にlocalStorageへ保存（共通） ---- */
function applyImport(lectures, skippedMsg = '') {
  const existing = getLectures();
  let merge = false;

  if (existing.length > 0) {
    merge = confirm(
      `${lectures.length}件の講義をインポートします。\n\n` +
      `OK     → 現在の${existing.length}件に追加\n` +
      `キャンセル → 現在のデータを置き換え`
    );
  }

  const now = new Date().toISOString();
  const imported = lectures.map(l => ({
    ...l,
    id:        genId(),
    createdAt: now,
    updatedAt: now,
  }));

  const finalLectures = merge ? [...existing, ...imported] : imported;
  save(KEYS.LECTURES, finalLectures);

  const msg = skippedMsg
    ? `${imported.length}件をインポート（${skippedMsg}）`
    : `${imported.length}件の講義をインポートしました`;
  showToast(msg);
  setTimeout(() => navigate('index.html'), 1500);
}

/* ---- 時限別時刻グリッド ---- */
function renderPeriodTimesGrid(s) {
  const grid = document.getElementById('period-times-grid');
  if (!grid) return;

  const times = s.periodTimes || DEFAULT_PERIOD_TIMES;

  grid.innerHTML = times.map((t, i) => `
    <div class="period-times-row">
      <span class="period-times-label">${i + 1}限</span>
      <input class="period-time-input" type="time" id="pt-s-${i}" value="${t.start}">
      <input class="period-time-input" type="time" id="pt-e-${i}" value="${t.end}">
    </div>
  `).join('');

  times.forEach((_, i) => {
    const save = () => {
      const current = getSettings().periodTimes;
      current[i] = {
        start: document.getElementById(`pt-s-${i}`).value,
        end:   document.getElementById(`pt-e-${i}`).value,
      };
      saveSettings({ periodTimes: current });
    };
    document.getElementById(`pt-s-${i}`).addEventListener('change', save);
    document.getElementById(`pt-e-${i}`).addEventListener('change', save);
  });
}

function bindToggle(inputId, settingKey, s) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.checked = s[settingKey];
  input.addEventListener('change', () => {
    saveSettings({ [settingKey]: input.checked });
  });
}
