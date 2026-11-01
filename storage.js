// ==========================================================================
// Cash Tracker - Storage Engine & Database Management (Personal Finance Edition)
// Persistent via localStorage with realistic personal finance data
// ==========================================================================

const DB_KEY = 'cashtracker_personal_v3';

const DEFAULT_ACCOUNTS = [
  { id: 'acc_1', name: 'Dompet Tunai (Cash)', type: 'cash', initialBalance: 1250000, color: '#10b981' },
  { id: 'acc_2', name: 'BCA Rekening Utama (Gaji)', type: 'bank', initialBalance: 16800000, color: '#0284c7' },
  { id: 'acc_3', name: 'Bank Jago / Mandiri (Tabungan)', type: 'bank', initialBalance: 24500000, color: '#f59e0b' },
  { id: 'acc_4', name: 'GoPay & OVO (Harian)', type: 'ewallet', initialBalance: 650000, color: '#8b5cf6' }
];

const DEFAULT_INCOME_CATEGORIES = [
  'Gaji Pokok & Tunjangan',
  'Bonus, THR & Insentif',
  'Freelance & Side Hustle',
  'Dividen & Return Investasi',
  'Pendapatan Pasif & Sewa',
  'Uang Masuk / Hadiah Lainnya'
];

const DEFAULT_EXPENSE_CATEGORIES = [
  'Makan & Minum Harian',
  'Belanja Bulanan & Kebutuhan Rumah',
  'Tagihan Rutin (Listrik, Air, Wifi, Pulsa)',
  'Transportasi & Bensin (Tol, Ojol, Servis)',
  'Cicilan & Bayar Hutang (KPR, Kendaraan, Kartu Kredit, Paylater)',
  'Hiburan, Nongkrong & Langganan (Netflix, Bioskop, Hobi)',
  'Kesehatan, Medis, BPJS & Skincare',
  'Donasi, Zakat & Kasih Orang Tua',
  'Belanja Pribadi, Pakaian & Gadget',
  'Pengeluaran Lain-lain'
];

function getDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const DEFAULT_PERSONAL_ASSETS = [
  { id: 'ast_1', name: 'Rumah Tinggal Pribadi', category: 'Properti', purchaseValue: 450000000, currentValue: 520000000, purchaseDate: '2023-01-15', notes: 'Sertifikat Hak Milik (SHM)' },
  { id: 'ast_2', name: 'Mobil Honda HR-V 2022', category: 'Kendaraan', purchaseValue: 285000000, currentValue: 250000000, purchaseDate: '2022-08-10', notes: 'Kendaraan keluarga' },
  { id: 'ast_3', name: 'Motor Honda Vario 160', category: 'Kendaraan', purchaseValue: 26000000, currentValue: 21000000, purchaseDate: '2023-03-20', notes: 'Transportasi harian' },
  { id: 'ast_4', name: 'Emas Batangan Logam Mulia Antam (30 gram)', category: 'Investasi Jangka Panjang', purchaseValue: 31000000, currentValue: 42000000, purchaseDate: '2023-02-12', notes: 'Disimpan di Safe Deposit Box' },
  { id: 'ast_5', name: 'Portofolio Reksadana & Saham', category: 'Investasi Likuid', purchaseValue: 18000000, currentValue: 22500000, purchaseDate: '2023-05-18', notes: 'Investasi pasar modal' },
  { id: 'ast_6', name: 'Laptop MacBook Pro & iPhone', category: 'Elektronik & Alat', purchaseValue: 28000000, currentValue: 20000000, purchaseDate: '2023-10-15', notes: 'Peralatan kerja & pribadi' }
];

const DEFAULT_RECEIVABLES = [
  { id: 'rcv_1', debtorName: 'Pinjaman Teman (Reza Pratama)', amount: 2500000, dueDate: getDateOffset(15), notes: 'Pinjam keperluan mendadak', status: 'unpaid' }
];

const DEFAULT_DEBTS = [
  {
    id: 'dbt_1',
    creditorName: 'KPR Rumah Bank Mandiri',
    category: 'Jangka Panjang',
    totalLoan: 350000000,
    remainingAmount: 245000000,
    interestRate: 7.2,
    monthlyPayment: 3250000,
    dueDayOfMonth: 10,
    status: 'active',
    notes: 'Tenor sisa 8 tahun'
  },
  {
    id: 'dbt_2',
    creditorName: 'Cicilan Mobil BCA Finance',
    category: 'Jangka Panjang',
    totalLoan: 120000000,
    remainingAmount: 42000000,
    interestRate: 6.0,
    monthlyPayment: 2950000,
    dueDayOfMonth: 15,
    status: 'active',
    notes: 'Sisa 14 bulan cicilan'
  },
  {
    id: 'dbt_3',
    creditorName: 'Kartu Kredit BCA Everyday',
    category: 'Jangka Pendek',
    totalLoan: 5000000,
    remainingAmount: 2350000,
    interestRate: 1.75,
    monthlyPayment: 1000000,
    dueDayOfMonth: 20,
    status: 'active',
    notes: 'Belanja kebutuhan bulanan'
  },
  {
    id: 'dbt_4',
    creditorName: 'ShopeePayLater / GoPayLater',
    category: 'Jangka Pendek',
    totalLoan: 1800000,
    remainingAmount: 850000,
    interestRate: 2.0,
    monthlyPayment: 850000,
    dueDayOfMonth: 5,
    status: 'active',
    notes: 'Cicilan 3 bulan gadget & fashion'
  }
];

const DEFAULT_REMINDERS = [
  {
    id: 'rem_1',
    title: 'Tagihan Listrik PLN Pascabayar',
    amount: 850000,
    dueDate: getDateOffset(2), // H-2 (Mendekati jatuh tempo)
    frequency: 'monthly',
    category: 'Tagihan Rutin (Listrik, Air, Wifi, Pulsa)',
    accountId: 'acc_2',
    isPaid: false,
    notes: 'ID Pel: 53120098412'
  },
  {
    id: 'rem_2',
    title: 'Internet Wi-Fi Rumah 100 Mbps',
    amount: 425000,
    dueDate: getDateOffset(5), // H-5
    frequency: 'monthly',
    category: 'Tagihan Rutin (Listrik, Air, Wifi, Pulsa)',
    accountId: 'acc_2',
    isPaid: false,
    notes: 'Nomor Pelanggan: 1224859102'
  },
  {
    id: 'rem_3',
    title: 'Cicilan KPR Rumah Mandiri',
    amount: 3250000,
    dueDate: getDateOffset(10),
    frequency: 'monthly',
    category: 'Cicilan & Bayar Hutang (KPR, Kendaraan, Kartu Kredit, Paylater)',
    accountId: 'acc_2',
    isPaid: false,
    notes: 'Auto-debet Bank Mandiri'
  },
  {
    id: 'rem_4',
    title: 'Cicilan Mobil BCA Finance',
    amount: 2950000,
    dueDate: getDateOffset(-1), // Kemarin (Overdue!)
    frequency: 'monthly',
    category: 'Cicilan & Bayar Hutang (KPR, Kendaraan, Kartu Kredit, Paylater)',
    accountId: 'acc_2',
    isPaid: false,
    notes: 'Kontrak: BCA-2022-7718'
  },
  {
    id: 'rem_5',
    title: 'BPJS Kesehatan Mandiri Sekeluarga',
    amount: 450000,
    dueDate: getDateOffset(8),
    frequency: 'monthly',
    category: 'Kesehatan, Medis, BPJS & Skincare',
    accountId: 'acc_2',
    isPaid: false,
    notes: 'Kelas 1'
  }
];

const DEFAULT_SAVINGS_GOALS = [
  {
    id: 'gl_1',
    title: 'Dana Darurat 6 Bulan Pengeluaran',
    targetAmount: 50000000,
    currentAmount: 24500000,
    deadlineDate: getDateOffset(180),
    monthlyContribution: 3500000,
    category: 'Dana Darurat',
    notes: 'Tersimpan di Bank Jago & Reksadana Pasar Uang'
  },
  {
    id: 'gl_2',
    title: 'Liburan Akhir Tahun Sekeluarga',
    targetAmount: 18000000,
    currentAmount: 11000000,
    deadlineDate: getDateOffset(90),
    monthlyContribution: 2000000,
    category: 'Liburan & Impian',
    notes: 'Tiket & akomodasi liburan'
  },
  {
    id: 'gl_3',
    title: 'Upgrade Tabungan Investasi Masa Depan',
    targetAmount: 100000000,
    currentAmount: 42000000,
    deadlineDate: getDateOffset(360),
    monthlyContribution: 4000000,
    category: 'Investasi Jangka Panjang',
    notes: 'Emas Antam & Reksadana Saham'
  }
];

const DEFAULT_TRANSACTIONS = [
  {
    id: 'trx_1',
    type: 'income',
    date: getDateOffset(-10),
    amount: 17500000,
    category: 'Gaji Pokok & Tunjangan',
    accountId: 'acc_2',
    notes: 'Gaji bulanan kantor'
  },
  {
    id: 'trx_2',
    type: 'income',
    date: getDateOffset(-4),
    amount: 3800000,
    category: 'Freelance & Side Hustle',
    accountId: 'acc_2',
    notes: 'Proyek freelance sampingan'
  },
  {
    id: 'trx_3',
    type: 'expense',
    date: getDateOffset(-8),
    amount: 1450000,
    category: 'Belanja Bulanan & Kebutuhan Rumah',
    accountId: 'acc_2',
    notes: 'Belanja sembako & perlengkapan rumah'
  },
  {
    id: 'trx_4',
    type: 'expense',
    date: getDateOffset(-6),
    amount: 450000,
    category: 'Transportasi & Bensin (Tol, Ojol, Servis)',
    accountId: 'acc_1',
    notes: 'Isi bensin Pertamax & saldo e-Toll'
  },
  {
    id: 'trx_5',
    type: 'expense',
    date: getDateOffset(-3),
    amount: 350000,
    category: 'Hiburan, Nongkrong & Langganan (Netflix, Bioskop, Hobi)',
    accountId: 'acc_4',
    notes: 'Makan akhir pekan & nonton bioskop'
  },
  {
    id: 'trx_6',
    type: 'expense',
    date: getDateOffset(-1),
    amount: 1500000,
    category: 'Donasi, Zakat & Kasih Orang Tua',
    accountId: 'acc_2',
    notes: 'Transfer bulanan orang tua'
  }
];

class CashTrackerStorage {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.accounts = parsed.accounts || DEFAULT_ACCOUNTS;
        parsed.incomeCategories = parsed.incomeCategories || DEFAULT_INCOME_CATEGORIES;
        parsed.expenseCategories = parsed.expenseCategories || DEFAULT_EXPENSE_CATEGORIES;
        parsed.transactions = parsed.transactions || DEFAULT_TRANSACTIONS;
        parsed.fixedAssets = parsed.fixedAssets || DEFAULT_PERSONAL_ASSETS;
        parsed.receivables = parsed.receivables || DEFAULT_RECEIVABLES;
        parsed.debts = parsed.debts || DEFAULT_DEBTS;
        parsed.reminders = parsed.reminders || DEFAULT_REMINDERS;
        parsed.savingsGoals = parsed.savingsGoals || DEFAULT_SAVINGS_GOALS;
        parsed.settings = parsed.settings || { theme: 'light', userName: 'Keuangan Pribadi Saya' };
        return parsed;
      }
    } catch (e) {
      console.error('Error loading database, resetting', e);
    }
    return this.createInitialData();
  }

  createInitialData() {
    const initial = {
      version: 3,
      createdAt: new Date().toISOString(),
      accounts: JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS)),
      incomeCategories: [...DEFAULT_INCOME_CATEGORIES],
      expenseCategories: [...DEFAULT_EXPENSE_CATEGORIES],
      transactions: JSON.parse(JSON.stringify(DEFAULT_TRANSACTIONS)),
      fixedAssets: JSON.parse(JSON.stringify(DEFAULT_PERSONAL_ASSETS)),
      receivables: JSON.parse(JSON.stringify(DEFAULT_RECEIVABLES)),
      debts: JSON.parse(JSON.stringify(DEFAULT_DEBTS)),
      reminders: JSON.parse(JSON.stringify(DEFAULT_REMINDERS)),
      savingsGoals: JSON.parse(JSON.stringify(DEFAULT_SAVINGS_GOALS)),
      settings: {
        theme: 'light',
        userName: 'Keuangan Pribadi Saya'
      }
    };
    this.save(initial);
    return initial;
  }

  save(customData = null) {
    if (customData) this.data = customData;
    localStorage.setItem(DB_KEY, JSON.stringify(this.data));
  }

  reset() {
    localStorage.removeItem(DB_KEY);
    this.data = this.createInitialData();
    return this.data;
  }

  // Formatters
  static formatRupiah(amount, withPrefix = true) {
    const val = Math.round(Number(amount) || 0);
    const formatted = val.toLocaleString('id-ID');
    return withPrefix ? `Rp ${formatted}` : formatted;
  }

  static parseRupiah(str) {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const cleaned = String(str).replace(/[^0-9-]/g, '');
    return parseInt(cleaned, 10) || 0;
  }

  static formatDateID(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  }

  // Financial calculations
  getCalculatedAccounts() {
    const accounts = this.data.accounts.map(acc => ({
      ...acc,
      currentBalance: Number(acc.initialBalance || 0)
    }));

    (this.data.transactions || []).forEach(tx => {
      const acc = accounts.find(a => a.id === tx.accountId);
      if (acc) {
        if (tx.type === 'income') acc.currentBalance += Number(tx.amount || 0);
        else if (tx.type === 'expense') acc.currentBalance -= Number(tx.amount || 0);
      }
      if (tx.type === 'transfer') {
        const fromAcc = accounts.find(a => a.id === tx.fromAccountId);
        const toAcc = accounts.find(a => a.id === tx.toAccountId);
        if (fromAcc) fromAcc.currentBalance -= Number(tx.amount || 0);
        if (toAcc) toAcc.currentBalance += Number(tx.amount || 0);
      }
    });

    return accounts;
  }

  getTotalCashAndBank() {
    const accounts = this.getCalculatedAccounts();
    return accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  }

  getTotalReceivables() {
    return (this.data.receivables || [])
      .filter(r => r.status !== 'paid')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }

  getTotalCurrentAssets() {
    return this.getTotalCashAndBank() + this.getTotalReceivables();
  }

  getTotalFixedAssets() {
    return (this.data.fixedAssets || []).reduce((sum, a) => sum + Number(a.currentValue || a.purchaseValue || 0), 0);
  }

  getTotalAssets() {
    return this.getTotalCurrentAssets() + this.getTotalFixedAssets();
  }

  getTotalShortTermDebts() {
    return (this.data.debts || [])
      .filter(d => d.category === 'Jangka Pendek' && d.status === 'active')
      .reduce((sum, d) => sum + Number(d.remainingAmount || 0), 0);
  }

  getTotalLongTermDebts() {
    return (this.data.debts || [])
      .filter(d => d.category === 'Jangka Panjang' && d.status === 'active')
      .reduce((sum, d) => sum + Number(d.remainingAmount || 0), 0);
  }

  getTotalDebts() {
    return this.getTotalShortTermDebts() + this.getTotalLongTermDebts();
  }

  getNetWorth() {
    return this.getTotalAssets() - this.getTotalDebts();
  }

  getMonthlyStats(year = new Date().getFullYear(), month = new Date().getMonth() + 1) {
    const paddedMonth = String(month).padStart(2, '0');
    const prefix = `${year}-${paddedMonth}`;

    let totalIncome = 0;
    let totalExpense = 0;

    (this.data.transactions || []).forEach(tx => {
      if (tx.date && tx.date.startsWith(prefix)) {
        if (tx.type === 'income') totalIncome += Number(tx.amount || 0);
        if (tx.type === 'expense') totalExpense += Number(tx.amount || 0);
      }
    });

    return {
      year,
      month,
      totalIncome,
      totalExpense,
      netCashflow: totalIncome - totalExpense
    };
  }

  exportToJSON() {
    const jsonStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash_tracker_pribadi_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importFromJSON(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.transactions || !parsed.accounts) {
        throw new Error('Format data backup tidak valid!');
      }
      this.data = parsed;
      this.save();
      return true;
    } catch (e) {
      alert('Gagal memulihkan file: ' + e.message);
      return false;
    }
  }

  exportTransactionsCSV() {
    const txs = this.data.transactions || [];
    const accounts = this.getCalculatedAccounts();
    const accMap = {};
    accounts.forEach(a => { accMap[a.id] = a.name; });

    let csv = 'ID,Tanggal,Jenis,Kategori,Nominal,Rekening,Catatan\n';
    txs.forEach(t => {
      const typeStr = t.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
      const row = [
        t.id,
        t.date,
        typeStr,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        t.amount,
        `"${(accMap[t.accountId] || '-').replace(/"/g, '""')}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riwayat_transaksi_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

window.storage = new CashTrackerStorage();
