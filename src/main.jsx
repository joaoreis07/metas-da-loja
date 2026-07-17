import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  Edit3,
  FileUp,
  Filter,
  LineChart,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'metas_da_loja_state_v1';

const defaultState = {
  transactions: [],
  monthlyGoal: 0,
  darkMode: false,
};

const categories = ['Vendas', 'Marketing', 'Aluguel', 'Fornecedores', 'Impostos', 'Salarios', 'Operacional', 'Outros'];

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function getMonthKey(date = new Date()) {
  if (typeof date === 'string') return date.slice(0, 7);
  return date.toISOString().slice(0, 7);
}

function formatMonthLabel(monthKey) {
  if (monthKey === 'all') return 'Todos os periodos';
  const [year, month] = monthKey.split('-');
  const label = monthFormatter.format(new Date(Date.UTC(Number(year), Number(month) - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shiftMonth(monthKey, offset) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

function aggregateTransactions(transactions) {
  const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expense = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  return { income, expense, net: income - expense, count: transactions.length };
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '0,0%';
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultState;
    const parsed = JSON.parse(saved);
    return {
      ...defaultState,
      ...parsed,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    };
  } catch {
    return defaultState;
  }
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

function normalizeMoney(value) {
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  return Number(cleaned) || 0;
}

function StatCard({ icon: Icon, label, value, tone, helper }) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-icon">
        <Icon size={22} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </article>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <WalletCards size={42} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function App() {
  const [state, setState] = useState(loadState);
  const [isReady, setIsReady] = useState(false);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(getMonthKey());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '', type: 'all', category: 'all' });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    type: 'income',
    name: '',
    amount: '',
    category: 'Vendas',
    date: new Date().toISOString().slice(0, 10),
  });
  const importInputRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsReady(true), 420);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state]);

  const sortedTransactions = useMemo(() => {
    return [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [state.transactions]);

  const periodOptions = useMemo(() => {
    const months = new Set([getMonthKey()]);
    state.transactions.forEach((item) => months.add(getMonthKey(item.date)));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [state.transactions]);

  const monthlyData = useMemo(() => {
    const grouped = new Map();
    state.transactions.forEach((item) => {
      const month = getMonthKey(item.date);
      const transactions = grouped.get(month) || [];
      transactions.push(item);
      grouped.set(month, transactions);
    });

    return Array.from(grouped.entries())
      .map(([month, transactions]) => ({
        month,
        label: formatMonthLabel(month),
        ...aggregateTransactions(transactions),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [state.transactions]);

  const currentMonthForComparison = selectedPeriod === 'all' ? monthlyData.at(-1)?.month || getMonthKey() : selectedPeriod;
  const previousMonthForComparison = shiftMonth(currentMonthForComparison, -1);

  const periodTransactions = useMemo(() => {
    if (selectedPeriod === 'all') return sortedTransactions;
    return sortedTransactions.filter((item) => getMonthKey(item.date) === selectedPeriod);
  }, [selectedPeriod, sortedTransactions]);

  const totals = useMemo(() => aggregateTransactions(periodTransactions), [periodTransactions]);

  const previousTotals = useMemo(() => {
    return aggregateTransactions(state.transactions.filter((item) => getMonthKey(item.date) === previousMonthForComparison));
  }, [previousMonthForComparison, state.transactions]);

  const comparisonBaseTotals = useMemo(() => {
    if (selectedPeriod !== 'all') return totals;
    return aggregateTransactions(state.transactions.filter((item) => getMonthKey(item.date) === currentMonthForComparison));
  }, [currentMonthForComparison, selectedPeriod, state.transactions, totals]);

  const comparison = useMemo(() => {
    const profitDiff = comparisonBaseTotals.net - previousTotals.net;
    const incomeDiff = comparisonBaseTotals.income - previousTotals.income;
    const expenseDiff = comparisonBaseTotals.expense - previousTotals.expense;
    const profitPercent = previousTotals.net === 0 ? (comparisonBaseTotals.net === 0 ? 0 : 100) : (profitDiff / Math.abs(previousTotals.net)) * 100;
    return { profitDiff, incomeDiff, expenseDiff, profitPercent };
  }, [comparisonBaseTotals, previousTotals]);

  const filteredTransactions = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return periodTransactions.filter((item) => {
      const matchesSearch = !query || item.name.toLowerCase().includes(query);
      const matchesType = filters.type === 'all' || item.type === filters.type;
      const matchesCategory = filters.category === 'all' || item.category === filters.category;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [filters, periodTransactions]);

  const goalProgress = state.monthlyGoal > 0 ? Math.min(100, Math.max(0, (totals.net / state.monthlyGoal) * 100)) : 0;
  const netTone = totals.net > 0 ? 'positive' : totals.net < 0 ? 'negative' : 'neutral';
  const growthTone = comparison.profitDiff > 0 ? 'positive' : comparison.profitDiff < 0 ? 'negative' : 'neutral';
  const maxBar = Math.max(totals.income, totals.expense, 1);
  const monthlyMax = Math.max(...monthlyData.flatMap((item) => [item.income, item.expense, Math.abs(item.net)]), 1);
  const lineMax = Math.max(...monthlyData.map((item) => item.net), 1);
  const lineMin = Math.min(...monthlyData.map((item) => item.net), 0);
  const lineRange = lineMax - lineMin || 1;
  const linePoints = monthlyData
    .map((item, index) => {
      const x = monthlyData.length === 1 ? 50 : (index / (monthlyData.length - 1)) * 100;
      const y = 92 - ((item.net - lineMin) / lineRange) * 76;
      return `${x},${y}`;
    })
    .join(' ');
  const lineDots = monthlyData.map((item, index) => ({
    x: monthlyData.length === 1 ? 50 : (index / (monthlyData.length - 1)) * 100,
    y: 92 - ((item.net - lineMin) / lineRange) * 76,
  }));
  const rankedMonths = [...monthlyData].sort((a, b) => b.net - a.net);
  const monthlyAverage = monthlyData.length ? monthlyData.reduce((sum, item) => sum + item.net, 0) / monthlyData.length : 0;
  const totalAccumulated = monthlyData.reduce((sum, item) => sum + item.net, 0);

  function handlePeriodChange(value) {
    setSelectedPeriod(value);
    setPeriodLoading(true);
    window.setTimeout(() => setPeriodLoading(false), 260);
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      type: 'income',
      name: '',
      amount: '',
      category: 'Vendas',
      date: new Date().toISOString().slice(0, 10),
    });
  }

  function submitTransaction(event) {
    event.preventDefault();
    const transaction = {
      id: editingId || crypto.randomUUID(),
      type: form.type,
      name: form.name.trim(),
      amount: normalizeMoney(form.amount),
      category: form.category,
      date: form.date,
    };

    if (!transaction.name || transaction.amount <= 0 || !transaction.date) return;

    setState((current) => ({
      ...current,
      transactions: editingId
        ? current.transactions.map((item) => (item.id === editingId ? transaction : item))
        : [transaction, ...current.transactions],
    }));
    resetForm();
  }

  function editTransaction(item) {
    setEditingId(item.id);
    setForm({
      type: item.type,
      name: item.name,
      amount: String(item.amount).replace('.', ','),
      category: item.category,
      date: item.date,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deleteTransaction(id) {
    const confirmed = window.confirm('Deseja excluir esta movimentacao?');
    if (!confirmed) return;
    setState((current) => ({
      ...current,
      transactions: current.transactions.filter((item) => item.id !== id),
    }));
  }

  function exportCsv() {
    const header = ['Nome', 'Tipo', 'Categoria', 'Valor', 'Data'];
    const rows = sortedTransactions.map((item) => [
      item.name,
      item.type === 'income' ? 'Entrada' : 'Saida',
      item.category,
      item.amount.toFixed(2).replace('.', ','),
      item.date,
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'metas-da-loja.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'metas-da-loja-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result));
        if (!Array.isArray(imported.transactions)) throw new Error('Invalid backup');
        setState({
          ...defaultState,
          ...imported,
          transactions: imported.transactions.map((item) => ({
            ...item,
            id: item.id || crypto.randomUUID(),
            amount: Number(item.amount) || 0,
          })),
        });
      } catch {
        window.alert('Backup invalido. Selecione um arquivo JSON exportado pelo sistema.');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="app-shell">
      {!isReady && (
        <div className="loading-screen">
          <strong className="loading-brand">Metas da loja</strong>
          <span>Carregando...</span>
        </div>
      )}

      <aside className={`sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">M</div>
          <div>
            <strong>Metas da loja</strong>
            <span>Controle financeiro</span>
          </div>
        </div>
        <nav>
          <a href="#dashboard" onClick={() => setMobileNavOpen(false)}><BarChart3 size={18} />Dashboard</a>
          <a href="#comparacao" onClick={() => setMobileNavOpen(false)}><TrendingUp size={18} />Comparacao</a>
          <a href="#movimentacoes" onClick={() => setMobileNavOpen(false)}><WalletCards size={18} />Movimentacoes</a>
          <a href="#relatorios" onClick={() => setMobileNavOpen(false)}><LineChart size={18} />Relatorios</a>
          <a href="#meta" onClick={() => setMobileNavOpen(false)}><Target size={18} />Meta</a>
        </nav>
        <button className="ghost-button theme-button" onClick={() => setState((current) => ({ ...current, darkMode: !current.darkMode }))}>
          {state.darkMode ? <Sun size={18} /> : <Moon size={18} />}
          {state.darkMode ? 'Modo claro' : 'Modo escuro'}
        </button>
      </aside>

      <main>
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
          <div>
            <p>Controle financeiro local</p>
            <h1>Metas da loja</h1>
          </div>
          <div className="topbar-actions">
            <button className="secondary-button" onClick={exportCsv}><Download size={17} />CSV</button>
            <button className="secondary-button" onClick={exportBackup}><Download size={17} />Backup</button>
            <button className="primary-button" onClick={() => importInputRef.current?.click()}><FileUp size={17} />Importar</button>
            <input ref={importInputRef} type="file" accept="application/json" onChange={importBackup} hidden />
          </div>
        </header>

        <section className="period-toolbar" id="dashboard">
          <div>
            <span>Periodo analisado</span>
            <strong>{formatMonthLabel(selectedPeriod)}</strong>
          </div>
          <label>
            Mes + ano
            <select value={selectedPeriod} onChange={(event) => handlePeriodChange(event.target.value)}>
              <option value="all">Todos os periodos</option>
              {periodOptions.map((month) => <option key={month} value={month}>{formatMonthLabel(month)}</option>)}
            </select>
          </label>
        </section>

        <section className={`stats-grid ${periodLoading ? 'is-loading' : ''}`}>
          <StatCard icon={ArrowUpCircle} label="Entradas" value={formatCurrency(totals.income)} tone="positive" helper={selectedPeriod === 'all' ? 'Historico completo' : `Periodo: ${formatMonthLabel(selectedPeriod)}`} />
          <StatCard icon={ArrowDownCircle} label="Saidas" value={formatCurrency(totals.expense)} tone="negative" helper="Despesas do periodo" />
          <StatCard icon={BarChart3} label="Lucro Liquido" value={formatCurrency(totals.net)} tone={netTone} helper={totals.net >= 0 ? 'Resultado positivo' : 'Resultado em prejuizo'} />
          <StatCard icon={comparison.profitDiff >= 0 ? TrendingUp : TrendingDown} label="Crescimento Mensal" value={`${comparison.profitDiff >= 0 ? '+' : ''}${formatPercent(comparison.profitPercent)}`} tone={growthTone} helper={`${comparison.profitDiff >= 0 ? '+' : ''}${formatCurrency(comparison.profitDiff)} vs ${formatMonthLabel(previousMonthForComparison)}`} />
          <StatCard icon={Target} label="Meta Mensal" value={formatCurrency(state.monthlyGoal)} tone="accent" helper={`${goalProgress.toFixed(0)}% alcancado`} />
        </section>

        <section className="comparison-grid" id="comparacao">
          <article className="panel comparison-panel">
            <div className="panel-heading">
              <div>
                <span>Comparacao entre meses</span>
                <h2>{formatMonthLabel(currentMonthForComparison)} vs {formatMonthLabel(previousMonthForComparison)}</h2>
              </div>
              {comparison.profitDiff >= 0 ? <TrendingUp className="success-icon" /> : <TrendingDown className="danger-icon" />}
            </div>
            <div className="comparison-summary">
              <div>
                <span>Lucro atual</span>
                <strong>{formatCurrency(comparisonBaseTotals.net)}</strong>
              </div>
              <div>
                <span>Lucro anterior</span>
                <strong>{formatCurrency(previousTotals.net)}</strong>
              </div>
              <div className={growthTone}>
                <span>Diferenca</span>
                <strong>{comparison.profitDiff >= 0 ? '+' : ''}{formatCurrency(comparison.profitDiff)}</strong>
                <small>{comparison.profitDiff >= 0 ? '+' : ''}{formatPercent(comparison.profitPercent)}</small>
              </div>
            </div>
          </article>

          <article className="panel comparison-panel compact">
            <div className="metric-row">
              <span>Diferenca de entradas</span>
              <strong className={comparison.incomeDiff >= 0 ? 'positive' : 'negative'}>{comparison.incomeDiff >= 0 ? '+' : ''}{formatCurrency(comparison.incomeDiff)}</strong>
            </div>
            <div className="metric-row">
              <span>Diferenca de saidas</span>
              <strong className={comparison.expenseDiff <= 0 ? 'positive' : 'negative'}>{comparison.expenseDiff >= 0 ? '+' : ''}{formatCurrency(comparison.expenseDiff)}</strong>
            </div>
            <div className="metric-row">
              <span>Modo ativo</span>
              <strong>{selectedPeriod === 'all' ? 'Geral' : 'Mensal'}</strong>
            </div>
          </article>
        </section>

        <section className="workspace-grid">
          <article className="panel transaction-panel" id="movimentacoes">
            <div className="panel-heading">
              <div>
                <span>Nova movimentacao</span>
                <h2>{editingId ? 'Editar lancamento' : 'Adicionar lancamento'}</h2>
              </div>
              {editingId && <button className="ghost-button" onClick={resetForm}><X size={16} />Cancelar</button>}
            </div>

            <form className="transaction-form" onSubmit={submitTransaction}>
              <label>
                Tipo
                <div className="segmented-control">
                  <button type="button" className={form.type === 'income' ? 'active income' : ''} onClick={() => setForm((current) => ({ ...current, type: 'income' }))}>Entrada</button>
                  <button type="button" className={form.type === 'expense' ? 'active expense' : ''} onClick={() => setForm((current) => ({ ...current, type: 'expense' }))}>Saida</button>
                </div>
              </label>
              <label>
                Nome da movimentacao
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex: Venda do dia" />
              </label>
              <label>
                Valor
                <input inputMode="decimal" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="R$ 0,00" />
              </label>
              <label>
                Categoria
                <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label>
                Data
                <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
              </label>
              <button className="primary-button wide" type="submit"><Plus size={18} />{editingId ? 'Salvar alteracoes' : 'Adicionar movimentacao'}</button>
            </form>
          </article>

          <article className="panel goal-panel" id="meta">
            <div className="panel-heading">
              <div>
                <span>Meta financeira</span>
                <h2>Lucro mensal</h2>
              </div>
              {totals.net >= state.monthlyGoal && state.monthlyGoal > 0 ? <CheckCircle2 className="success-icon" /> : <Target className="accent-icon" />}
            </div>
            <label className="goal-input">
              Meta de lucro
              <input
                inputMode="decimal"
                value={String(state.monthlyGoal).replace('.', ',')}
                onChange={(event) => setState((current) => ({ ...current, monthlyGoal: normalizeMoney(event.target.value) }))}
              />
            </label>
            <div className="goal-status">
              <div>
                <strong>{formatCurrency(totals.net)}</strong>
                <span>de {formatCurrency(state.monthlyGoal)}</span>
              </div>
              <b>{totals.net >= state.monthlyGoal && state.monthlyGoal > 0 ? 'Atingido' : 'Em progresso'}</b>
            </div>
            <div className="progress-bar">
              <span style={{ width: `${goalProgress}%` }} />
            </div>
          </article>
        </section>

        <section className="panel">
          <div className="panel-heading list-heading">
            <div>
              <span>Historico financeiro</span>
              <h2>Movimentacoes</h2>
            </div>
            <div className="filters">
              <label className="search-field">
                <Search size={16} />
                <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Buscar por nome" />
              </label>
              <label>
                <Filter size={15} />
                <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
                  <option value="all">Todos</option>
                  <option value="income">Entradas</option>
                  <option value="expense">Saidas</option>
                </select>
              </label>
              <label>
                <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
                  <option value="all">Categorias</option>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <EmptyState title="Nenhuma movimentacao encontrada" text="Adicione uma entrada ou saida para acompanhar o resultado do negocio." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Categoria</th>
                    <th>Valor</th>
                    <th>Data</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <small><CalendarDays size={14} />Lancado em {dateFormatter.format(new Date(`${item.date}T00:00:00Z`))}</small>
                      </td>
                      <td><span className={`badge ${item.type}`}>{item.type === 'income' ? 'Entrada' : 'Saida'}</span></td>
                      <td>{item.category}</td>
                      <td className={item.type === 'income' ? 'money-positive' : 'money-negative'}>{formatCurrency(item.amount)}</td>
                      <td>{dateFormatter.format(new Date(`${item.date}T00:00:00Z`))}</td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-button" onClick={() => editTransaction(item)} aria-label="Editar"><Edit3 size={16} /></button>
                          <button className="icon-button danger" onClick={() => deleteTransaction(item.id)} aria-label="Excluir"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="reports-grid" id="relatorios">
          <article className="panel monthly-evolution-panel">
            <div className="panel-heading">
              <div>
                <span>Historico completo automatico</span>
                <h2>Evolucao mensal do lucro, entradas e saidas</h2>
              </div>
              <LineChart className="accent-icon" />
            </div>
            {monthlyData.length === 0 ? (
              <EmptyState title="Sem dados suficientes" text="A evolucao mensal aparece assim que houver movimentacoes." />
            ) : (
              <div className="monthly-evolution">
                {monthlyData.map((month) => (
                  <div className="month-column" key={month.month}>
                    <div className="month-bars">
                      <span className="income-bar" style={{ height: `${Math.max(7, (month.income / monthlyMax) * 100)}%` }} title="Entradas" />
                      <span className="expense-bar" style={{ height: `${Math.max(7, (month.expense / monthlyMax) * 100)}%` }} title="Saidas" />
                      <span className={month.net >= 0 ? 'profit-bar' : 'loss-bar'} style={{ height: `${Math.max(7, (Math.abs(month.net) / monthlyMax) * 100)}%` }} title="Lucro" />
                    </div>
                    <strong>{month.month.slice(5, 7)}/{month.month.slice(0, 4)}</strong>
                    <small>{formatCurrency(month.net)}</small>
                  </div>
                ))}
              </div>
            )}
            <div className="legend-row">
              <span><i className="income-dot" />Entradas</span>
              <span><i className="expense-dot" />Saidas</span>
              <span><i className="profit-dot" />Lucro</span>
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <span>Periodo selecionado</span>
                <h2>Comparativo</h2>
              </div>
              <BarChart3 className="accent-icon" />
            </div>
            <div className="bar-chart">
              <div>
                <span style={{ height: `${Math.max(8, (totals.income / maxBar) * 100)}%` }} className="income-bar" />
                <b>{formatCurrency(totals.income)}</b>
                <small>Entradas</small>
              </div>
              <div>
                <span style={{ height: `${Math.max(8, (totals.expense / maxBar) * 100)}%` }} className="expense-bar" />
                <b>{formatCurrency(totals.expense)}</b>
                <small>Saidas</small>
              </div>
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <span>Evolucao mensal</span>
                <h2>Lucro por mes</h2>
              </div>
              <LineChart className="accent-icon" />
            </div>
            {monthlyData.length === 0 ? (
              <EmptyState title="Sem dados suficientes" text="A evolucao aparece assim que houver movimentacoes." />
            ) : (
              <div className="line-chart">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Evolucao mensal de lucro">
                  <polyline points={linePoints} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  {lineDots.map((dot, index) => <circle key={`${dot.x}-${index}`} cx={dot.x} cy={dot.y} r="2.8" fill="currentColor" />)}
                </svg>
                <div className="chart-labels">
                  <span>{monthlyData[0]?.label}</span>
                  <span>{monthlyData.at(-1)?.label}</span>
                </div>
              </div>
            )}
          </article>

          <article className="panel summary-panel">
            <div className="panel-heading">
              <div>
                <span>Analise geral</span>
                <h2>Indicadores</h2>
              </div>
            </div>
            <dl>
              <div><dt>Entradas</dt><dd>{formatCurrency(totals.income)}</dd></div>
              <div><dt>Saidas</dt><dd>{formatCurrency(totals.expense)}</dd></div>
              <div><dt>Lucro liquido</dt><dd className={netTone}>{formatCurrency(totals.net)}</dd></div>
              <div><dt>Media mensal</dt><dd>{formatCurrency(monthlyAverage)}</dd></div>
              <div><dt>Total acumulado</dt><dd className={totalAccumulated >= 0 ? 'positive' : 'negative'}>{formatCurrency(totalAccumulated)}</dd></div>
            </dl>
          </article>

          <article className="panel ranking-panel">
            <div className="panel-heading">
              <div>
                <span>Melhor para pior</span>
                <h2>Ranking de meses</h2>
              </div>
              <Trophy className="accent-icon" />
            </div>
            {rankedMonths.length === 0 ? (
              <EmptyState title="Ranking vazio" text="Os meses aparecem aqui conforme as movimentacoes forem cadastradas." />
            ) : (
              <ol className="ranking-list">
                {rankedMonths.map((month, index) => (
                  <li key={month.month}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{month.label}</strong>
                      <small>{month.count} movimentacoes</small>
                    </div>
                    <b className={month.net >= 0 ? 'positive' : 'negative'}>{formatCurrency(month.net)}</b>
                  </li>
                ))}
              </ol>
            )}
          </article>
        </section>
      </main>

      {mobileNavOpen && <button className="nav-scrim" aria-label="Fechar menu" onClick={() => setMobileNavOpen(false)} />}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
