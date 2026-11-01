// ==========================================================================
// Cash Tracker - Accounts Module (Kelola Akun Simpanan, Bank & E-Wallet)
// Supports BRI, BNI, BCA, Mandiri, BSI, CIMB, e-Wallets, Cash & Transfer
// ==========================================================================

const AccountsModule = {
  presets: [
    { key: 'bri', name: 'Bank BRI', type: 'bank', color: '#00529C', label: 'BRI' },
    { key: 'bni', name: 'Bank BNI', type: 'bank', color: '#F15A22', label: 'BNI' },
    { key: 'bca', name: 'Bank BCA', type: 'bank', color: '#005596', label: 'BCA' },
    { key: 'mandiri', name: 'Bank Mandiri', type: 'bank', color: '#002D62', label: 'Mandiri' },
    { key: 'bsi', name: 'Bank BSI', type: 'bank', color: '#00A39D', label: 'BSI Syariah' },
    { key: 'cimb', name: 'CIMB Niaga', type: 'bank', color: '#ED1C24', label: 'CIMB' },
    { key: 'jago', name: 'Bank Jago', type: 'bank', color: '#FF7F00', label: 'Jago' },
    { key: 'seabank', name: 'SeaBank', type: 'bank', color: '#FF5722', label: 'SeaBank' },
    { key: 'btn', name: 'Bank BTN', type: 'bank', color: '#003399', label: 'BTN' },
    { key: 'danamon', name: 'Bank Danamon', type: 'bank', color: '#007A3D', label: 'Danamon' },
    { key: 'jenius', name: 'Jenius (BTPN)', type: 'bank', color: '#00A4E4', label: 'Jenius' },
    { key: 'gopay', name: 'GoPay', type: 'ewallet', color: '#00AED6', label: 'GoPay' },
    { key: 'ovo', name: 'OVO', type: 'ewallet', color: '#4C2A86', label: 'OVO' },
    { key: 'dana', name: 'DANA', type: 'ewallet', color: '#118EEA', label: 'DANA' },
    { key: 'shopeepay', name: 'ShopeePay', type: 'ewallet', color: '#EE4D2D', label: 'ShopeePay' },
    { key: 'cash', name: 'Dompet Tunai', type: 'cash', color: '#10B981', label: 'Uang Tunai' }
  ],

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // Mask initial balance in modal
    const balanceInput = document.getElementById('accInitialBalanceInput');
    if (balanceInput) {
      balanceInput.addEventListener('input', (e) => {
        const val = CashTrackerStorage.parseRupiah(e.target.value);
        e.target.value = val ? CashTrackerStorage.formatRupiah(val, false) : '';
      });
    }

    // Mask transfer amount
    const transferAmount = document.getElementById('transferAmountInput');
    if (transferAmount) {
      transferAmount.addEventListener('input', (e) => {
        const val = CashTrackerStorage.parseRupiah(e.target.value);
        e.target.value = val ? CashTrackerStorage.formatRupiah(val, false) : '';
      });
    }
  },

  renderPresets() {
    const container = document.getElementById('accountPresetsContainer');
    if (!container) return;

    container.innerHTML = this.presets.map(p => `
      <button type="button" class="btn btn-sm" style="background:${p.color}15; color:${p.color}; border:1px solid ${p.color}40; font-size:11px; padding:3px 8px;" onclick="AccountsModule.applyPreset('${p.key}')">
        ${p.label}
      </button>
    `).join('');
  },

  applyPreset(key) {
    const preset = this.presets.find(p => p.key === key);
    if (!preset) return;

    document.getElementById('accNameInput').value = preset.name;
    document.getElementById('accTypeSelect').value = preset.type;
    document.getElementById('accColorInput').value = preset.color;
  },

  openAddModal() {
    const modal = document.getElementById('accountModal');
    if (!modal) return;

    document.getElementById('accountForm').reset();
    document.getElementById('accEditId').value = '';
    document.getElementById('accModalTitle').innerText = 'Tambah Akun Simpanan / Debet Baru';
    document.getElementById('accColorInput').value = '#00529C'; // default BRI Blue
    this.renderPresets();

    modal.classList.add('active');
  },

  openEditModal(id) {
    const acc = (window.storage.data.accounts || []).find(a => a.id === id);
    if (!acc) return;

    const modal = document.getElementById('accountModal');
    document.getElementById('accEditId').value = acc.id;
    document.getElementById('accNameInput').value = acc.name || '';
    document.getElementById('accTypeSelect').value = acc.type || 'bank';
    document.getElementById('accNumberInput').value = acc.accountNumber || '';
    document.getElementById('accInitialBalanceInput').value = CashTrackerStorage.formatRupiah(acc.initialBalance || 0, false);
    document.getElementById('accColorInput').value = acc.color || '#10b981';

    document.getElementById('accModalTitle').innerText = 'Edit Akun Simpanan';
    this.renderPresets();
    modal.classList.add('active');
  },

  saveAccountFromModal(e) {
    e.preventDefault();
    const id = document.getElementById('accEditId').value;
    const name = document.getElementById('accNameInput').value.trim();
    const type = document.getElementById('accTypeSelect').value;
    const accountNumber = document.getElementById('accNumberInput').value.trim();
    const initialBalance = CashTrackerStorage.parseRupiah(document.getElementById('accInitialBalanceInput').value);
    const color = document.getElementById('accColorInput').value || '#10b981';

    if (!name) {
      AppUI.showToast('Nama akun / bank wajib diisi!', 'error');
      return;
    }

    if (id) {
      // Edit existing
      const idx = window.storage.data.accounts.findIndex(a => a.id === id);
      if (idx !== -1) {
        window.storage.data.accounts[idx] = {
          ...window.storage.data.accounts[idx],
          name, type, accountNumber, initialBalance, color
        };
        AppUI.showToast(`Akun "${name}" berhasil diperbarui!`, 'success');
      }
    } else {
      // Create new
      const newAcc = {
        id: 'acc_' + Date.now(),
        name,
        type,
        accountNumber,
        initialBalance,
        color
      };
      window.storage.data.accounts.push(newAcc);
      AppUI.showToast(`Akun "${name}" berhasil ditambahkan!`, 'success');
    }

    window.storage.save();
    document.getElementById('accountModal').classList.remove('active');
    window.app.refreshAll();
  },

  deleteAccount(id) {
    if (window.storage.data.accounts.length <= 1) {
      AppUI.showToast('Anda harus memiliki setidaknya satu akun aktif!', 'warning');
      return;
    }

    const acc = window.storage.data.accounts.find(a => a.id === id);
    if (!acc) return;

    if (!confirm(`Hapus akun simpanan "${acc.name}"? Transaksi yang sudah terhubung akan tetap tercatat.`)) return;

    window.storage.data.accounts = window.storage.data.accounts.filter(a => a.id !== id);
    window.storage.save();
    AppUI.showToast(`Akun "${acc.name}" telah dihapus.`, 'info');
    window.app.refreshAll();
  },

  // --- Transfer Antar Akun ---
  openTransferModal() {
    const modal = document.getElementById('transferModal');
    if (!modal) return;

    document.getElementById('transferForm').reset();
    document.getElementById('transferDateInput').value = new Date().toISOString().split('T')[0];

    const accounts = window.storage.getCalculatedAccounts();
    const fromSelect = document.getElementById('transferFromSelect');
    const toSelect = document.getElementById('transferToSelect');

    const options = accounts.map(a => `<option value="${a.id}">${a.name} (Saldo: ${CashTrackerStorage.formatRupiah(a.currentBalance)})</option>`).join('');
    fromSelect.innerHTML = options;
    toSelect.innerHTML = options;

    if (accounts.length > 1) {
      toSelect.selectedIndex = 1;
    }

    modal.classList.add('active');
  },

  saveTransferFromModal(e) {
    e.preventDefault();
    const fromId = document.getElementById('transferFromSelect').value;
    const toId = document.getElementById('transferToSelect').value;
    const amount = CashTrackerStorage.parseRupiah(document.getElementById('transferAmountInput').value);
    const date = document.getElementById('transferDateInput').value;
    const notes = document.getElementById('transferNotesInput').value.trim();

    if (fromId === toId) {
      AppUI.showToast('Akun asal dan akun tujuan transfer tidak boleh sama!', 'error');
      return;
    }

    if (!amount || amount <= 0) {
      AppUI.showToast('Nominal transfer harus lebih besar dari 0!', 'error');
      return;
    }

    const accounts = window.storage.getCalculatedAccounts();
    const fromAcc = accounts.find(a => a.id === fromId);
    const toAcc = accounts.find(a => a.id === toId);

    // Create transfer transaction
    const newTx = {
      id: 'trx_' + Date.now(),
      type: 'transfer',
      date,
      amount,
      category: 'Pindah Dana / Transfer Antar Akun',
      fromAccountId: fromId,
      toAccountId: toId,
      notes: notes || `Transfer dari ${fromAcc.name} ke ${toAcc.name}`
    };

    window.storage.data.transactions.unshift(newTx);
    window.storage.save();

    document.getElementById('transferModal').classList.remove('active');
    AppUI.showToast(`Sukses transfer ${CashTrackerStorage.formatRupiah(amount)} dari ${fromAcc.name} ke ${toAcc.name}!`, 'success');
    window.app.refreshAll();
  },

  renderAccountsCards() {
    const container = document.getElementById('txAccountsContainer');
    if (!container) return;

    const accounts = window.storage.getCalculatedAccounts();

    container.innerHTML = accounts.map(a => {
      const typeLabel = a.type === 'bank' ? 'BANK / DEBET' : (a.type === 'ewallet' ? 'E-WALLET' : (a.type === 'cash' ? 'KAS TUNAI' : 'SIMPANAN'));
      const iconName = a.type === 'bank' ? 'landmark' : 'wallet';

      return `
        <div class="card" style="padding: 1rem 1.15rem; border-left: 4.5px solid ${a.color || 'var(--primary)'}; position: relative; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em;">
                ${typeLabel}
              </div>
              <div style="font-weight: 700; font-size: 0.95rem; margin-top: 2px; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
                <span style="color: ${a.color};">${icon(iconName, 'w-4 h-4', 16)}</span>
                ${a.name}
              </div>
              ${a.accountNumber ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 2px; font-family: monospace;">No: ${a.accountNumber}</div>` : ''}
            </div>

            <div style="display: flex; gap: 4px;">
              <button class="btn btn-secondary btn-sm" style="padding: 3px 6px; min-height: 26px;" onclick="AccountsModule.openEditModal('${a.id}')" title="Edit Akun">
                ${icon('edit', 'w-3 h-3', 12)}
              </button>
              <button class="btn btn-outline-danger btn-sm" style="padding: 3px 6px; min-height: 26px;" onclick="AccountsModule.deleteAccount('${a.id}')" title="Hapus Akun">
                ${icon('trash', 'w-3 h-3', 12)}
              </button>
            </div>
          </div>

          <div style="margin-top: 0.85rem; padding-top: 0.65rem; border-top: 1px dashed var(--border-subtle); display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="font-size: 11px; color: var(--text-muted);">Saldo Tersedia:</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main);">
              ${CashTrackerStorage.formatRupiah(a.currentBalance)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderDropdowns() {
    const accounts = window.storage.getCalculatedAccounts();
    const options = accounts.map(a => 
      `<option value="${a.id}">${a.name} (Saldo: ${CashTrackerStorage.formatRupiah(a.currentBalance)})</option>`
    ).join('');

    const txSelect = document.getElementById('txAccountSelect');
    if (txSelect) txSelect.innerHTML = options;

    const remSelect = document.getElementById('remAccountSelect');
    if (remSelect) remSelect.innerHTML = options;
  },

  render() {
    this.renderAccountsCards();
    this.renderDropdowns();
  }
};
