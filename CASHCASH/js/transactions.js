// ==========================================================================
// Cash Tracker - Transactions Module (Pemasukan, Pengeluaran & Transfer)
// ==========================================================================

const TransactionsModule = {
  activeFilterType: 'all', // 'all', 'income', 'expense', 'transfer'
  searchQuery: '',
  filterCategory: '',
  filterAccountId: '',

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    const searchInput = document.getElementById('txSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.renderTable();
      });
    }

    document.querySelectorAll('[data-tx-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-tx-filter]').forEach(b => b.classList.remove('active', 'btn-primary'));
        btn.classList.add('active', 'btn-primary');
        this.activeFilterType = btn.getAttribute('data-tx-filter');
        this.renderTable();
      });
    });

    const nominalInput = document.getElementById('txAmountInput');
    if (nominalInput) {
      nominalInput.addEventListener('input', (e) => {
        const val = CashTrackerStorage.parseRupiah(e.target.value);
        e.target.value = val ? CashTrackerStorage.formatRupiah(val, false) : '';
      });
    }

    const typeRadios = document.querySelectorAll('input[name="txModalType"]');
    typeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.populateModalCategories();
      });
    });
  },

  populateModalCategories() {
    const isIncome = document.querySelector('input[name="txModalType"]:checked').value === 'income';
    const catSelect = document.getElementById('txCategorySelect');
    if (!catSelect) return;

    const list = isIncome ? window.storage.data.incomeCategories : window.storage.data.expenseCategories;
    catSelect.innerHTML = list.map(c => `<option value="${c}">${c}</option>`).join('');
  },

  populateModalAccounts() {
    AccountsModule.renderDropdowns();
  },

  openAddModal(defaultType = 'income') {
    const modal = document.getElementById('transactionModal');
    if (!modal) return;

    document.getElementById('txForm').reset();
    document.getElementById('txEditId').value = '';

    const radio = document.querySelector(`input[name="txModalType"][value="${defaultType}"]`);
    if (radio) radio.checked = true;

    document.getElementById('txDateInput').value = new Date().toISOString().split('T')[0];

    this.populateModalCategories();
    this.populateModalAccounts();

    document.getElementById('txModalTitle').innerText = defaultType === 'income' ? 'Tambah Sumber Pemasukan' : 'Catat Pengeluaran Baru';
    modal.classList.add('active');
  },

  openEditModal(id) {
    const tx = window.storage.data.transactions.find(t => t.id === id);
    if (!tx) return;

    if (tx.type === 'transfer') {
      AccountsModule.openTransferModal();
      return;
    }

    const modal = document.getElementById('transactionModal');
    document.getElementById('txEditId').value = tx.id;
    
    const radio = document.querySelector(`input[name="txModalType"][value="${tx.type}"]`);
    if (radio) radio.checked = true;

    this.populateModalCategories();
    this.populateModalAccounts();

    document.getElementById('txDateInput').value = tx.date;
    document.getElementById('txAmountInput').value = CashTrackerStorage.formatRupiah(tx.amount, false);
    document.getElementById('txCategorySelect').value = tx.category;
    document.getElementById('txAccountSelect').value = tx.accountId;
    document.getElementById('txNotesInput').value = tx.notes || '';

    document.getElementById('txModalTitle').innerText = 'Edit Transaksi';
    modal.classList.add('active');
  },

  saveFromModal(e) {
    e.preventDefault();
    const id = document.getElementById('txEditId').value;
    const type = document.querySelector('input[name="txModalType"]:checked').value;
    const date = document.getElementById('txDateInput').value;
    const amount = CashTrackerStorage.parseRupiah(document.getElementById('txAmountInput').value);
    const category = document.getElementById('txCategorySelect').value;
    const accountId = document.getElementById('txAccountSelect').value;
    const notes = document.getElementById('txNotesInput').value.trim();

    if (!amount || amount <= 0) {
      AppUI.showToast('Nominal harus lebih besar dari 0!', 'error');
      return;
    }

    if (!date) {
      AppUI.showToast('Silakan pilih tanggal!', 'error');
      return;
    }

    if (id) {
      const idx = window.storage.data.transactions.findIndex(t => t.id === id);
      if (idx !== -1) {
        window.storage.data.transactions[idx] = {
          ...window.storage.data.transactions[idx],
          type, date, amount, category, accountId, notes
        };
        AppUI.showToast('Transaksi berhasil diperbarui!', 'success');
      }
    } else {
      const newTx = {
        id: 'trx_' + Date.now(),
        type,
        date,
        amount,
        category,
        accountId,
        notes
      };
      window.storage.data.transactions.unshift(newTx);
      AppUI.showToast(type === 'income' ? 'Pemasukan berhasil dicatat!' : 'Pengeluaran berhasil dicatat!', 'success');
    }

    window.storage.save();
    document.getElementById('transactionModal').classList.remove('active');
    window.app.refreshAll();
  },

  deleteTransaction(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini? Saldo rekening akan otomatis disesuaikan.')) return;
    window.storage.data.transactions = window.storage.data.transactions.filter(t => t.id !== id);
    window.storage.save();
    AppUI.showToast('Transaksi telah dihapus.', 'info');
    window.app.refreshAll();
  },

  getFilteredTransactions() {
    let list = [...(window.storage.data.transactions || [])];
    list.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (this.activeFilterType !== 'all') {
      list = list.filter(t => t.type === this.activeFilterType);
    }

    if (this.searchQuery) {
      list = list.filter(t => 
        (t.category && t.category.toLowerCase().includes(this.searchQuery)) ||
        (t.notes && t.notes.toLowerCase().includes(this.searchQuery)) ||
        String(t.amount).includes(this.searchQuery)
      );
    }

    return list;
  },

  renderTable() {
    const tbody = document.getElementById('txTableBody');
    if (!tbody) return;

    const list = this.getFilteredTransactions();
    const accounts = window.storage.getCalculatedAccounts();
    const accMap = {};
    accounts.forEach(a => { accMap[a.id] = a.name; });

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding: 2rem 1rem; color: var(--text-muted);">
            ${icon('info', 'w-7 h-7', 28)}
            <div style="margin-top: 6px; font-weight: 500;">Tidak ada catatan transaksi yang sesuai kriteria.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(tx => {
      const isIncome = tx.type === 'income';
      const isTransfer = tx.type === 'transfer';
      
      let badgeClass = 'badge-income';
      let iconType = 'arrow-down-left';
      let typeLabel = 'Pemasukan';
      let amountColor = 'color: var(--income); font-weight: 700;';
      let sign = '+ ';

      if (isTransfer) {
        badgeClass = 'badge-info';
        iconType = 'arrow-left-right';
        typeLabel = 'Transfer';
        amountColor = 'color: var(--info); font-weight: 700;';
        sign = '⇄ ';
      } else if (!isIncome) {
        badgeClass = 'badge-expense';
        iconType = 'arrow-up-right';
        typeLabel = 'Pengeluaran';
        amountColor = 'color: var(--expense); font-weight: 700;';
        sign = '- ';
      }

      const accountDisplay = isTransfer
        ? `${accMap[tx.fromAccountId] || 'Asal'} → ${accMap[tx.toAccountId] || 'Tujuan'}`
        : `${accMap[tx.accountId] || 'Rekening'}`;

      return `
        <tr>
          <td style="white-space: nowrap;">
            <div style="font-weight: 600;">${CashTrackerStorage.formatDateID(tx.date)}</div>
          </td>
          <td>
            <span class="badge ${badgeClass}">
              ${icon(iconType, 'w-3 h-3', 12)}
              ${typeLabel}
            </span>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">${tx.category || '-'}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${tx.notes || '-'}</div>
          </td>
          <td>
            <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; background: rgba(0,0,0,0.04); padding: 3px 8px; border-radius: 6px; font-weight: 500;">
              ${icon(isTransfer ? 'arrow-left-right' : 'landmark', 'w-3 h-3', 12)}
              ${accountDisplay}
            </span>
          </td>
          <td style="${amountColor}; font-size: 0.95rem; text-align: right; white-space: nowrap;">
            ${sign}${CashTrackerStorage.formatRupiah(tx.amount)}
          </td>
          <td style="text-align: right; white-space: nowrap;">
            ${!isTransfer ? `
              <button class="btn btn-secondary btn-sm" onclick="TransactionsModule.openEditModal('${tx.id}')" title="Edit">
                ${icon('edit', 'w-3 h-3', 12)}
              </button>
            ` : ''}
            <button class="btn btn-outline-danger btn-sm" onclick="TransactionsModule.deleteTransaction('${tx.id}')" title="Hapus">
              ${icon('trash', 'w-3 h-3', 12)}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderSummaryCards() {
    let totalIncome = 0;
    let totalExpense = 0;

    (window.storage.data.transactions || []).forEach(tx => {
      if (tx.type === 'income') totalIncome += Number(tx.amount || 0);
      if (tx.type === 'expense') totalExpense += Number(tx.amount || 0);
    });

    const net = totalIncome - totalExpense;

    const elIncome = document.getElementById('txSumIncome');
    if (elIncome) elIncome.innerText = CashTrackerStorage.formatRupiah(totalIncome);

    const elExpense = document.getElementById('txSumExpense');
    if (elExpense) elExpense.innerText = CashTrackerStorage.formatRupiah(totalExpense);

    const elNet = document.getElementById('txSumNet');
    if (elNet) {
      elNet.innerText = CashTrackerStorage.formatRupiah(net);
      elNet.style.color = net >= 0 ? 'var(--income)' : 'var(--expense)';
    }
  },

  render() {
    this.renderSummaryCards();
    AccountsModule.render();
    this.renderTable();
  }
};
