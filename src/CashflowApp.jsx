import React, { useState, useMemo } from "react";
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  ComposedChart,
} from "recharts";
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Target,
  Wallet,
  CreditCard,
  Sparkles,
  ArrowRight,
} from "lucide-react";

// --- Date utilities -------------------------------------------------------
const toKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const fromKey = (s) => {
  if (!s) return new Date();
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmtMoney = (n) =>
  (n < 0 ? "-$" : "$") +
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtMoneyDetailed = (n) =>
  (n < 0 ? "-$" : "$") +
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMonth = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
};
const fmtDate = (d) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// --- Demo data ------------------------------------------------------------
const todayKey = toKey(new Date());
const SAMPLE_INCOME = [
  { id: 1, partner: "Partner A", name: "Salary", amount: 2200, frequency: "Biweekly (Friday)", start: todayKey },
  { id: 2, partner: "Partner B", name: "Salary", amount: 1850, frequency: "Semi-monthly", start: todayKey },
  { id: 3, partner: "Partner A", name: "Freelance", amount: 600, frequency: "Monthly", start: todayKey },
];
const SAMPLE_EXPENSES = [
  { id: 1, name: "Rent", amount: 2100, due: "1", note: "" },
  { id: 2, name: "Groceries", amount: 180, due: "Weekly", note: "" },
  { id: 3, name: "Utilities", amount: 220, due: "15", note: "" },
  { id: 4, name: "Internet", amount: 75, due: "20", note: "" },
  { id: 5, name: "Phones", amount: 110, due: "5", note: "" },
  { id: 6, name: "Car insurance", amount: 165, due: "12", note: "" },
  { id: 7, name: "Streaming", amount: 45, due: "8", note: "" },
];
const SAMPLE_ACCOUNTS = [
  { id: 1, name: "Joint chequing", balance: 4200 },
  { id: 2, name: "Savings", balance: 6500 },
];
const SAMPLE_DEBTS = [
  { id: 1, name: "Credit card", balance: 3400, apr: 19.99, minPayment: 250, paymentDay: "18" },
  { id: 2, name: "Car loan", balance: 12800, apr: 5.9, minPayment: 380, paymentDay: "1" },
];

const FREQS = ["Biweekly (Friday)", "Semi-monthly", "Monthly", "Weekly", "One-time"];

// --- Projection engine ----------------------------------------------------
function projectDaily(income, expenses, accounts, debts, startDate, endDate) {
  const incomeMap = {};
  const expenseMap = {};

  // Income recurrence (mirrors generateProjections.gs)
  income.forEach(({ amount, frequency, start }) => {
    if (!amount || !start) return;
    let date = fromKey(start);
    const amt = parseFloat(amount);
    if (isNaN(amt)) return;
    let safety = 0;
    while (date <= endDate && safety < 5000) {
      if (date >= startDate) {
        incomeMap[toKey(date)] = (incomeMap[toKey(date)] || 0) + amt;
      }
      if (frequency === "Biweekly (Friday)") date.setDate(date.getDate() + 14);
      else if (frequency === "Semi-monthly") {
        if (date.getDate() === 1) date.setDate(15);
        else {
          date.setMonth(date.getMonth() + 1);
          date.setDate(1);
        }
      } else if (frequency === "Monthly") date.setMonth(date.getMonth() + 1);
      else if (frequency === "Weekly") date.setDate(date.getDate() + 7);
      else break;
      safety++;
    }
  });

  // Expense recurrence
  expenses.forEach(({ amount, due, note }) => {
    const amt = parseFloat(amount);
    if (!amt || isNaN(amt)) return;
    if (note === "One-time") {
      const d = fromKey(due);
      if (d >= startDate && d <= endDate) {
        expenseMap[toKey(d)] = (expenseMap[toKey(d)] || 0) + amt;
      }
    } else if (due === "Weekly") {
      let date = new Date(startDate);
      let safety = 0;
      while (date <= endDate && safety < 5000) {
        expenseMap[toKey(date)] = (expenseMap[toKey(date)] || 0) + amt;
        date.setDate(date.getDate() + 7);
        safety++;
      }
    } else {
      const dueDay = parseInt(due);
      if (isNaN(dueDay)) return;
      let temp = new Date(startDate);
      let safety = 0;
      while (temp <= endDate && safety < 100) {
        const expenseDate = new Date(temp.getFullYear(), temp.getMonth(), dueDay);
        if (expenseDate >= startDate && expenseDate <= endDate) {
          expenseMap[toKey(expenseDate)] = (expenseMap[toKey(expenseDate)] || 0) + amt;
        }
        temp.setMonth(temp.getMonth() + 1);
        safety++;
      }
    }
  });

  // Debt schedule: monthly interest accrual, min payment on paymentDay,
  // stop scheduling once paid off. Payments become expenses on the chart.
  const debtTimelines = [];
  debts.forEach((debt) => {
    const min = parseFloat(debt.minPayment) || 0;
    const aprPct = parseFloat(debt.apr) || 0;
    const monthlyRate = aprPct / 100 / 12;
    const payDay = parseInt(debt.paymentDay);
    const startBal = parseFloat(debt.balance) || 0;
    if (!min || isNaN(payDay) || startBal <= 0) {
      debtTimelines.push({ name: debt.name, payoffDate: null, totalPaid: 0, totalInterest: 0, startBalance: startBal, currentBalance: startBal });
      return;
    }
    let bal = startBal;
    let totalPaid = 0;
    let totalInterest = 0;
    let payoffDate = null;
    let temp = new Date(startDate);
    temp.setDate(1);
    let safety = 0;
    while (temp <= endDate && bal > 0 && safety < 600) {
      const interest = bal * monthlyRate;
      bal += interest;
      totalInterest += interest;
      const payDate = new Date(temp.getFullYear(), temp.getMonth(), payDay);
      if (payDate >= startDate && payDate <= endDate) {
        const payment = Math.min(min, bal);
        bal -= payment;
        totalPaid += payment;
        const k = toKey(payDate);
        expenseMap[k] = (expenseMap[k] || 0) + payment;
        if (bal <= 0.01) {
          bal = 0;
          payoffDate = payDate;
          break;
        }
      }
      temp.setMonth(temp.getMonth() + 1);
      safety++;
    }
    debtTimelines.push({ name: debt.name, payoffDate, totalPaid, totalInterest, startBalance: startBal, currentBalance: bal });
  });

  const startingBalance = accounts.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
  const totalDebt = debts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0);

  const allDates = new Set([...Object.keys(incomeMap), ...Object.keys(expenseMap)]);
  const sorted = Array.from(allDates).sort();

  let running = startingBalance;
  const rows = sorted.map((k) => {
    const inc = incomeMap[k] || 0;
    const exp = expenseMap[k] || 0;
    const net = inc - exp;
    running += net;
    return { date: k, dateObj: fromKey(k), income: inc, expense: exp, net, balance: running };
  });

  return { rows, startingBalance, totalDebt, debtTimelines };
}

function monthlySummary(rows, startingBalance) {
  if (!rows.length) return [];
  const map = {};
  let prevEnd = startingBalance;
  rows.forEach((r) => {
    const ym = r.date.slice(0, 7);
    if (!map[ym]) {
      map[ym] = {
        month: ym,
        startingBalance: prevEnd,
        endingBalance: prevEnd,
        totalIncome: 0,
        totalExpense: 0,
      };
    }
    map[ym].totalIncome += r.income;
    map[ym].totalExpense += r.expense;
    map[ym].endingBalance = r.balance;
    prevEnd = r.balance;
  });
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

// --- Design tokens --------------------------------------------------------
const accent = "#c2410c";
const ink = "#1a1614";
const paper = "#f4efe6";
const green = "#15803d";
const red = "#b91c1c";

// --- UI atoms -------------------------------------------------------------
function SectionTitle({ kicker, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {kicker && (
        <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: accent, marginBottom: 6 }}>
          {kicker}
        </div>
      )}
      <h2 style={{ fontFamily: "'Fraunces', 'Playfair Display', Georgia, serif", fontWeight: 500, fontSize: 28, letterSpacing: "-0.02em", lineHeight: 1.05, margin: 0, color: ink }}>
        {children}
      </h2>
    </div>
  );
}

function NumberStat({ label, value, sub, tone }) {
  const color = tone === "good" ? green : tone === "bad" ? red : ink;
  return (
    <div style={{ borderTop: `1px solid ${ink}`, paddingTop: 10 }}>
      <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#5b544d", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#5b544d", marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function InputCell({ value, onChange, type = "text", placeholder }) {
  return (
    <input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      placeholder={placeholder}
      style={{
        background: "transparent",
        border: "none",
        borderBottom: `1px solid #c9c1b3`,
        padding: "4px 2px",
        fontFamily: type === "number" || placeholder === "YYYY-MM-DD" ? "'JetBrains Mono', monospace" : "'Fraunces', Georgia, serif",
        fontSize: 14,
        color: ink,
        width: "100%",
        outline: "none",
      }}
      onFocus={(e) => (e.target.style.borderBottomColor = accent)}
      onBlur={(e) => (e.target.style.borderBottomColor = "#c9c1b3")}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ background: "transparent", border: "none", borderBottom: `1px solid #c9c1b3`, padding: "4px 2px", fontFamily: "'Fraunces', Georgia, serif", fontSize: 14, color: ink, width: "100%", outline: "none", appearance: "none", cursor: "pointer" }}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function IconBtn({ onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ background: "transparent", border: "none", cursor: "pointer", color: "#7a716a", padding: 4, display: "flex", alignItems: "center" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = accent)}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#7a716a")}
    >
      {children}
    </button>
  );
}

function AddRowBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{ background: "transparent", border: `1px dashed ${ink}`, padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: ink, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12 }}
      onMouseEnter={(e) => { e.currentTarget.style.background = ink; e.currentTarget.style.color = paper; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ink; }}
    >
      <Plus size={14} /> {children}
    </button>
  );
}

const COL_STYLE = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#7a716a",
  paddingBottom: 8,
  textAlign: "left",
  fontWeight: 400,
};
const numCell = { fontFamily: "'JetBrains Mono', monospace", fontSize: 13, padding: "12px 0", textAlign: "right", color: ink };
const tdStyle = { padding: "10px 12px 10px 0", verticalAlign: "middle" };

// --- Welcome screen -------------------------------------------------------
function Welcome({ onLoadSample, onStartFresh }) {
  return (
    <div style={{ minHeight: "100vh", background: paper, color: ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=JetBrains+Mono:wght@400;500&display=swap" />
      <div style={{ maxWidth: 720, width: "100%" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: accent, marginBottom: 16 }}>
          Household Ledger · Edition 01
        </div>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 72, fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 0.95, margin: 0 }}>
          <span style={{ fontStyle: "italic" }}>Cashflow</span><br />
          <span style={{ fontWeight: 400 }}>&amp;</span> Forecast
        </h1>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, lineHeight: 1.5, marginTop: 28, marginBottom: 36, color: "#3a342f", maxWidth: 540 }}>
          A clear-eyed look at where your money goes — and when you'll be able to afford the next thing. Enter your income, expenses, accounts, and debts. The chart and projections build themselves.
        </p>

        <div style={{ borderTop: `1px solid ${ink}`, borderBottom: `1px solid ${ink}`, padding: "24px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <button
            onClick={onStartFresh}
            style={{ background: ink, color: paper, border: `1px solid ${ink}`, padding: "22px 24px", fontFamily: "'Fraunces', serif", fontSize: 22, fontStyle: "italic", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 8 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#000")}
            onMouseLeave={(e) => (e.currentTarget.style.background = ink)}
          >
            <span>Start fresh</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontStyle: "normal", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a8a09a", display: "flex", alignItems: "center", gap: 6 }}>
              Enter your own numbers <ArrowRight size={12} />
            </span>
          </button>
          <button
            onClick={onLoadSample}
            style={{ background: "transparent", color: ink, border: `1px solid ${ink}`, padding: "22px 24px", fontFamily: "'Fraunces', serif", fontSize: 22, fontStyle: "italic", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 8 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = ink; e.currentTarget.style.color = paper; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ink; }}
          >
            <span>See a sample</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontStyle: "normal", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "currentColor", opacity: 0.7, display: "flex", alignItems: "center", gap: 6 }}>
              Two-partner household demo <Sparkles size={12} />
            </span>
          </button>
        </div>

        <div style={{ marginTop: 24, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7a716a" }}>
          Data stays in your browser · Nothing is sent anywhere
        </div>
      </div>
    </div>
  );
}

// --- Main app -------------------------------------------------------------
export default function CashflowApp() {
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [debts, setDebts] = useState([]);
  const [horizon, setHorizon] = useState(18);
  const [goalAmount, setGoalAmount] = useState("");
  const [goalLabel, setGoalLabel] = useState("Down payment");
  const [hasStarted, setHasStarted] = useState(false);

  const startDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const endDate = useMemo(() => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + horizon);
    return d;
  }, [startDate, horizon]);

  const { rows, startingBalance, totalDebt, debtTimelines } = useMemo(
    () => projectDaily(income, expenses, accounts, debts, startDate, endDate),
    [income, expenses, accounts, debts, startDate, endDate]
  );

  const months = useMemo(() => monthlySummary(rows, startingBalance), [rows, startingBalance]);

  const chartData = useMemo(() => {
    if (!rows.length) return [];
    const data = [{ date: toKey(startDate), ts: startDate.getTime(), balance: startingBalance, income: 0, expense: 0 }];
    rows.forEach((r) => {
      data.push({ date: r.date, ts: r.dateObj.getTime(), balance: r.balance, income: r.income, expense: r.expense });
    });
    return data;
  }, [rows, startDate, startingBalance]);

  const goalHit = useMemo(() => {
    if (!goalAmount) return null;
    const goal = parseFloat(goalAmount);
    if (isNaN(goal)) return null;
    if (startingBalance >= goal) return { hit: true, immediate: true };
    const row = rows.find((r) => r.balance >= goal);
    if (!row) return { hit: false };
    return { hit: true, date: row.dateObj, balance: row.balance };
  }, [rows, goalAmount, startingBalance]);

  const stats = useMemo(() => {
    if (!rows.length) return { endBal: startingBalance, lowBal: startingBalance, monthlyIn: 0, monthlyOut: 0 };
    const endBal = rows[rows.length - 1].balance;
    const lowBal = Math.min(...rows.map((r) => r.balance), startingBalance);
    const monthCount = Math.max(1, months.length);
    const monthlyIn = months.reduce((s, m) => s + m.totalIncome, 0) / monthCount;
    const monthlyOut = months.reduce((s, m) => s + m.totalExpense, 0) / monthCount;
    return { endBal, lowBal, monthlyIn, monthlyOut };
  }, [rows, months, startingBalance]);

  const monthTicks = useMemo(() => {
    const ticks = [];
    const d = new Date(startDate);
    d.setDate(1);
    for (let i = 0; i <= horizon; i++) {
      ticks.push(d.getTime());
      d.setMonth(d.getMonth() + 1);
    }
    return ticks;
  }, [startDate, horizon]);

  // CRUD
  const updateIncome = (id, k, v) => setIncome((a) => a.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const addIncome = () => setIncome((a) => [...a, { id: Date.now(), partner: "Partner A", name: "", amount: "", frequency: "Biweekly (Friday)", start: toKey(startDate) }]);
  const delIncome = (id) => setIncome((a) => a.filter((r) => r.id !== id));

  const updateExpense = (id, k, v) => setExpenses((a) => a.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const addExpense = () => setExpenses((a) => [...a, { id: Date.now(), name: "", amount: "", due: "1", note: "" }]);
  const delExpense = (id) => setExpenses((a) => a.filter((r) => r.id !== id));

  const updateAccount = (id, k, v) => setAccounts((a) => a.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const addAccount = () => setAccounts((a) => [...a, { id: Date.now(), name: "", balance: "" }]);
  const delAccount = (id) => setAccounts((a) => a.filter((r) => r.id !== id));

  const updateDebt = (id, k, v) => setDebts((a) => a.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const addDebt = () => setDebts((a) => [...a, { id: Date.now(), name: "", balance: "", apr: "", minPayment: "", paymentDay: "1" }]);
  const delDebt = (id) => setDebts((a) => a.filter((r) => r.id !== id));

  const loadSample = () => {
    setIncome(SAMPLE_INCOME);
    setExpenses(SAMPLE_EXPENSES);
    setAccounts(SAMPLE_ACCOUNTS);
    setDebts(SAMPLE_DEBTS);
    setGoalAmount(15000);
    setHasStarted(true);
  };
  const startFresh = () => setHasStarted(true);
  const resetAll = () => {
    setIncome([]); setExpenses([]); setAccounts([]); setDebts([]);
    setGoalAmount(""); setGoalLabel("Down payment");
    setHasStarted(false);
  };

  if (!hasStarted) {
    return <Welcome onLoadSample={loadSample} onStartFresh={startFresh} />;
  }

  const hasInputs = income.length > 0 || expenses.length > 0 || accounts.length > 0 || debts.length > 0;
  const hasEnoughToProject = rows.length > 0 || accounts.length > 0 || debts.length > 0;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0].payload;
    return (
      <div style={{ background: paper, border: `1px solid ${ink}`, padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: ink, boxShadow: "4px 4px 0 rgba(26,22,20,0.15)" }}>
        <div style={{ marginBottom: 6, letterSpacing: "0.08em" }}>{fmtDate(fromKey(p.date))}</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500 }}>{fmtMoneyDetailed(p.balance)}</div>
        {(p.income > 0 || p.expense > 0) && (
          <div style={{ marginTop: 6, fontSize: 10, color: "#5b544d" }}>
            {p.income > 0 && <span style={{ color: green }}>+{fmtMoney(p.income)} in </span>}
            {p.expense > 0 && <span style={{ color: red }}>−{fmtMoney(p.expense)} out</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: paper, minHeight: "100vh", color: ink, fontFamily: "'Fraunces', Georgia, serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=JetBrains+Mono:wght@400;500&display=swap" />

      {/* Masthead */}
      <header style={{ borderBottom: `2px solid ${ink}`, padding: "32px 48px 20px", background: paper }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: accent, marginBottom: 4 }}>
              Household Ledger · Edition 01
            </div>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 56, fontWeight: 500, letterSpacing: "-0.035em", lineHeight: 1, margin: 0, fontStyle: "italic" }}>
              Cashflow <span style={{ fontStyle: "normal", fontWeight: 400 }}>&amp;</span> Forecast
            </h1>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#5b544d", textAlign: "right" }}>
              <div>{fmtDate(startDate).toUpperCase()}</div>
              <div style={{ marginTop: 2 }}>PROJECTING {horizon} MONTHS · THRU {fmtDate(endDate).toUpperCase()}</div>
            </div>
            <button
              onClick={resetAll}
              style={{ background: "transparent", border: `1px solid ${ink}`, padding: "6px 10px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: ink, cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = ink; e.currentTarget.style.color = paper; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ink; }}
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      <main style={{ padding: "32px 48px 64px", maxWidth: 1400, margin: "0 auto" }}>

        {/* Empty-state coaching */}
        {!hasInputs && (
          <section style={{ border: `1px dashed ${ink}`, padding: "32px 36px", marginBottom: 40, background: "rgba(194,65,12,0.04)" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>
              Get started
            </div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2 }}>
              Add at least one <span style={{ fontStyle: "italic" }}>account</span>, one <span style={{ fontStyle: "italic" }}>income</span>, and one <span style={{ fontStyle: "italic" }}>expense</span>. The chart and forecast appear as soon as there's something to project.
            </h2>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#5b544d", marginTop: 14, letterSpacing: "0.04em" }}>
              Scroll down to the inputs · or
              <button onClick={loadSample} style={{ background: "transparent", border: "none", color: accent, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: "0 4px", marginLeft: 4 }}>
                load a sample household
              </button>
              to see how it works.
            </div>
          </section>
        )}

        {/* Forecast section (only when there's something) */}
        {hasEnoughToProject && (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, marginBottom: 40 }}>
              <NumberStat label="Starting Balance" value={fmtMoney(startingBalance)} sub={`across ${accounts.length} account${accounts.length === 1 ? "" : "s"}`} />
              <NumberStat
                label={`Ending · ${fmtMonth(toKey(endDate).slice(0, 7))}`}
                value={fmtMoney(stats.endBal)}
                tone={stats.endBal >= startingBalance ? "good" : "bad"}
                sub={stats.endBal >= startingBalance ? `+${fmtMoney(stats.endBal - startingBalance)} net` : `${fmtMoney(stats.endBal - startingBalance)} net`}
              />
              <NumberStat
                label="Avg Monthly In · Out"
                value={fmtMoney(stats.monthlyIn - stats.monthlyOut)}
                tone={stats.monthlyIn - stats.monthlyOut >= 0 ? "good" : "bad"}
                sub={`${fmtMoney(stats.monthlyIn)} − ${fmtMoney(stats.monthlyOut)}`}
              />
              <NumberStat
                label="Total Debt"
                value={fmtMoney(totalDebt)}
                tone={totalDebt > 0 ? "bad" : undefined}
                sub={debts.length === 0 ? "No debts tracked" : `${debts.length} account${debts.length === 1 ? "" : "s"}`}
              />
            </section>

            {rows.length > 0 && (
              <section style={{ border: `1px solid ${ink}`, background: "#faf6ed", padding: "24px 24px 16px", marginBottom: 48 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                  <SectionTitle kicker="Section I · The Forecast">
                    <span style={{ fontStyle: "italic" }}>Daily</span> running balance
                  </SectionTitle>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#5b544d" }}>Horizon</span>
                    {[6, 12, 18, 24, 36].map((m) => (
                      <button
                        key={m}
                        onClick={() => setHorizon(m)}
                        style={{ background: horizon === m ? ink : "transparent", color: horizon === m ? paper : ink, border: `1px solid ${ink}`, padding: "5px 10px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, cursor: "pointer" }}
                      >
                        {m}mo
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ width: "100%", height: 360 }}>
                  <ResponsiveContainer>
                    <ComposedChart data={chartData} margin={{ top: 10, right: 24, bottom: 10, left: 8 }}>
                      <defs>
                        <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={accent} stopOpacity={0.18} />
                          <stop offset="100%" stopColor={accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#d9d1c1" strokeDasharray="2 4" vertical={false} />
                      <XAxis
                        dataKey="ts"
                        type="number"
                        scale="time"
                        domain={["dataMin", "dataMax"]}
                        ticks={monthTicks}
                        tickFormatter={(t) => new Date(t).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                        tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: "#5b544d" }}
                        stroke={ink}
                        tickLine={false}
                      />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: "#5b544d" }} stroke={ink} tickLine={false} width={48} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: ink, strokeDasharray: "3 3" }} />
                      <ReferenceLine y={0} stroke={red} strokeDasharray="4 4" />
                      {goalAmount && !isNaN(parseFloat(goalAmount)) && (
                        <ReferenceLine y={parseFloat(goalAmount)} stroke={accent} strokeDasharray="2 6"
                          label={{ value: `${goalLabel || "Goal"}: ${fmtMoney(parseFloat(goalAmount))}`, position: "insideTopRight", fill: accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }} />
                      )}
                      <Area type="monotone" dataKey="balance" stroke="none" fill="url(#balFill)" isAnimationActive={false} />
                      <Line type="monotone" dataKey="balance" stroke={ink} strokeWidth={1.75} dot={false} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Goal calculator */}
            {rows.length > 0 && (
              <section style={{ border: `1px solid ${ink}`, background: ink, color: paper, padding: "28px 32px", marginBottom: 48, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>
                    <Target size={11} style={{ display: "inline", marginRight: 6, verticalAlign: -1 }} /> The Question
                  </div>
                  <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1, fontStyle: "italic" }}>
                    When can we afford
                  </h2>
                  <div style={{ display: "flex", gap: 16, marginTop: 16, alignItems: "baseline", flexWrap: "wrap" }}>
                    <input value={goalLabel} onChange={(e) => setGoalLabel(e.target.value)} placeholder="What for?"
                      style={{ background: "transparent", border: "none", borderBottom: `1px solid #7a716a`, padding: "4px 2px", fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontSize: 24, color: paper, outline: "none", width: 180 }} />
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24 }}>at</span>
                    <input value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} type="number" placeholder="0"
                      style={{ background: "transparent", border: "none", borderBottom: `1px solid #7a716a`, padding: "4px 2px", fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color: paper, outline: "none", width: 140 }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, color: "#a8a09a" }}>?</span>
                  </div>
                </div>
                <div>
                  {!goalAmount || isNaN(parseFloat(goalAmount)) ? (
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", color: "#a8a09a", fontSize: 13 }}>Enter a goal amount to see when you'll cross it.</div>
                  ) : goalHit?.immediate ? (
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: green, marginBottom: 6 }}>Already there</div>
                      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontStyle: "italic" }}>You have it now.</div>
                    </div>
                  ) : goalHit?.hit ? (
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: accent, marginBottom: 6 }}>Projected to cross goal</div>
                      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 40, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1 }}>{fmtDate(goalHit.date)}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#a8a09a", marginTop: 8 }}>
                        Balance hits {fmtMoney(goalHit.balance)} · {Math.ceil((goalHit.date - startDate) / (1000 * 60 * 60 * 24 * 30.44))} months out
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: red, marginBottom: 6 }}>Not within horizon</div>
                      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontStyle: "italic", lineHeight: 1.2 }}>Won't reach {fmtMoney(parseFloat(goalAmount))} in the next {horizon} months.</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#a8a09a", marginTop: 8 }}>Try extending the horizon, trimming expenses, or raising income.</div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Debt payoff */}
            {debts.length > 0 && (
              <section style={{ marginBottom: 48 }}>
                <SectionTitle kicker="Section II · Debt Payoff">
                  The <span style={{ fontStyle: "italic" }}>climb out</span>
                </SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))`, gap: 24, marginTop: 16 }}>
                  {debtTimelines.map((dt, i) => (
                    <div key={i} style={{ border: `1px solid ${ink}`, padding: "18px 20px", background: "#faf6ed" }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7a716a", marginBottom: 6 }}>{dt.name || "Untitled debt"}</div>
                      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 14, color: "#5b544d", marginBottom: 4 }}>
                        Starting at <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: ink }}>{fmtMoney(dt.startBalance)}</span>
                      </div>
                      {dt.startBalance <= 0 ? (
                        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "#7a716a", marginTop: 8 }}>No balance yet.</div>
                      ) : dt.payoffDate ? (
                        <>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: green, marginTop: 12, marginBottom: 4 }}>Paid off</div>
                          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1 }}>{fmtDate(dt.payoffDate)}</div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#5b544d", marginTop: 8 }}>
                            {fmtMoney(dt.totalPaid)} paid · {fmtMoney(dt.totalInterest)} interest
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: red, marginTop: 12, marginBottom: 4 }}>Not paid off in horizon</div>
                          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontStyle: "italic", lineHeight: 1.2 }}>
                            Still owe {fmtMoney(dt.currentBalance)} after {horizon} months
                          </div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#5b544d", marginTop: 8 }}>Try a higher minimum payment or longer horizon.</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Monthly breakdown */}
            {months.length > 0 && (
              <section style={{ marginBottom: 48 }}>
                <SectionTitle kicker={debts.length > 0 ? "Section III · Month by Month" : "Section II · Month by Month"}>
                  The <span style={{ fontStyle: "italic" }}>ledger</span>
                </SectionTitle>
                <div style={{ overflowX: "auto", borderTop: `1px solid ${ink}`, marginTop: 8 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${ink}` }}>
                        <th style={{ ...COL_STYLE, paddingTop: 10 }}>Month</th>
                        <th style={{ ...COL_STYLE, paddingTop: 10, textAlign: "right" }}>Start</th>
                        <th style={{ ...COL_STYLE, paddingTop: 10, textAlign: "right" }}>Income</th>
                        <th style={{ ...COL_STYLE, paddingTop: 10, textAlign: "right" }}>Expenses</th>
                        <th style={{ ...COL_STYLE, paddingTop: 10, textAlign: "right" }}>Net</th>
                        <th style={{ ...COL_STYLE, paddingTop: 10, textAlign: "right" }}>End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map((m, i) => {
                        const net = m.totalIncome - m.totalExpense;
                        return (
                          <tr key={m.month} style={{ borderBottom: `1px solid #d9d1c1`, background: i % 2 === 1 ? "rgba(26,22,20,0.025)" : "transparent" }}>
                            <td style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontStyle: "italic", padding: "12px 8px 12px 0" }}>{fmtMonth(m.month)}</td>
                            <td style={numCell}>{fmtMoney(m.startingBalance)}</td>
                            <td style={{ ...numCell, color: green }}>+{fmtMoney(m.totalIncome)}</td>
                            <td style={{ ...numCell, color: red }}>−{fmtMoney(m.totalExpense)}</td>
                            <td style={{ ...numCell, color: net >= 0 ? green : red, fontWeight: 500 }}>{net >= 0 ? "+" : ""}{fmtMoney(net)}</td>
                            <td style={{ ...numCell, fontWeight: 500 }}>{fmtMoney(m.endingBalance)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {/* Editors --- always visible */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 40 }}>
          {/* Income */}
          <div>
            <SectionTitle kicker={hasEnoughToProject ? "Inputs" : "Section I · Inputs"}>
              <TrendingUp size={22} style={{ display: "inline", marginRight: 8, verticalAlign: -3, color: green }} /> Income
            </SectionTitle>
            {income.length === 0 ? (
              <div style={{ borderTop: `1px solid ${ink}`, padding: "14px 0", fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "#7a716a", fontSize: 14 }}>
                No income yet. Add your paychecks, freelance, or any recurring income.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${ink}` }}>
                    <th style={{ ...COL_STYLE, width: "20%" }}>Partner</th>
                    <th style={{ ...COL_STYLE, width: "26%" }}>Source</th>
                    <th style={{ ...COL_STYLE, width: "16%" }}>Amount</th>
                    <th style={{ ...COL_STYLE, width: "26%" }}>Frequency</th>
                    <th style={{ ...COL_STYLE, width: "14%" }}>Start</th>
                    <th style={{ ...COL_STYLE, width: "20px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {income.map((r) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid #e8e0d1` }}>
                      <td style={tdStyle}><InputCell value={r.partner} onChange={(v) => updateIncome(r.id, "partner", v)} /></td>
                      <td style={tdStyle}><InputCell value={r.name} onChange={(v) => updateIncome(r.id, "name", v)} placeholder="Salary" /></td>
                      <td style={tdStyle}><InputCell type="number" value={r.amount} onChange={(v) => updateIncome(r.id, "amount", v)} placeholder="0" /></td>
                      <td style={tdStyle}><Select value={r.frequency} onChange={(v) => updateIncome(r.id, "frequency", v)} options={FREQS} /></td>
                      <td style={tdStyle}><InputCell value={r.start} onChange={(v) => updateIncome(r.id, "start", v)} placeholder="YYYY-MM-DD" /></td>
                      <td style={tdStyle}><IconBtn onClick={() => delIncome(r.id)} title="Remove"><Trash2 size={14} /></IconBtn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <AddRowBtn onClick={addIncome}>Add Income</AddRowBtn>
          </div>

          {/* Expenses */}
          <div>
            <SectionTitle kicker="">
              <TrendingDown size={22} style={{ display: "inline", marginRight: 8, verticalAlign: -3, color: red }} /> Expenses
            </SectionTitle>
            {expenses.length === 0 ? (
              <div style={{ borderTop: `1px solid ${ink}`, padding: "14px 0", fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "#7a716a", fontSize: 14 }}>
                No expenses yet. Rent, groceries, subscriptions — anything that leaves the account.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${ink}` }}>
                    <th style={{ ...COL_STYLE, width: "34%" }}>Name</th>
                    <th style={{ ...COL_STYLE, width: "20%" }}>Amount</th>
                    <th style={{ ...COL_STYLE, width: "22%" }}>Due</th>
                    <th style={{ ...COL_STYLE, width: "18%" }}>Note</th>
                    <th style={{ ...COL_STYLE, width: "20px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((r) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid #e8e0d1` }}>
                      <td style={tdStyle}><InputCell value={r.name} onChange={(v) => updateExpense(r.id, "name", v)} placeholder="Rent" /></td>
                      <td style={tdStyle}><InputCell type="number" value={r.amount} onChange={(v) => updateExpense(r.id, "amount", v)} placeholder="0" /></td>
                      <td style={tdStyle}><InputCell value={r.due} onChange={(v) => updateExpense(r.id, "due", v)} placeholder="1, Weekly, or date" /></td>
                      <td style={tdStyle}>
                        <Select value={r.note || "Recurring"} onChange={(v) => updateExpense(r.id, "note", v === "Recurring" ? "" : v)} options={["Recurring", "One-time"]} />
                      </td>
                      <td style={tdStyle}><IconBtn onClick={() => delExpense(r.id)} title="Remove"><Trash2 size={14} /></IconBtn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <AddRowBtn onClick={addExpense}>Add Expense</AddRowBtn>
          </div>
        </section>

        {/* Accounts + Debts */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 40 }}>
          {/* Accounts */}
          <div>
            <SectionTitle kicker="">
              <Wallet size={20} style={{ display: "inline", marginRight: 8, verticalAlign: -3 }} /> Starting balances
            </SectionTitle>
            {accounts.length === 0 ? (
              <div style={{ borderTop: `1px solid ${ink}`, padding: "14px 0", fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "#7a716a", fontSize: 14 }}>
                No accounts yet. Add chequing, savings, etc — what you have right now.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${ink}` }}>
                    <th style={{ ...COL_STYLE, width: "65%" }}>Account</th>
                    <th style={{ ...COL_STYLE, width: "30%", textAlign: "right" }}>Balance</th>
                    <th style={{ ...COL_STYLE, width: "20px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((r) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid #e8e0d1` }}>
                      <td style={tdStyle}><InputCell value={r.name} onChange={(v) => updateAccount(r.id, "name", v)} placeholder="Chequing" /></td>
                      <td style={{ ...tdStyle, textAlign: "right" }}><InputCell type="number" value={r.balance} onChange={(v) => updateAccount(r.id, "balance", v)} placeholder="0" /></td>
                      <td style={tdStyle}><IconBtn onClick={() => delAccount(r.id)} title="Remove"><Trash2 size={14} /></IconBtn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <AddRowBtn onClick={addAccount}>Add Account</AddRowBtn>
          </div>

          {/* Debts */}
          <div>
            <SectionTitle kicker="">
              <CreditCard size={20} style={{ display: "inline", marginRight: 8, verticalAlign: -3, color: red }} /> Debts
            </SectionTitle>
            {debts.length === 0 ? (
              <div style={{ borderTop: `1px solid ${ink}`, padding: "14px 0", fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "#7a716a", fontSize: 14 }}>
                No debts. Credit cards, loans, student debt — anything with an APR.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${ink}` }}>
                    <th style={{ ...COL_STYLE, width: "26%" }}>Debt</th>
                    <th style={{ ...COL_STYLE, width: "18%" }}>Balance</th>
                    <th style={{ ...COL_STYLE, width: "14%" }}>APR %</th>
                    <th style={{ ...COL_STYLE, width: "18%" }}>Min / mo</th>
                    <th style={{ ...COL_STYLE, width: "14%" }}>Pay day</th>
                    <th style={{ ...COL_STYLE, width: "20px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map((r) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid #e8e0d1` }}>
                      <td style={tdStyle}><InputCell value={r.name} onChange={(v) => updateDebt(r.id, "name", v)} placeholder="Credit card" /></td>
                      <td style={tdStyle}><InputCell type="number" value={r.balance} onChange={(v) => updateDebt(r.id, "balance", v)} placeholder="0" /></td>
                      <td style={tdStyle}><InputCell type="number" value={r.apr} onChange={(v) => updateDebt(r.id, "apr", v)} placeholder="0" /></td>
                      <td style={tdStyle}><InputCell type="number" value={r.minPayment} onChange={(v) => updateDebt(r.id, "minPayment", v)} placeholder="0" /></td>
                      <td style={tdStyle}><InputCell value={r.paymentDay} onChange={(v) => updateDebt(r.id, "paymentDay", v)} placeholder="1" /></td>
                      <td style={tdStyle}><IconBtn onClick={() => delDebt(r.id)} title="Remove"><Trash2 size={14} /></IconBtn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <AddRowBtn onClick={addDebt}>Add Debt</AddRowBtn>
          </div>
        </section>

        <footer style={{ marginTop: 64, paddingTop: 24, borderTop: `1px solid ${ink}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7a716a", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>End of edition</span>
          <span>{rows.length} dated cashflow events · {debts.length} debt{debts.length === 1 ? "" : "s"} tracked</span>
        </footer>
      </main>
    </div>
  );
}
