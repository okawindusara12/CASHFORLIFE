// ==========================================================================
// Cash Tracker - Core Application Controller (Personal Finance Edition)
// Handles desktop sidebar, mobile bottom navigation, FAB, and responsive charts
// ==========================================================================

const AppUI = {
  showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-circle';
    if (type === 'warning') iconName = 'alert-triangle';

    toast.innerHTML = `
      <span style="color: var(--${type === 'error' ? 'expense' : (type === 'success' ? 'income' : 'info')});">
        ${icon(iconName, 'w-5 h-5', 20)}
      </span>
      <div style="flex: 1; font-weight: 500;">${message}</div>
      <button style="background:none; border:none; color:var(--text-muted); cursor:pointer;" onclick="this.parentElement.remove()">
        ${icon('x', 'w-4 h-4', 16)}
      </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }
};

class CashTrackerApp {
  constructor() {
    this.currentTab = 'dashboard';
  }

  init() {
    const savedTheme = window.storage.data.settings?.theme || 'light';
    this.setTheme(savedTheme);

    // Desktop & Mobile Sidebar clicks
    document.querySelectorAll('[data-nav-tab]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-nav-tab');
        this.switchTab(tab);
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) sidebar.classList.remove('open');
      });
    });

    // Mobile Bottom Navigation clicks
    document.querySelectorAll('[data-mobile-tab]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-mobile-tab');
        this.switchTab(tab);
      });
    });

    // Mobile sidebar toggle
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) sidebar.classList.toggle('open');
      });
    }

    // Theme toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        this.setTheme(next);
      });
    }

    // Modal close listeners
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    });
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-backdrop');
        if (modal) modal.classList.remove('active');
      });
    });

    // Submodules (Personal Finance)
    AccountsModule.init();
    TransactionsModule.init();
    DebtsModule.init();
    BalanceSheetModule.init();
    RemindersModule.init();
    CalculatorModule.init();

    this.refreshAll();
    renderAllIcons();

    window.addEventListener('resize', () => {
      if (this.currentTab === 'dashboard') {
        this.renderDashboardCharts();
      }
    });
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    window.storage.data.settings = window.storage.data.settings || {};
    window.storage.data.settings.theme = theme;
    window.storage.save();

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark' ? icon('sun', 'w-5 h-5', 20) : icon('moon', 'w-5 h-5', 20);
    }

    if (this.currentTab === 'dashboard') {
      this.renderDashboardCharts();
    }
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    // Desktop nav items
    document.querySelectorAll('[data-nav-tab]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-nav-tab') === tabName);
    });

    // Mobile nav items
    document.querySelectorAll('[data-mobile-tab]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-mobile-tab') === tabName);
    });

    // Tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const activePanel = document.getElementById(`tab-${tabName}`);
    if (activePanel) {
      activePanel.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const titleMap = {
      dashboard: 'Ringkasan Finansial',
      transactions: 'Pemasukan & Pengeluaran',
      debts: 'Kewajiban & Hutang',
      balancesheet: 'Neraca Keuangan Pribadi',
      reminders: 'Reminder Jatuh Tempo',
      calculator: 'Kalkulator Tabungan',
      settings: 'Pengaturan & Backup'
    };
    const titleEl = document.getElementById('navbarPageTitle');
    if (titleEl) titleEl.innerText = titleMap[tabName] || 'Cash Tracker';

    if (tabName === 'dashboard') this.renderDashboard();
    if (tabName === 'transactions') TransactionsModule.render();
    if (tabName === 'debts') DebtsModule.render();
    if (tabName === 'balancesheet') BalanceSheetModule.render();
    if (tabName === 'reminders') RemindersModule.render();
    if (tabName === 'calculator') CalculatorModule.render();
  }

  renderDashboardStats() {
    const totalCash = window.storage.getTotalCashAndBank();
    const netWorth = window.storage.getNetWorth();
    const totalFixedAssets = window.storage.getTotalFixedAssets();
    const totalDebts = window.storage.getTotalDebts();
    const monthlyStats = window.storage.getMonthlyStats();

    const elCash = document.getElementById('dashTotalCash');
    if (elCash) elCash.innerText = CashTrackerStorage.formatRupiah(totalCash);

    const elNetWorth = document.getElementById('dashNetWorth');
    if (elNetWorth) {
      elNetWorth.innerText = CashTrackerStorage.formatRupiah(netWorth);
      elNetWorth.style.color = netWorth >= 0 ? 'var(--income)' : 'var(--expense)';
    }

    const elIncome = document.getElementById('dashMonthlyIncome');
    if (elIncome) elIncome.innerText = CashTrackerStorage.formatRupiah(monthlyStats.totalIncome);

    const elExpense = document.getElementById('dashMonthlyExpense');
    if (elExpense) elExpense.innerText = CashTrackerStorage.formatRupiah(monthlyStats.totalExpense);

    const elFixed = document.getElementById('dashFixedAssetsVal');
    if (elFixed) elFixed.innerText = CashTrackerStorage.formatRupiah(totalFixedAssets);

    const elDebt = document.getElementById('dashTotalDebts');
    if (elDebt) elDebt.innerText = CashTrackerStorage.formatRupiah(totalDebts);
  }

  renderDashboardCharts() {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const now = new Date();
    const labels = [];
    const incomeData = [];
    const expenseData = [];

    // Show 6 months on desktop, 4 months on mobile for clear view
    const monthsBack = window.innerWidth < 480 ? 3 : 5;
    for (let i = monthsBack; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      labels.push(`${monthNames[mIdx]} '${String(yr).slice(-2)}`);

      const stats = window.storage.getMonthlyStats(yr, mIdx + 1);
      incomeData.push(stats.totalIncome);
      expenseData.push(stats.totalExpense);
    }

    AppCharts.renderBarComparison('dashCashflowCanvas', labels, incomeData, expenseData);

    // Expense Categories Donut
    const expenseCatMap = {};
    (window.storage.data.transactions || []).forEach(tx => {
      if (tx.type === 'expense') {
        const cat = tx.category || 'Lain-lain';
        expenseCatMap[cat] = (expenseCatMap[cat] || 0) + Number(tx.amount || 0);
      }
    });

    const expenseDonutData = Object.keys(expenseCatMap).map((cat, idx) => ({
      label: cat,
      value: expenseCatMap[cat],
      color: AppCharts.colors[idx % AppCharts.colors.length]
    })).sort((a, b) => b.value - a.value);

    AppCharts.renderDoughnut('dashExpenseDonutCanvas', 'dashExpenseDonutLegend', expenseDonutData);

    // Income Categories Donut
    const incomeCatMap = {};
    (window.storage.data.transactions || []).forEach(tx => {
      if (tx.type === 'income') {
        const cat = tx.category || 'Lain-lain';
        incomeCatMap[cat] = (incomeCatMap[cat] || 0) + Number(tx.amount || 0);
      }
    });

    const incomeDonutData = Object.keys(incomeCatMap).map((cat, idx) => ({
      label: cat,
      value: incomeCatMap[cat],
      color: AppCharts.colors[(idx + 2) % AppCharts.colors.length]
    })).sort((a, b) => b.value - a.value);

    AppCharts.renderDoughnut('dashIncomeDonutCanvas', 'dashIncomeDonutLegend', incomeDonutData);

    // Balance Sheet Visual: Liquid Cash vs Fixed Assets vs Short & Long Debts
    const currentAssets = window.storage.getTotalCurrentAssets();
    const fixedAssets = window.storage.getTotalFixedAssets();
    const shortDebts = window.storage.getTotalShortTermDebts();
    const longDebts = window.storage.getTotalLongTermDebts();

    AppCharts.renderBalanceComparison('dashBalanceBarCanvas', currentAssets, fixedAssets, shortDebts, longDebts);
  }

  renderRecentTransactions() {
    const list = [...(window.storage.data.transactions || [])];
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = list.slice(0, 5);

    const tbody = document.getElementById('dashRecentTxBody');
    if (!tbody) return;

    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:1.25rem; color:var(--text-muted);">Belum ada riwayat transaksi.</td></tr>`;
      return;
    }

    tbody.innerHTML = recent.map(t => {
      const isIncome = t.type === 'income';
      return `
        <tr>
          <td>
            <div style="font-weight:600; font-size:12px;">${CashTrackerStorage.formatDateID(t.date)}</div>
          </td>
          <td>
            <div style="font-weight:600; font-size:12px;">${t.category}</div>
            <div style="font-size:10px; color:var(--text-muted);">${t.notes || '-'}</div>
          </td>
          <td style="text-align:right; font-weight:700; font-size:12px; color:${isIncome ? 'var(--income)' : 'var(--expense)'}; white-space:nowrap;">
            ${isIncome ? '+' : '-'} ${CashTrackerStorage.formatRupiah(t.amount)}
          </td>
        </tr>
      `;
    }).join('');
  }

  renderDashboard() {
    this.renderDashboardStats();
    this.renderDashboardCharts();
    this.renderRecentTransactions();
  }

  refreshAll() {
    RemindersModule.renderBanner();
    AccountsModule.render();
    this.renderDashboardStats();
    if (this.currentTab === 'dashboard') {
      this.renderDashboard();
    } else if (this.currentTab === 'transactions') {
      TransactionsModule.render();
    } else if (this.currentTab === 'debts') {
      DebtsModule.render();
    } else if (this.currentTab === 'balancesheet') {
      BalanceSheetModule.render();
    } else if (this.currentTab === 'reminders') {
      RemindersModule.render();
    } else if (this.currentTab === 'calculator') {
      CalculatorModule.render();
    }
    RemindersModule.renderSummary();
  }
}

window.app = new CashTrackerApp();

document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
