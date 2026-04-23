/**
 * swipe.js - スワイプジェスチャー・ダブルタップ
 * 対象: 週間グリッドのセル (.wg-cell)
 *
 * 設定反映:
 *   gestureEnabled   → falseのときスワイプ記録を無効化
 *   doubleTapEnabled → trueのときダブルタップで出席記録
 *   confirmOnRecord  → trueのとき記録前に確認シートを表示
 */

const GRID_SWIPE_THRESHOLD = 40;
const GRID_MAX_TRANSLATE   = 56;
const DOUBLE_TAP_MS        = 340;  // ダブルタップ判定時間（ms）

/* ========================================
   記録共通処理（確認ダイアログ対応）
   ======================================== */
async function doRecord(cell, lectureId, action, confirmOnRecord) {
  const lecture = getLecture(lectureId);
  if (!lecture) return;
  const label = action === 'attend' ? '出席' : '欠席';

  if (confirmOnRecord) {
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

  saveRecord(lectureId, getTodayStr(), action);
  showToast(`${label}を記録しました`);

  // フラッシュアニメーション
  const flashClass = action === 'attend' ? 'flash-attend' : 'flash-absent';
  cell.classList.remove('status-attend', 'status-absent');
  cell.classList.add(flashClass);
  cell.addEventListener('animationend', () => {
    cell.classList.remove(flashClass);
  }, { once: true });
}

/* ========================================
   週間グリッドセル用ハンドラ初期化
   ======================================== */
function initGridSwipeHandlers(settings) {
  const gestureEnabled   = settings?.gestureEnabled   ?? true;
  const doubleTapEnabled = settings?.doubleTapEnabled ?? false;
  const confirmOnRecord  = settings?.confirmOnRecord  ?? false;

  document.querySelectorAll('.wg-cell:not(.empty)').forEach(cell => {
    const lectureId = cell.dataset.id;

    /* --- ダブルタップ --- */
    if (doubleTapEnabled) {
      let lastTap = 0;
      cell.addEventListener('touchend', e => {
        const now = Date.now();
        if (now - lastTap < DOUBLE_TAP_MS && lastTap > 0) {
          e.preventDefault(); // クリックイベントを抑止
          lastTap = 0;
          doRecord(cell, lectureId, 'attend', confirmOnRecord);
        } else {
          lastTap = now;
        }
      });
    }

    /* --- スワイプ --- */
    if (!gestureEnabled) return;

    let startX = 0, startY = 0, currentX = 0;
    let isDragging = false, isVertical = false;

    function resetCell(animate = true) {
      cell.style.transition = animate
        ? 'transform 0.22s ease-out, background-color 0.22s ease-out'
        : '';
      cell.style.transform = 'translateX(0)';
      setTimeout(() => {
        cell.style.transition = '';
        cell.style.backgroundColor = '';
      }, animate ? 220 : 0);
    }

    function applyDrag(dx) {
      const clamped = Math.max(-GRID_MAX_TRANSLATE, Math.min(GRID_MAX_TRANSLATE, dx));
      cell.style.transition = '';
      cell.style.transform = `translateX(${clamped}px)`;

      const ratio = Math.min(Math.abs(clamped) / GRID_SWIPE_THRESHOLD, 1);
      if (clamped > 0) {
        cell.style.backgroundColor = `rgba(22,163,74,${0.12 + ratio * 0.55})`;
      } else if (clamped < 0) {
        cell.style.backgroundColor = `rgba(220,38,38,${0.12 + ratio * 0.55})`;
      } else {
        cell.style.backgroundColor = '';
      }
    }

    function triggerRecord(action) {
      // セルをアニメーションでリセット
      cell.style.transition = 'transform 0.22s ease-out';
      cell.style.transform = 'translateX(0)';
      cell.style.backgroundColor = '';
      setTimeout(() => { cell.style.transition = ''; }, 220);

      // 記録（確認あり/なし）
      setTimeout(() => doRecord(cell, lectureId, action, confirmOnRecord), 240);
    }

    cell.addEventListener('touchstart', e => {
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
      currentX = 0; isDragging = false; isVertical = false;
    }, { passive: true });

    cell.addEventListener('touchmove', e => {
      if (!e.touches[0]) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (!isDragging && !isVertical) {
        if (Math.abs(dy) > Math.abs(dx) + 5) { isVertical = true; return; }
        if (Math.abs(dx) > 6) { isDragging = true; }
      }
      if (isVertical || !isDragging) return;
      currentX = dx;
      applyDrag(dx);
    }, { passive: true });

    cell.addEventListener('touchend', () => {
      if (!isDragging) { resetCell(false); return; }
      if      (currentX >  GRID_SWIPE_THRESHOLD) triggerRecord('attend');
      else if (currentX < -GRID_SWIPE_THRESHOLD) triggerRecord('absent');
      else                                        resetCell(true);
      isDragging = false; currentX = 0;
    });

    cell.addEventListener('touchcancel', () => {
      resetCell(false); isDragging = false;
    });
  });
}
