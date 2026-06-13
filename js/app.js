// ─── APP STATE ───
const App = {
  currentPage: 'family',
  ym: Utils.currentYearMonth(),   // { year, month }
  data: {},                        // cached month data

  init() {
    this.registerSW();
    this.setupNav();
    this.loadPage('family');
    document.getElementById('month-display').textContent =
      Utils.fmtMonth(this.ym.year, this.ym.month);
  },

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  },

  setupNav() {
    // Nav item clicks
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        this.loadPage(page);
      });
    });

    // Hamburger
    const ham = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    if (ham && sidebar) {
      ham.addEventListener('click', () => sidebar.classList.toggle('open'));
      document.addEventListener('click', e => {
        if (!sidebar.contains(e.target) && !ham.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }

    // Month prev/next
    document.getElementById('btn-prev-month')?.addEventListener('click', () => {
      this.ym = Utils.prevMonth(this.ym.year, this.ym.month);
      this.onMonthChange();
    });
    document.getElementById('btn-next-month')?.addEventListener('click', () => {
      this.ym = Utils.nextMonth(this.ym.year, this.ym.month);
      this.onMonthChange();
    });
  },

  onMonthChange() {
    document.getElementById('month-display').textContent =
      Utils.fmtMonth(this.ym.year, this.ym.month);
    this.data = {};
    this.loadPage(this.currentPage);
  },

  setActiveNav(page) {
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.remove('active', 'active-mayang');
    });
    const item = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (item) {
      if (page === 'mayang') item.classList.add('active-mayang');
      else item.classList.add('active');
    }
  },

  async loadPage(page) {
    this.currentPage = page;
    this.setActiveNav(page);

    const titles = {
      family: 'Dashboard Keluarga',
      emir:   'Keuangan Emir',
      mayang: 'Keuangan Mayang',
      input:  'Input Data Bulanan',
      budget: 'Budget vs Aktual',
      trends: 'Tren & Analisis',
    };
    document.getElementById('page-title').textContent = titles[page] || 'FamFinance';
    document.getElementById('sidebar')?.classList.remove('open');

    const container = document.getElementById('page-container');
    container.innerHTML = `<div class="loading-overlay"><div class="loading-spinner"></div></div>`;

    try {
      // Fetch fresh data for current month
      if (!this.data.loaded) {
        this.data = await DB.getMonthData(this.ym.year, this.ym.month);
        this.data.loaded = true;
      }

      switch (page) {
        case 'family': await Pages.renderFamily(this.data, this.ym); break;
        case 'emir':   await Pages.renderEmir(this.data, this.ym);   break;
        case 'mayang': await Pages.renderMayang(this.data, this.ym); break;
        case 'input':  Pages.renderInput(this.data, this.ym);        break;
        case 'budget': await Pages.renderBudget(this.data, this.ym); break;
        case 'trends': await Pages.renderTrends(this.ym);            break;
      }
    } catch (err) {
      console.error(err);
      container.innerHTML = `
        <div class="empty">
          <div class="empty-icon">⚠️</div>
          <div class="empty-text">Gagal memuat data. Cek koneksi &amp; konfigurasi Supabase.</div>
          <div style="margin-top:8px;font-size:12px;color:var(--hint)">${err.message}</div>
          <button class="btn-secondary" style="margin-top:16px" onclick="App.loadPage('${page}')">Coba Lagi</button>
        </div>`;
    }
  },

  // Force reload (called after input save)
  async reload() {
    this.data = {};
    await this.loadPage(this.currentPage);
  },
};

// ─── PAGE RENDERERS ───
const Pages = {

  // ── FAMILY DASHBOARD ──
  async renderFamily(data, ym) {
    const { entries, expenses, contributions } = data;
    const emirIncome = entries.find(e => e.person === 'emir')?.income || 0;
    const mayangIncome = entries.find(e => e.person === 'mayang')?.income || 0;
    const totalIncome = emirIncome + mayangIncome;

    const emirExpenses = Utils.sumExpenses(expenses, 'emir');
    const mayangExpenses = Utils.sumExpenses(expenses, 'mayang');
    const familyExpenses = Utils.sumExpenses(expenses, 'family');
    const totalExpenses = emirExpenses + mayangExpenses + familyExpenses;

    const emirContrib = contributions.find(c => c.person === 'emir')?.amount || 0;
    const mayangContrib = contributions.find(c => c.person === 'mayang')?.amount || 0;
    const familyPool = emirContrib + mayangContrib;

    const savings = totalIncome - totalExpenses;

    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card kpi-blue">
          <div class="kpi-label">Total Pendapatan</div>
          <div class="kpi-value">${Utils.fmtRp(totalIncome, true)}</div>
          <div class="kpi-sub">${Utils.fmtMonth(ym.year, ym.month)}</div>
        </div>
        <div class="kpi-card kpi-red">
          <div class="kpi-label">Total Pengeluaran</div>
          <div class="kpi-value">${Utils.fmtRp(totalExpenses, true)}</div>
          <div class="kpi-sub">${Utils.fmtPct(totalExpenses, totalIncome)} dari pendapatan</div>
        </div>
        <div class="kpi-card ${savings >= 0 ? 'kpi-green' : 'kpi-red'}">
          <div class="kpi-label">Sisa / Tabungan</div>
          <div class="kpi-value">${Utils.fmtRp(savings, true)}</div>
          <div class="kpi-sub">${savings >= 0 ? '✅ Surplus' : '⚠️ Defisit'}</div>
        </div>
        <div class="kpi-card kpi-teal">
          <div class="kpi-label">Dana Keluarga</div>
          <div class="kpi-value">${Utils.fmtRp(familyPool, true)}</div>
          <div class="kpi-sub">Kontribusi bersama</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="section-card">
          <div class="section-header">
            <div><div class="section-title">Ringkasan Per Orang</div></div>
          </div>
          <table class="data-table">
            <thead><tr>
              <th>Orang</th><th>Pendapatan</th><th>Pengeluaran</th><th>Sisa</th><th>Kontribusi Keluarga</th>
            </tr></thead>
            <tbody>
              <tr>
                <td><div style="display:flex;align-items:center;gap:8px">
                  <div class="avatar avatar-e">E</div>
                  <span style="font-weight:500">Emir</span>
                </div></td>
                <td class="mono">${Utils.fmtRp(emirIncome, true)}</td>
                <td class="mono">${Utils.fmtRp(emirExpenses, true)}</td>
                <td class="mono ${emirIncome - emirExpenses < 0 ? 'style="color:var(--red)"' : ''}">${Utils.fmtRp(emirIncome - emirExpenses, true)}</td>
                <td class="mono">${Utils.fmtRp(emirContrib, true)}</td>
              </tr>
              <tr>
                <td><div style="display:flex;align-items:center;gap:8px">
                  <div class="avatar avatar-m">M</div>
                  <span style="font-weight:500">Mayang</span>
                </div></td>
                <td class="mono">${Utils.fmtRp(mayangIncome, true)}</td>
                <td class="mono">${Utils.fmtRp(mayangExpenses, true)}</td>
                <td class="mono">${Utils.fmtRp(mayangIncome - mayangExpenses, true)}</td>
                <td class="mono">${Utils.fmtRp(mayangContrib, true)}</td>
              </tr>
              <tr style="font-weight:600;background:var(--bg)">
                <td>Total Keluarga</td>
                <td class="mono">${Utils.fmtRp(totalIncome, true)}</td>
                <td class="mono">${Utils.fmtRp(totalExpenses, true)}</td>
                <td class="mono">${Utils.fmtRp(savings, true)}</td>
                <td class="mono">${Utils.fmtRp(familyPool, true)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section-card">
          <div class="section-header">
            <div class="section-title">Komposisi Pengeluaran</div>
          </div>
          <div class="chart-wrap chart-h240">
            <canvas id="chart-family-donut"></canvas>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <div><div class="section-title">Pengeluaran Keluarga per Kategori</div>
          <div class="section-sub">Bulan ${Utils.fmtMonth(ym.year, ym.month)}</div></div>
        </div>
        <div id="family-category-bars"></div>
      </div>
    `;

    // Donut
    const catMap = Utils.groupByCategory(expenses);
    const catKeys = Object.keys(catMap).filter(k => catMap[k] > 0);
    if (catKeys.length) {
      Charts.buildDonut(
        'chart-family-donut',
        catKeys.map(k => {
          const p = expenses.find(e => e.category === k)?.person;
          return Utils.getCategoryMeta(k, p).label;
        }),
        catKeys.map(k => catMap[k]),
        catKeys.map(k => {
          const p = expenses.find(e => e.category === k)?.person;
          return Utils.getCategoryMeta(k, p).color;
        }),
      );
    } else {
      document.getElementById('chart-family-donut').closest('.chart-wrap').innerHTML =
        '<div class="empty"><div class="empty-icon">📊</div><div class="empty-text">Belum ada data pengeluaran bulan ini</div></div>';
    }

    // Category bars
    const barsEl = document.getElementById('family-category-bars');
    if (!catKeys.length) {
      barsEl.innerHTML = '<div class="empty"><div class="empty-text">Belum ada data. Silakan input dulu.</div></div>';
    } else {
      const total = Object.values(catMap).reduce((a, b) => a + b, 0);
      barsEl.innerHTML = catKeys.sort((a, b) => catMap[b] - catMap[a]).map(k => {
        const p = expenses.find(e => e.category === k)?.person;
        const meta = Utils.getCategoryMeta(k, p);
        const pct = Math.round((catMap[k] / total) * 100);
        return `
          <div class="prog-row">
            <span class="prog-label">${meta.icon} ${meta.label}</span>
            <div class="prog-track"><div class="prog-fill" style="width:${pct}%;background:${meta.color}"></div></div>
            <span class="prog-val">${Utils.fmtRp(catMap[k], true)}</span>
            <span class="prog-pct">${pct}%</span>
          </div>`;
      }).join('');
    }
  },

  // ── EMIR PAGE ──
  async renderEmir(data, ym) {
    this._renderPersonPage('emir', 'Emir', data, ym, 'avatar-e', 'var(--blue)');
  },

  // ── MAYANG PAGE ──
  async renderMayang(data, ym) {
    this._renderPersonPage('mayang', 'Mayang', data, ym, 'avatar-m', 'var(--mayang)');
  },

  _renderPersonPage(person, name, data, ym, avatarClass, accentColor) {
    const { entries, expenses, budgets, contributions } = data;
    const income = entries.find(e => e.person === person)?.income || 0;
    const myExpenses = expenses.filter(e => e.person === person);
    const totalSpent = Utils.sumExpenses(myExpenses);
    const contrib = contributions.find(c => c.person === person)?.amount || 0;
    const savings = income - totalSpent - contrib;
    const cats = person === 'mayang' ? Utils.CATEGORIES_MAYANG : Utils.CATEGORIES_EMIR;
    const catMap = Utils.groupByCategory(myExpenses);

    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card kpi-blue">
          <div class="kpi-label">Pendapatan</div>
          <div class="kpi-value">${Utils.fmtRp(income, true)}</div>
          <div class="kpi-sub">${Utils.fmtMonth(ym.year, ym.month)}</div>
        </div>
        <div class="kpi-card kpi-red">
          <div class="kpi-label">Total Pengeluaran</div>
          <div class="kpi-value">${Utils.fmtRp(totalSpent, true)}</div>
          <div class="kpi-sub">${Utils.fmtPct(totalSpent, income)} dari pendapatan</div>
        </div>
        <div class="kpi-card kpi-teal">
          <div class="kpi-label">Kontribusi Keluarga</div>
          <div class="kpi-value">${Utils.fmtRp(contrib, true)}</div>
          <div class="kpi-sub">Ke dana bersama</div>
        </div>
        <div class="kpi-card ${savings >= 0 ? 'kpi-green' : 'kpi-red'}">
          <div class="kpi-label">Sisa Pribadi</div>
          <div class="kpi-value">${Utils.fmtRp(savings, true)}</div>
          <div class="kpi-sub">${savings >= 0 ? '✅ Surplus' : '⚠️ Defisit'}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="section-card">
          <div class="section-header">
            <div class="section-title">Pengeluaran per Kategori</div>
          </div>
          <div id="${person}-cat-bars"></div>
        </div>
        <div class="section-card">
          <div class="section-header"><div class="section-title">Distribusi</div></div>
          <div class="chart-wrap chart-h240"><canvas id="chart-${person}-donut"></canvas></div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <div class="section-title">Budget vs Aktual</div>
        </div>
        <div class="chart-wrap chart-h280"><canvas id="chart-${person}-bva"></canvas></div>
      </div>
    `;

    // Category bars
    const barsEl = document.getElementById(`${person}-cat-bars`);
    const totalCats = Object.values(catMap).reduce((a, b) => a + b, 0);
    if (!myExpenses.length) {
      barsEl.innerHTML = '<div class="empty"><div class="empty-text">Belum ada data pengeluaran</div></div>';
    } else {
      barsEl.innerHTML = cats
        .filter(c => catMap[c.key])
        .sort((a, b) => (catMap[b.key] || 0) - (catMap[a.key] || 0))
        .map(c => {
          const pct = Math.round(((catMap[c.key] || 0) / totalCats) * 100);
          return `
            <div class="prog-row">
              <span class="prog-label">${c.icon} ${c.label}</span>
              <div class="prog-track"><div class="prog-fill" style="width:${pct}%;background:${c.color}"></div></div>
              <span class="prog-val">${Utils.fmtRp(catMap[c.key] || 0, true)}</span>
              <span class="prog-pct">${pct}%</span>
            </div>`;
        }).join('');
    }

    // Donut
    const filledCats = cats.filter(c => catMap[c.key] > 0);
    if (filledCats.length) {
      Charts.buildDonut(
        `chart-${person}-donut`,
        filledCats.map(c => c.label),
        filledCats.map(c => catMap[c.key] || 0),
        filledCats.map(c => c.color),
      );
    }

    // BvA
    const bvaData = Utils.budgetVsActual(budgets, myExpenses, person);
    if (bvaData.length) {
      Charts.buildBudgetActualChart(`chart-${person}-bva`, bvaData, person);
    } else {
      document.getElementById(`chart-${person}-bva`).closest('.chart-wrap').innerHTML =
        '<div class="empty"><div class="empty-text">Set budget dulu di halaman Budget</div></div>';
    }
  },

  // ── INPUT PAGE ──
  renderInput(data, ym) {
    const { entries, contributions } = data;
    const emirIncome = entries.find(e => e.person === 'emir')?.income || '';
    const mayangIncome = entries.find(e => e.person === 'mayang')?.income || '';
    const emirContrib = contributions.find(c => c.person === 'emir')?.amount || '';
    const mayangContrib = contributions.find(c => c.person === 'mayang')?.amount || '';

    const emirCats = Utils.CATEGORIES_EMIR;
    const mayangCats = Utils.CATEGORIES_MAYANG;
    const familyCats = Utils.CATEGORIES_FAMILY;

    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="grid-2" style="margin-bottom:16px">

        <!-- EMIR INCOME -->
        <div class="section-card">
          <div class="section-header">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar avatar-e">E</div>
              <div class="section-title">Pendapatan Emir</div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Gaji / Pendapatan Bulan Ini</label>
            <div class="input-prefix">
              <span class="input-prefix-label">Rp</span>
              <input type="number" id="emir-income" value="${emirIncome}" placeholder="0">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Kontribusi ke Dana Keluarga</label>
            <div class="input-prefix">
              <span class="input-prefix-label">Rp</span>
              <input type="number" id="emir-contrib" value="${emirContrib}" placeholder="0">
            </div>
          </div>
          <button class="btn-primary" onclick="Pages.saveIncome('emir')">💾 Simpan</button>
        </div>

        <!-- MAYANG INCOME -->
        <div class="section-card">
          <div class="section-header">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar avatar-m">M</div>
              <div class="section-title">Pendapatan Mayang</div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Gaji / Pendapatan Bulan Ini</label>
            <div class="input-prefix">
              <span class="input-prefix-label">Rp</span>
              <input type="number" id="mayang-income" value="${mayangIncome}" placeholder="0">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Kontribusi ke Dana Keluarga</label>
            <div class="input-prefix">
              <span class="input-prefix-label">Rp</span>
              <input type="number" id="mayang-contrib" value="${mayangContrib}" placeholder="0">
            </div>
          </div>
          <button class="btn-primary" style="background:var(--mayang)" onclick="Pages.saveIncome('mayang')">💾 Simpan</button>
        </div>
      </div>

      <!-- ADD EXPENSE -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-title">➕ Tambah Pengeluaran</div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Untuk siapa</label>
            <select id="exp-person" class="form-select" onchange="Pages.onPersonChange()">
              <option value="emir">Emir</option>
              <option value="mayang">Mayang</option>
              <option value="family">Keluarga</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Kategori</label>
            <select id="exp-category" class="form-select"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Jumlah</label>
            <div class="input-prefix">
              <span class="input-prefix-label">Rp</span>
              <input type="number" id="exp-amount" placeholder="0">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Catatan (opsional)</label>
          <input type="text" id="exp-note" class="form-input" placeholder="e.g. Superindo, GoFood…">
        </div>
        <button class="btn-primary" onclick="Pages.addExpense()">➕ Tambah Pengeluaran</button>
      </div>

      <!-- EXPENSE LIST -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-title">Daftar Pengeluaran Bulan Ini</div>
          <span class="tag tag-gray">${data.expenses.length} transaksi</span>
        </div>
        <table class="data-table">
          <thead><tr><th>Orang</th><th>Kategori</th><th>Jumlah</th><th>Catatan</th><th></th></tr></thead>
          <tbody id="expense-list">
            ${this._renderExpenseRows(data.expenses)}
          </tbody>
        </table>
      </div>
    `;

    this.onPersonChange();
  },

  onPersonChange() {
    const person = document.getElementById('exp-person')?.value;
    const cats = person === 'mayang' ? Utils.CATEGORIES_MAYANG
               : person === 'family' ? Utils.CATEGORIES_FAMILY
               : Utils.CATEGORIES_EMIR;
    const sel = document.getElementById('exp-category');
    if (sel) sel.innerHTML = cats.map(c => `<option value="${c.key}">${c.icon} ${c.label}</option>`).join('');
  },

  _renderExpenseRows(expenses) {
    if (!expenses.length) return `<tr><td colspan="5" style="text-align:center;color:var(--hint);padding:24px">Belum ada pengeluaran</td></tr>`;
    return expenses.map(e => {
      const meta = Utils.getCategoryMeta(e.category, e.person);
      const personLabel = e.person === 'emir' ? '<span class="tag tag-blue">Emir</span>'
                       : e.person === 'mayang' ? '<span class="tag tag-pink">Mayang</span>'
                       : '<span class="tag tag-green">Keluarga</span>';
      return `
        <tr>
          <td>${personLabel}</td>
          <td><span style="display:inline-flex;align-items:center;gap:5px">
            <span style="width:8px;height:8px;border-radius:50%;background:${meta.color};display:inline-block"></span>
            ${meta.label}
          </span></td>
          <td class="mono" style="font-weight:500">${Utils.fmtRp(e.amount)}</td>
          <td style="color:var(--muted)">${e.note || '—'}</td>
          <td><button class="btn-secondary" style="padding:4px 10px;font-size:11px" onclick="Pages.deleteExpense('${e.id}')">Hapus</button></td>
        </tr>`;
    }).join('');
  },

  async saveIncome(person) {
    const income = parseFloat(document.getElementById(`${person}-income`)?.value) || 0;
    const contrib = parseFloat(document.getElementById(`${person}-contrib`)?.value) || 0;
    try {
      await DB.saveIncome(person, App.ym.year, App.ym.month, income);
      await DB.saveContribution(person, App.ym.year, App.ym.month, contrib);
      Utils.showToast(`Data ${person} tersimpan ✓`, 'success');
      App.data = {};
    } catch (e) {
      Utils.showToast('Gagal menyimpan: ' + e.message, 'error');
    }
  },

  async addExpense() {
    const person = document.getElementById('exp-person')?.value;
    const category = document.getElementById('exp-category')?.value;
    const amount = parseFloat(document.getElementById('exp-amount')?.value) || 0;
    const note = document.getElementById('exp-note')?.value || '';
    if (!amount) { Utils.showToast('Masukkan jumlah dulu', 'error'); return; }
    try {
      await DB.addExpense(person, App.ym.year, App.ym.month, category, amount, note);
      Utils.showToast('Pengeluaran ditambahkan ✓', 'success');
      document.getElementById('exp-amount').value = '';
      document.getElementById('exp-note').value = '';
      App.data = {};
      App.data = await DB.getMonthData(App.ym.year, App.ym.month);
      App.data.loaded = true;
      document.getElementById('expense-list').innerHTML =
        this._renderExpenseRows(App.data.expenses);
    } catch (e) {
      Utils.showToast('Gagal: ' + e.message, 'error');
    }
  },

  async deleteExpense(id) {
    if (!confirm('Hapus pengeluaran ini?')) return;
    try {
      await DB.sbDelete('expenses', id);
      Utils.showToast('Dihapus ✓', 'success');
      App.data = {};
      App.data = await DB.getMonthData(App.ym.year, App.ym.month);
      App.data.loaded = true;
      document.getElementById('expense-list').innerHTML =
        this._renderExpenseRows(App.data.expenses);
    } catch (e) {
      Utils.showToast('Gagal: ' + e.message, 'error');
    }
  },

  // ── BUDGET PAGE ──
  async renderBudget(data, ym) {
    const { budgets, expenses } = data;
    const persons = [
      { key: 'emir',   label: 'Emir',   cats: Utils.CATEGORIES_EMIR,   accent: 'var(--blue)' },
      { key: 'mayang', label: 'Mayang', cats: Utils.CATEGORIES_MAYANG, accent: 'var(--mayang)' },
      { key: 'family', label: 'Keluarga', cats: Utils.CATEGORIES_FAMILY, accent: 'var(--green)' },
    ];

    const container = document.getElementById('page-container');
    container.innerHTML = persons.map(p => {
      const bva = Utils.budgetVsActual(
        budgets.filter(b => b.person === p.key),
        expenses.filter(e => e.person === p.key),
        p.key
      );
      const totalBudget = bva.reduce((a, b) => a + b.budget, 0);
      const totalActual = bva.reduce((a, b) => a + b.actual, 0);

      return `
        <div class="section-card">
          <div class="section-header">
            <div>
              <div class="section-title" style="color:${p.accent}">${p.label} — Budget vs Aktual</div>
              <div class="section-sub">${Utils.fmtMonth(ym.year, ym.month)}</div>
            </div>
            <button class="btn-primary" style="background:${p.accent}" onclick="Pages.openBudgetModal('${p.key}','${p.label}')">
              ✏️ Set Budget
            </button>
          </div>

          <div class="kpi-grid kpi-grid-3" style="margin-bottom:16px">
            <div class="kpi-card kpi-blue">
              <div class="kpi-label">Total Budget</div>
              <div class="kpi-value" style="font-size:20px">${Utils.fmtRp(totalBudget, true)}</div>
            </div>
            <div class="kpi-card ${totalActual > totalBudget ? 'kpi-red' : 'kpi-green'}">
              <div class="kpi-label">Total Aktual</div>
              <div class="kpi-value" style="font-size:20px">${Utils.fmtRp(totalActual, true)}</div>
            </div>
            <div class="kpi-card ${totalBudget - totalActual < 0 ? 'kpi-red' : 'kpi-green'}">
              <div class="kpi-label">Sisa Budget</div>
              <div class="kpi-value" style="font-size:20px">${Utils.fmtRp(totalBudget - totalActual, true)}</div>
            </div>
          </div>

          ${bva.length ? `
          <div id="${p.key}-bva-bars">
            ${bva.map(item => {
              const meta = Utils.getCategoryMeta(item.category, p.key);
              const pct = item.budget > 0 ? Math.min(Math.round((item.actual / item.budget) * 100), 100) : 0;
              const overBudget = item.actual > item.budget && item.budget > 0;
              const nearBudget = !overBudget && pct >= 80;
              const rowClass = overBudget ? 'prog-over' : nearBudget ? 'prog-warn' : '';
              return `
                <div class="prog-row ${rowClass}">
                  <span class="prog-label">${meta.icon} ${meta.label}</span>
                  <div class="prog-track">
                    <div class="prog-fill" style="width:${pct}%;background:${overBudget ? 'var(--red)' : nearBudget ? 'var(--amber)' : meta.color}"></div>
                  </div>
                  <span class="prog-val">${Utils.fmtRp(item.actual, true)} / ${Utils.fmtRp(item.budget, true)}</span>
                  <span class="prog-pct ${overBudget ? 'style="color:var(--red)"' : ''}">${pct}%</span>
                </div>`;
            }).join('')}
          </div>` : `<div class="empty"><div class="empty-text">Belum ada budget. Klik "Set Budget" untuk mulai.</div></div>`}
        </div>`;
    }).join('');

    // Add modal placeholder
    container.insertAdjacentHTML('beforeend', `<div id="budget-modal" style="display:none" class="modal-backdrop"></div>`);
  },

  openBudgetModal(person, name) {
    const cats = person === 'mayang' ? Utils.CATEGORIES_MAYANG
               : person === 'family' ? Utils.CATEGORIES_FAMILY
               : Utils.CATEGORIES_EMIR;
    const existing = (App.data.budgets || []).filter(b => b.person === person);
    const bMap = {};
    existing.forEach(b => bMap[b.category] = b.amount);

    const modal = document.getElementById('budget-modal');
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div>
            <div class="modal-title">Set Budget — ${name}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px">${Utils.fmtMonth(App.ym.year, App.ym.month)}</div>
          </div>
          <button class="modal-close" onclick="document.getElementById('budget-modal').style.display='none'">✕</button>
        </div>
        <div class="modal-body">
          ${cats.map(c => `
            <div class="form-group">
              <label class="form-label">${c.icon} ${c.label}</label>
              <div class="input-prefix">
                <span class="input-prefix-label">Rp</span>
                <input type="number" id="bgt-${c.key}" value="${bMap[c.key] || ''}" placeholder="0">
              </div>
            </div>`).join('')}
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="document.getElementById('budget-modal').style.display='none'">Batal</button>
          <button class="btn-primary" onclick="Pages.saveBudgets('${person}')">💾 Simpan Budget</button>
        </div>
      </div>`;
  },

  async saveBudgets(person) {
    const cats = person === 'mayang' ? Utils.CATEGORIES_MAYANG
               : person === 'family' ? Utils.CATEGORIES_FAMILY
               : Utils.CATEGORIES_EMIR;
    try {
      for (const c of cats) {
        const val = parseFloat(document.getElementById(`bgt-${c.key}`)?.value) || 0;
        if (val > 0) await DB.saveBudget(person, App.ym.year, App.ym.month, c.key, val);
      }
      Utils.showToast('Budget tersimpan ✓', 'success');
      document.getElementById('budget-modal').style.display = 'none';
      App.data = {};
      await App.loadPage('budget');
    } catch (e) {
      Utils.showToast('Gagal: ' + e.message, 'error');
    }
  },

  // ── TRENDS PAGE ──
  async renderTrends(ym) {
    const container = document.getElementById('page-container');
    container.innerHTML = `<div class="loading-overlay"><div class="loading-spinner"></div></div>`;
    const months = Utils.lastNMonths(6);

    // Fetch all months
    const allData = await Promise.all(months.map(m => DB.getMonthData(m.year, m.month)));
    const labels = months.map(m => Utils.monthLabel(m.year, m.month));

    const emirIncome   = allData.map(d => d.entries.find(e => e.person === 'emir')?.income || 0);
    const mayangIncome = allData.map(d => d.entries.find(e => e.person === 'mayang')?.income || 0);
    const emirSpend    = allData.map(d => Utils.sumExpenses(d.expenses, 'emir'));
    const mayangSpend  = allData.map(d => Utils.sumExpenses(d.expenses, 'mayang'));
    const familySpend  = allData.map(d => Utils.sumExpenses(d.expenses, 'family'));
    const savings      = allData.map((d, i) =>
      (emirIncome[i] + mayangIncome[i]) - (emirSpend[i] + mayangSpend[i] + familySpend[i])
    );

    container.innerHTML = `
      <div class="section-card">
        <div class="section-title" style="margin-bottom:16px">Pendapatan vs Pengeluaran (6 Bulan)</div>
        <div class="chart-wrap chart-h280"><canvas id="chart-trend-income"></canvas></div>
      </div>
      <div class="grid-2">
        <div class="section-card">
          <div class="section-title" style="margin-bottom:16px">Pengeluaran per Orang</div>
          <div class="chart-wrap chart-h240"><canvas id="chart-trend-spend"></canvas></div>
        </div>
        <div class="section-card">
          <div class="section-title" style="margin-bottom:16px">Tren Tabungan / Surplus</div>
          <div class="chart-wrap chart-h240"><canvas id="chart-trend-savings"></canvas></div>
        </div>
      </div>
    `;

    Charts.buildStackedBar('chart-trend-income', labels, [
      { label: 'Pendapatan Emir',   data: emirIncome,   backgroundColor: '#2563eb' },
      { label: 'Pendapatan Mayang', data: mayangIncome, backgroundColor: '#db2777' },
      { label: 'Pengeluaran Emir',  data: emirSpend.map(v => -v), backgroundColor: '#93c5fd' },
      { label: 'Pengeluaran Mayang',data: mayangSpend.map(v => -v), backgroundColor: '#fbcfe8' },
    ]);

    Charts.buildBarChart('chart-trend-spend', labels, [
      { label: 'Emir',     data: emirSpend,   backgroundColor: '#2563eb', borderRadius: 3 },
      { label: 'Mayang',   data: mayangSpend, backgroundColor: '#db2777', borderRadius: 3 },
      { label: 'Keluarga', data: familySpend, backgroundColor: '#059669', borderRadius: 3 },
    ], { plugins: { legend: { display: true } } });

    Charts.buildLineChart('chart-trend-savings', labels, [{
      label: 'Surplus / Defisit',
      data: savings,
      borderColor: '#059669',
      backgroundColor: 'rgba(5,150,105,.1)',
      fill: true,
      borderWidth: 2,
      pointRadius: 4,
      tension: 0.3,
    }]);
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
