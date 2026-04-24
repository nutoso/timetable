/**
 * lecture.js - 講義詳細・追加・編集
 */

function navigateHome() {
  try {
    const s = JSON.parse(localStorage.getItem('tt_settings') || '{}');
    if (s.theme === 'shinmen') { window.location.href = 'shinmen.html'; return; }
    if (s.theme === 'flyer')   { window.location.href = 'flyer.html';   return; }
  } catch {}
  window.location.href = 'index.html';
}

const DAY_OPTIONS = [
  { value: 1, label: '月曜日' },
  { value: 2, label: '火曜日' },
  { value: 3, label: '水曜日' },
  { value: 4, label: '木曜日' },
  { value: 5, label: '金曜日' },
  { value: 6, label: '土曜日' },
  { value: 0, label: '日曜日' },
];

function initLecturePage() {
  const id   = getQueryParam('id');
  const mode = getQueryParam('mode'); // 'edit' or 'new'

  if (mode === 'new' || (!id && !mode)) {
    renderNewForm();
  } else if (mode === 'edit' && id) {
    const lecture = getLecture(id);
    if (!lecture) { navigate('index.html'); return; }
    renderEditForm(lecture);
  } else if (id) {
    const lecture = getLecture(id);
    if (!lecture) { navigate('index.html'); return; }
    renderDetail(lecture);
  }
}

/* ---- 詳細表示 ---- */
function renderDetail(lecture) {
  const summary = getAttendanceSummary(lecture.id);
  const todayStr = getTodayStr();

  // ヘッダー
  document.getElementById('page-title').textContent = lecture.name;

  const content = document.getElementById('lecture-content');
  // 休める上限・残り回数
  const maxAbsences = lecture.maxAbsences ?? 5;
  const remaining   = maxAbsences - summary.absent;
  const remainCls   = remaining <= 0 ? 'over' : remaining === 1 ? 'warn' : 'safe';

  // 今日の累積件数
  const todayCounts = getCountsByDate(lecture.id, todayStr);

  // 出席履歴
  const allRecords = getRecords().filter(r => r.lectureId === lecture.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 15);

  const historyItems = allRecords.length > 0
    ? allRecords.map(r => `
      <div class="history-item">
        <span class="history-date">${r.date.replace(/-/g, '/')}</span>
        <span class="status-badge ${r.status}">${r.status === 'attend' ? '出席' : '欠席'}</span>
      </div>`).join('')
    : '<p class="history-empty">まだ記録がありません</p>';

  content.innerHTML = `
    <div class="detail-section">

      <!-- 統計 -->
      <div class="stats-card">
        <div class="stat-item">
          <span class="stat-value attend">${summary.attend}</span>
          <span class="stat-label">出席</span>
        </div>
        <div class="stat-item">
          <span class="stat-value absent">${summary.absent}</span>
          <span class="stat-label">欠席</span>
        </div>
        <div class="stat-item">
          <span class="stat-value remain-${remainCls}">${remaining >= 0 ? remaining : Math.abs(remaining)}</span>
          <span class="stat-label">${remaining >= 0 ? 'あと休める' : '回超過'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" style="color:var(--color-text-secondary)">${summary.total}<span style="font-size:14px;font-weight:400"> / ${lecture.totalClasses ?? 15}</span></span>
          <span class="stat-label">回数</span>
        </div>
      </div>
      <div class="rate-bar-wrap">
        <div class="rate-bar">
          <div class="rate-bar-fill ${remainCls === 'over' ? 'low' : remainCls === 'warn' ? 'warn' : ''}" style="width:${Math.min(100, maxAbsences > 0 ? summary.absent / maxAbsences * 100 : 0)}%"></div>
        </div>
      </div>

      <!-- 今日の記録 -->
      <div class="detail-record-section">
        <div class="detail-section-header">
          <span class="detail-section-title">今日の記録</span>
        </div>
        <div class="record-btn-row">
          <button class="btn-record attend" id="btn-attend">
            <svg data-lucide="check-circle" />出席 +1
          </button>
          <button class="btn-record absent" id="btn-absent">
            <svg data-lucide="x-circle" />欠席 +1
          </button>
        </div>
      </div>

      <!-- 講義情報 -->
      <div class="detail-card">
        <div class="detail-row">
          <svg data-lucide="book-open" class="detail-row-icon" />
          <span class="detail-row-label">講義名</span>
          <span class="detail-row-value">${escHtml(lecture.name)}</span>
        </div>
        <div class="detail-row">
          <svg data-lucide="user" class="detail-row-icon" />
          <span class="detail-row-label">担当</span>
          <span class="detail-row-value">${escHtml(lecture.teacher) || '—'}</span>
        </div>
        <div class="detail-row">
          <svg data-lucide="map-pin" class="detail-row-icon" />
          <span class="detail-row-label">教室</span>
          <span class="detail-row-value">${escHtml(lecture.room) || '—'}</span>
        </div>
        ${lecture.memo ? `
        <div class="detail-row">
          <svg data-lucide="file-text" class="detail-row-icon" />
          <span class="detail-row-label">メモ</span>
          <span class="detail-row-value detail-memo">${escHtml(lecture.memo)}</span>
        </div>` : ''}
      </div>

      <!-- 出席履歴 -->
      <div class="detail-history-section">
        <div class="detail-section-title" style="margin-bottom:var(--space-3)">出席履歴</div>
        <div class="detail-card history-list">${historyItems}</div>
      </div>

      <!-- アクション -->
      <div class="detail-actions">
        <button class="btn btn-secondary btn-full" id="btn-edit">
          <svg data-lucide="pencil" />編集する
        </button>
      </div>

    </div>
  `;

  // ボタンイベント
  document.getElementById('btn-attend').addEventListener('click', () => {
    recordAndRefresh(lecture, 'attend');
  });
  document.getElementById('btn-absent').addEventListener('click', () => {
    recordAndRefresh(lecture, 'absent');
  });
  document.getElementById('btn-edit').addEventListener('click', () => {
    navigate(`lecture.html?id=${lecture.id}&mode=edit`);
  });

  if (window.lucide) lucide.createIcons();
}

/* ---- 詳細ページの記録処理 ---- */
async function recordAndRefresh(lecture, action) {
  const label = action === 'attend' ? '出席' : '欠席';
  const settings = getSettings();

  if (settings.confirmOnRecord) {
    const result = await showContextMenu(`${label}を記録しますか？`, [
      {
        label: `${label}を記録する`,
        value: 'yes',
        icon:  action === 'attend' ? 'check-circle' : 'x-circle',
        cls:   action,
      },
      { label: 'キャンセル', value: 'no', icon: 'x', cls: 'cancel' },
    ]);
    if (result !== 'yes') return;
  }

  saveRecord(lecture.id, getTodayStr(), action);
  showToast(`${label}を記録しました`);
  renderDetail(lecture);
}

/* ---- 新規追加フォーム ---- */
function renderNewForm() {
  document.getElementById('page-title').textContent = '講義を追加';
  renderForm(null);
}

/* ---- 編集フォーム ---- */
function renderEditForm(lecture) {
  document.getElementById('page-title').textContent = '講義を編集';
  renderForm(lecture);
}

/* ---- フォーム共通 ---- */
function renderForm(lecture) {
  const content = document.getElementById('lecture-content');
  const isEdit = !!lecture;

  const periods = Array.from({ length: 8 }, (_, i) => i + 1);

  // 編集時：現在の記録件数を取得して合計表示値を計算
  const recAttend = isEdit ? getRecords().filter(r => r.lectureId === lecture.id && r.status === 'attend').length : 0;
  const recAbsent = isEdit ? getRecords().filter(r => r.lectureId === lecture.id && r.status === 'absent').length : 0;
  const totalAttend = isEdit ? recAttend + (lecture.attendOffset || 0) : 0;
  const totalAbsent = isEdit ? recAbsent + (lecture.absentOffset || 0) : 0;

  const dayOptions = DAY_OPTIONS.map(d =>
    `<option value="${d.value}" ${lecture?.dayOfWeek === d.value ? 'selected' : ''}>${d.label}</option>`
  ).join('');

  const periodOptions = periods.map(p =>
    `<option value="${p}" ${lecture?.period === p ? 'selected' : ''}>${p}限</option>`
  ).join('');

  content.innerHTML = `
    <div class="form-section">
      <div class="form-group">
        <label class="form-label required">講義名</label>
        <input class="form-input" id="f-name" type="text" placeholder="例: 情報処理基礎" value="${escHtml(lecture?.name ?? '')}" maxlength="50">
        <p class="form-error" id="err-name" style="display:none">講義名を入力してください</p>
      </div>
      <div class="form-group">
        <label class="form-label">担当教員</label>
        <input class="form-input" id="f-teacher" type="text" placeholder="例: 田中 教授" value="${escHtml(lecture?.teacher ?? '')}" maxlength="50">
      </div>
      <div class="form-group">
        <label class="form-label">教室</label>
        <input class="form-input" id="f-room" type="text" placeholder="例: 101講義室" value="${escHtml(lecture?.room ?? '')}" maxlength="50">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label required">曜日</label>
          <div class="form-select-wrap">
            <select class="form-select" id="f-dow">${dayOptions}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label required">時限</label>
          <div class="form-select-wrap">
            <select class="form-select" id="f-period">${periodOptions}</select>
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">全講義回数</label>
          <input class="form-input" id="f-total" type="number" placeholder="15" min="1" max="99" value="${lecture?.totalClasses ?? 15}">
        </div>
        <div class="form-group">
          <label class="form-label">休める上限回数</label>
          <input class="form-input" id="f-max-abs" type="number" placeholder="5" min="0" max="99" value="${lecture?.maxAbsences ?? 5}">
        </div>
      </div>
      <span class="form-hint" style="margin-top:-12px">休める上限未設定の場合は5回として計算します</span>
      ${isEdit ? `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">出席数</label>
          <input class="form-input" id="f-attend" type="number" min="0" max="999" value="${totalAttend}">
        </div>
        <div class="form-group">
          <label class="form-label">欠席数</label>
          <input class="form-input" id="f-absent" type="number" min="0" max="999" value="${totalAbsent}">
        </div>
      </div>
      <span class="form-hint" style="margin-top:-12px">記録の自動集計値を直接修正できます</span>
      ` : ''}
      <div class="form-group">
        <label class="form-label">メモ</label>
        <textarea class="form-textarea" id="f-memo" placeholder="任意メモ">${escHtml(lecture?.memo ?? '')}</textarea>
      </div>
    </div>
    <div class="form-bottom-actions">
      <button class="btn btn-primary btn-full" id="btn-save">保存する</button>
      ${isEdit ? `<button class="btn btn-danger btn-full" id="btn-delete">この講義を削除する</button>` : ''}
      <button class="btn btn-secondary btn-full" id="btn-cancel">キャンセル</button>
    </div>
  `;

  document.getElementById('btn-save').addEventListener('click', () => saveForm(lecture?.id));
  document.getElementById('btn-cancel').addEventListener('click', () => history.back());
  if (isEdit) {
    document.getElementById('btn-delete').addEventListener('click', () => showDeleteSheet(lecture));
  }

  // 入力時にエラーを消す
  document.getElementById('f-name').addEventListener('input', () => {
    document.getElementById('err-name').style.display = 'none';
    document.getElementById('f-name').classList.remove('input-error');
  });

  if (window.lucide) lucide.createIcons();
}

/* ---- 保存 ---- */
function saveForm(existingId) {
  const nameEl = document.getElementById('f-name');
  const name = nameEl.value.trim();

  if (!name) {
    nameEl.classList.add('input-error');
    const errEl = document.getElementById('err-name');
    errEl.style.display = 'block';
    nameEl.focus();
    nameEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const data = {
    id: existingId,
    name,
    teacher:      document.getElementById('f-teacher').value.trim(),
    room:         document.getElementById('f-room').value.trim(),
    dayOfWeek:    Number(document.getElementById('f-dow').value),
    period:       Number(document.getElementById('f-period').value),
    totalClasses: Number(document.getElementById('f-total').value)   || 15,
    maxAbsences:  Number(document.getElementById('f-max-abs').value) || 5,
    memo:         document.getElementById('f-memo').value.trim(),
  };

  if (existingId) {
    const recs = getRecords().filter(r => r.lectureId === existingId);
    const recAttend = recs.filter(r => r.status === 'attend').length;
    const recAbsent = recs.filter(r => r.status === 'absent').length;
    data.attendOffset = Number(document.getElementById('f-attend').value) - recAttend;
    data.absentOffset = Number(document.getElementById('f-absent').value) - recAbsent;
  }

  saveLecture(data);
  navigateHome();
}

/* ---- 削除確認シート ---- */
function showDeleteSheet(lecture) {
  // オーバーレイを作成
  const overlay = document.createElement('div');
  overlay.className = 'context-menu-overlay';

  overlay.innerHTML = `
    <div class="context-menu">
      <div class="context-menu-handle"></div>
      <div class="context-menu-title">「${escHtml(lecture.name)}」を削除しますか？</div>
      <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-4)">
        出席記録もすべて削除されます。この操作は取り消せません。
      </p>
      <div style="display:flex;flex-direction:column;gap:var(--space-3)">
        <button class="btn btn-danger btn-full" id="confirm-delete-yes">削除する</button>
        <button class="btn btn-secondary btn-full" id="confirm-delete-no">キャンセル</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeSheet = () => {
    overlay.classList.add('hiding');
    setTimeout(() => overlay.remove(), 200);
  };

  document.getElementById('confirm-delete-yes').addEventListener('click', () => {
    deleteLecture(lecture.id);
    navigateHome();
  });
  document.getElementById('confirm-delete-no').addEventListener('click', closeSheet);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeSheet();
  });
}
