// ─── CHART DEFAULTS ───
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#9ca3af';
Chart.defaults.plugins.legend.display = false;

const TOOLTIP_DEFAULTS = {
  backgroundColor: '#1f2937',
  titleColor: '#f9fafb',
  bodyColor: '#d1d5db',
  borderColor: '#374151',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 8,
  displayColors: true,
  boxWidth: 8, boxHeight: 8, boxPadding: 4,
};

// Destroy existing chart on canvas before creating new one
function destroyChart(id) {
  const existing = Chart.getChart(id);
  if (existing) existing.destroy();
}

// ─── BAR CHART (monthly trend) ───
function buildBarChart(id, labels, datasets, opts = {}) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: datasets.length > 1, position: 'bottom',
          labels: { font: { size: 11 }, padding: 12, boxWidth: 10, boxHeight: 10, boxPadding: 3 } },
        tooltip: { ...TOOLTIP_DEFAULTS,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${Utils.fmtRp(ctx.raw, true)}`
          }
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0 } },
        y: { grid: { color: '#f3f4f6' },
          ticks: { font: { size: 10 }, callback: v => Utils.fmtRp(v, true) } },
      },
      ...opts,
    },
  });
}

// ─── STACKED BAR ───
function buildStackedBar(id, labels, datasets, opts = {}) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom',
          labels: { font: { size: 11 }, padding: 12, boxWidth: 10, boxHeight: 10 } },
        tooltip: { ...TOOLTIP_DEFAULTS, mode: 'index',
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${Utils.fmtRp(ctx.raw, true)}` }
        },
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: true, grid: { color: '#f3f4f6' },
          ticks: { font: { size: 10 }, callback: v => Utils.fmtRp(v, true) } },
      },
      ...opts,
    },
  });
}

// ─── DONUT CHART ───
function buildDonut(id, labels, data, colors, opts = {}) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 5 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: true, position: 'right',
          labels: { font: { size: 11 }, padding: 10, boxWidth: 10 } },
        tooltip: { ...TOOLTIP_DEFAULTS,
          callbacks: {
            label: ctx => ` ${ctx.label}: ${Utils.fmtRp(ctx.raw, true)} (${Math.round(ctx.raw / ctx.dataset.data.reduce((a,b)=>a+b,0)*100)}%)`
          }
        },
      },
      ...opts,
    },
  });
}

// ─── LINE CHART ───
function buildLineChart(id, labels, datasets, opts = {}) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: datasets.length > 1, position: 'bottom',
          labels: { font: { size: 11 }, padding: 12, boxWidth: 10, boxHeight: 2 } },
        tooltip: { ...TOOLTIP_DEFAULTS,
          mode: 'index', intersect: false,
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${Utils.fmtRp(ctx.raw, true)}` },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { grid: { color: '#f3f4f6' },
          ticks: { font: { size: 10 }, callback: v => Utils.fmtRp(v, true) } },
      },
      interaction: { mode: 'index', intersect: false },
      ...opts,
    },
  });
}

// ─── BUDGET vs ACTUAL HORIZONTAL BAR ───
function buildBudgetActualChart(id, bvData, person) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  const labels = bvData.map(d => {
    const meta = Utils.getCategoryMeta(d.category, person);
    return meta.label;
  });
  const budgets = bvData.map(d => d.budget);
  const actuals = bvData.map(d => d.actual);
  const colors  = bvData.map(d => d.actual > d.budget ? '#dc2626' : '#2563eb');

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Budget', data: budgets, backgroundColor: '#e5e7eb', borderRadius: 3, borderSkipped: false },
        { label: 'Aktual', data: actuals, backgroundColor: colors, borderRadius: 3, borderSkipped: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: true, position: 'bottom',
          labels: { font: { size: 11 }, padding: 12, boxWidth: 10 } },
        tooltip: { ...TOOLTIP_DEFAULTS,
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${Utils.fmtRp(ctx.raw, true)}` }
        },
      },
      scales: {
        x: { grid: { color: '#f3f4f6' },
          ticks: { font: { size: 10 }, callback: v => Utils.fmtRp(v, true) } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  });
}

window.Charts = {
  buildBarChart, buildStackedBar, buildDonut,
  buildLineChart, buildBudgetActualChart, destroyChart,
};
