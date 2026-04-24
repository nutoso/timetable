/**
 * storage.js - localStorage CRUD 操作
 */

const KEYS = {
  LECTURES: 'tt_lectures',
  RECORDS:  'tt_records',
  SETTINGS: 'tt_settings',
};

const DEFAULT_PERIOD_TIMES = [
  { start: '09:00', end: '10:30' },
  { start: '10:40', end: '12:10' },
  { start: '13:00', end: '14:30' },
  { start: '14:40', end: '16:10' },
  { start: '16:20', end: '17:50' },
  { start: '18:00', end: '19:30' },
  { start: '19:40', end: '21:10' },
  { start: '21:20', end: '22:50' },
];

const DEFAULT_SETTINGS = {
  displayDays: 'weekday',  // 'weekday' | 'sat' | 'sun'
  periodsCount: 6,
  periodTimes: DEFAULT_PERIOD_TIMES,
  theme: 'midnight',       // 'midnight' | 'sakura' | 'blueprint' | 'washi'
  grade: 1,               // 1〜6
  semester: '前期',        // '前期' | '後期'
  gestureEnabled: true,
  confirmOnRecord: false,
  doubleTapEnabled: false,
  schoolStartDate: '',    // 'YYYY-MM-DD' 形式、空なら3月1日基準
};

/* ---- 汎用 ---- */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? null;
  } catch {
    return null;
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/* ---- 講義マスター ---- */
function getLectures() {
  return load(KEYS.LECTURES) ?? [];
}

function getLecture(id) {
  return getLectures().find(l => l.id === id) ?? null;
}

function saveLecture(data) {
  const lectures = getLectures();
  const now = new Date().toISOString();
  if (data.id) {
    const idx = lectures.findIndex(l => l.id === data.id);
    if (idx >= 0) {
      lectures[idx] = { ...lectures[idx], ...data, updatedAt: now };
    } else {
      lectures.push({ ...data, updatedAt: now });
    }
  } else {
    lectures.push({ ...data, id: genId(), createdAt: now, updatedAt: now });
  }
  save(KEYS.LECTURES, lectures);
}

function deleteLecture(id) {
  const lectures = getLectures().filter(l => l.id !== id);
  save(KEYS.LECTURES, lectures);
  // 関連する記録も削除
  const records = getRecords().filter(r => r.lectureId !== id);
  save(KEYS.RECORDS, records);
}

/* ---- 出席記録 ---- */
function getRecords() {
  return load(KEYS.RECORDS) ?? [];
}

function getRecordByDate(lectureId, date) {
  return getRecords().find(r => r.lectureId === lectureId && r.date === date) ?? null;
}

/**
 * 出席記録を追加（累積カウント方式）
 * status: 'attend' | 'absent' | null（nullで最新の1件を取り消し）
 */
function saveRecord(lectureId, date, status) {
  const records = getRecords();
  const now = new Date().toISOString();

  if (status === null) {
    // 最新の1件だけ取り消し
    let lastIdx = -1;
    records.forEach((r, i) => {
      if (r.lectureId === lectureId && r.date === date) lastIdx = i;
    });
    if (lastIdx >= 0) records.splice(lastIdx, 1);
  } else {
    // 常に新規追加（累積）
    records.push({ id: genId(), lectureId, date, status, updatedAt: now });
  }
  save(KEYS.RECORDS, records);
}

function deleteRecord(lectureId, date) {
  saveRecord(lectureId, date, null);
}

/**
 * 指定日の出席・欠席件数を返す
 */
function getCountsByDate(lectureId, date) {
  const recs = getRecords().filter(r => r.lectureId === lectureId && r.date === date);
  return {
    attend: recs.filter(r => r.status === 'attend').length,
    absent: recs.filter(r => r.status === 'absent').length,
  };
}

/* ---- 集計 ---- */
function getAttendanceSummary(lectureId) {
  const lecture = getLecture(lectureId);
  const records = getRecords().filter(r => r.lectureId === lectureId);
  const recAttend = records.filter(r => r.status === 'attend').length;
  const recAbsent = records.filter(r => r.status === 'absent').length;
  const attend = recAttend + (lecture?.attendOffset || 0);
  const absent = recAbsent + (lecture?.absentOffset || 0);
  const total  = attend + absent;
  const rate   = total > 0 ? Math.round((attend / total) * 100) : null;
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const lastDate = sorted.length > 0 ? sorted[0].date : null;
  return { attend, absent, total, rate, lastDate };
}

/* ---- 設定 ---- */
function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(load(KEYS.SETTINGS) ?? {}) };
}

function saveSettings(data) {
  save(KEYS.SETTINGS, { ...getSettings(), ...data });
}

/* ---- デモデータ（初回起動時のみ） ---- */
function initDemoData() {
  if (getLectures().length > 0) return;

  const demos = [
    { name: '情報処理基礎', teacher: '田中 教授', room: '101講義室', dayOfWeek: 1, period: 1, startTime: '09:00', endTime: '10:30', totalClasses: 15, memo: '' },
    { name: 'データ構造とアルゴリズム', teacher: '鈴木 准教授', room: '203演習室', dayOfWeek: 1, period: 3, startTime: '13:00', endTime: '14:30', totalClasses: 15, memo: '' },
    { name: '線形代数学', teacher: '佐藤 教授', room: '大講義室A', dayOfWeek: 2, period: 2, startTime: '10:40', endTime: '12:10', totalClasses: 15, memo: '' },
    { name: 'プログラミング演習', teacher: '高橋 准教授', room: 'PC演習室1', dayOfWeek: 3, period: 2, startTime: '10:40', endTime: '12:10', totalClasses: 15, memo: 'Python使用' },
    { name: '英語コミュニケーション', teacher: 'Smith 講師', room: '語学ラボ2', dayOfWeek: 3, period: 4, startTime: '14:40', endTime: '16:10', totalClasses: 15, memo: '' },
    { name: 'データベース論', teacher: '伊藤 教授', room: '102講義室', dayOfWeek: 4, period: 1, startTime: '09:00', endTime: '10:30', totalClasses: 15, memo: '' },
    { name: 'ネットワーク工学', teacher: '渡辺 教授', room: '201講義室', dayOfWeek: 5, period: 3, startTime: '13:00', endTime: '14:30', totalClasses: 15, memo: '' },
  ];

  const now = new Date().toISOString();
  const lectures = demos.map(d => ({ ...d, id: genId(), createdAt: now, updatedAt: now }));
  save(KEYS.LECTURES, lectures);
}
