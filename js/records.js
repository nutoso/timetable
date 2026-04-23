/**
 * records.js - 出席記録一覧
 */

function initRecordsPage() {
  renderRecordList();
}

function renderRecordList() {
  const container = document.getElementById('record-list');
  if (!container) return;

  const lectures = getLectures().sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.period - b.period;
  });

  if (lectures.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg data-lucide="clipboard-list" width="48" height="48" />
        <div class="empty-state-title">講義が登録されていません</div>
        <div class="empty-state-desc">ホーム画面の＋ボタンから<br>講義を追加してください</div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = '';

  lectures.forEach(lecture => {
    const summary = getAttendanceSummary(lecture.id);
    const maxAbsences = lecture.maxAbsences ?? 5;
    const remaining   = maxAbsences - summary.absent;
    const remainCls   = remaining <= 0 ? 'over' : remaining === 1 ? 'warn' : 'safe';
    const remainDisp  = remaining > 0 ? `あと${remaining}回` : remaining === 0 ? 'ちょうど0回' : `${Math.abs(remaining)}回超過`;
    const dayLabel = DOW_LABELS[lecture.dayOfWeek] + '曜 ' + lecture.period + '限';

    const card = document.createElement('div');
    card.className = 'record-card';
    card.innerHTML = `
      <div class="record-card-info">
        <div class="record-card-name">${escHtml(lecture.name)}</div>
        <div class="record-card-sub">${dayLabel}${summary.lastDate ? ` ・ 最終: ${summary.lastDate}` : ''}</div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <span style="font-size:11px;color:var(--color-attend-text)">出席 ${summary.attend}</span>
          <span style="font-size:11px;color:var(--color-absent-text)">欠席 ${summary.absent}</span>
        </div>
      </div>
      <div class="record-card-stats">
        <span class="record-rate ${remainCls}">${remainDisp}</span>
        <span class="record-counts-small">上限 ${maxAbsences}回</span>
      </div>
    `;
    card.addEventListener('click', () => navigate(`lecture.html?id=${lecture.id}`));
    container.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}
