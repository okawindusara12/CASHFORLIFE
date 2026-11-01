// ==========================================================================
// Cash Tracker - Debts & Liabilities Module (Hutang & Kewajiban)
// Jangka Pendek, Jangka Panjang, Cicilan, Bunga, & Auto-sync to Neraca
// ==========================================================================

const DebtsModule = {
  activeTab: 'all', // 'all', 'short', 'long'

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    ['dbtTotalLoanInput', 'dbtRemainingInput', 'dbtMonthlyPaymentInput'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => {
          const val = CashTrackerStorage.parseRupiah(e.target.value);
          e.target.value = val ? CashTrackerStorage.formatRupiah(val, false) : '';
        });
      }
    });

    document.querySelectorAll('[data-dbt-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-dbt-filter]').forEach(b => b.classList.remove('active', 'btn-primary'));
        btn.classList.add('active', 'btn-primary');
        this.activeTab = btn.getAttribute('data-dbt-filter');
        this.renderTable();
      });
    });
  },

  openAddModal() {
    const modal = document.getElementById('debtModal');
    if (!modal) return;
    document.getElementById('debtForm').reset();
    document.getElementById('dbtEditId').value = '';
    document.getElementById('debtModalTitle').innerText = 'Catat Hutang / Pinjaman Baru';
    modal.classList.add('active');
  },

  openEditModal(id) {
    const item = (window.storage.data.debts || []).find(d => d.id === id);
    if (!item) return;

    const modal = document.getElementById('debtModal');
    document.getElementById('dbtEditId').value = item.id;
    document.getElementById('dbtCreditorInput').value = item.creditorName || '';
    document.getElementById('dbtCategorySelect').value = item.category || 'Jangka Pendek';
    document.getElementById('dbtTotalLoanInput').value = CashTrackerStorage.formatRupiah(item.totalLoan, false);
    document.getElementById('dbtRemainingInput').value = CashTrackerStorage.formatRupiah(item.remainingAmount, false);
    document.getElementById('dbtInterestInput').value = item.interestRate || 0;
    document.getElementById('dbtMonthlyPaymentInput').value = CashTrackerStorage.formatRupiah(item.monthlyPayment, false);
    document.getElementById('dbtDueDayInput').value = item.dueDayOfMonth || 1;
    document.getElementById('dbtNotesInput').value = item.notes || '';

    document.getElementById('debtModalTitle').innerText = 'Edit Data Hutang / Kewajiban';
    modal.classList.add('active');
  },

  saveFromModal(e) {
    e.preventDefault();
    const id = document.getElementById('dbtEditId').value;
    const creditorName = document.getElementById('dbtCreditorInput').value.trim();
    const category = document.getElementById('dbtCategorySelect').value;
    const totalLoan = CashTrackerStorage.parseRupiah(document.getElementById('dbtTotalLoanInput').value);
    const remainingAmount = CashTrackerStorage.parseRupiah(document.getElementById('dbtRemainingInput').value);
    const interestRate = parseFloat(document.getElementById('dbtInterestInput').value) || 0;
    const monthlyPayment = CashTrackerStorage.parseRupiah(document.getElementById('dbtMonthlyPaymentInput').value);
    const dueDayOfMonth = parseInt(document.getElementById('dbtDueDayInput').value, 10) || 1;
    const notes = document.getElementById('dbtNotesInput').value.trim();

    if (!creditorName) {
      AppUI.showToast('Nama Kreditor / Bank harus diisi!', 'error');
      return;
    }

    if (id) {
      const idx = window.storage.data.debts.findIndex(d => d.id === id);
      if (idx !== -1) {
        window.storage.data.debts[idx] = {
          ...window.storage.data.debts[idx],
          creditorName, category, totalLoan, remainingAmount, interestRate, monthlyPayment, dueDayOfMonth, notes,
          status: remainingAmount <= 0 ? 'paid' : 'active'
        };
        AppUI.showToast('Data hutang diperbarui!', 'success');
      }
    } else {
      const newDebt = {
        id: 'dbt_' + Date.now(),
        creditorName, category, totalLoan, remainingAmount, interestRate, monthlyPayment, dueDayOfMonth, notes,
        status: remainingAmount <= 0 ? 'paid' : 'active'
      };
      window.storage.data.debts.unshift(newDebt);
      AppUI.showToast('Hutang baru berhasil dicatat!', 'success');
    }

    window.storage.save();
    document.getElementById('debtModal').classList.remove('active');
    window.app.refreshAll();
  },

  payInstallment(id) {
    const debt = (window.storage.data.debts || []).find(d => d.id === id);
    if (!debt) return;

    const defaultPayment = debt.monthlyPayment || debt.remainingAmount;
    const paymentPrompt = prompt(`Masukkan nominal pembayaran cicilan untuk "${debt.creditorName}":\n(Sisa Hutang: ${CashTrackerStorage.formatRupiah(debt.remainingAmount)})`, defaultPayment);
    if (!paymentPrompt) return;

    const paidVal = CashTrackerStorage.parseRupiah(paymentPrompt);
    if (paidVal <= 0) {
      AppUI.showToast('Nominal pembayaran tidak valid.', 'error');
      return;
    }

    // Reduce debt remaining
    debt.remainingAmount = Math.max(0, debt.remainingAmount - paidVal);
    if (debt.remainingAmount === 0) {
      debt.status = 'paid';
    }

    // Record as Expense transaction
    const newTx = {
      id: 'trx_' + Date.now(),
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      amount: paidVal,
      category: 'Cicilan & Bayar Hutang',
      accountId: window.storage.data.accounts[0]?.id || 'acc_1',
      notes: `Pembayaran cicilan: ${debt.creditorName} (Sisa: ${CashTrackerStorage.formatRupiah(debt.remainingAmount)})`
    };
    window.storage.data.transactions.unshift(newTx);

    window.storage.save();
    AppUI.showToast(`Pembayaran cicilan ${CashTrackerStorage.formatRupiah(paidVal)} berhasil dicatat & masuk ke pengeluaran!`, 'success');
    window.app.refreshAll();
  },

  deleteDebt(id) {
    if (!confirm('Hapus data hutang ini?')) return;
    window.storage.data.debts = window.storage.data.debts.filter(d => d.id !== id);
    window.storage.save();
    AppUI.showToast('Data hutang dihapus.', 'info');
    window.app.refreshAll();
  },

  renderTable() {
    const tbody = document.getElementById('debtsTableBody');
    if (!tbody) return;

    let list = [...(window.storage.data.debts || [])];

    if (this.activeTab === 'short') {
      list = list.filter(d => d.category === 'Jangka Pendek');
    } else if (this.activeTab === 'long') {
      list = list.filter(d => d.category === 'Jangka Panjang');
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 2.5rem 1rem; color: var(--text-muted);">
            ${icon('credit-card', 'w-8 h-8', 32)}
            <div style="margin-top: 8px; font-weight: 500;">Tidak ada hutang aktif pada kategori ini. Bebas beban!</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(item => {
      const isPaid = item.remainingAmount <= 0;
      const pctPaid = item.totalLoan > 0 ? Math.min(100, Math.round(((item.totalLoan - item.remainingAmount) / item.totalLoan) * 100)) : 100;
      const isShort = item.category === 'Jangka Pendek';

      return `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-main);">${item.creditorName}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${item.notes || '-'}</div>
          </td>
          <td>
            <span class="badge ${isShort ? 'badge-warning' : 'badge-purple'}">${item.category}</span>
          </td>
          <td style="text-align: right;">
            <div>${CashTrackerStorage.formatRupiah(item.totalLoan)}</div>
            <div style="font-size: 11px; color: var(--text-muted);">Bunga: ${item.interestRate}%</div>
          </td>
          <td style="text-align: right;">
            <div style="font-size: 1rem; font-weight: 700; color: ${isPaid ? 'var(--income)' : 'var(--expense)'};">
              ${isPaid ? 'LUNAS' : CashTrackerStorage.formatRupiah(item.remainingAmount)}
            </div>
            <div style="font-size: 11px; color: var(--text-muted);">Progress: ${pctPaid}%</div>
          </td>
          <td style="text-align: right;">
            <div style="font-weight: 600;">${CashTrackerStorage.formatRupiah(item.monthlyPayment)} /bln</div>
            <div style="font-size: 11px; color: var(--warning); font-weight: 500;">Tgl ${item.dueDayOfMonth} tiap bulan</div>
          </td>
          <td style="text-align: center;">
            <span class="badge ${isPaid ? 'badge-income' : 'badge-expense'}">
              ${isPaid ? 'Lunas' : 'Belum Lunas'}
            </span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            ${!isPaid ? `
              <button class="btn btn-primary btn-sm" onclick="DebtsModule.payInstallment('${item.id}')" title="Bayar Cicilan">
                ${icon('check-circle', 'w-3.5 h-3.5', 14)} Bayar
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" onclick="DebtsModule.openEditModal('${item.id}')" title="Edit">
              ${icon('edit', 'w-3.5 h-3.5', 14)}
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="DebtsModule.deleteDebt('${item.id}')" title="Hapus">
              ${icon('trash', 'w-3.5 h-3.5', 14)}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderSummary() {
    const totalShort = window.storage.getTotalShortTermDebts();
    const totalLong = window.storage.getTotalLongTermDebts();
    const totalAll = totalShort + totalLong;

    const monthlyTotal = (window.storage.data.debts || [])
      .filter(d => d.status === 'active')
      .reduce((sum, d) => sum + (Number(d.monthlyPayment) || 0), 0);

    const elTotal = document.getElementById('debtTotalAmount');
    if (elTotal) elTotal.innerText = CashTrackerStorage.formatRupiah(totalAll);

    const elShort = document.getElementById('debtShortTermAmount');
    if (elShort) elShort.innerText = CashTrackerStorage.formatRupiah(totalShort);

    const elLong = document.getElementById('debtLongTermAmount');
    if (elLong) elLong.innerText = CashTrackerStorage.formatRupiah(totalLong);

    const elMonthly = document.getElementById('debtMonthlyTotal');
    if (elMonthly) elMonthly.innerText = CashTrackerStorage.formatRupiah(monthlyTotal);
  },

  render() {
    this.renderSummary();
    this.renderTable();
  }
};
