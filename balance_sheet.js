// ==========================================================================
// Cash Tracker - Balance Sheet Module (Neraca Keuangan Pribadi)
// Personal Net Worth: Aset Pribadi, Hutang Pribadi & Ekuitas
// ==========================================================================

const BalanceSheetModule = {
  viewMode: 'skontro', // 'skontro' or 'stafel'

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    document.querySelectorAll('[data-bs-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-bs-view]').forEach(b => b.classList.remove('active', 'btn-primary'));
        btn.classList.add('active', 'btn-primary');
        this.viewMode = btn.getAttribute('data-bs-view');
        this.renderView();
      });
    });

    ['assetPurchaseValueInput', 'assetCurrentValueInput'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => {
          const val = CashTrackerStorage.parseRupiah(e.target.value);
          e.target.value = val ? CashTrackerStorage.formatRupiah(val, false) : '';
        });
      }
    });
  },

  openAddAssetModal() {
    const modal = document.getElementById('assetModal');
    if (!modal) return;
    document.getElementById('assetForm').reset();
    document.getElementById('assetEditId').value = '';
    document.getElementById('assetDateInput').value = new Date().toISOString().split('T')[0];
    document.getElementById('assetModalTitle').innerText = 'Tambah Aset Pribadi Baru';
    modal.classList.add('active');
  },

  openEditAssetModal(id) {
    const item = (window.storage.data.fixedAssets || []).find(a => a.id === id);
    if (!item) return;

    const modal = document.getElementById('assetModal');
    document.getElementById('assetEditId').value = item.id;
    document.getElementById('assetNameInput').value = item.name || '';
    document.getElementById('assetCategorySelect').value = item.category || 'Properti';
    document.getElementById('assetPurchaseValueInput').value = CashTrackerStorage.formatRupiah(item.purchaseValue, false);
    document.getElementById('assetCurrentValueInput').value = CashTrackerStorage.formatRupiah(item.currentValue || item.purchaseValue, false);
    document.getElementById('assetDateInput').value = item.purchaseDate || new Date().toISOString().split('T')[0];
    document.getElementById('assetNotesInput').value = item.notes || '';

    document.getElementById('assetModalTitle').innerText = 'Edit Data Aset Pribadi';
    modal.classList.add('active');
  },

  saveAssetFromModal(e) {
    e.preventDefault();
    const id = document.getElementById('assetEditId').value;
    const name = document.getElementById('assetNameInput').value.trim();
    const category = document.getElementById('assetCategorySelect').value;
    const purchaseValue = CashTrackerStorage.parseRupiah(document.getElementById('assetPurchaseValueInput').value);
    const currentValue = CashTrackerStorage.parseRupiah(document.getElementById('assetCurrentValueInput').value);
    const purchaseDate = document.getElementById('assetDateInput').value;
    const notes = document.getElementById('assetNotesInput').value.trim();

    if (!name) {
      AppUI.showToast('Nama aset wajib diisi!', 'error');
      return;
    }

    if (id) {
      const idx = window.storage.data.fixedAssets.findIndex(a => a.id === id);
      if (idx !== -1) {
        window.storage.data.fixedAssets[idx] = {
          ...window.storage.data.fixedAssets[idx],
          name, category, purchaseValue, currentValue, purchaseDate, notes
        };
        AppUI.showToast('Aset pribadi berhasil diperbarui!', 'success');
      }
    } else {
      const newAsset = {
        id: 'ast_' + Date.now(),
        name, category, purchaseValue, currentValue, purchaseDate, notes
      };
      window.storage.data.fixedAssets.unshift(newAsset);
      AppUI.showToast('Aset pribadi baru berhasil dicatat!', 'success');
    }

    window.storage.save();
    document.getElementById('assetModal').classList.remove('active');
    window.app.refreshAll();
  },

  deleteAsset(id) {
    if (!confirm('Hapus aset ini dari daftar neraca?')) return;
    window.storage.data.fixedAssets = window.storage.data.fixedAssets.filter(a => a.id !== id);
    window.storage.save();
    AppUI.showToast('Aset telah dihapus.', 'info');
    window.app.refreshAll();
  },

  renderHealthMetrics() {
    const totalAssets = window.storage.getTotalAssets();
    const totalDebts = window.storage.getTotalDebts();
    const currentAssets = window.storage.getTotalCurrentAssets();
    const shortDebts = window.storage.getTotalShortTermDebts();
    const netWorth = window.storage.getNetWorth();

    const dar = totalAssets > 0 ? (totalDebts / totalAssets) * 100 : 0;
    let darStatus = 'Sangat Sehat';
    let darColor = 'var(--income)';
    if (dar > 60) {
      darStatus = 'Tinggi / Beban Berat';
      darColor = 'var(--expense)';
    } else if (dar > 35) {
      darStatus = 'Waspada / Sedang';
      darColor = 'var(--warning)';
    }

    const currentRatio = shortDebts > 0 ? (currentAssets / shortDebts) : (currentAssets > 0 ? 10 : 0);
    let crStatus = 'Dana Cair Sangat Baik';
    let crColor = 'var(--income)';
    if (currentRatio < 1.0 && shortDebts > 0) {
      crStatus = 'Defisit Kas Jangka Pendek';
      crColor = 'var(--expense)';
    } else if (currentRatio < 1.5 && shortDebts > 0) {
      crStatus = 'Cukup / Waspada';
      crColor = 'var(--warning)';
    }

    const elDAR = document.getElementById('bsDARValue');
    if (elDAR) {
      elDAR.innerHTML = `
        <span style="font-size: 1.25rem; font-weight: 700; color:${darColor};">${dar.toFixed(1)}%</span>
        <span class="badge" style="background: rgba(0,0,0,0.05); color:${darColor}; margin-left: 6px;">${darStatus}</span>
      `;
    }

    const elCR = document.getElementById('bsCRValue');
    if (elCR) {
      elCR.innerHTML = `
        <span style="font-size: 1.25rem; font-weight: 700; color:${crColor};">${currentRatio >= 10 ? '> 10x' : currentRatio.toFixed(2) + 'x'}</span>
        <span class="badge" style="background: rgba(0,0,0,0.05); color:${crColor}; margin-left: 6px;">${crStatus}</span>
      `;
    }

    const elNW = document.getElementById('bsNetWorthValue');
    if (elNW) {
      elNW.innerText = CashTrackerStorage.formatRupiah(netWorth);
      elNW.style.color = netWorth >= 0 ? 'var(--income)' : 'var(--expense)';
    }
  },

  renderView() {
    const container = document.getElementById('bsContentContainer');
    if (!container) return;

    const accounts = window.storage.getCalculatedAccounts();
    const fixedAssets = window.storage.data.fixedAssets || [];
    const receivables = window.storage.data.receivables || [];
    const debts = window.storage.data.debts || [];

    const totalCash = window.storage.getTotalCashAndBank();
    const totalRec = window.storage.getTotalReceivables();
    const totalCurrentAssets = totalCash + totalRec;
    const totalFixedAssets = window.storage.getTotalFixedAssets();
    const totalAssets = totalCurrentAssets + totalFixedAssets;

    const totalShortDebts = window.storage.getTotalShortTermDebts();
    const totalLongDebts = window.storage.getTotalLongTermDebts();
    const totalDebts = totalShortDebts + totalLongDebts;
    const netWorth = totalAssets - totalDebts;

    if (this.viewMode === 'skontro') {
      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
          
          <!-- AKTIVA / ASET PRIBADI -->
          <div class="card" style="border-top: 4px solid var(--income);">
            <div class="card-header" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
              <div class="card-title" style="color: var(--income); font-size: 1.1rem;">
                ${icon('trending-up', 'w-5 h-5', 20)} AKTIVA (TOTAL ASET PRIBADI)
              </div>
              <div style="font-weight: 700; font-size: 1.1rem; color: var(--income);">
                ${CashTrackerStorage.formatRupiah(totalAssets)}
              </div>
            </div>

            <!-- I. ASET LANCAR / KAS -->
            <div style="margin-top: 1rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; background: var(--bg-card-hover); padding: 6px 10px; border-radius: 6px; font-weight: 700; font-size: 0.85rem;">
                <span>I. KAS & DANA LIKUID</span>
                <span>${CashTrackerStorage.formatRupiah(totalCurrentAssets)}</span>
              </div>
              
              <div style="padding: 8px 10px; border-bottom: 1px dashed var(--border-subtle);">
                <div style="display:flex; justify-content:space-between; font-weight: 600; font-size: 0.85rem;">
                  <span>Rekening Bank & Dompet</span>
                  <span>${CashTrackerStorage.formatRupiah(totalCash)}</span>
                </div>
                <div style="padding-left: 8px; font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                  ${accounts.map(a => `
                    <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                      <span>• ${a.name}</span>
                      <span>${CashTrackerStorage.formatRupiah(a.currentBalance)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>

              ${receivables.filter(r => r.status !== 'paid').length > 0 ? `
                <div style="padding: 8px 10px;">
                  <div style="display:flex; justify-content:space-between; font-weight: 600; font-size: 0.85rem;">
                    <span>Piutang Pribadi</span>
                    <span>${CashTrackerStorage.formatRupiah(totalRec)}</span>
                  </div>
                  <div style="padding-left: 8px; font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    ${receivables.filter(r => r.status !== 'paid').map(r => `
                      <div style="display:flex; justify-content:space-between;">
                        <span>• ${r.debtorName}</span>
                        <span>${CashTrackerStorage.formatRupiah(r.amount)}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- II. ASET TETAP & INVESTASI PRIBADI -->
            <div style="margin-top: 1.25rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; background: var(--bg-card-hover); padding: 6px 10px; border-radius: 6px; font-weight: 700; font-size: 0.85rem;">
                <span>II. ASET TETAP & INVESTASI</span>
                <span>${CashTrackerStorage.formatRupiah(totalFixedAssets)}</span>
              </div>
              <div style="padding: 8px 10px;">
                ${fixedAssets.map(a => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 0; border-bottom: 1px dotted var(--border-subtle); font-size: 0.85rem;">
                    <div>
                      <div style="font-weight: 600;">${a.name}</div>
                      <div style="font-size: 11px; color: var(--text-muted);">${a.category}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap: 6px;">
                      <span style="font-weight: 700;">${CashTrackerStorage.formatRupiah(a.currentValue || a.purchaseValue)}</span>
                      <button class="btn btn-secondary btn-sm no-print" onclick="BalanceSheetModule.openEditAssetModal('${a.id}')" title="Edit">
                        ${icon('edit', 'w-3 h-3', 12)}
                      </button>
                    </div>
                  </div>
                `).join('')}
                <div class="no-print" style="margin-top: 10px; text-align: center;">
                  <button class="btn btn-secondary btn-sm" onclick="BalanceSheetModule.openAddAssetModal()">
                    ${icon('plus', 'w-3.5 h-3.5', 14)} Tambah Aset Pribadi
                  </button>
                </div>
              </div>
            </div>

            <div style="margin-top: 1.5rem; padding: 10px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; display:flex; justify-content:space-between; align-items:center; font-weight: 800; font-size: 1rem; color: var(--income);">
              <span>TOTAL ASET</span>
              <span>${CashTrackerStorage.formatRupiah(totalAssets)}</span>
            </div>
          </div>

          <!-- PASIVA / KEWAJIBAN & EKUITAS PRIBADI -->
          <div class="card" style="border-top: 4px solid var(--expense);">
            <div class="card-header" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
              <div class="card-title" style="color: var(--expense); font-size: 1.1rem;">
                ${icon('scale', 'w-5 h-5', 20)} PASIVA (HUTANG & NET WORTH)
              </div>
              <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-main);">
                ${CashTrackerStorage.formatRupiah(totalAssets)}
              </div>
            </div>

            <!-- I. HUTANG JANGKA PENDEK -->
            <div style="margin-top: 1rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; background: var(--bg-card-hover); padding: 6px 10px; border-radius: 6px; font-weight: 700; font-size: 0.85rem;">
                <span>I. HUTANG JANGKA PENDEK</span>
                <span style="color: var(--warning);">${CashTrackerStorage.formatRupiah(totalShortDebts)}</span>
              </div>
              <div style="padding: 8px 10px;">
                ${debts.filter(d => d.category === 'Jangka Pendek' && d.status === 'active').map(d => `
                  <div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom: 1px dotted var(--border-subtle); font-size: 0.85rem;">
                    <div>
                      <div style="font-weight: 600;">${d.creditorName}</div>
                      <div style="font-size: 11px; color: var(--text-muted);">Tempo Tgl ${d.dueDayOfMonth}</div>
                    </div>
                    <span style="font-weight: 700; color: var(--expense);">${CashTrackerStorage.formatRupiah(d.remainingAmount)}</span>
                  </div>
                `).join('') || '<div style="font-size: 12px; color: var(--text-muted); padding: 4px 0;">Tidak ada hutang jangka pendek.</div>'}
              </div>
            </div>

            <!-- II. HUTANG JANGKA PANJANG -->
            <div style="margin-top: 1.25rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; background: var(--bg-card-hover); padding: 6px 10px; border-radius: 6px; font-weight: 700; font-size: 0.85rem;">
                <span>II. HUTANG JANGKA PANJANG (KPR/CICILAN)</span>
                <span style="color: var(--expense);">${CashTrackerStorage.formatRupiah(totalLongDebts)}</span>
              </div>
              <div style="padding: 8px 10px;">
                ${debts.filter(d => d.category === 'Jangka Panjang' && d.status === 'active').map(d => `
                  <div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom: 1px dotted var(--border-subtle); font-size: 0.85rem;">
                    <div>
                      <div style="font-weight: 600;">${d.creditorName}</div>
                      <div style="font-size: 11px; color: var(--text-muted);">${CashTrackerStorage.formatRupiah(d.monthlyPayment)} /bln</div>
                    </div>
                    <span style="font-weight: 700; color: var(--expense);">${CashTrackerStorage.formatRupiah(d.remainingAmount)}</span>
                  </div>
                `).join('') || '<div style="font-size: 12px; color: var(--text-muted); padding: 4px 0;">Tidak ada pinjaman jangka panjang.</div>'}
              </div>
            </div>

            <!-- III. EKUITAS (NET WORTH) -->
            <div style="margin-top: 1.25rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; background: var(--bg-card-hover); padding: 6px 10px; border-radius: 6px; font-weight: 700; font-size: 0.85rem;">
                <span>III. KEKAYAAN BERSIH PRIBADI (NET WORTH)</span>
                <span style="color: var(--income);">${CashTrackerStorage.formatRupiah(netWorth)}</span>
              </div>
              <div style="padding: 10px; font-size: 0.85rem;">
                <div style="display:flex; justify-content:space-between;">
                  <span>Kekayaan Bersih Anda</span>
                  <span style="font-weight: 700;">${CashTrackerStorage.formatRupiah(netWorth)}</span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  (Total Seluruh Aset - Total Seluruh Hutang)
                </div>
              </div>
            </div>

            <div style="margin-top: 1.5rem; padding: 10px; background: rgba(56, 189, 248, 0.1); border-radius: 8px; display:flex; justify-content:space-between; align-items:center; font-weight: 800; font-size: 1rem; color: var(--text-main);">
              <span>TOTAL PASIVA</span>
              <span>${CashTrackerStorage.formatRupiah(totalDebts + netWorth)}</span>
            </div>
          </div>

        </div>
      `;
    } else {
      // Stafel Mode (Laporan Vertikal)
      container.innerHTML = `
        <div class="card" style="max-width: 760px; margin: 0 auto;">
          <div style="text-align: center; border-bottom: 2px solid var(--border-strong); padding-bottom: 1rem; margin-bottom: 1.25rem;">
            <h2 style="font-size: 1.25rem; font-weight: 800; text-transform: uppercase;">Neraca Keuangan Pribadi</h2>
            <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 2px;">Per Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</div>
            <div style="font-size: 0.85rem; color: var(--primary); font-weight: 600;">${window.storage.data.settings?.userName || 'Keuangan Pribadi'}</div>
          </div>

          <h3 style="color: var(--income); font-size: 1.05rem; font-weight: 700; margin-bottom: 0.5rem;">A. ASET PRIBADI</h3>
          
          <div style="padding-left: 0.75rem; margin-bottom: 1rem;">
            <div style="display:flex; justify-content:space-between; font-weight: 700; border-bottom: 1px solid var(--border-subtle); padding: 4px 0;">
              <span>1. KAS & REKENING BANK</span>
              <span>${CashTrackerStorage.formatRupiah(totalCurrentAssets)}</span>
            </div>
            <div style="padding-left: 0.75rem; font-size: 0.85rem;">
              <div style="display:flex; justify-content:space-between; padding: 3px 0;">
                <span>• Saldo Rekening & Dompet Tunai</span>
                <span>${CashTrackerStorage.formatRupiah(totalCash)}</span>
              </div>
              ${totalRec > 0 ? `
                <div style="display:flex; justify-content:space-between; padding: 3px 0;">
                  <span>• Piutang Pribadi</span>
                  <span>${CashTrackerStorage.formatRupiah(totalRec)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div style="padding-left: 0.75rem; margin-bottom: 1rem;">
            <div style="display:flex; justify-content:space-between; font-weight: 700; border-bottom: 1px solid var(--border-subtle); padding: 4px 0;">
              <span>2. ASET TETAP & INVESTASI</span>
              <span>${CashTrackerStorage.formatRupiah(totalFixedAssets)}</span>
            </div>
            <div style="padding-left: 0.75rem; font-size: 0.85rem;">
              ${fixedAssets.map(a => `
                <div style="display:flex; justify-content:space-between; padding: 3px 0;">
                  <span>• ${a.name} (${a.category})</span>
                  <span>${CashTrackerStorage.formatRupiah(a.currentValue || a.purchaseValue)}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; font-weight: 800; font-size: 0.95rem; background: var(--bg-card-hover); padding: 6px 10px; border-radius: 6px; margin-bottom: 1.5rem;">
            <span>TOTAL ASET</span>
            <span style="color: var(--income);">${CashTrackerStorage.formatRupiah(totalAssets)}</span>
          </div>

          <h3 style="color: var(--expense); font-size: 1.05rem; font-weight: 700; margin-bottom: 0.5rem;">B. KEWAJIBAN & KEKAYAAN BERSIH</h3>

          <div style="padding-left: 0.75rem; margin-bottom: 1rem;">
            <div style="display:flex; justify-content:space-between; font-weight: 700; border-bottom: 1px solid var(--border-subtle); padding: 4px 0;">
              <span>1. TOTAL HUTANG</span>
              <span>${CashTrackerStorage.formatRupiah(totalDebts)}</span>
            </div>
            <div style="padding-left: 0.75rem; font-size: 0.85rem;">
              <div style="display:flex; justify-content:space-between; padding: 3px 0;">
                <span>• Hutang Jangka Pendek (Kartu Kredit & Paylater)</span>
                <span>${CashTrackerStorage.formatRupiah(totalShortDebts)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding: 3px 0;">
                <span>• Hutang Jangka Panjang (KPR & Kendaraan)</span>
                <span>${CashTrackerStorage.formatRupiah(totalLongDebts)}</span>
              </div>
            </div>
          </div>

          <div style="padding-left: 0.75rem; margin-bottom: 1rem;">
            <div style="display:flex; justify-content:space-between; font-weight: 700; border-bottom: 1px solid var(--border-subtle); padding: 4px 0;">
              <span>2. KEKAYAAN BERSIH (NET WORTH)</span>
              <span>${CashTrackerStorage.formatRupiah(netWorth)}</span>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; font-weight: 800; font-size: 0.95rem; background: var(--bg-card-hover); padding: 6px 10px; border-radius: 6px;">
            <span>TOTAL PASIVA (HUTANG + NET WORTH)</span>
            <span style="color: var(--text-main);">${CashTrackerStorage.formatRupiah(totalDebts + netWorth)}</span>
          </div>
        </div>
      `;
    }
  },

  printReport() {
    window.print();
  },

  render() {
    this.renderHealthMetrics();
    this.renderView();
  }
};
