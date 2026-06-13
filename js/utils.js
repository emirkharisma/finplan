// ─── FORMATTING ───
function fmtRp(num, compact = false) {
  if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
  const n = Number(num);
  if (compact) {
    if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
    if (n >= 1_000)     return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  }
  return 'Rp ' + n.toLocaleString('id-ID');
}

function fmtPct(value, total) {
  if (!total) return '0%';
  return Math.round((value / total) * 100) + '%';
}

function fmtMonth(year, month) {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function fmtMonthShort(year, month) {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
}

function monthLabel(year, month) {
  const names = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  return names[month - 1] + ' ' + String(year).slice(2);
}

// ─── DATE HELPERS ───
function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function prevMonth(year, month) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function nextMonth(year, month) {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

function lastNMonths(n) {
  const result = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return result;
}

// ─── CATEGORIES ───
const CATEGORIES_EMIR = [
  { key: 'makan',       label: 'Makan & Groceries',   color: '#2563eb', icon: '🛒' },
  { key: 'transport',   label: 'Transport',            color: '#7c3aed', icon: '🚗' },
  { key: 'belanja',     label: 'Belanja Online',       color: '#d97706', icon: '📦' },
  { key: 'hiburan',     label: 'Hiburan',              color: '#db2777', icon: '🎬' },
  { key: 'kesehatan',   label: 'Kesehatan',            color: '#059669', icon: '🏥' },
  { key: 'pendidikan',  label: 'Pendidikan',           color: '#0d9488', icon: '📚' },
  { key: 'investasi',   label: 'Investasi / Tabungan', color: '#16a34a', icon: '📈' },
  { key: 'lainnya',     label: 'Lain-lain',            color: '#6b7280', icon: '💼' },
];

const CATEGORIES_MAYANG = [
  { key: 'makan',       label: 'Makan & Groceries',   color: '#db2777', icon: '🛒' },
  { key: 'belanja',     label: 'Belanja & Fashion',   color: '#7c3aed', icon: '👗' },
  { key: 'kecantikan',  label: 'Kecantikan',          color: '#e879f9', icon: '💄' },
  { key: 'anak',        label: 'Kebutuhan Anak',      color: '#f59e0b', icon: '👶' },
  { key: 'kesehatan',   label: 'Kesehatan',           color: '#059669', icon: '🏥' },
  { key: 'transport',   label: 'Transport',           color: '#6366f1', icon: '🚗' },
  { key: 'investasi',   label: 'Investasi / Tabungan',color: '#16a34a', icon: '📈' },
  { key: 'lainnya',     label: 'Lain-lain',           color: '#6b7280', icon: '💼' },
];

const CATEGORIES_FAMILY = [
  { key: 'listrik',     label: 'Listrik (PLN)',       color: '#f59e0b', icon: '⚡' },
  { key: 'gas',         label: 'Gas & Air',           color: '#0d9488', icon: '🔥' },
  { key: 'sampah',      label: 'Sampah & Kebersihan', color: '#059669', icon: '🗑️' },
  { key: 'internet',    label: 'Internet & Telepon',  color: '#2563eb', icon: '📡' },
  { key: 'groceries',   label: 'Groceries Rumah',     color: '#16a34a', icon: '🏠' },
  { key: 'pendidikan',  label: 'Pendidikan Anak',     color: '#7c3aed', icon: '🎓' },
  { key: 'kesehatan',   label: 'Kesehatan Keluarga',  color: '#dc2626', icon: '🏥' },
  { key: 'hiburan',     label: 'Hiburan Keluarga',    color: '#db2777', icon: '🎡' },
  { key: 'lainnya',     label: 'Lain-lain',           color: '#6b7280', icon: '🏡' },
];

function getCategoryMeta(key, person) {
  const list = person === 'mayang' ? CATEGORIES_MAYANG
             : person === 'family' ? CATEGORIES_FAMILY
             : CATEGORIES_EMIR;
  return list.find(c => c.key === key) || { key, label: key, color: '#6b7280', icon: '💰' };
}

// ─── AGGREGATION HELPERS ───
function sumExpenses(expenses, person) {
  return expenses
    .filter(e => !person || e.person === person)
    .reduce((a, e) => a + Number(e.amount), 0);
}

function groupByCategory(expenses) {
  const map = {};
  for (const e of expenses) {
    map[e.category] = (map[e.category] || 0) + Number(e.amount);
  }
  return map;
}

function budgetVsActual(budgets, expenses, person) {
  const bMap = {};
  const eMap = {};
  budgets.filter(b => !person || b.person === person)
    .forEach(b => bMap[b.category] = (bMap[b.category] || 0) + Number(b.amount));
  expenses.filter(e => !person || e.person === person)
    .forEach(e => eMap[e.category] = (eMap[e.category] || 0) + Number(e.amount));
  const allCats = new Set([...Object.keys(bMap), ...Object.keys(eMap)]);
  return [...allCats].map(cat => ({
    category: cat,
    budget: bMap[cat] || 0,
    actual: eMap[cat] || 0,
    diff:   (bMap[cat] || 0) - (eMap[cat] || 0),
    pct:    bMap[cat] ? Math.round(((eMap[cat] || 0) / bMap[cat]) * 100) : null,
  }));
}

// ─── TOAST ───
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ─── LOADING TOGGLE ───
function setLoading(id, on) {
  const el = document.getElementById(id);
  if (!el) return;
  if (on) {
    el.dataset.orig = el.innerHTML;
    el.innerHTML = '<span class="loading-spinner" style="display:inline-block;margin:auto"></span>';
    el.disabled = true;
  } else {
    el.innerHTML = el.dataset.orig || el.innerHTML;
    el.disabled = false;
  }
}

// ─── DOM HELPERS ───
function el(id) { return document.getElementById(id); }
function html(id, content) { const e = el(id); if (e) e.innerHTML = content; }
function text(id, content) { const e = el(id); if (e) e.textContent = content; }
function show(id) { const e = el(id); if (e) e.style.display = ''; }
function hide(id) { const e = el(id); if (e) e.style.display = 'none'; }
function toggleModal(id, open) {
  const e = el(id);
  if (!e) return;
  e.style.display = open ? 'flex' : 'none';
}

// ─── NUMBER INPUT CLEANUP ───
function parseRp(str) {
  return parseFloat(String(str).replace(/[^\d.]/g, '')) || 0;
}

window.Utils = {
  fmtRp, fmtPct, fmtMonth, fmtMonthShort, monthLabel,
  currentYearMonth, prevMonth, nextMonth, lastNMonths,
  CATEGORIES_EMIR, CATEGORIES_MAYANG, CATEGORIES_FAMILY,
  getCategoryMeta, sumExpenses, groupByCategory, budgetVsActual,
  showToast, setLoading, el, html, text, show, hide, toggleModal, parseRp,
};
