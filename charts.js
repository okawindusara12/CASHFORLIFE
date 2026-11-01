// ==========================================================================
// Cash Tracker - Pure Canvas & SVG Interactive Chart Engine (Personal Finance)
// 100% offline, responsive for mobile & desktop, zero dependencies
// ==========================================================================

const AppCharts = {
  colors: [
    '#10b981', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6',
    '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4', '#e11d48'
  ],

  // 1. Interactive Doughnut / Pie Chart
  renderDoughnut(canvasId, legendId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 300;
    const height = canvas.height = Math.min(240, width * 0.75);

    ctx.clearRect(0, 0, width, height);

    const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

    if (total === 0 || data.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Belum ada data transaksi', width / 2, height / 2);
      if (legendId) {
        const leg = document.getElementById(legendId);
        if (leg) leg.innerHTML = '';
      }
      return;
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 15;
    const innerRadius = radius * 0.58;

    let startAngle = -Math.PI / 2;

    data.forEach((item, idx) => {
      const sliceAngle = ((Number(item.value) || 0) / total) * (Math.PI * 2);
      const endAngle = startAngle + sliceAngle;
      const color = item.color || this.colors[idx % this.colors.length];

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = color;
      ctx.fill();

      ctx.strokeStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#131b2e' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle = endAngle;
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText('TOTAL', centerX, centerY - 8);

    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#f8fafc' : '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(CashTrackerStorage.formatRupiah(total, false), centerX, centerY + 10);

    if (legendId) {
      const leg = document.getElementById(legendId);
      if (leg) {
        leg.innerHTML = data.slice(0, 6).map((item, idx) => {
          const color = item.color || this.colors[idx % this.colors.length];
          const pct = Math.round(((Number(item.value) || 0) / total) * 100);
          return `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; font-size:12px;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${color}; flex-shrink:0;"></span>
                <span style="color:var(--text-main); max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.label}</span>
              </div>
              <div style="text-align:right;">
                <span style="font-weight:600; color:var(--text-main);">${pct}%</span>
                <span style="color:var(--text-muted); font-size:10px; margin-left:3px;">(${CashTrackerStorage.formatRupiah(item.value, false)})</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  },

  // 2. Bar Chart: Monthly Income vs Expense (Mobile optimized)
  renderBarComparison(canvasId, labels, incomeData, expenseData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 500;
    const height = canvas.height = width < 480 ? 220 : 260;

    ctx.clearRect(0, 0, width, height);

    const isMobile = width < 480;
    const padding = { top: 20, right: 15, bottom: 35, left: isMobile ? 50 : 65 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(...incomeData, ...expenseData, 1000000) * 1.15;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = isMobile ? '9px sans-serif' : '11px sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (chartH * (1 - i / 3));
      const val = (maxVal * (i / 3));

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      let labelStr = val >= 1000000 ? `${(val / 1000000).toFixed(0)}jt` : (val >= 1000 ? `${(val / 1000).toFixed(0)}rb` : '0');
      ctx.fillText(labelStr, padding.left - 6, y + 3);
    }

    const groupCount = labels.length;
    const groupWidth = chartW / groupCount;
    const barWidth = Math.min(groupWidth * 0.38, isMobile ? 14 : 26);

    labels.forEach((label, idx) => {
      const groupX = padding.left + (idx * groupWidth);
      const incVal = incomeData[idx] || 0;
      const expVal = expenseData[idx] || 0;

      const incH = (incVal / maxVal) * chartH;
      const expH = (expVal / maxVal) * chartH;

      const x1 = groupX + (groupWidth / 2) - barWidth - 2;
      const y1 = padding.top + chartH - incH;
      const x2 = groupX + (groupWidth / 2) + 2;
      const y2 = padding.top + chartH - expH;

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(x1, y1, barWidth, incH, [3, 3, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.roundRect(x2, y2, barWidth, expH, [3, 3, 0, 0]);
      ctx.fill();

      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.font = isMobile ? '9px sans-serif' : '11px sans-serif';
      ctx.fillText(label, groupX + (groupWidth / 2), height - padding.bottom + 16);
    });
  },

  // 3. Balance Sheet Visual (Personal Assets vs Debts)
  renderBalanceComparison(canvasId, currentAssets, fixedAssets, shortDebts, longDebts) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 450;
    const height = canvas.height = width < 480 ? 210 : 240;

    ctx.clearRect(0, 0, width, height);

    const totalAssets = currentAssets + fixedAssets;
    const totalLiabilities = shortDebts + longDebts;
    const maxVal = Math.max(totalAssets, totalLiabilities, 1000000) * 1.15;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const isMobile = width < 480;
    const padding = { top: 20, right: 15, bottom: 45, left: isMobile ? 50 : 65 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (chartH * (1 - i / 3));
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const val = (maxVal * (i / 3));
      let labelStr = val >= 1000000000 ? `${(val / 1000000000).toFixed(1)}M` : (val >= 1000000 ? `${(val / 1000000).toFixed(0)}jt` : '0');
      ctx.fillStyle = textColor;
      ctx.textAlign = 'right';
      ctx.font = isMobile ? '9px sans-serif' : '11px sans-serif';
      ctx.fillText(labelStr, padding.left - 6, y + 4);
    }

    const colWidth = isMobile ? 55 : 80;
    const assetColX = padding.left + (chartW * 0.28) - (colWidth / 2);
    const liabColX = padding.left + (chartW * 0.72) - (colWidth / 2);

    let currentY = padding.top + chartH;
    const hCash = (currentAssets / maxVal) * chartH;
    const hFixed = (fixedAssets / maxVal) * chartH;

    // Kas/Setara Kas (Sky)
    ctx.fillStyle = '#0284c7';
    currentY -= hCash;
    ctx.fillRect(assetColX, currentY, colWidth, hCash);

    // Aset Tetap/Investasi (Emerald)
    ctx.fillStyle = '#10b981';
    currentY -= hFixed;
    ctx.fillRect(assetColX, currentY, colWidth, hFixed);

    let liabY = padding.top + chartH;
    const hShort = (shortDebts / maxVal) * chartH;
    const hLong = (longDebts / maxVal) * chartH;

    // Short term (Rose)
    ctx.fillStyle = '#f43f5e';
    liabY -= hShort;
    ctx.fillRect(liabColX, liabY, colWidth, hShort);

    // Long term (Dark Rose)
    ctx.fillStyle = '#9f1239';
    liabY -= hLong;
    ctx.fillRect(liabColX, liabY, colWidth, hLong);

    ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
    ctx.textAlign = 'center';
    ctx.font = isMobile ? 'bold 10px sans-serif' : 'bold 11px sans-serif';
    ctx.fillText('ASET PRIBADI', assetColX + colWidth / 2, height - padding.bottom + 18);
    ctx.fillText('TOTAL HUTANG', liabColX + colWidth / 2, height - padding.bottom + 18);

    ctx.font = isMobile ? '10px sans-serif' : '11px sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.fillText(CashTrackerStorage.formatRupiah(totalAssets, true), assetColX + colWidth / 2, height - padding.bottom + 32);

    ctx.fillStyle = '#f43f5e';
    ctx.fillText(CashTrackerStorage.formatRupiah(totalLiabilities, true), liabColX + colWidth / 2, height - padding.bottom + 32);
  }
};
