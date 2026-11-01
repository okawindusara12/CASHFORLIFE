// ==========================================================================
// Cash Tracker - Calculator Module (Kalkulator Tabungan & Target Finansial)
// Goal saving calculator, compound return, emergency fund & active targets
// ==========================================================================

const CalculatorModule = {
  activeCalcTab: 'goal', // 'goal', 'emergency', 'payoff'

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // Mask rupiah inputs in calculator
    ['calcTargetAmount', 'calcInitialAmount', 'calcMonthlySave', 'calcEmergencyMonthlyExpense', 'goalModalTarget', 'goalModalCurrent'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => {
          const val = CashTrackerStorage.parseRupiah(e.target.value);
          e.target.value = val ? CashTrackerStorage.formatRupiah(val, false) : '';
        });
      }
    });

    // Sub-tab toggles
    document.querySelectorAll('[data-calc-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-calc-tab]').forEach(b => b.classList.remove('active', 'btn-primary'));
        btn.classList.add('active', 'btn-primary');
        this.activeCalcTab = btn.getAttribute('data-calc-tab');
        this.renderActiveCalcView();
      });
    });

    // Auto-calculate on input changes
    const calcInputs = ['calcTargetAmount', 'calcInitialAmount', 'calcMonths', 'calcReturnRate', 'calcCalcMode', 'calcMonthlySave'];
    calcInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.calculateSavingsGoal());
        el.addEventListener('change', () => this.calculateSavingsGoal());
      }
    });

    const emInputs = ['calcEmergencyMonthlyExpense', 'calcEmergencyProfile'];
    emInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.calculateEmergencyFund());
        el.addEventListener('change', () => this.calculateEmergencyFund());
      }
    });
  },

  renderActiveCalcView() {
    document.getElementById('calcViewGoal').style.display = this.activeCalcTab === 'goal' ? 'block' : 'none';
    document.getElementById('calcViewEmergency').style.display = this.activeCalcTab === 'emergency' ? 'block' : 'none';
    if (this.activeCalcTab === 'goal') this.calculateSavingsGoal();
    if (this.activeCalcTab === 'emergency') this.calculateEmergencyFund();
  },

  // --- 1. Savings Goal Calculation ---
  calculateSavingsGoal() {
    const target = CashTrackerStorage.parseRupiah(document.getElementById('calcTargetAmount')?.value) || 50000000;
    const initial = CashTrackerStorage.parseRupiah(document.getElementById('calcInitialAmount')?.value) || 0;
    const mode = document.getElementById('calcCalcMode')?.value || 'byMonths'; // 'byMonths' or 'bySavings'
    const annualRate = parseFloat(document.getElementById('calcReturnRate')?.value) || 0;
    const monthlyRate = annualRate > 0 ? (annualRate / 100) / 12 : 0;

    let months = parseInt(document.getElementById('calcMonths')?.value, 10) || 12;
    let monthlySavings = CashTrackerStorage.parseRupiah(document.getElementById('calcMonthlySave')?.value) || 2000000;

    // Toggle input field visibility based on mode
    const groupMonths = document.getElementById('groupCalcMonths');
    const groupMonthlySave = document.getElementById('groupCalcMonthlySave');

    if (mode === 'byMonths') {
      if (groupMonths) groupMonths.style.display = 'block';
      if (groupMonthlySave) groupMonthlySave.style.display = 'none';

      // Formula: Solve for PMT (Monthly Savings needed)
      // FV = PV*(1+r)^n + PMT * [((1+r)^n - 1) / r]
      const remainingTarget = target - (initial * Math.pow(1 + monthlyRate, months));
      if (remainingTarget <= 0) {
        monthlySavings = 0;
      } else if (monthlyRate === 0) {
        monthlySavings = remainingTarget / months;
      } else {
        const factor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
        monthlySavings = remainingTarget / factor;
      }
    } else {
      if (groupMonths) groupMonths.style.display = 'none';
      if (groupMonthlySave) groupMonthlySave.style.display = 'block';

      // Solve for n (Months needed)
      if (monthlySavings <= 0) {
        months = 999;
      } else {
        let current = initial;
        let m = 0;
        while (current < target && m < 600) {
          m++;
          current = current * (1 + monthlyRate) + monthlySavings;
        }
        months = m;
      }
    }

    // Display summary results
    const elResultSave = document.getElementById('calcResultMonthlySave');
    if (elResultSave) elResultSave.innerText = CashTrackerStorage.formatRupiah(Math.ceil(monthlySavings));

    const elResultMonths = document.getElementById('calcResultMonths');
    if (elResultMonths) elResultMonths.innerText = `${months} Bulan (${(months / 12).toFixed(1)} Tahun)`;

    const totalContributed = initial + (monthlySavings * months);
    const estimatedInterest = Math.max(0, target - totalContributed);

    const elTotalSave = document.getElementById('calcResultTotalContributed');
    if (elTotalSave) elTotalSave.innerText = CashTrackerStorage.formatRupiah(totalContributed);

    const elTotalInterest = document.getElementById('calcResultInterest');
    if (elTotalInterest) elTotalInterest.innerText = CashTrackerStorage.formatRupiah(estimatedInterest);

    // Build Simulation Table (show first 12 months or up to total months)
    this.renderSimulationTable(initial, monthlySavings, monthlyRate, months, target);
  },

  renderSimulationTable(initial, monthlySave, monthlyRate, totalMonths, target) {
    const tbody = document.getElementById('calcSimulationTableBody');
    if (!tbody) return;

    let balance = initial;
    let html = '';
    const displayCount = Math.min(totalMonths, 24); // Show up to 24 months

    for (let m = 1; m <= displayCount; m++) {
      const startBalance = balance;
      const interestEarned = balance * monthlyRate;
      balance = startBalance + interestEarned + monthlySave;
      const progressPct = Math.min(100, Math.round((balance / target) * 100));

      html += `
        <tr>
          <td style="font-weight: 600;">Bulan ${m}</td>
          <td>${CashTrackerStorage.formatRupiah(startBalance)}</td>
          <td style="color: var(--income); font-weight: 600;">+ ${CashTrackerStorage.formatRupiah(monthlySave)}</td>
          <td style="color: var(--info);">+ ${CashTrackerStorage.formatRupiah(interestEarned)}</td>
          <td style="font-weight: 700; color: var(--text-main);">${CashTrackerStorage.formatRupiah(balance)}</td>
          <td>
            <div style="display:flex; align-items:center; gap: 8px;">
              <div style="flex:1; height:6px; background:var(--border-subtle); border-radius:999px; overflow:hidden;">
                <div style="width:${progressPct}%; height:100%; background:var(--primary);"></div>
              </div>
              <span style="font-size:11px; font-weight:600;">${progressPct}%</span>
            </div>
          </td>
        </tr>
      `;
    }

    if (totalMonths > 24) {
      html += `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 12px;">
            ... Dan seterusnya hingga Bulan ke-${totalMonths} (Target ${CashTrackerStorage.formatRupiah(target)} Tercapai!) ...
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = html;
  },

  // Save current calculated goal to User's Active Goals
  saveGoalToActive() {
    const target = CashTrackerStorage.parseRupiah(document.getElementById('calcTargetAmount')?.value) || 50000000;
    const initial = CashTrackerStorage.parseRupiah(document.getElementById('calcInitialAmount')?.value) || 0;
    const months = parseInt(document.getElementById('calcMonths')?.value, 10) || 12;

    const titlePrompt = prompt('Beri nama tujuan finansial ini:', 'Tabungan Masa Depan');
    if (!titlePrompt) return;

    const newGoal = {
      id: 'gl_' + Date.now(),
      title: titlePrompt.trim(),
      targetAmount: target,
      currentAmount: initial,
      deadlineDate: getDateOffset(months * 30),
      monthlyContribution: Math.ceil((target - initial) / months),
      category: 'Target Tabungan',
      notes: `Target ${months} bulan`
    };

    window.storage.data.savingsGoals.unshift(newGoal);
    window.storage.save();
    AppUI.showToast(`Target "${newGoal.title}" berhasil ditambahkan ke daftar target aktif!`, 'success');
    this.renderActiveGoals();
  },

  // --- 2. Emergency Fund Calculation ---
  calculateEmergencyFund() {
    // Get average monthly expense or user input
    let monthlyExpense = CashTrackerStorage.parseRupiah(document.getElementById('calcEmergencyMonthlyExpense')?.value);
    
    if (!monthlyExpense || monthlyExpense <= 0) {
      // Calculate from existing expenses
      const monthlyStats = window.storage.getMonthlyStats();
      monthlyExpense = monthlyStats.totalExpense > 0 ? monthlyStats.totalExpense : 5000000;
      const elInput = document.getElementById('calcEmergencyMonthlyExpense');
      if (elInput && !elInput.value) {
        elInput.value = CashTrackerStorage.formatRupiah(monthlyExpense, false);
      }
    }

    const profile = document.getElementById('calcEmergencyProfile')?.value || 'single';
    let multiplier = 3;
    let profileTitle = 'Lajang (Single)';
    let profileDesc = 'Kebutuhan standar 3-6 bulan pengeluaran untuk antisipasi keadaan darurat.';

    if (profile === 'single') {
      multiplier = 6;
      profileTitle = 'Lajang / Belum Menikah (6x)';
      profileDesc = 'Ideal 6 bulan pengeluaran rutin.';
    } else if (profile === 'married') {
      multiplier = 9;
      profileTitle = 'Menikah tanpa tanggungan (9x)';
      profileDesc = 'Rekomendasi 9 bulan pengeluaran rumah tangga.';
    } else if (profile === 'family') {
      multiplier = 12;
      profileTitle = 'Berkeluarga dengan Anak / Usaha (12x)';
      profileDesc = 'Kesiapan maksimal 12 bulan pengeluaran untuk keamanan keluarga & usaha.';
    }

    const idealEmergencyFund = monthlyExpense * multiplier;
    const currentLiquidCash = window.storage.getTotalCashAndBank();
    const readinessPct = Math.min(100, Math.round((currentLiquidCash / idealEmergencyFund) * 100));
    const deficit = Math.max(0, idealEmergencyFund - currentLiquidCash);

    const elTarget = document.getElementById('calcEmergencyTarget');
    if (elTarget) elTarget.innerText = CashTrackerStorage.formatRupiah(idealEmergencyFund);

    const elCurrent = document.getElementById('calcEmergencyCurrentCash');
    if (elCurrent) elCurrent.innerText = CashTrackerStorage.formatRupiah(currentLiquidCash);

    const elDeficit = document.getElementById('calcEmergencyDeficit');
    if (elDeficit) {
      elDeficit.innerText = deficit === 0 ? 'TERPENUHI (Dana Darurat Aman!)' : `Kurang: ${CashTrackerStorage.formatRupiah(deficit)}`;
      elDeficit.style.color = deficit === 0 ? 'var(--income)' : 'var(--expense)';
    }

    const elProgress = document.getElementById('calcEmergencyProgressBar');
    if (elProgress) {
      elProgress.style.width = `${readinessPct}%`;
      elProgress.style.backgroundColor = readinessPct >= 100 ? 'var(--income)' : (readinessPct >= 50 ? 'var(--warning)' : 'var(--expense)');
    }

    const elPctText = document.getElementById('calcEmergencyPctText');
    if (elPctText) elPctText.innerText = `${readinessPct}% Terkumpul`;
  },

  // --- Active Goals Management ---
  openAddGoalModal() {
    const modal = document.getElementById('goalModal');
    if (!modal) return;
    document.getElementById('goalForm').reset();
    document.getElementById('goalEditId').value = '';
    document.getElementById('goalModalDeadline').value = getDateOffset(180);
    modal.classList.add('active');
  },

  saveGoalFromModal(e) {
    e.preventDefault();
    const id = document.getElementById('goalEditId').value;
    const title = document.getElementById('goalModalTitleInput').value.trim();
    const targetAmount = CashTrackerStorage.parseRupiah(document.getElementById('goalModalTarget').value);
    const currentAmount = CashTrackerStorage.parseRupiah(document.getElementById('goalModalCurrent').value);
    const deadlineDate = document.getElementById('goalModalDeadline').value;
    const category = document.getElementById('goalModalCategory').value.trim() || 'Tabungan';

    if (!title || !targetAmount) {
      AppUI.showToast('Judul dan target nominal wajib diisi!', 'error');
      return;
    }

    if (id) {
      const idx = window.storage.data.savingsGoals.findIndex(g => g.id === id);
      if (idx !== -1) {
        window.storage.data.savingsGoals[idx] = {
          ...window.storage.data.savingsGoals[idx],
          title, targetAmount, currentAmount, deadlineDate, category
        };
        AppUI.showToast('Target tabungan berhasil diperbarui!', 'success');
      }
    } else {
      const newGoal = {
        id: 'gl_' + Date.now(),
        title, targetAmount, currentAmount, deadlineDate, category,
        notes: ''
      };
      window.storage.data.savingsGoals.unshift(newGoal);
      AppUI.showToast('Target tabungan baru berhasil dibuat!', 'success');
    }

    window.storage.save();
    document.getElementById('goalModal').classList.remove('active');
    this.renderActiveGoals();
  },

  topUpGoal(id) {
    const goal = (window.storage.data.savingsGoals || []).find(g => g.id === id);
    if (!goal) return;

    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    const promptVal = prompt(
      `SETOR TABUNGAN KE: "${goal.title}"\n` +
      `Terkumpul: ${CashTrackerStorage.formatRupiah(goal.currentAmount)} / ${CashTrackerStorage.formatRupiah(goal.targetAmount)}\n` +
      `Sisa Target: ${CashTrackerStorage.formatRupiah(remaining)}\n\n` +
      `Masukkan nominal setoran tambahan hari ini:`,
      "1000000"
    );

    if (!promptVal) return;
    const addVal = CashTrackerStorage.parseRupiah(promptVal);
    if (addVal <= 0) return;

    goal.currentAmount = (goal.currentAmount || 0) + addVal;

    // Optional: Also offer to record as Expense/Transfer from account
    const recordAsTx = confirm(`Apakah Anda ingin mencatat setoran ${CashTrackerStorage.formatRupiah(addVal)} ini sebagai transaksi pengeluaran tabungan di pembukuan?`);
    if (recordAsTx) {
      const newTx = {
        id: 'trx_' + Date.now(),
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        amount: addVal,
        category: 'Belanja Modal / Inventory',
        accountId: window.storage.data.accounts[0]?.id || 'acc_1',
        notes: `Setor tabungan target: ${goal.title}`
      };
      window.storage.data.transactions.unshift(newTx);
    }

    window.storage.save();
    AppUI.showToast(`Berhasil menambah setoran ${CashTrackerStorage.formatRupiah(addVal)} ke target "${goal.title}"!`, 'success');
    window.app.refreshAll();
  },

  deleteGoal(id) {
    if (!confirm('Hapus target tabungan ini?')) return;
    window.storage.data.savingsGoals = window.storage.data.savingsGoals.filter(g => g.id !== id);
    window.storage.save();
    AppUI.showToast('Target tabungan dihapus.', 'info');
    this.renderActiveGoals();
  },

  renderActiveGoals() {
    const container = document.getElementById('activeGoalsContainer');
    if (!container) return;

    const goals = window.storage.data.savingsGoals || [];
    if (goals.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">
          ${icon('target', 'w-8 h-8', 32)}
          <div style="margin-top: 8px;">Belum ada target tabungan aktif. Klik tombol di atas untuk membuat target impian Anda!</div>
        </div>
      `;
      return;
    }

    container.innerHTML = goals.map(g => {
      const pct = Math.min(100, Math.round(((g.currentAmount || 0) / (g.targetAmount || 1)) * 100));
      const remaining = Math.max(0, g.targetAmount - (g.currentAmount || 0));
      const isReached = pct >= 100;

      return `
        <div class="card" style="border-top: 4px solid ${isReached ? 'var(--income)' : 'var(--primary)'};">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <span class="badge badge-purple" style="font-size: 10px; margin-bottom: 4px;">${g.category || 'Tabungan'}</span>
              <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main);">${g.title}</h4>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                ${icon('calendar', 'w-3 h-3', 12)} Target Selesai: ${CashTrackerStorage.formatDateID(g.deadlineDate)}
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 1.25rem; font-weight: 800; color: ${isReached ? 'var(--income)' : 'var(--primary)'};">${pct}%</span>
            </div>
          </div>

          <!-- Progress Bar -->
          <div style="margin-top: 1rem;">
            <div style="display:flex; justify-content:space-between; font-size: 11px; font-weight: 600; margin-bottom: 4px;">
              <span>Terkumpul: ${CashTrackerStorage.formatRupiah(g.currentAmount)}</span>
              <span>Target: ${CashTrackerStorage.formatRupiah(g.targetAmount)}</span>
            </div>
            <div style="height: 8px; width: 100%; background: var(--bg-card-hover); border-radius: 999px; overflow: hidden;">
              <div style="width: ${pct}%; height: 100%; background: ${isReached ? 'var(--income)' : 'linear-gradient(90deg, #10b981, #059669)'};"></div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle); font-size: 0.8rem;">
            <span style="color: var(--text-muted);">Sisa: <strong>${CashTrackerStorage.formatRupiah(remaining)}</strong></span>
            <div style="display:flex; gap: 6px;">
              <button class="btn btn-primary btn-sm" onclick="CalculatorModule.topUpGoal('${g.id}')">
                ${icon('plus', 'w-3 h-3', 12)} Setor Tabungan
              </button>
              <button class="btn btn-outline-danger btn-sm" onclick="CalculatorModule.deleteGoal('${g.id}')">
                ${icon('trash', 'w-3 h-3', 12)}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  render() {
    this.renderActiveCalcView();
    this.renderActiveGoals();
  }
};
