function getStorage() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null) {
      localStorage.getItem('__test__');
      return localStorage;
    }
  } catch(e) {}
  return null;
}

function safeGetItem(key) {
  var s = getStorage();
  return s ? s.getItem(key) : null;
}

function safeSetItem(key, val) {
  var s = getStorage();
  if (s) s.setItem(key, val);
}

function safeRemoveItem(key) {
  var s = getStorage();
  if (s) s.removeItem(key);
}

function generateId() {
  return 'txn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

function formatCurrency(amount) {
  const settings = getSettings();
  const symbol = settings.currency || '\u20BA';
  return symbol + ' ' + Number(amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(isoString) {
  const d = new Date(isoString + 'T00:00:00');
  const months = ['Ocak', '\u015eubat', 'Mart', 'Nisan', 'May\u0131s', 'Haziran', 'Temmuz', 'A\u011fustos', 'Eyl\u00fcl', 'Ekim', 'Kas\u0131m', 'Aral\u0131k'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function getCurrentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return y + '-' + m;
}

function getMonthName(monthStr) {
  const [y, m] = monthStr.split('-');
  const months = ['Ocak', '\u015eubat', 'Mart', 'Nisan', 'May\u0131s', 'Haziran', 'Temmuz', 'A\u011fustos', 'Eyl\u00fcl', 'Ekim', 'Kas\u0131m', 'Aral\u0131k'];
  return months[parseInt(m) - 1] + ' ' + y;
}

function getNextMonth(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  if (m === 12) return (y + 1) + '-01';
  return y + '-' + String(m + 1).padStart(2, '0');
}

function getPrevMonth(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  if (m === 1) return (y - 1) + '-12';
  return y + '-' + String(m - 1).padStart(2, '0');
}

// -------- Transactions --------

function getTransactions() {
  try {
    return JSON.parse(safeGetItem('finans_transactions')) || [];
  } catch (e) {
    return [];
  }
}

function saveTransaction(obj) {
  const transactions = getTransactions();
  const newTxn = {
    id: generateId(),
    type: obj.type,
    amount: parseFloat(obj.amount),
    category: obj.category,
    description: obj.description || '',
    date: obj.date,
    createdAt: Date.now()
  };
  transactions.push(newTxn);
  safeSetItem('finans_transactions', JSON.stringify(transactions));
  return newTxn;
}

function deleteTransaction(id) {
  let transactions = getTransactions();
  transactions = transactions.filter(t => t.id !== id);
  safeSetItem('finans_transactions', JSON.stringify(transactions));
}

// -------- Budgets --------

function getAllBudgets() {
  try {
    return JSON.parse(safeGetItem('finans_budgets')) || [];
  } catch (e) {
    return [];
  }
}

function setBudget(category, limit, month) {
  const budgets = getAllBudgets();
  const idx = budgets.findIndex(b => b.category === category && b.month === month);
  if (idx >= 0) {
    budgets[idx].limit = parseFloat(limit);
  } else {
    budgets.push({ category, limit: parseFloat(limit), month });
  }
  safeSetItem('finans_budgets', JSON.stringify(budgets));
}

function getBudget(category, month) {
  const budgets = getAllBudgets();
  return budgets.find(b => b.category === category && b.month === month) || null;
}

// -------- Settings --------

const DEFAULT_SETTINGS = {
  theme: 'dark',
  currency: '\u20BA',
  name: 'Kullan\u0131c\u0131'
};

function getSettings() {
  try {
    const data = safeGetItem('finans_settings');
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(obj) {
  const current = getSettings();
  const merged = { ...current, ...obj };
  safeSetItem('finans_settings', JSON.stringify(merged));
}

// -------- Export / Clear --------

function exportData() {
  const data = {
    transactions: getTransactions(),
    budgets: getAllBudgets(),
    notes: getNotes(),
    settings: getSettings(),
    exportedAt: new Date().toISOString()
  };
  return JSON.stringify(data, null, 2);
}

function clearAllData() {
  safeRemoveItem('finans_transactions');
  safeRemoveItem('finans_budgets');
  safeRemoveItem('finans_settings');
  safeRemoveItem('finans_password');
  safeRemoveItem('finans_notes');
}

// -------- Password Auth --------

function hashPassword(password) {
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = ((hash << 5) + hash) + password.charCodeAt(i);
  }
  return 'h' + Math.abs(hash).toString(36);
}

function setPassword(password) {
  safeSetItem('finans_password', hashPassword(password));
}

function checkPassword(password) {
  const stored = safeGetItem('finans_password');
  return stored && stored === hashPassword(password);
}

function hasPassword() {
  return !!safeGetItem('finans_password');
}

function removePassword() {
  safeRemoveItem('finans_password');
}

// -------- Import --------

function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') throw new Error();
    if (data.transactions) safeSetItem('finans_transactions', JSON.stringify(data.transactions));
    if (data.budgets) safeSetItem('finans_budgets', JSON.stringify(data.budgets));
    if (data.notes) safeSetItem('finans_notes', JSON.stringify(data.notes));
    if (data.settings) safeSetItem('finans_settings', JSON.stringify(data.settings));
    return true;
  } catch (e) {
    return false;
  }
}

// -------- Notes --------

function generateNoteId() {
  return 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

function getNotes() {
  try {
    return JSON.parse(safeGetItem('finans_notes')) || [];
  } catch (e) {
    return [];
  }
}

function saveNote(text) {
  const notes = getNotes();
  notes.push({
    id: generateNoteId(),
    text: text.trim(),
    createdAt: Date.now()
  });
  safeSetItem('finans_notes', JSON.stringify(notes));
  return notes;
}

function deleteNote(id) {
  let notes = getNotes();
  notes = notes.filter(n => n.id !== id);
  safeSetItem('finans_notes', JSON.stringify(notes));
  return notes;
}

// -------- Query Helpers --------

function getTransactionsByMonth(month) {
  return getTransactions().filter(t => t.date && t.date.startsWith(month));
}

function getExpensesByCategory(month) {
  const txns = getTransactionsByMonth(month).filter(t => t.type === 'expense');
  const map = {};
  const expenseCategories = ['Market', 'Fatura', 'Kira', 'Ula\u015f\u0131m', 'Sa\u011fl\u0131k', 'E\u011flence', 'E\u011fitim', 'Giyim', 'Restoran', 'Di\u011fer'];
  expenseCategories.forEach(c => map[c] = 0);
  txns.forEach(t => {
    if (map.hasOwnProperty(t.category)) map[t.category] += t.amount;
    else map['Di\u011fer'] += t.amount;
  });
  return map;
}

function getMonthlyTotals(months) {
  const all = getTransactions();
  const result = months.map(m => {
    const filtered = all.filter(t => t.date && t.date.startsWith(m));
    return {
      month: m,
      income: filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    };
  });
  return result;
}

function getCurrentMonthExpenses() {
  return getTransactionsByMonth(getCurrentMonth()).filter(t => t.type === 'expense');
}

function getTotalIncome() {
  return getTransactions().reduce((s, t) => t.type === 'income' ? s + t.amount : s, 0);
}

function getTotalExpense() {
  return getTransactions().reduce((s, t) => t.type === 'expense' ? s + t.amount : s, 0);
}

function getNetBalance() {
  return getTotalIncome() - getTotalExpense();
}

const expenseCategories = ['Market', 'Fatura', 'Kira', 'Ula\u015f\u0131m', 'Sa\u011fl\u0131k', 'E\u011flence', 'E\u011fitim', 'Giyim', 'Restoran', 'Di\u011fer'];
const incomeCategories = ['Maa\u015f', 'Serbest \u00c7al\u0131\u015fma', 'Kira Geliri', 'Yat\u0131r\u0131m', 'Di\u011fer'];
