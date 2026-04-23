/**
 * app.js - 共通ユーティリティ・トースト・ナビゲーション
 */

/* ---- テーマ適用（全ページ共通・即時実行） ---- */
const THEME_BG_COLORS = {
  midnight:  '#0D1117',
  sakura:    '#FDF0F4',
  blueprint: '#060E1A',
  washi:     '#F0E9DC',
  keiko:     '#080808',
  yohaku:    '#F5F4F1',
  shinmen:   '#f3efe7',
  flyer:     '#ece4d3',
};

const SHINMEN_FONTS_ID = 'shinmen-gfonts';

function applyTheme(theme) {
  const t = theme || 'midnight';
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEME_BG_COLORS[t] || THEME_BG_COLORS.midnight;

  // 紙面テーマのみ Google Fonts を動的ロード
  if (t === 'shinmen') {
    if (!document.getElementById(SHINMEN_FONTS_ID)) {
      const link = document.createElement('link');
      link.id   = SHINMEN_FONTS_ID;
      link.rel  = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=Shippori+Mincho:wght@400;500;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap';
      document.head.appendChild(link);
    }
  }

  renderThemeDecoration(t);
}

(function () {
  try {
    const s = JSON.parse(localStorage.getItem('tt_settings') || '{}');
    applyTheme(s.theme || 'midnight');
  } catch (e) {
    applyTheme('midnight');
  }
})();

/* ---- 日付ユーティリティ ---- */
const TODAY = new Date();

function getTodayStr() {
  return formatDate(TODAY);
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTodayDow() {
  return TODAY.getDay(); // 0=日, 1=月 ... 6=土
}

function getCurrentTimeMinutes() {
  return TODAY.getHours() * 60 + TODAY.getMinutes();
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/* ---- トースト ---- */
let toastTimer = null;
let lastToastInfo = null;

function showToast(message, onUndo) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // 既存トーストを消す
  const existing = container.querySelector('.toast');
  if (existing) existing.remove();
  if (toastTimer) clearTimeout(toastTimer);

  const toast = document.createElement('div');
  toast.className = 'toast';

  const msg = document.createElement('span');
  msg.textContent = message;
  toast.appendChild(msg);

  if (onUndo) {
    const btn = document.createElement('button');
    btn.className = 'toast-undo';
    btn.textContent = '元に戻す';
    btn.addEventListener('click', () => {
      onUndo();
      hideToast(toast, container);
    });
    toast.appendChild(btn);
  }

  container.appendChild(toast);
  lastToastInfo = { toast, container };

  toastTimer = setTimeout(() => hideToast(toast, container), 4000);
}

function hideToast(toast, container) {
  if (!toast || !toast.parentNode) return;
  toast.classList.add('hiding');
  setTimeout(() => toast.remove(), 200);
}

/* ---- 長押しメニュー ---- */
function showContextMenu(title, items) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'context-menu-overlay';

    const menu = document.createElement('div');
    menu.className = 'context-menu';

    const handle = document.createElement('div');
    handle.className = 'context-menu-handle';
    menu.appendChild(handle);

    if (title) {
      const t = document.createElement('div');
      t.className = 'context-menu-title';
      t.textContent = title;
      menu.appendChild(t);
    }

    function close(value) {
      overlay.classList.add('hiding');
      setTimeout(() => { overlay.remove(); resolve(value); }, 200);
    }

    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = `context-menu-item ${item.cls ?? ''}`;
      btn.innerHTML = `${item.icon ? `<svg data-lucide="${item.icon}" />` : ''}<span>${item.label}</span>`;
      btn.addEventListener('click', () => close(item.value));
      menu.appendChild(btn);
    });

    overlay.appendChild(menu);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(null); });
    document.body.appendChild(overlay);

    // Lucide アイコン再描画
    if (window.lucide) lucide.createIcons();
  });
}

/* ---- ナビゲーション ---- */
function navigate(url) {
  // index.html への遷移は、テーマに応じてリダイレクト
  if (url === 'index.html') {
    try {
      const s = JSON.parse(localStorage.getItem('tt_settings') || '{}');
      if (s.theme === 'shinmen') { window.location.href = 'shinmen.html'; return; }
      if (s.theme === 'flyer')   { window.location.href = 'flyer.html';   return; }
    } catch {}
  }
  window.location.href = url;
}

function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

/* ---- ボトムナビ アクティブ制御 ---- */
function initBottomNav() {
  const path = window.location.pathname;
  const items = document.querySelectorAll('.bottom-nav-item');
  items.forEach(item => {
    const href = item.getAttribute('href') || item.dataset.href;
    if (!href) return;
    const isActive =
      (href === 'index.html' && (path.endsWith('index.html') || path.endsWith('/'))) ||
      (href !== 'index.html' && path.includes(href.replace('.html', '')));
    item.classList.toggle('active', isActive);
  });
}

/* ---- 期間テキスト ---- */
function periodLabel(period) {
  return `${period}限`;
}

/* ---- 出席率の色クラス ---- */
function rateClass(rate) {
  if (rate === null) return '';
  return rate < 70 ? 'low' : '';
}

/* ---- HTML エスケープ（全ページ共通） ---- */
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ---- テーマ装飾イラスト ---- */
function renderThemeDecoration(theme) {
  if (!document.body) return;

  // 旧式の theme-deco は不要になったので削除
  const old = document.getElementById('theme-deco');
  if (old) old.remove();

  // ヘッダーとボトムナビに直接注入（z-index:-1 でコンテンツの後ろに）
  function injectDeco(containerId, parentSelector, svg) {
    const parent = document.querySelector(parentSelector);
    if (!parent) return;
    let el = document.getElementById(containerId);
    if (!el) {
      el = document.createElement('div');
      el.id = containerId;
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;';
      parent.prepend(el);
    }
    el.innerHTML = svg;
  }

  // ヘッダー: viewBox="0 0 390 68", ナビ: viewBox="0 0 390 60"
  const vbH = `viewBox="0 0 390 68" width="100%" height="100%" preserveAspectRatio="none"`;
  const vbN = `viewBox="0 0 390 60" width="100%" height="100%" preserveAspectRatio="none"`;

  // ========== ヘッダー用 SVG (viewBox 390x68) ==========
  const headerSvgs = {

    midnight: `<svg xmlns="http://www.w3.org/2000/svg" ${vbH}>
      <defs>
        <mask id="hd-moon-mask">
          <rect width="390" height="68" fill="white"/>
          <circle cx="368" cy="26" r="14" fill="black"/>
        </mask>
      </defs>
      <circle cx="355" cy="33" r="19" fill="#D4A017" opacity="0.55" mask="url(#hd-moon-mask)"/>
      <g fill="#D4A017">
        <circle cx="20"  cy="16" r="1.8" opacity="0.70"/>
        <circle cx="44"  cy="48" r="1.2" opacity="0.55"/>
        <circle cx="68"  cy="10" r="1.5" opacity="0.62"/>
        <circle cx="305" cy="12" r="1.3" opacity="0.58"/>
        <circle cx="285" cy="54" r="1.0" opacity="0.48"/>
      </g>
      <g stroke="#D4A017" stroke-width="0.7" opacity="0.20">
        <line x1="20" y1="16" x2="68" y2="10"/>
        <line x1="20" y1="16" x2="44" y2="48"/>
      </g>
    </svg>`,

    sakura: `<svg xmlns="http://www.w3.org/2000/svg" ${vbH}>
      <!-- 枝：右下コーナーから上向きに（テキスト領域 x>300,y<40 を回避） -->
      <g stroke="#A0506A" stroke-linecap="round" fill="none" opacity="0.45">
        <path d="M390 68 Q380 57 368 50 Q354 44 336 48" stroke-width="2.2"/>
        <path d="M368 50 Q360 43 350 44" stroke-width="1.3"/>
      </g>
      <!-- 花1：y=44 (テキスト下端y=39より下) -->
      <g transform="translate(350,44)" opacity="0.65">
        <ellipse cx="0" cy="-9" rx="5.5" ry="8" fill="#F2A8C0" transform="rotate(0)"/>
        <ellipse cx="0" cy="-9" rx="5.5" ry="8" fill="#F2A8C0" transform="rotate(72)"/>
        <ellipse cx="0" cy="-9" rx="5.5" ry="8" fill="#F2A8C0" transform="rotate(144)"/>
        <ellipse cx="0" cy="-9" rx="5.5" ry="8" fill="#F2A8C0" transform="rotate(216)"/>
        <ellipse cx="0" cy="-9" rx="5.5" ry="8" fill="#F2A8C0" transform="rotate(288)"/>
        <circle r="3.2" fill="#FFDCEA"/>
      </g>
      <!-- 花2：y=52（さらに下） -->
      <g transform="translate(336,52) scale(0.72)" opacity="0.50">
        <ellipse cx="0" cy="-9" rx="5.5" ry="8" fill="#F5BDD0" transform="rotate(18)"/>
        <ellipse cx="0" cy="-9" rx="5.5" ry="8" fill="#F5BDD0" transform="rotate(90)"/>
        <ellipse cx="0" cy="-9" rx="5.5" ry="8" fill="#F5BDD0" transform="rotate(162)"/>
        <ellipse cx="0" cy="-9" rx="5.5" ry="8" fill="#F5BDD0" transform="rotate(234)"/>
        <ellipse cx="0" cy="-9" rx="5.5" ry="8" fill="#F5BDD0" transform="rotate(306)"/>
        <circle r="2.8" fill="#FFE6F0"/>
      </g>
      <!-- 散る花びら：左側のみ（x<260 でテキストと干渉しない） -->
      <g fill="#F2A8C0" opacity="0.45">
        <ellipse cx="16" cy="24" rx="5" ry="3" transform="rotate(-28 16 24)"/>
        <ellipse cx="52" cy="12" rx="4" ry="2.5" transform="rotate(22 52 12)"/>
        <ellipse cx="88" cy="40" rx="4.5" ry="2.8" transform="rotate(-48 88 40)"/>
        <ellipse cx="145" cy="18" rx="3.8" ry="2.4" transform="rotate(35 145 18)"/>
      </g>
    </svg>`,

    blueprint: `<svg xmlns="http://www.w3.org/2000/svg" ${vbH}>
      <g stroke="#00D2FF" fill="none" stroke-linecap="round">
        <g opacity="0.48" stroke-width="1.6">
          <line x1="10" y1="8"  x2="10" y2="36"/><line x1="8"  y1="10" x2="36" y2="10"/>
          <line x1="380" y1="8"  x2="380" y2="36"/><line x1="354" y1="10" x2="382" y2="10"/>
        </g>
        <g transform="translate(195,34)" opacity="0.35">
          <circle r="16" stroke-width="0.8"/>
          <circle r="9"  stroke-width="0.6"/>
          <circle r="2.5" stroke-width="1.0"/>
          <line x1="-16" y1="0" x2="-11" y2="0" stroke-width="0.8"/>
          <line x1="11" y1="0"  x2="16"  y2="0" stroke-width="0.8"/>
          <line x1="0" y1="-16" x2="0" y2="-11" stroke-width="0.8"/>
          <line x1="0" y1="11"  x2="0"  y2="16" stroke-width="0.8"/>
        </g>
        <g opacity="0.28" stroke-width="0.8">
          <line x1="46" y1="10" x2="46" y2="18"/>
          <line x1="66" y1="10" x2="66" y2="14"/>
          <line x1="86" y1="10" x2="86" y2="18"/>
          <line x1="280" y1="10" x2="280" y2="18"/>
          <line x1="300" y1="10" x2="300" y2="14"/>
          <line x1="320" y1="10" x2="320" y2="18"/>
        </g>
      </g>
      <g fill="#00D2FF" font-family="monospace" font-size="7.5" opacity="0.30">
        <text x="42" y="9.5">TL-01</text>
        <text x="268" y="9.5">TR-01</text>
      </g>
    </svg>`,

    washi: `<svg xmlns="http://www.w3.org/2000/svg" ${vbH}>
      <!-- 枝：右下から水平に伸ばし、花はヘッダー下半分のみに配置 -->
      <g stroke="#8B1A1A" stroke-linecap="round" fill="none" opacity="0.38" stroke-width="1.6">
        <path d="M390 68 Q382 60 370 56 Q355 52 338 54"/>
        <path d="M370 56 Q362 50 352 52"/>
        <path d="M338 54 Q326 49 316 52"/>
      </g>
      <!-- 梅の花1：小さめ (cy=-7,ry=7) で y=56 → 花びら上端 y=56-14=42 → テキスト下端39を下回る ✅ -->
      <g transform="translate(352,56)" opacity="0.62">
        <ellipse cx="0" cy="-7" rx="5" ry="7" fill="#C0392B" transform="rotate(0)"/>
        <ellipse cx="0" cy="-7" rx="5" ry="7" fill="#C0392B" transform="rotate(72)"/>
        <ellipse cx="0" cy="-7" rx="5" ry="7" fill="#C0392B" transform="rotate(144)"/>
        <ellipse cx="0" cy="-7" rx="5" ry="7" fill="#C0392B" transform="rotate(216)"/>
        <ellipse cx="0" cy="-7" rx="5" ry="7" fill="#C0392B" transform="rotate(288)"/>
        <circle r="3.2" fill="#E8956D"/>
        <g stroke="#8B1A1A" stroke-width="0.8" stroke-linecap="round" opacity="0.65">
          <line x1="0" y1="0" x2="0"  y2="-5"/>
          <line x1="0" y1="0" x2="5"  y2="-1.5"/>
          <line x1="0" y1="0" x2="-5" y2="-1.5"/>
          <line x1="0" y1="0" x2="3"  y2="4"/>
          <line x1="0" y1="0" x2="-3" y2="4"/>
        </g>
      </g>
      <!-- 梅の花2：さらに小さく -->
      <g transform="translate(316,56) scale(0.72)" opacity="0.48">
        <ellipse cx="0" cy="-7" rx="5" ry="7" fill="#C0392B" transform="rotate(18)"/>
        <ellipse cx="0" cy="-7" rx="5" ry="7" fill="#C0392B" transform="rotate(90)"/>
        <ellipse cx="0" cy="-7" rx="5" ry="7" fill="#C0392B" transform="rotate(162)"/>
        <ellipse cx="0" cy="-7" rx="5" ry="7" fill="#C0392B" transform="rotate(234)"/>
        <ellipse cx="0" cy="-7" rx="5" ry="7" fill="#C0392B" transform="rotate(306)"/>
        <circle r="2.8" fill="#E8956D"/>
      </g>
      <!-- 落花：左側のみ -->
      <g fill="#C0392B" opacity="0.22">
        <ellipse cx="18" cy="32" rx="4.5" ry="2.8" transform="rotate(-38 18 32)"/>
        <ellipse cx="48" cy="14" rx="3.8" ry="2.3" transform="rotate(26 48 14)"/>
        <ellipse cx="110" cy="22" rx="3.5" ry="2.2" transform="rotate(-20 110 22)"/>
      </g>
    </svg>`,

    keiko: `<svg xmlns="http://www.w3.org/2000/svg" ${vbH}>
      <defs>
        <filter id="hd-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g stroke="#CCFF00" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.40" stroke-width="1.3">
        <path d="M0 30 L24 30 L24 12 L60 12 L60 30 L98 30"/>
        <path d="M60 12 L60 0"/>
      </g>
      <g fill="#CCFF00" opacity="0.55">
        <circle cx="24" cy="30" r="3.2"/>
        <circle cx="60" cy="12" r="3.8"/>
        <circle cx="60" cy="30" r="3.2"/>
      </g>
      <g stroke="#CCFF00" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.40" stroke-width="1.3">
        <path d="M390 22 L363 22 L363 50 L328 50"/>
        <path d="M363 50 L363 68"/>
      </g>
      <g fill="#CCFF00" opacity="0.55">
        <circle cx="363" cy="22" r="3.2"/>
        <circle cx="363" cy="50" r="3.8"/>
      </g>
      <g filter="url(#hd-glow)" fill="#CCFF00">
        <circle cx="120" cy="24" r="3.2" opacity="0.80"/>
        <circle cx="195" cy="14" r="3.8" opacity="0.75"/>
        <circle cx="270" cy="30" r="3.0" opacity="0.72"/>
      </g>
    </svg>`,

    yohaku: `<svg xmlns="http://www.w3.org/2000/svg" ${vbH}>
      <rect x="0" y="14" width="3" height="40" fill="#4338CA" opacity="0.38" rx="1.5"/>
      <line x1="12" y1="34" x2="148" y2="34" stroke="#4338CA" stroke-width="0.9" opacity="0.20"/>
      <circle cx="156" cy="34" r="3.2" fill="none" stroke="#4338CA" stroke-width="1.1" opacity="0.30"/>
      <circle cx="156" cy="34" r="1.1" fill="#4338CA" opacity="0.32"/>
      <g stroke="#4338CA" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.26">
        <line x1="374" y1="12" x2="374" y2="38"/>
        <line x1="350" y1="12" x2="374" y2="12"/>
      </g>
    </svg>`,
  };

  // ========== ボトムナビ用 SVG (viewBox 390x60) ==========
  const navSvgs = {

    midnight: `<svg xmlns="http://www.w3.org/2000/svg" ${vbN}>
      <g fill="#D4A017">
        <circle cx="28"  cy="32" r="1.8" opacity="0.62"/>
        <circle cx="78"  cy="20" r="1.3" opacity="0.52"/>
        <circle cx="148" cy="36" r="1.5" opacity="0.58"/>
        <circle cx="240" cy="18" r="1.0" opacity="0.45"/>
        <circle cx="308" cy="30" r="1.6" opacity="0.60"/>
        <circle cx="365" cy="42" r="1.2" opacity="0.50"/>
      </g>
      <g stroke="#D4A017" stroke-width="0.6" opacity="0.18">
        <line x1="28"  y1="32" x2="78"  y2="20"/>
        <line x1="148" y1="36" x2="240" y2="18"/>
        <line x1="308" y1="30" x2="365" y2="42"/>
      </g>
    </svg>`,

    sakura: `<svg xmlns="http://www.w3.org/2000/svg" ${vbN}>
      <g fill="#F2A8C0" opacity="0.42">
        <ellipse cx="22"  cy="28" rx="6.5" ry="4.0" transform="rotate(-22 22  28)"/>
        <ellipse cx="75"  cy="18" rx="5.5" ry="3.3" transform="rotate(38  75  18)"/>
        <ellipse cx="138" cy="35" rx="6.0" ry="3.6" transform="rotate(-15 138 35)"/>
        <ellipse cx="202" cy="22" rx="5.0" ry="3.0" transform="rotate(50  202 22)"/>
        <ellipse cx="268" cy="38" rx="6.0" ry="3.8" transform="rotate(-30 268 38)"/>
        <ellipse cx="330" cy="20" rx="5.5" ry="3.3" transform="rotate(18  330 20)"/>
        <ellipse cx="375" cy="34" rx="4.5" ry="2.8" transform="rotate(-42 375 34)"/>
      </g>
    </svg>`,

    blueprint: `<svg xmlns="http://www.w3.org/2000/svg" ${vbN}>
      <g stroke="#00D2FF" fill="none" stroke-linecap="round">
        <g opacity="0.40" stroke-width="1.5">
          <line x1="10" y1="52" x2="10" y2="26"/><line x1="8"  y1="50" x2="36" y2="50"/>
          <line x1="380" y1="52" x2="380" y2="26"/><line x1="354" y1="50" x2="382" y2="50"/>
        </g>
        <line x1="46" y1="50" x2="344" y2="50" stroke-width="0.6" stroke-dasharray="4 8" opacity="0.22"/>
      </g>
      <g fill="#00D2FF" font-family="monospace" font-size="7.5" opacity="0.28">
        <text x="42" y="58">BL-01</text>
        <text x="268" y="58">BR-01</text>
      </g>
    </svg>`,

    washi: `<svg xmlns="http://www.w3.org/2000/svg" ${vbN}>
      <g stroke="#C0392B" fill="none" opacity="0.32" stroke-width="1.5">
        <path d="M30  38 Q50  22 70  38 Q50  54 30  38Z"/>
        <path d="M70  38 Q90  22 110 38 Q90  54 70  38Z"/>
        <path d="M110 38 Q130 22 150 38 Q130 54 110 38Z"/>
        <path d="M150 38 Q170 22 190 38 Q170 54 150 38Z"/>
        <path d="M190 38 Q210 22 230 38 Q210 54 190 38Z"/>
        <path d="M230 38 Q250 22 270 38 Q250 54 230 38Z"/>
        <path d="M270 38 Q290 22 310 38 Q290 54 270 38Z"/>
        <path d="M310 38 Q330 22 350 38 Q330 54 310 38Z"/>
      </g>
    </svg>`,

    keiko: `<svg xmlns="http://www.w3.org/2000/svg" ${vbN}>
      <defs>
        <filter id="nv-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g stroke="#CCFF00" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.32" stroke-width="1.3">
        <path d="M0 32 L34 32 L34 16 L90 16 L90 36 L152 36"/>
        <path d="M390 24 L356 24 L356 40 L294 40 L294 20 L238 20"/>
        <path d="M90 36 L90 60"/>
      </g>
      <g fill="#CCFF00" opacity="0.48">
        <circle cx="34"  cy="32" r="3.0"/><circle cx="90"  cy="16" r="3.5"/>
        <circle cx="90"  cy="36" r="3.0"/><circle cx="152" cy="36" r="3.0"/>
        <circle cx="356" cy="24" r="3.0"/><circle cx="356" cy="40" r="3.5"/>
        <circle cx="294" cy="40" r="3.0"/><circle cx="238" cy="20" r="3.0"/>
      </g>
      <g filter="url(#nv-glow)" fill="#CCFF00">
        <circle cx="178" cy="26" r="3.5" opacity="0.75"/>
        <circle cx="215" cy="40" r="3.0" opacity="0.68"/>
      </g>
    </svg>`,

    yohaku: `<svg xmlns="http://www.w3.org/2000/svg" ${vbN}>
      <rect x="0" y="4" width="3" height="52" fill="#4338CA" opacity="0.24" rx="1.5"/>
      <g fill="#4338CA" opacity="0.22">
        <circle cx="138" cy="22" r="2.0"/><circle cx="166" cy="22" r="2.0"/>
        <circle cx="194" cy="22" r="2.0"/><circle cx="222" cy="22" r="2.0"/>
        <circle cx="250" cy="22" r="2.0"/>
        <circle cx="138" cy="42" r="2.0"/><circle cx="166" cy="42" r="2.0"/>
        <circle cx="194" cy="42" r="2.0"/><circle cx="222" cy="42" r="2.0"/>
        <circle cx="250" cy="42" r="2.0"/>
      </g>
      <g stroke="#4338CA" stroke-width="1.0" stroke-linecap="round" fill="none" opacity="0.22">
        <line x1="374" y1="48" x2="374" y2="24"/>
        <line x1="350" y1="48" x2="374" y2="48"/>
      </g>
    </svg>`,
  };

  // 紙面テーマ用装飾
  const shinmenHeaderSvg = `<svg xmlns="http://www.w3.org/2000/svg" ${vbH}>
    <line x1="0" y1="67.5" x2="390" y2="67.5" stroke="#111" stroke-width="0.5" opacity="0.6"/>
    <line x1="0" y1="64"   x2="390" y2="64"   stroke="#111" stroke-width="0.25" opacity="0.25"/>
    <text x="370" y="20" font-family="Georgia,serif" font-style="italic" font-size="8" fill="#8a8478" opacity="0.55" text-anchor="end">Vol.04</text>
    <line x1="375" y1="14" x2="388" y2="14" stroke="#d2341e" stroke-width="1" opacity="0.6"/>
  </svg>`;

  const shinmenNavSvg = `<svg xmlns="http://www.w3.org/2000/svg" ${vbN}>
    <line x1="0" y1="0.5" x2="390" y2="0.5" stroke="#111" stroke-width="0.5" opacity="0.55"/>
    <line x1="0" y1="3"   x2="390" y2="3"   stroke="#111" stroke-width="0.25" opacity="0.18"/>
  </svg>`;

  const resolvedHeaderSvg = theme === 'shinmen' ? shinmenHeaderSvg : (headerSvgs[theme] || '');
  const resolvedNavSvg    = theme === 'shinmen' ? shinmenNavSvg    : (navSvgs[theme]    || '');

  injectDeco('header-deco', '.header',     resolvedHeaderSvg);
  injectDeco('nav-deco',    '.bottom-nav', resolvedNavSvg);
}
