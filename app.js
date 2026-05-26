let currentFilter = 'all';
let currentRange = 'month';
let confirmCallback = null;
let appInitialized = false;
let isAmountsMasked = false;
let idleTimer = null;

function initApp() {
  const settings = getSettings();
  applyTheme(settings.theme);
  document.getElementById('settingsName').value = settings.name || '';
  document.getElementById('settingsCurrency').value = settings.currency || '\u20BA';

  updateWelcome();
  renderDashboard();
  bindTabEvents();
  bindFabButton();
  bindModalEvents();
  bindFilterEvents();
  bindSearchEvent();
  bindSettingsEvents();
  bindExportClear();
  bindChartsNav();

  updateCharts();
  renderBudgetPage();
  bindMaskToggle();
  bindNoteEvents();
  startIdleMonitoring();
}

function initAuth() {
  if (hasPassword()) {
    document.getElementById('login-setup').style.display = 'none';
    document.getElementById('login-unlock').style.display = 'block';
    document.getElementById('login-subtitle').textContent = 'Devam etmek için şifrenizi girin';
    document.getElementById('unlock-password').focus();
  } else {
    document.getElementById('login-setup').style.display = 'block';
    document.getElementById('login-unlock').style.display = 'none';
    document.getElementById('login-subtitle').textContent = 'İlk giriş için şifre belirleyin';
    document.getElementById('setup-password').focus();
  }
}

function bindLoginEvents() {
  var setupBtn = document.getElementById('login-setup-btn');
  var unlockBtn = document.getElementById('login-unlock-btn');
  var setupPw = document.getElementById('setup-password');
  var setupPw2 = document.getElementById('setup-password-confirm');
  var unlockPw = document.getElementById('unlock-password');
  var errEl = document.getElementById('login-error');
  var errUnlock = document.getElementById('login-error-unlock');

  if (!setupBtn || !unlockBtn || !setupPw || !setupPw2 || !unlockPw || !errEl || !errUnlock) {
    setTimeout(bindLoginEvents, 100);
    return;
  }

  errEl.textContent = '';
  errUnlock.textContent = '';

  setupBtn.addEventListener('click', function() {
    var pw = setupPw.value;
    var pw2 = setupPw2.value;
    if (!pw) {
      errEl.textContent = 'Lütfen bir şifre girin';
      return;
    }
    if (pw.length < 3) {
      errEl.textContent = 'Şifre en az 3 karakter olmalıdır';
      return;
    }
    if (pw !== pw2) {
      errEl.textContent = 'Şifreler eşleşmiyor';
      return;
    }
    errEl.textContent = '';
    try {
      setPassword(pw);
      document.getElementById('login-screen').classList.add('hidden');
      if (!appInitialized) {
        try { initApp(); } catch (e) { console.error('initApp hatasi:', e); }
        appInitialized = true;
      }
    } catch (e) {
      errEl.textContent = 'Kayıt hatası: ' + e.message;
    }
  });

  unlockBtn.addEventListener('click', function() {
    var pw = unlockPw.value;
    if (!pw) {
      errUnlock.textContent = 'Lütfen şifrenizi girin';
      return;
    }
    try {
      if (checkPassword(pw)) {
        errUnlock.textContent = '';
        document.getElementById('login-screen').classList.add('hidden');
        if (!appInitialized) {
          try { initApp(); } catch (e) { console.error('initApp hatasi:', e); }
          appInitialized = true;
        } else {
          startIdleMonitoring();
        }
      } else {
        errUnlock.textContent = 'Hatalı şifre';
      }
    } catch (e) {
      errUnlock.textContent = 'Giriş hatası: ' + e.message;
    }
  });

  setupPw.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') setupBtn.click();
  });
  setupPw2.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') setupBtn.click();
  });
  unlockPw.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') unlockBtn.click();
  });
}

function lockApp() {
  stopIdleMonitoring();
  isAmountsMasked = false;
  document.querySelectorAll('.mask-toggle').forEach(function(b) { b.textContent = '\uD83D\uDC41'; });
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-setup').style.display = 'none';
  document.getElementById('login-unlock').style.display = 'block';
  document.getElementById('login-subtitle').textContent = 'Devam etmek için şifrenizi girin';
  document.getElementById('unlock-password').value = '';
  document.getElementById('login-error-unlock').textContent = '';
  document.getElementById('unlock-password').focus();
}

function startIdleMonitoring() {
  const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
  events.forEach(function(evt) {
    document.addEventListener(evt, resetIdleTimer);
  });
  resetIdleTimer();
}

function stopIdleMonitoring() {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
  events.forEach(function(evt) {
    document.removeEventListener(evt, resetIdleTimer);
  });
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(function() {
    lockApp();
  }, 300000);
}

function bindMaskToggle() {
  document.querySelectorAll('.mask-toggle').forEach(function(btn) {
    btn.addEventListener('click', function() {
      isAmountsMasked = !isAmountsMasked;
      document.querySelectorAll('.mask-toggle').forEach(function(b) {
        b.textContent = isAmountsMasked ? '\uD83D\uDE48' : '\uD83D\uDC41';
      });
      renderDashboard();
    });
  });
}

// -------- Notes --------

function renderNotes() {
  const notes = getNotes().sort((a, b) => b.createdAt - a.createdAt);
  const el = document.getElementById('notesList');
  if (notes.length === 0) {
    el.innerHTML = '<div class="notes-empty">Hen\u00FCz bir finans notu eklemediniz.</div>';
    return;
  }
  el.innerHTML = notes.map(function(n) {
    return '<div class="note-item">'
      + '<span class="note-text">' + escapeHtml(n.text) + '</span>'
      + '<button class="note-delete" data-id="' + n.id + '" aria-label="Notu sil">\uD83D\uDDD1\uFE0F</button>'
      + '</div>';
  }).join('');
}

function bindNoteEvents() {
  var addBtn = document.getElementById('noteAddBtn');
  var input = document.getElementById('noteInput');
  var list = document.getElementById('notesList');

  if (!addBtn || !input || !list) {
    setTimeout(bindNoteEvents, 100);
    return;
  }

  addBtn.addEventListener('click', function() {
    var text = input.value.trim();
    if (!text) return;
    saveNote(text);
    input.value = '';
    renderNotes();
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addBtn.click();
  });

  list.addEventListener('click', function(e) {
    var btn = e.target.closest('.note-delete');
    if (btn) {
      deleteNote(btn.dataset.id);
      renderNotes();
    }
  });
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  btn.textContent = theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
  const toggle = document.getElementById('themeToggleSetting');
  if (theme === 'dark') toggle.classList.add('active');
  else toggle.classList.remove('active');
}

function updateWelcome() {
  const settings = getSettings();
  const name = settings.name || 'Kullan\u0131c\u0131';
  document.getElementById('welcomeText').textContent = 'Merhaba ' + name + ' \uD83D\uDC4B';

  const now = new Date();
  const days = ['Pazar', 'Pazartesi', 'Sal\u0131', '\u00C7ar\u015famba', 'Per\u015fembe', 'Cuma', 'Cumartesi'];
  const months = ['Ocak', '\u015Eubat', 'Mart', 'Nisan', 'May\u0131s', 'Haziran', 'Temmuz', 'A\u011fustos', 'Eyl\u00FCl', 'Ekim', 'Kas\u0131m', 'Aral\u0131k'];
  document.getElementById('currentDate').textContent = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');

  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  const tab = document.querySelector('.tab-item[data-page="' + pageId + '"]');
  if (tab) tab.classList.add('active');

  if (pageId === 'charts') updateCharts();
  if (pageId === 'budget') renderBudgetPage();
  if (pageId === 'transactions') renderTransactionList();
  if (pageId === 'dashboard') renderDashboard();
}

function bindTabEvents() {
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', function() {
      showPage(this.dataset.page);
    });
  });
  document.querySelectorAll('[data-tab]').forEach(el => {
    el.addEventListener('click', function() {
      showPage(this.dataset.tab);
    });
  });
}

function bindFabButton() {
  document.getElementById('fab-button').addEventListener('click', function() {
    openModal();
  });
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      openModal(this.dataset.type);
    });
  });
}

// -------- Modal --------

function openModal(type) {
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('formAmount').value = '';
  document.getElementById('formDescription').value = '';
  document.getElementById('formDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('amountError').classList.remove('show');
  document.getElementById('categoryError').classList.remove('show');
  document.getElementById('dateError').classList.remove('show');

  if (type) {
    setTransactionType(type);
  } else {
    setTransactionType('income');
  }

  setTimeout(() => document.getElementById('formAmount').focus(), 300);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function setTransactionType(type) {
  document.querySelectorAll('#typeToggle button').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector('#typeToggle button[data-type="' + type + '"]');
  if (btn) {
    btn.classList.add('active');
    if (type === 'income') btn.classList.add('income-type');
    else btn.classList.add('expense-type');
  }
  updateCategorySelect(type);
}

function updateCategorySelect(type) {
  const select = document.getElementById('formCategory');
  const cats = type === 'income' ? incomeCategories : expenseCategories;
  select.innerHTML = '';
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

function bindModalEvents() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  document.querySelectorAll('#typeToggle button').forEach(btn => {
    btn.addEventListener('click', function() {
      setTransactionType(this.dataset.type);
    });
  });

  document.getElementById('transactionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    handleFormSubmit();
  });
}

function handleFormSubmit() {
  const type = document.querySelector('#typeToggle button.active');
  const amount = document.getElementById('formAmount').value;
  const category = document.getElementById('formCategory').value;
  const date = document.getElementById('formDate').value;
  const description = document.getElementById('formDescription').value;

  let valid = true;
  const amountErr = document.getElementById('amountError');
  const catErr = document.getElementById('categoryError');
  const dateErr = document.getElementById('dateError');

  amountErr.classList.remove('show');
  catErr.classList.remove('show');
  dateErr.classList.remove('show');

  if (!amount || parseFloat(amount) <= 0) {
    amountErr.classList.add('show');
    valid = false;
  }
  if (!category) {
    catErr.classList.add('show');
    valid = false;
  }
  if (!date) {
    dateErr.classList.add('show');
    valid = false;
  }

  if (!valid) return;

  saveTransaction({
    type: type.dataset.type,
    amount: parseFloat(amount),
    category: category,
    description: description,
    date: date
  });

  closeModal();
  showToast('\u0130\u015Flem ba\u015Far\u0131yla eklendi', 'success');
  refreshAll();
  checkBudgetAlerts();
}

function refreshAll() {
  renderDashboard();
  renderTransactionList();
  updateCharts();
  renderBudgetPage();
}

// -------- Dashboard --------

function renderDashboard() {
  const income = getTotalIncome();
  const expense = getTotalExpense();
  const net = getNetBalance();

  document.getElementById('netBalance').textContent = isAmountsMasked ? '\u2022\u2022\u2022\u2022' : formatCurrency(net);
  document.getElementById('totalIncome').textContent = isAmountsMasked ? '\u2022\u2022\u2022\u2022' : formatCurrency(income);
  document.getElementById('totalExpense').textContent = isAmountsMasked ? '\u2022\u2022\u2022\u2022' : formatCurrency(expense);

  renderRecentTransactions();
  renderNotes();
}

function renderRecentTransactions() {
  const all = getTransactions();
  const recent = all.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const el = document.getElementById('recentTransactions');

  if (recent.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">\uD83D\uDCB0</div><h4>Hen\u00FCz i\u015Flem yok</h4><p>Sa\u011F alttaki + butonunu kullanarak ilk i\u015Fleminizi ekleyin.</p></div>';
    return;
  }

  el.innerHTML = recent.map(t => renderTxnItem(t)).join('');
  bindTxnDeletes();
}

// -------- Transaction List --------

function renderTransactionList() {
  let transactions = getTransactions();

  if (currentFilter === 'income') transactions = transactions.filter(t => t.type === 'income');
  else if (currentFilter === 'expense') transactions = transactions.filter(t => t.type === 'expense');

  if (currentRange === 'month') {
    const m = getCurrentMonth();
    transactions = transactions.filter(t => t.date && t.date.startsWith(m));
  } else if (currentRange === '3months') {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    const cutoff = d.toISOString().split('T')[0];
    transactions = transactions.filter(t => t.date && t.date >= cutoff);
  }

  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  if (query) {
    transactions = transactions.filter(t =>
      (t.category && t.category.toLowerCase().includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query))
    );
  }

  const el = document.getElementById('transactionList');
  if (transactions.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">\uD83D\uDCCB</div><h4>E\u015Fle\u015Fen i\u015Flem bulunamad\u0131</h4><p>Filtreleri de\u011Fi\u015Ftirmeyi veya yeni bir i\u015Flem eklemeyi deneyin.</p></div>';
    return;
  }

  const sorted = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  const grouped = {};
  sorted.forEach(t => {
    const key = t.date || 'Bilinmeyen';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  let html = '';
  Object.keys(grouped).forEach(dateKey => {
    html += '<div class="date-group">';
    html += '<div class="date-header">' + formatDate(dateKey) + '</div>';
    grouped[dateKey].forEach(t => {
      html += renderTxnItem(t);
    });
    html += '</div>';
  });
  el.innerHTML = html;
  bindTxnDeletes();
}

function renderTxnItem(t) {
  const icon = t.type === 'income' ? '\u2B06' : '\u2B07';
  return '<div class="txn-item">'
    + '<div class="txn-icon ' + t.type + '">' + icon + '</div>'
    + '<div class="txn-info">'
    + '<div class="txn-category">' + t.category + '</div>'
    + '<div class="txn-desc">' + (t.description || '\u0130\u015Flem') + '</div>'
    + '</div>'
    + '<div class="txn-amount ' + t.type + '">' + (t.type === 'income' ? '+' : '-') + formatCurrency(t.amount) + '</div>'
    + '<button class="txn-delete" data-id="' + t.id + '" aria-label="Sil">\u2716</button>'
    + '</div>';
}

function bindTxnDeletes() {
  document.querySelectorAll('.txn-delete').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = this.dataset.id;
      showConfirm('\u0130\u015Flemi sil', 'Bu i\u015Flem kal\u0131c\u0131 olarak silinecek. Emin misiniz?', function() {
        deleteTransaction(id);
        showToast('\u0130\u015Flem silindi', 'success');
        refreshAll();
      });
    });
  });
}

// -------- Filters --------

function bindFilterEvents() {
  document.querySelectorAll('#typeFilters .filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#typeFilters .filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderTransactionList();
    });
  });

  document.querySelectorAll('#rangeFilters .filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#rangeFilters .filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentRange = this.dataset.range;
      renderTransactionList();
    });
  });
}

function bindSearchEvent() {
  let searchTimer;
  document.getElementById('searchInput').addEventListener('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => renderTransactionList(), 300);
  });
}

// -------- Budget --------

function renderBudgetPage() {
  const month = getCurrentMonth();
  document.getElementById('budgetMonthTitle').textContent = getMonthName(month) + ' B\u00FCt\u00E7esi';

  const expenses = getCurrentMonthExpenses();
  const expenseByCat = {};
  expenseCategories.forEach(c => expenseByCat[c] = 0);
  expenses.forEach(t => {
    if (expenseByCat.hasOwnProperty(t.category)) expenseByCat[t.category] += t.amount;
    else expenseByCat['Di\u011Fer'] += t.amount;
  });

  const budgets = getAllBudgets();
  const el = document.getElementById('budgetList');

  let html = '';
  expenseCategories.forEach(cat => {
    const spent = expenseByCat[cat] || 0;
    const budget = budgets.find(b => b.category === cat && b.month === month);
    const limit = budget ? budget.limit : 0;

    let pct = 0;
    if (limit > 0) pct = Math.min((spent / limit) * 100, 100);

    let fillClass = 'green';
    let overClass = '';
    if (limit > 0 && spent >= limit) {
      fillClass = 'red';
      overClass = 'over';
    } else if (limit > 0 && spent >= limit * 0.9) {
      fillClass = 'yellow';
    }

    html += '<div class="budget-item ' + overClass + '">';
    html += '<div class="budget-header">';
    html += '<span class="budget-category">' + cat + '</span>';
    html += '<span class="budget-numbers">';
    if (limit > 0) {
      html += '<span class="used">' + formatCurrency(spent) + '</span> / ' + formatCurrency(limit);
    } else {
      html += '<span class="used">' + formatCurrency(spent) + '</span>';
    }
    html += '</span>';
    html += '</div>';

    html += '<div class="progress-track"><div class="progress-fill ' + fillClass + '" style="width:' + pct + '%"></div></div>';

    html += '<div class="budget-edit" id="budget-edit-' + cat.replace(/\s/g, '') + '">';
    html += '<input type="number" step="0.01" min="0" placeholder="Limit belirle..." value="' + (limit > 0 ? limit : '') + '">';
    html += '<button data-category="' + cat + '">Kaydet</button>';
    html += '</div>';

    html += '</div>';
  });
  el.innerHTML = html;

  el.querySelectorAll('.budget-edit button').forEach(btn => {
    btn.addEventListener('click', function() {
      const cat = this.dataset.category;
      const input = this.parentElement.querySelector('input');
      const val = parseFloat(input.value);
      if (val > 0) {
        setBudget(cat, val, month);
        showToast(cat + ' b\u00FCt\u00E7esi g\u00FCncellendi', 'success');
        renderBudgetPage();
      } else {
        showToast('Ge\u00E7erli bir limit girin', 'error');
      }
    });
  });
}

// -------- Budget Alerts --------

function checkBudgetAlerts() {
  const month = getCurrentMonth();
  const expenses = getCurrentMonthExpenses();
  const expenseByCat = {};
  expenses.forEach(t => {
    if (!expenseByCat[t.category]) expenseByCat[t.category] = 0;
    expenseByCat[t.category] += t.amount;
  });

  const budgets = getAllBudgets();
  budgets.forEach(b => {
    if (b.month !== month) return;
    const spent = expenseByCat[b.category] || 0;
    if (spent >= b.limit) {
      showToast('\u26A0\uFE0F ' + b.category + ' b\u00FCt\u00E7esi a\u015F\u0131ld\u0131! (' + formatCurrency(spent) + ' / ' + formatCurrency(b.limit) + ')', 'error');
    } else if (spent >= b.limit * 0.9) {
      showToast('\u26A0\uFE0F ' + b.category + ' b\u00FCt\u00E7esine yakla\u015F\u0131yorsunuz (%' + Math.round((spent / b.limit) * 100) + ')', 'warning');
    }
  });
}

// -------- Toast --------

function showToast(message, type) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type || 'success');
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(function() {
    toast.classList.add('removing');
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }, 2500);
}

// -------- Confirm --------

function showConfirm(title, text, callback) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmText').textContent = text;
  document.getElementById('confirm-overlay').classList.add('open');
  confirmCallback = callback;
}

function bindConfirmEvents() {
  document.getElementById('confirmCancel').addEventListener('click', function() {
    document.getElementById('confirm-overlay').classList.remove('open');
    confirmCallback = null;
  });
  document.getElementById('confirmOk').addEventListener('click', function() {
    document.getElementById('confirm-overlay').classList.remove('open');
    if (typeof confirmCallback === 'function') {
      confirmCallback();
      confirmCallback = null;
    }
  });
  document.getElementById('confirm-overlay').addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.remove('open');
      confirmCallback = null;
    }
  });
}

// -------- Settings --------

function bindSettingsEvents() {
  document.getElementById('settingsName').addEventListener('change', function() {
    saveSettings({ name: this.value || 'Kullan\u0131c\u0131' });
    updateWelcome();
  });

  document.getElementById('settingsCurrency').addEventListener('change', function() {
    saveSettings({ currency: this.value });
    refreshAll();
    showToast('Para birimi g\u00FCncellendi', 'success');
  });

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('themeToggleSetting').addEventListener('click', toggleTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  saveSettings({ theme: next });
  showToast(next === 'dark' ? 'Karanl\u0131k temaya ge\u00E7ildi' : 'Ayd\u0131nl\u0131k temaya ge\u00E7ildi', 'success');
}

function bindExportClear() {
  var backupBtn = document.getElementById('backupBtn');
  var restoreBtn = document.getElementById('restoreBtn');
  var restoreInput = document.getElementById('restoreInput');
  var lockBtn = document.getElementById('lockBtn');
  var clearBtn = document.getElementById('clearBtn');

  if (!backupBtn || !restoreBtn || !restoreInput || !lockBtn || !clearBtn) {
    setTimeout(bindExportClear, 100);
    return;
  }

  backupBtn.addEventListener('click', function() {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finans-yedek-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Veriler yedeklendi', 'success');
  });

  restoreBtn.addEventListener('click', function() {
    restoreInput.click();
  });

  restoreInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      showConfirm('Verileri Geri Y\u00FCkle', 'Mevcut t\u00FCm veriler yedekteki verilerle de\u011Fi\u015Fecek. Bu i\u015Flem geri al\u0131namaz. Devam etmek istiyor musunuz?', function() {
        const success = importData(ev.target.result);
        if (success) {
          showToast('Veriler ba\u015Far\u0131yla geri y\u00FCklendi', 'success');
          location.reload();
        } else {
          showToast('Ge\u00E7ersiz yedek dosyas\u0131', 'error');
        }
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  lockBtn.addEventListener('click', function() {
    lockApp();
  });

  clearBtn.addEventListener('click', function() {
    showConfirm('T\u00FCm veriyi sil', 'T\u00FCm i\u015Flemler, b\u00FCt\u00E7eler ve ayarlar silinecek! Bu i\u015Flem geri al\u0131namaz.', function() {
      clearAllData();
      refreshAll();
      location.reload();
    });
  });
}

// -------- Charts Navigation --------

function bindChartsNav() {
  document.getElementById('chartPrev').addEventListener('click', function() {
    chartCurrentMonth = getPrevMonth(chartCurrentMonth);
    updateCharts();
  });
  document.getElementById('chartNext').addEventListener('click', function() {
    chartCurrentMonth = getNextMonth(chartCurrentMonth);
    updateCharts();
  });
}

// -------- Init --------

bindConfirmEvents();

document.addEventListener('DOMContentLoaded', function() {
  try {
    initAuth();
    bindLoginEvents();
  } catch (e) {
    console.error('Baslatma hatasi:', e);
    var loginErr = document.getElementById('login-error');
    if (loginErr) loginErr.textContent = 'Bir hata oluştu, sayfayı yenileyin.';
  }
});
