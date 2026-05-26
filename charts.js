let categoryChartInstance = null;
let monthlyChartInstance = null;
const CHART_COLORS = [
  '#6c63ff', '#e74c3c', '#2ecc71', '#f1c40f', '#3498db',
  '#e67e22', '#1abc9c', '#9b59b6', '#34495e', '#95a5a6'
];
let chartCurrentMonth = getCurrentMonth();

function renderCategoryChart(month) {
  const canvas = document.getElementById('categoryChart');
  const legendEl = document.getElementById('chartLegend');
  const fallbackEl = document.getElementById('fallbackChart');
  const ctx = canvas.getContext('2d');

  if (typeof Chart === 'undefined') {
    canvas.style.display = 'none';
    legendEl.style.display = 'none';
    fallbackEl.style.display = 'block';
    renderFallbackChart(month);
    return;
  }
  canvas.style.display = 'block';
  legendEl.style.display = 'block';
  fallbackEl.style.display = 'none';

  const data = getExpensesByCategory(month);
  const labels = Object.keys(data).filter(k => data[k] > 0);
  const values = labels.map(l => data[l]);
  const total = values.reduce((s, v) => s + v, 0);

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
    categoryChartInstance = null;
  }

  if (values.length === 0) {
    legendEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;">Bu ay için veri bulunmuyor.</div>';
    return;
  }

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: CHART_COLORS.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#2d3148',
          titleFont: { family: 'Nunito', size: 13 },
          bodyFont: { family: 'Nunito', size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(ctx) {
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ' ' + ctx.label + ': ' + formatCurrency(ctx.parsed) + ' (' + pct + '%)';
            }
          }
        }
      }
    }
  });

  let legendHtml = '';
  labels.forEach((label, i) => {
    const pct = total > 0 ? ((values[i] / total) * 100).toFixed(1) : 0;
    legendHtml += '<div class="legend-item">'
      + '<span class="legend-dot" style="background:' + CHART_COLORS[i % CHART_COLORS.length] + '"></span>'
      + '<span class="legend-label">' + label + '</span>'
      + '<span class="legend-amount">' + formatCurrency(values[i]) + '</span>'
      + '<span class="legend-pct">%' + pct + '</span>'
      + '</div>';
  });
  legendEl.innerHTML = legendHtml;
}

function renderFallbackChart(month) {
  const el = document.getElementById('fallbackChart');
  const data = getExpensesByCategory(month);
  const labels = Object.keys(data).filter(k => data[k] > 0);
  const values = labels.map(l => data[l]);
  const maxVal = Math.max(...values, 1);

  if (values.length === 0) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:10px;">Bu ay için veri bulunmuyor.</div>';
    return;
  }

  let html = '';
  labels.forEach((label, i) => {
    const pct = Math.round((values[i] / maxVal) * 100);
    html += '<div class="fallback-bar-item">'
      + '<span class="fb-label">' + label + '</span>'
      + '<div class="fb-track"><div class="fb-fill" style="width:' + pct + '%;background:' + CHART_COLORS[i % CHART_COLORS.length] + '"></div></div>'
      + '<span class="fb-value">' + formatCurrency(values[i]) + '</span>'
      + '</div>';
  });
  el.innerHTML = html;
}

function renderMonthlyChart() {
  const canvas = document.getElementById('monthlyChart');
  const ctx = canvas.getContext('2d');

  if (typeof Chart === 'undefined') return;

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    months.push(y + '-' + m);
  }

  const totals = getMonthlyTotals(months);
  const labels = months.map(m => getMonthName(m).split(' ')[0]);

  if (monthlyChartInstance) {
    monthlyChartInstance.destroy();
    monthlyChartInstance = null;
  }

  monthlyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Gelir',
          data: totals.map(t => t.income),
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46,204,113,0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#2ecc71',
          pointRadius: 4,
          borderWidth: 3
        },
        {
          label: 'Gider',
          data: totals.map(t => t.expense),
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231,76,60,0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#e74c3c',
          pointRadius: 4,
          borderWidth: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Nunito', size: 12 },
            color: '#a0a8c0',
            padding: 16,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: '#2d3148',
          titleFont: { family: 'Nunito', size: 13 },
          bodyFont: { family: 'Nunito', size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(ctx) {
              return ' ' + ctx.dataset.label + ': ' + formatCurrency(ctx.parsed);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Nunito', size: 11 }, color: '#6b7280' }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            font: { family: 'Nunito', size: 11 },
            color: '#6b7280',
            callback: function(v) { return formatCurrency(v); }
          }
        }
      }
    }
  });
}

function updateCharts() {
  renderCategoryChart(chartCurrentMonth);
  renderMonthlyChart();
  document.getElementById('chartMonthTitle').textContent = getMonthName(chartCurrentMonth);
}
