// ==========================================================================
// Cash Tracker - Reminders Module (Reminder Jatuh Tempo Pengeluaran yang Harus Dibayar)
// Tracks due dates, overdue alerts, countdown, and 1-Click Pay & Record Expense
// ==========================================================================

const RemindersModule = {
  activeFilter: 'all', // 'all', 'upcoming', 'overdue', 'paid'

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    const amountInput = document.getElementById('remAmountInput');
    if (amountInput) {
      amountInput.addEventListener('input', (e) => {
        const val = CashTrackerStorage.parseRupiah(e.target.value);
        e.target.value = val ? CashTrackerStorage.formatRupiah(val, false) : '';
      });
    }

    document.querySelectorAll('[data-rem-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-rem-filter]').forEach(b => b.classList.remove('active', 'btn-primary'));
        btn.classList.add('active', 'btn-primary');
        this.activeFilter = btn.getAttribute('data-rem-filter');
        this.renderTable();
      });
    });
  },

  populateReminderCategories() {
    const sel = document.getElementById('remCategorySelect');
    if (!sel) return;
    sel.innerHTML = window.storage.data.expenseCategories.map(c => `<option value="${c}">${c}</option>`).join('');
  },

  populateReminderAccounts() {
    const sel = document.getElementById('remAccountSelect');
    if (!sel) return;
    const accounts = window.storage.getCalculatedAccounts();
    sel.innerHTML = accounts.map(a => `<option value="${a.id}">${a.name} (Saldo: ${CashTrackerStorage.formatRupiah(a.currentBalance)})</option>`).join('');
  },

  openAddModal() {
    const modal = document.getElementById('reminderModal');
    if (!modal) return;
    document.getElementById('reminderForm').reset();
    document.getElementById('remEditId').value = '';
    document.getElementById('remDueDateInput').value = getDateOffset(7);
    this.populateReminderCategories();
    this.populateReminderAccounts();
    document.getElementById('remModalTitle').innerText = 'Tambah Pengingat Tagihan Jatuh Tempo';
    modal.classList.add('active');
  },

  openEditModal(id) {
    const item = (window.storage.data.reminders || []).find(r => r.id === id);
    if (!item) return;

    const modal = document.getElementById('reminderModal');
    document.getElementById('remEditId').value = item.id;
    document.getElementById('remTitleInput').value = item.title || '';
    document.getElementById('remAmountInput').value = CashTrackerStorage.formatRupiah(item.amount, false);
    document.getElementById('remDueDateInput').value = item.dueDate || '';
    document.getElementById('remFrequencySelect').value = item.frequency || 'monthly';
    
    this.populateReminderCategories();
    this.populateReminderAccounts();
    if (item.category) document.getElementById('remCategorySelect').value = item.category;
    if (item.accountId) document.getElementById('remAccountSelect').value = item.accountId;

    document.getElementById('remNotesInput').value = item.notes || '';
    document.getElementById('remModalTitle').innerText = 'Edit Pengingat Tagihan';
    modal.classList.add('active');
  },

  saveFromModal(e) {
    e.preventDefault();
    const id = document.getElementById('remEditId').value;
    const title = document.getElementById('remTitleInput').value.trim();
    const amount = CashTrackerStorage.parseRupiah(document.getElementById('remAmountInput').value);
    const dueDate = document.getElementById('remDueDateInput').value;
    const frequency = document.getElementById('remFrequencySelect').value;
    const category = document.getElementById('remCategorySelect').value;
    const accountId = document.getElementById('remAccountSelect').value;
    const notes = document.getElementById('remNotesInput').value.trim();

    if (!title || !amount || !dueDate) {
      AppUI.showToast('Harap lengkapi judul tagihan, nominal, dan tanggal jatuh tempo!', 'error');
      return;
    }

    if (id) {
      const idx = window.storage.data.reminders.findIndex(r => r.id === id);
      if (idx !== -1) {
        window.storage.data.reminders[idx] = {
          ...window.storage.data.reminders[idx],
          title, amount, dueDate, frequency, category, accountId, notes
        };
        AppUI.showToast('Pengingat tagihan diperbarui!', 'success');
      }
    } else {
      const newRem = {
        id: 'rem_' + Date.now(),
        title, amount, dueDate, frequency, category, accountId, notes,
        isPaid: false
      };
      window.storage.data.reminders.unshift(newRem);
      AppUI.showToast('Pengingat tagihan berhasil disimpan!', 'success');
    }

    window.storage.save();
    document.getElementById('reminderModal').classList.remove('active');
    window.app.refreshAll();
  },

  getDaysDifference(dueDateStr) {
    if (!dueDateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  },

  payBillNow(id) {
    const item = (window.storage.data.reminders || []).find(r => r.id === id);
    if (!item) return;

    const accounts = window.storage.getCalculatedAccounts();
    const accOptions = accounts.map((a, i) => `${i + 1}. ${a.name} (Saldo: ${CashTrackerStorage.formatRupiah(a.currentBalance)})`).join('\n');
    
    const choice = prompt(
      `KONFIRMASI PEMBAYARAN TAGIHAN:\n` +
      `Tagihan: ${item.title}\n` +
      `Nominal: ${CashTrackerStorage.formatRupiah(item.amount)}\n\n` +
      `Pilih Nomor Rekening Sumber Dana:\n${accOptions}\n\nMasukkan nomor pilihan (1-${accounts.length}):`,
      "1"
    );

    if (!choice) return;
    const selectedIdx = parseInt(choice, 10) - 1;
    const chosenAcc = accounts[selectedIdx] || accounts[0];

    // 1. Record transaction
    const newTx = {
      id: 'trx_' + Date.now(),
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      amount: item.amount,
      category: item.category || 'Tagihan & Utilitas (Listrik, Wifi, Air)',
      accountId: chosenAcc.id,
      notes: `Pembayaran Jatuh Tempo: ${item.title} (${item.notes || ''})`
    };
    window.storage.data.transactions.unshift(newTx);

    // 2. Advance due date if monthly, or mark paid if one-time
    if (item.frequency === 'monthly') {
      const currentDue = new Date(item.dueDate);
      currentDue.setMonth(currentDue.getMonth() + 1);
      item.dueDate = currentDue.toISOString().split('T')[0];
      item.lastPaidDate = new Date().toISOString().split('T')[0];
      AppUI.showToast(`Tagihan "${item.title}" lunas! Jatuh tempo dimajukan ke bulan depan (${CashTrackerStorage.formatDateID(item.dueDate)}).`, 'success');
    } else {
      item.isPaid = true;
      item.lastPaidDate = new Date().toISOString().split('T')[0];
      AppUI.showToast(`Tagihan "${item.title}" berhasil dibayar lunas!`, 'success');
    }

    window.storage.save();
    window.app.refreshAll();
  },

  deleteReminder(id) {
    if (!confirm('Hapus pengingat tagihan ini?')) return;
    window.storage.data.reminders = window.storage.data.reminders.filter(r => r.id !== id);
    window.storage.save();
    AppUI.showToast('Pengingat tagihan dihapus.', 'info');
    window.app.refreshAll();
  },

  renderTable() {
    const tbody = document.getElementById('remTableBody');
    if (!tbody) return;

    let list = [...(window.storage.data.reminders || [])];

    // Sort by due date ascending (soonest first)
    list.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    if (this.activeFilter === 'upcoming') {
      list = list.filter(r => !r.isPaid && this.getDaysDifference(r.dueDate) >= 0 && this.getDaysDifference(r.dueDate) <= 7);
    } else if (this.activeFilter === 'overdue') {
      list = list.filter(r => !r.isPaid && this.getDaysDifference(r.dueDate) < 0);
    } else if (this.activeFilter === 'paid') {
      list = list.filter(r => r.isPaid);
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding: 2.5rem 1rem; color: var(--text-muted);">
            ${icon('bell', 'w-8 h-8', 32)}
            <div style="margin-top: 8px; font-weight: 500;">Tidak ada jadwal tagihan pada filter ini. Semua terkendali!</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(item => {
      const daysDiff = this.getDaysDifference(item.dueDate);
      let statusBadge = '';
      let rowStyle = '';

      if (item.isPaid) {
        statusBadge = `<span class="badge badge-income">${icon('check', 'w-3 h-3', 12)} Lunas</span>`;
      } else if (daysDiff < 0) {
        statusBadge = `<span class="badge badge-expense">${icon('alert-triangle', 'w-3 h-3', 12)} Terlambat (${Math.abs(daysDiff)} hari lalu)</span>`;
        rowStyle = 'background-color: rgba(244, 63, 94, 0.05);';
      } else if (daysDiff === 0) {
        statusBadge = `<span class="badge badge-expense" style="animation: pulse 1.5s infinite;">Jatuh Tempo HARI INI</span>`;
        rowStyle = 'background-color: rgba(244, 63, 94, 0.08);';
      } else if (daysDiff <= 7) {
        statusBadge = `<span class="badge badge-warning">${icon('clock', 'w-3 h-3', 12)} H-${daysDiff} (${daysDiff} hari lagi)</span>`;
      } else {
        statusBadge = `<span class="badge badge-info">${daysDiff} hari lagi</span>`;
      }

      const freqStr = item.frequency === 'monthly' ? 'Bulanan' : (item.frequency === 'weekly' ? 'Mingguan' : (item.frequency === 'yearly' ? 'Tahunan' : 'Sekali Bayar'));

      return `
        <tr style="${rowStyle}">
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${item.title}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${item.notes || '-'}</div>
          </td>
          <td>
            <span class="badge badge-purple">${item.category || 'Tagihan'}</span>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Frekuensi: ${freqStr}</div>
          </td>
          <td style="text-align: right; font-size: 1rem; font-weight: 700; color: var(--expense);">
            ${CashTrackerStorage.formatRupiah(item.amount)}
          </td>
          <td>
            <div style="font-weight: 600;">${CashTrackerStorage.formatDateID(item.dueDate)}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${item.dueDate}</div>
          </td>
          <td style="text-align: center;">
            ${statusBadge}
          </td>
          <td style="text-align: right; white-space: nowrap;">
            ${!item.isPaid ? `
              <button class="btn btn-success btn-sm" onclick="RemindersModule.payBillNow('${item.id}')" title="Bayar Sekarang & Catat Pengeluaran">
                ${icon('check-circle', 'w-3.5 h-3.5', 14)} Bayar Sekarang
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" onclick="RemindersModule.openEditModal('${item.id}')" title="Edit">
              ${icon('edit', 'w-3.5 h-3.5', 14)}
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="RemindersModule.deleteReminder('${item.id}')" title="Hapus">
              ${icon('trash', 'w-3.5 h-3.5', 14)}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderBanner() {
    const banner = document.getElementById('globalDueBanner');
    if (!banner) return;

    const list = window.storage.data.reminders || [];
    const urgentItems = list.filter(r => !r.isPaid && this.getDaysDifference(r.dueDate) <= 7);
    const overdueItems = list.filter(r => !r.isPaid && this.getDaysDifference(r.dueDate) < 0);

    const urgentTotal = urgentItems.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    if (urgentItems.length === 0) {
      banner.style.display = 'none';
      return;
    }

    banner.style.display = 'flex';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: #f43f5e; color: white;">
          ${icon('bell-ring', 'w-4 h-4', 16)}
        </span>
        <div>
          <strong>Pemberitahuan Tagihan:</strong> Ada <strong>${urgentItems.length} pengeluaran</strong> ${overdueItems.length > 0 ? `(termasuk ${overdueItems.length} terlambat)` : 'yang mendekati jatuh tempo'} minggu ini dengan total <strong>${CashTrackerStorage.formatRupiah(urgentTotal)}</strong>.
        </div>
      </div>
      <div>
        <button class="btn btn-danger btn-sm" onclick="app.switchTab('reminders')">
          Lihat & Bayar Tagihan
        </button>
      </div>
    `;
  },

  renderSummary() {
    const list = window.storage.data.reminders || [];
    const overdue = list.filter(r => !r.isPaid && this.getDaysDifference(r.dueDate) < 0);
    const upcoming7 = list.filter(r => !r.isPaid && this.getDaysDifference(r.dueDate) >= 0 && this.getDaysDifference(r.dueDate) <= 7);
    const allPending = list.filter(r => !r.isPaid);

    const sumPending = allPending.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const sumOverdue = overdue.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const elPending = document.getElementById('remPendingTotal');
    if (elPending) elPending.innerText = CashTrackerStorage.formatRupiah(sumPending);

    const elOverdueCount = document.getElementById('remOverdueCount');
    if (elOverdueCount) elOverdueCount.innerText = `${overdue.length} Tagihan (${CashTrackerStorage.formatRupiah(sumOverdue)})`;

    const elUpcomingCount = document.getElementById('remUpcomingCount');
    if (elUpcomingCount) elUpcomingCount.innerText = `${upcoming7.length} Tagihan`;

    // Notification badge in sidebar
    const badge = document.getElementById('sidebarDueBadge');
    if (badge) {
      const urgentCount = overdue.length + upcoming7.length;
      if (urgentCount > 0) {
        badge.innerText = urgentCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  },

  render() {
    this.renderBanner();
    this.renderSummary();
    this.renderTable();
  }
};
