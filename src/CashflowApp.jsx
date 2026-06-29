import React, { useState, useMemo, useEffect } from "react";
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
  Wallet,
  CreditCard,
  Sparkles,
  ArrowRight,
  Layers,
  Car,
  Home,
  Coffee,
  X,
  Info,
  ChevronRight,
  Power,
  Lock,
  Unlock,
  Wrench,
  Repeat,
  Zap,
  Calendar as CalIcon,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// ============================================================
// DATE UTILITIES
// ============================================================
export const toKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
export const fromKey = (s) => {
  if (!s) return new Date();
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addMonths = (dateKey, months) => {
  const d = fromKey(dateKey);
  d.setMonth(d.getMonth() + months);
  return toKey(d);
};
const monthsBetween = (startKey, endKey) => {
  const a = fromKey(startKey);
  const b = fromKey(endKey);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
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

// ============================================================
// SOURCED REGIONAL DEFAULTS
// State/province-level. Values shown to users come with source labels.
// ============================================================
const REGIONS = [
  { code: "CA-ON", label: "Ontario, Canada" },
  { code: "CA-BC", label: "British Columbia, Canada" },
  { code: "CA-AB", label: "Alberta, Canada" },
  { code: "US-CA", label: "California, USA" },
  { code: "US-NY", label: "New York, USA" },
  { code: "US-TX", label: "Texas, USA" },
];

const DEFAULTS = {
  house: {
    mortgageAPR: {
      "CA-ON": { value: 5.04, source: "Bank of Canada · avg 5-yr fixed · Q1 2026", range: "4.5%–5.8%" },
      "CA-BC": { value: 5.04, source: "Bank of Canada · avg 5-yr fixed · Q1 2026", range: "4.5%–5.8%" },
      "CA-AB": { value: 5.04, source: "Bank of Canada · avg 5-yr fixed · Q1 2026", range: "4.5%–5.8%" },
      "US-CA": { value: 6.80, source: "Freddie Mac PMMS · 30-yr fixed · Mar 2026", range: "6.3%–7.4%" },
      "US-NY": { value: 6.80, source: "Freddie Mac PMMS · 30-yr fixed · Mar 2026", range: "6.3%–7.4%" },
      "US-TX": { value: 6.80, source: "Freddie Mac PMMS · 30-yr fixed · Mar 2026", range: "6.3%–7.4%" },
    },
    propertyTaxPercent: {
      "CA-ON": { value: 1.10, source: "Avg municipal mill rate · Ontario 2024", range: "0.6%–1.8%" },
      "CA-BC": { value: 0.55, source: "BC Assessment 2024", range: "0.3%–1.0%" },
      "CA-AB": { value: 0.70, source: "Avg municipal mill rate · Alberta 2024", range: "0.5%–1.1%" },
      "US-CA": { value: 0.75, source: "California Tax Foundation 2024", range: "0.6%–1.1%" },
      "US-NY": { value: 1.40, source: "NY State Comptroller 2024", range: "0.7%–2.5%" },
      "US-TX": { value: 1.74, source: "Texas Comptroller 2024", range: "1.2%–2.5%" },
    },
    appreciationPercent: {
      "CA-ON": { value: 4.2, source: "CREA HPI · Ontario 10-yr avg", range: "Highly variable by city" },
      "CA-BC": { value: 4.8, source: "CREA HPI · BC 10-yr avg", range: "Highly variable by city" },
      "CA-AB": { value: 2.1, source: "CREA HPI · Alberta 10-yr avg", range: "Highly variable by city" },
      "US-CA": { value: 5.5, source: "Case-Shiller CA 10-yr avg", range: "Highly variable by city" },
      "US-NY": { value: 4.0, source: "Case-Shiller NY 10-yr avg", range: "Highly variable by city" },
      "US-TX": { value: 4.5, source: "Case-Shiller TX 10-yr avg", range: "Highly variable by city" },
    },
    homeInsurancePerMonth: {
      "CA-ON": { value: 130, source: "IBC avg · Ontario 2024", range: "$90–$200" },
      "CA-BC": { value: 110, source: "IBC avg · BC 2024", range: "$80–$180" },
      "CA-AB": { value: 145, source: "IBC avg · Alberta 2024", range: "$100–$220" },
      "US-CA": { value: 145, source: "III avg · California 2024", range: "$100–$280" },
      "US-NY": { value: 130, source: "III avg · New York 2024", range: "$95–$200" },
      "US-TX": { value: 220, source: "III avg · Texas 2024", range: "$150–$380" },
    },
  },
  car: {
    autoLoanAPR: {
      "CA-ON": { value: 7.5, source: "Avg auto loan rate · Canada Q1 2026", range: "5%–11%" },
      "CA-BC": { value: 7.5, source: "Avg auto loan rate · Canada Q1 2026", range: "5%–11%" },
      "CA-AB": { value: 7.5, source: "Avg auto loan rate · Canada Q1 2026", range: "5%–11%" },
      "US-CA": { value: 7.2, source: "Experian State of Auto Finance Q4 2025", range: "5%–11%" },
      "US-NY": { value: 7.2, source: "Experian State of Auto Finance Q4 2025", range: "5%–11%" },
      "US-TX": { value: 7.2, source: "Experian State of Auto Finance Q4 2025", range: "5%–11%" },
    },
    insurancePerMonth: {
      "CA-ON": { value: 175, source: "Insurance Bureau of Canada · ON 2024", range: "$120–$280" },
      "CA-BC": { value: 165, source: "ICBC avg 2024", range: "$110–$260" },
      "CA-AB": { value: 145, source: "AIRB 2024", range: "$95–$230" },
      "US-CA": { value: 195, source: "III avg · California 2024", range: "$130–$320" },
      "US-NY": { value: 175, source: "III avg · New York 2024", range: "$120–$290" },
      "US-TX": { value: 165, source: "III avg · Texas 2024", range: "$110–$270" },
    },
  },
};

// ============================================================
// PRIMITIVES — the six event types
// ============================================================
// Every primitive emits 0+ DatedAmount events when the projection runs.
// An income_change / expense_change instead mutates other events.

// Shift any date-bearing field of a primitive by N months. Used for
// the "earliest workable date" search — we slide the whole block forward
// in time and re-project, looking for the smallest offset that yields
// an affordable result.
function shiftPrimitive(p, offsetMonths) {
  if (!offsetMonths) return p;
  const shifted = { ...p };
  if (p.date) shifted.date = addMonths(p.date, offsetMonths);
  if (p.startDate) shifted.startDate = addMonths(p.startDate, offsetMonths);
  if (p.endDate) shifted.endDate = addMonths(p.endDate, offsetMonths);
  return shifted;
}

function eventsFromOneTime(p, startDate, endDate) {
  const d = fromKey(p.date);
  if (d < startDate || d > endDate) return [];
  return [{ date: p.date, amount: p.amount, label: p.label, blockId: p.blockId }];
}

function eventsFromRecurring(p, startDate, endDate) {
  const out = [];
  let date = fromKey(p.startDate);
  const stop = p.endDate ? fromKey(p.endDate) : endDate;
  const truStop = stop < endDate ? stop : endDate;
  let safety = 0;
  let yearsElapsed = 0;
  let baseYear = date.getFullYear();
  let amt = p.amount;

  while (date <= truStop && safety < 5000) {
    // escalation applied annually
    if (p.escalation && date.getFullYear() > baseYear + yearsElapsed) {
      yearsElapsed = date.getFullYear() - baseYear;
      amt = p.amount * Math.pow(1 + p.escalation.rate, yearsElapsed);
    }
    if (date >= startDate) {
      out.push({ date: toKey(date), amount: amt, label: p.label, blockId: p.blockId });
    }
    if (p.frequency === "weekly") date.setDate(date.getDate() + 7);
    else if (p.frequency === "biweekly") date.setDate(date.getDate() + 14);
    else if (p.frequency === "semimonthly") {
      if (date.getDate() < 15) date.setDate(15);
      else {
        date.setMonth(date.getMonth() + 1);
        date.setDate(1);
      }
    } else if (p.frequency === "monthly") date.setMonth(date.getMonth() + 1);
    else if (p.frequency === "quarterly") date.setMonth(date.getMonth() + 3);
    else if (p.frequency === "annual") date.setFullYear(date.getFullYear() + 1);
    else break;
    safety++;
  }
  return out;
}

function eventsFromAmortizedLoan(p, startDate, endDate) {
  const out = [];
  const r = p.apr / 100 / 12;
  const n = p.termMonths;
  if (p.principal <= 0 || r < 0 || n <= 0) return [];
  // standard amortization
  const payment = r === 0 ? p.principal / n : p.principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const extra = p.extraMonthlyPayment || 0;

  let balance = p.principal;
  let date = fromKey(p.startDate);
  for (let i = 0; i < n + 100 && balance > 0.01; i++) {
    const interest = balance * r;
    const principalPaid = Math.min(payment - interest + extra, balance);
    balance -= principalPaid;
    const totalPayment = principalPaid + interest;

    if (date >= startDate && date <= endDate) {
      out.push({
        date: toKey(date),
        amount: -totalPayment,
        label: p.label,
        blockId: p.blockId,
      });
    }
    date.setMonth(date.getMonth() + 1);
    if (date > endDate) break;
  }
  return out;
}

// Income/expense change primitives produce *modifier* records, not events.
// The projection engine applies them to base income/expense lines before emitting.
function modifierFromIncomeChange(p) {
  return { kind: "income_change", primitive: p };
}
function modifierFromExpenseChange(p) {
  return { kind: "expense_change", primitive: p };
}

// Dispatch
function eventsFromPrimitive(p, startDate, endDate) {
  if (p.type === "one_time") return eventsFromOneTime(p, startDate, endDate);
  if (p.type === "recurring") return eventsFromRecurring(p, startDate, endDate);
  if (p.type === "amortized_loan") return eventsFromAmortizedLoan(p, startDate, endDate);
  return []; // income_change & expense_change handled separately
}

// ============================================================
// TEMPLATES
// ============================================================
// Each template = id, name, icon, form fields (rendered generically),
// and a generate() function producing primitives.

const TEMPLATES = {
  buy_car: {
    id: "buy_car",
    name: "Buy a car",
    icon: Car,
    description: "Down payment, financed purchase, ongoing insurance & gas",
    fields: [
      { key: "price", label: "Purchase price", type: "money", default: 35000 },
      { key: "downPayment", label: "Down payment", type: "money", default: 5000 },
      { key: "tradeIn", label: "Trade-in value", type: "money", default: 0, optional: true },
      {
        key: "apr",
        label: "Loan APR",
        type: "percent",
        default: 7.5,
        defaultRef: "car.autoLoanAPR",
      },
      { key: "termMonths", label: "Loan term (months)", type: "number", default: 60 },
      { key: "purchaseDate", label: "Purchase date", type: "date" },
      {
        key: "insurance",
        label: "Monthly insurance",
        type: "money",
        default: 175,
        defaultRef: "car.insurancePerMonth",
      },
      { key: "gas", label: "Monthly gas & maintenance", type: "money", default: 250 },
    ],
    generate: (i) => {
      const prims = [];
      if (i.downPayment > 0)
        prims.push({
          type: "one_time",
          label: "Down payment",
          amount: -i.downPayment,
          date: i.purchaseDate,
        });
      if (i.tradeIn > 0)
        prims.push({
          type: "one_time",
          label: "Trade-in credit",
          amount: i.tradeIn,
          date: i.purchaseDate,
        });
      const financed = i.price - i.downPayment - i.tradeIn;
      if (financed > 0)
        prims.push({
          type: "amortized_loan",
          label: "Car loan",
          principal: financed,
          apr: i.apr,
          termMonths: i.termMonths,
          startDate: addMonths(i.purchaseDate, 1),
        });
      prims.push({
        type: "recurring",
        label: "Car insurance",
        amount: -i.insurance,
        frequency: "monthly",
        startDate: i.purchaseDate,
      });
      prims.push({
        type: "recurring",
        label: "Gas & maintenance",
        amount: -i.gas,
        frequency: "monthly",
        startDate: i.purchaseDate,
      });
      return prims;
    },
  },
  buy_house: {
    id: "buy_house",
    name: "Buy a house",
    icon: Home,
    description: "Down payment, mortgage, property tax, insurance, maintenance",
    fields: [
      { key: "price", label: "Purchase price", type: "money", default: 650000 },
      { key: "downPayment", label: "Down payment", type: "money", default: 130000 },
      {
        key: "apr",
        label: "Mortgage APR",
        type: "percent",
        default: 5.04,
        defaultRef: "house.mortgageAPR",
      },
      { key: "termYears", label: "Amortization (years)", type: "number", default: 30 },
      { key: "purchaseDate", label: "Closing date", type: "date" },
      {
        key: "closingCostsPercent",
        label: "Closing costs (% of price)",
        type: "percent",
        default: 2,
      },
      {
        key: "propertyTaxPercent",
        label: "Property tax (% of price/yr)",
        type: "percent",
        default: 1.1,
        defaultRef: "house.propertyTaxPercent",
      },
      {
        key: "insurance",
        label: "Monthly home insurance",
        type: "money",
        default: 130,
        defaultRef: "house.homeInsurancePerMonth",
      },
      {
        key: "maintenancePercent",
        label: "Maintenance (% of price/yr)",
        type: "percent",
        default: 1.0,
      },
      { key: "hoa", label: "Monthly HOA (optional)", type: "money", default: 0, optional: true },
    ],
    generate: (i) => {
      const prims = [];
      if (i.downPayment > 0)
        prims.push({
          type: "one_time",
          label: "Down payment",
          amount: -i.downPayment,
          date: i.purchaseDate,
        });
      const closingCosts = i.price * (i.closingCostsPercent / 100);
      if (closingCosts > 0)
        prims.push({
          type: "one_time",
          label: "Closing costs",
          amount: -closingCosts,
          date: i.purchaseDate,
        });
      const principal = i.price - i.downPayment;
      if (principal > 0)
        prims.push({
          type: "amortized_loan",
          label: "Mortgage",
          principal,
          apr: i.apr,
          termMonths: i.termYears * 12,
          startDate: addMonths(i.purchaseDate, 1),
        });
      const monthlyTax = (i.price * i.propertyTaxPercent / 100) / 12;
      prims.push({
        type: "recurring",
        label: "Property tax",
        amount: -monthlyTax,
        frequency: "monthly",
        startDate: i.purchaseDate,
        escalation: { rate: 0.02, appliedAt: "annual" },
      });
      prims.push({
        type: "recurring",
        label: "Home insurance",
        amount: -i.insurance,
        frequency: "monthly",
        startDate: i.purchaseDate,
        escalation: { rate: 0.03, appliedAt: "annual" },
      });
      const monthlyMaint = (i.price * i.maintenancePercent / 100) / 12;
      prims.push({
        type: "recurring",
        label: "Maintenance",
        amount: -monthlyMaint,
        frequency: "monthly",
        startDate: i.purchaseDate,
      });
      if (i.hoa > 0)
        prims.push({
          type: "recurring",
          label: "HOA fees",
          amount: -i.hoa,
          frequency: "monthly",
          startDate: i.purchaseDate,
        });
      return prims;
    },
  },
  sabbatical: {
    id: "sabbatical",
    name: "Take a sabbatical",
    icon: Coffee,
    description: "Pause income for a stretch, model gap-period costs",
    fields: [
      { key: "incomeTarget", label: "Which income pauses", type: "income_select" },
      { key: "startDate", label: "Sabbatical start", type: "date" },
      { key: "durationMonths", label: "Duration (months)", type: "number", default: 6 },
      { key: "monthlySpend", label: "Travel/lifestyle spend per month", type: "money", default: 1500 },
      { key: "healthcare", label: "Healthcare per month", type: "money", default: 400 },
    ],
    generate: (i) => {
      const endDate = addMonths(i.startDate, i.durationMonths);
      const prims = [];
      if (i.incomeTarget) {
        prims.push({
          type: "income_change",
          label: `Pause: ${i.incomeTargetLabel || "income"}`,
          targetIncomeId: i.incomeTarget,
          startDate: i.startDate,
          endDate,
          change: { kind: "pause" },
        });
      }
      if (i.monthlySpend > 0)
        prims.push({
          type: "recurring",
          label: "Sabbatical spending",
          amount: -i.monthlySpend,
          frequency: "monthly",
          startDate: i.startDate,
          endDate,
        });
      if (i.healthcare > 0)
        prims.push({
          type: "recurring",
          label: "Healthcare during gap",
          amount: -i.healthcare,
          frequency: "monthly",
          startDate: i.startDate,
          endDate,
        });
      return prims;
    },
  },
};

// ============================================================
// PROJECTION ENGINE
// ============================================================
export function projectDaily(income, expenses, accounts, debts, blocks, startDate, endDate) {
  const incomeMap = {};
  const expenseMap = {};
  const sourceMap = {}; // date -> { label: amount, ... } for tooltips

  // Build modifier set from all active blocks' income_change / expense_change primitives
  // (also shifted by the block's offsetMonths if set)
  const incomeModifiers = [];
  const expenseModifiers = [];
  blocks.forEach((b) => {
    // Locked blocks are always counted (they represent committed decisions).
    // Unlocked blocks must also be active to participate.
    if (!b.locked && !b.active) return;
    const offset = b.offsetMonths || 0;
    b.primitives.forEach((p) => {
      const shifted = offset ? shiftPrimitive(p, offset) : p;
      if (p.type === "income_change") incomeModifiers.push(shifted);
      else if (p.type === "expense_change") expenseModifiers.push(shifted);
    });
  });

  // Helper to apply income modifiers for a given income id + date
  const applyIncomeModifiers = (incomeId, date, baseAmount) => {
    let amt = baseAmount;
    incomeModifiers.forEach((m) => {
      if (m.targetIncomeId !== incomeId) return;
      const s = fromKey(m.startDate);
      const e = m.endDate ? fromKey(m.endDate) : null;
      if (date < s) return;
      if (e && date > e) return;
      if (m.change.kind === "pause") amt = 0;
      else if (m.change.kind === "replace") amt = m.change.newAmount;
      else if (m.change.kind === "delta_absolute") amt += m.change.deltaAmount;
      else if (m.change.kind === "delta_percent") amt *= 1 + m.change.deltaPercent / 100;
    });
    return amt;
  };

  // INCOME
  income.forEach((row) => {
    const { id, amount, frequency, start, end } = row;
    if (!amount || !start) return;
    let date = fromKey(start);
    const amt = parseFloat(amount);
    if (isNaN(amt)) return;
    const endLimit = end ? fromKey(end) : null;
    let safety = 0;
    while (date <= endDate && safety < 5000) {
      if (endLimit && date > endLimit) break;
      if (date >= startDate) {
        const finalAmt = applyIncomeModifiers(id, date, amt);
        if (finalAmt > 0) {
          const k = toKey(date);
          incomeMap[k] = (incomeMap[k] || 0) + finalAmt;
          if (!sourceMap[k]) sourceMap[k] = {};
          sourceMap[k][row.name || "Income"] = (sourceMap[k][row.name || "Income"] || 0) + finalAmt;
        }
      }
      if (frequency === "Biweekly (Friday)") date.setDate(date.getDate() + 14);
      else if (frequency === "Semi-monthly") {
        if (date.getDate() === 1) date.setDate(15);
        else { date.setMonth(date.getMonth() + 1); date.setDate(1); }
      } else if (frequency === "Monthly") date.setMonth(date.getMonth() + 1);
      else if (frequency === "Weekly") date.setDate(date.getDate() + 7);
      else break;
      safety++;
    }
  });

  // Helper to apply expense modifiers
  const applyExpenseModifiers = (expenseId, date, baseAmount) => {
    let amt = baseAmount;
    let removed = false;
    expenseModifiers.forEach((m) => {
      if (m.targetExpenseId !== expenseId) return;
      const s = fromKey(m.startDate);
      const e = m.endDate ? fromKey(m.endDate) : null;
      if (date < s) return;
      if (e && date > e) return;
      if (m.change.kind === "remove") { amt = 0; removed = true; }
      else if (m.change.kind === "replace") amt = m.change.newAmount;
      else if (m.change.kind === "delta_absolute") amt += m.change.deltaAmount;
      else if (m.change.kind === "delta_percent") amt *= 1 + m.change.deltaPercent / 100;
    });
    return removed ? 0 : Math.max(0, amt);
  };

  // EXPENSES
  expenses.forEach((row) => {
    const { id, amount, due, note, end } = row;
    const amt = parseFloat(amount);
    if (!amt || isNaN(amt)) return;
    if (note === "One-time") {
      const d = fromKey(due);
      if (d >= startDate && d <= endDate) {
        const finalAmt = applyExpenseModifiers(id, d, amt);
        if (finalAmt > 0) {
          const k = toKey(d);
          expenseMap[k] = (expenseMap[k] || 0) + finalAmt;
        }
      }
    } else if (due === "Weekly") {
      let date = new Date(startDate);
      let safety = 0;
      const endLimit = end ? fromKey(end) : null;
      while (date <= endDate && safety < 5000) {
        if (endLimit && date > endLimit) break;
        const finalAmt = applyExpenseModifiers(id, date, amt);
        if (finalAmt > 0) {
          const k = toKey(date);
          expenseMap[k] = (expenseMap[k] || 0) + finalAmt;
        }
        date.setDate(date.getDate() + 7);
        safety++;
      }
    } else {
      const dueDay = parseInt(due);
      if (isNaN(dueDay)) return;
      let temp = new Date(startDate);
      let safety = 0;
      const endLimit = end ? fromKey(end) : null;
      while (temp <= endDate && safety < 100) {
        const expenseDate = new Date(temp.getFullYear(), temp.getMonth(), dueDay);
        if (expenseDate >= startDate && expenseDate <= endDate) {
          if (!endLimit || expenseDate <= endLimit) {
            const finalAmt = applyExpenseModifiers(id, expenseDate, amt);
            if (finalAmt > 0) {
              const k = toKey(expenseDate);
              expenseMap[k] = (expenseMap[k] || 0) + finalAmt;
            }
          }
        }
        temp.setMonth(temp.getMonth() + 1);
        safety++;
      }
    }
  });

  // DEBT SCHEDULES
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
    let totalPaid = 0, totalInterest = 0;
    let payoffDate = null;
    let temp = new Date(startDate);
    temp.setDate(1);
    let safety = 0;
    while (temp <= endDate && bal > 0 && safety < 600) {
      const interest = bal * monthlyRate;
      bal += interest; totalInterest += interest;
      const payDate = new Date(temp.getFullYear(), temp.getMonth(), payDay);
      if (payDate >= startDate && payDate <= endDate) {
        const payment = Math.min(min, bal);
        bal -= payment; totalPaid += payment;
        const k = toKey(payDate);
        expenseMap[k] = (expenseMap[k] || 0) + payment;
        if (bal <= 0.01) { bal = 0; payoffDate = payDate; break; }
      }
      temp.setMonth(temp.getMonth() + 1);
      safety++;
    }
    debtTimelines.push({ name: debt.name, payoffDate, totalPaid, totalInterest, startBalance: startBal, currentBalance: bal });
  });

  // BLOCK EVENTS (one_time, recurring, amortized_loan)
  // Each block may have an offsetMonths (default 0) which slides every
  // dated primitive in the block forward by that many months. Used by
  // the affordability calculation.
  blocks.forEach((b) => {
    // Locked blocks are always projected; unlocked must be active.
    if (!b.locked && !b.active) return;
    const offset = b.offsetMonths || 0;
    b.primitives.forEach((p) => {
      const shifted = offset ? shiftPrimitive(p, offset) : p;
      const tagged = { ...shifted, blockId: b.id };
      const events = eventsFromPrimitive(tagged, startDate, endDate);
      events.forEach((e) => {
        if (e.amount >= 0) {
          incomeMap[e.date] = (incomeMap[e.date] || 0) + e.amount;
        } else {
          expenseMap[e.date] = (expenseMap[e.date] || 0) + Math.abs(e.amount);
        }
      });
    });
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
      map[ym] = { month: ym, startingBalance: prevEnd, endingBalance: prevEnd, totalIncome: 0, totalExpense: 0 };
    }
    map[ym].totalIncome += r.income;
    map[ym].totalExpense += r.expense;
    map[ym].endingBalance = r.balance;
    prevEnd = r.balance;
  });
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

// ============================================================
// AFFORDABILITY
// ============================================================
// For a given block (in isolation against the baseline), compute:
//   - state: "affordable" | "tight" | "underwater"
//   - lowestBalance: the worst point in the projection with this scenario on
//   - earliestWorkableOffset: smallest # of months we'd need to delay
//     the block so the projection stays affordable. null if affordable now.
//   - earliestWorkableDate: human date corresponding to that offset.
// "In isolation" = this block as the only active scenario, against the
// user's base income/expenses/debts/accounts. Doesn't compound with
// other active scenarios — that would make affordability shift around
// every time a different scenario was toggled.
function computeAffordability(block, baseInputs, startDate, endDate) {
  const { income, expenses, accounts, debts, lockedBlocks } = baseInputs;
  const TIGHT_THRESHOLD = 1000; // balance below this = "tight"
  const MAX_OFFSET_MONTHS = 60; // give up searching after 5 years

  const isolatedBlock = { ...block, active: true, offsetMonths: 0 };

  // Locked blocks are part of the committed baseline — every unlocked
  // scenario is evaluated assuming the locked ones are already in play.
  const lockedForEval = (lockedBlocks || []).filter((lb) => lb.id !== block.id);

  const evaluate = (offsetMonths) => {
    const b = { ...isolatedBlock, offsetMonths };
    const { rows } = projectDaily(income, expenses, accounts, debts, [...lockedForEval, b], startDate, endDate);
    if (!rows.length) return { lowest: Infinity, state: "affordable" };
    const lowest = Math.min(...rows.map((r) => r.balance));
    let state;
    if (lowest < 0) state = "underwater";
    else if (lowest < TIGHT_THRESHOLD) state = "tight";
    else state = "affordable";
    return { lowest, state };
  };

  // Current state (no delay)
  const current = evaluate(0);

  // If already affordable, no search needed
  if (current.state === "affordable") {
    return {
      state: "affordable",
      lowestBalance: current.lowest,
      earliestWorkableOffset: 0,
      earliestWorkableDate: null,
    };
  }

  // Search for the smallest offset that makes it affordable
  let earliestWorkableOffset = null;
  for (let m = 1; m <= MAX_OFFSET_MONTHS; m++) {
    const res = evaluate(m);
    if (res.state === "affordable") {
      earliestWorkableOffset = m;
      break;
    }
  }

  let earliestWorkableDate = null;
  if (earliestWorkableOffset !== null) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + earliestWorkableOffset);
    earliestWorkableDate = d;
  }

  return {
    state: current.state,
    lowestBalance: current.lowest,
    earliestWorkableOffset,
    earliestWorkableDate,
  };
}

// ============================================================
// DESIGN TOKENS
// ============================================================
const accent = "#c2410c";
const ink = "#1a1614";
const paper = "#f4efe6";
const green = "#15803d";
const red = "#b91c1c";

// ============================================================
// SAMPLE DATA (for the "see a sample" path)
// ============================================================
const todayKey = toKey(new Date());
const SAMPLE_INCOME = [
  { id: "i1", partner: "Partner A", name: "Salary", amount: 2200, frequency: "Biweekly (Friday)", start: todayKey },
  { id: "i2", partner: "Partner B", name: "Salary", amount: 1850, frequency: "Semi-monthly", start: todayKey },
  { id: "i3", partner: "Partner A", name: "Freelance", amount: 600, frequency: "Monthly", start: todayKey },
];
const SAMPLE_EXPENSES = [
  { id: "e1", name: "Rent", amount: 2100, due: "1", note: "" },
  { id: "e2", name: "Groceries", amount: 180, due: "Weekly", note: "" },
  { id: "e3", name: "Utilities", amount: 220, due: "15", note: "" },
  { id: "e4", name: "Internet", amount: 75, due: "20", note: "" },
  { id: "e5", name: "Phones", amount: 110, due: "5", note: "" },
  { id: "e6", name: "Car insurance", amount: 165, due: "12", note: "" },
  { id: "e7", name: "Streaming", amount: 45, due: "8", note: "" },
];
const SAMPLE_ACCOUNTS = [
  { id: "a1", name: "Joint chequing", balance: 4200 },
  { id: "a2", name: "Savings", balance: 6500 },
];
const SAMPLE_DEBTS = [
  { id: "d1", name: "Credit card", balance: 3400, apr: 19.99, minPayment: 250, paymentDay: "18" },
  { id: "d2", name: "Car loan", balance: 12800, apr: 5.9, minPayment: 380, paymentDay: "1" },
];

const FREQS = ["Biweekly (Friday)", "Semi-monthly", "Monthly", "Weekly", "One-time"];

// ============================================================
// UI ATOMS
// ============================================================
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

function TooltipHelp({ text, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help", gap: 4 }}
    >
      {children}
      <Info size={10} style={{ opacity: 0.6 }} />
      {hovered && (
        <span style={{
          position: "absolute",
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          background: paper,
          border: `1px solid ${ink}`,
          padding: "8px 12px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: ink,
          zIndex: 50,
          width: 200,
          boxShadow: "3px 3px 0 rgba(26,22,20,0.12)",
          marginBottom: 6,
          lineHeight: 1.4,
          fontStyle: "normal",
          fontWeight: "normal",
          textTransform: "none",
          textAlign: "left"
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

function DatePickerCell({ value, onChange, placeholder = "YYYY-MM-DD" }) {
  const inputRef = React.useRef(null);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, width: "100%", position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: "transparent",
          border: "none",
          borderBottom: `1px solid #c9c1b3`,
          padding: "4px 2px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          color: ink,
          width: "100%",
          outline: "none"
        }}
      />
      <button
        type="button"
        onClick={() => {
          try {
            const el = document.createElement("input");
            el.type = "date";
            el.style.position = "absolute";
            el.style.opacity = 0;
            el.value = value && value.match(/^\d{4}-\d{2}-\d{2}$/) ? value : "";
            el.onchange = (e) => {
              onChange(e.target.value);
              document.body.removeChild(el);
            };
            document.body.appendChild(el);
            if (typeof el.showPicker === "function") {
              el.showPicker();
            } else {
              el.click();
            }
          } catch (e) {
            if (inputRef.current) {
              inputRef.current.type = "date";
              inputRef.current.focus();
            }
          }
        }}
        style={{
          background: "transparent",
          border: "none",
          padding: 2,
          cursor: "pointer",
          color: "#7a716a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
        title="Select date"
      >
        <CalIcon size={14} />
      </button>
    </div>
  );
}

function NumberStat({ label, value, sub, tone, tooltipText }) {
  const color = tone === "good" ? green : tone === "bad" ? red : ink;
  return (
    <div style={{ borderTop: `1px solid ${ink}`, paddingTop: 10 }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#5b544d", marginBottom: 6 }}>
        {tooltipText ? (
          <TooltipHelp text={tooltipText}>{label}</TooltipHelp>
        ) : (
          label
        )}
      </div>
      <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#5b544d", marginTop: 6 }}>{sub}</div>}
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
        background: "transparent", border: "none", borderBottom: `1px solid #c9c1b3`, padding: "4px 2px",
        fontFamily: type === "number" || placeholder === "YYYY-MM-DD" ? "'JetBrains Mono', monospace" : "'Fraunces', Georgia, serif",
        fontSize: 14, color: ink, width: "100%", outline: "none",
      }}
      onFocus={(e) => (e.target.style.borderBottomColor = accent)}
      onBlur={(e) => (e.target.style.borderBottomColor = "#c9c1b3")}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ background: "transparent", border: "none", borderBottom: `1px solid #c9c1b3`, padding: "4px 2px", fontFamily: "'Fraunces', Georgia, serif", fontSize: 14, color: ink, width: "100%", outline: "none", appearance: "none", cursor: "pointer" }}>
      {options.map((o) => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
    </select>
  );
}

function IconBtn({ onClick, children, title }) {
  return (
    <button onClick={onClick} title={title}
      style={{ background: "transparent", border: "none", cursor: "pointer", color: "#7a716a", padding: 4, display: "flex", alignItems: "center" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = accent)}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#7a716a")}>
      {children}
    </button>
  );
}

function AddRowBtn({ onClick, children }) {
  return (
    <button onClick={onClick}
      style={{ background: "transparent", border: `1px dashed ${ink}`, padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: ink, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12 }}
      onMouseEnter={(e) => { e.currentTarget.style.background = ink; e.currentTarget.style.color = paper; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ink; }}>
      <Plus size={14} /> {children}
    </button>
  );
}

function AddPrimitiveBtn({ onClick, icon: Icon, label, hint, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        background: "transparent",
        border: `1px solid ${disabled ? "#d9d1c1" : ink}`,
        padding: "10px 12px",
        textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? "#a8a09a" : ink,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.12s ease",
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = ink; e.currentTarget.style.color = paper; } }}
      onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ink; } }}
    >
      <Icon size={14} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 500 }}>
          {label}
        </div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 11, fontStyle: "italic", opacity: 0.75, marginTop: 2, lineHeight: 1.3 }}>
          {hint}
        </div>
      </div>
    </button>
  );
}

const COL_STYLE = { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7a716a", paddingBottom: 8, textAlign: "left", fontWeight: 400 };
const numCell = { fontFamily: "'JetBrains Mono', monospace", fontSize: 13, padding: "12px 0", textAlign: "right", color: ink };
const tdStyle = { padding: "10px 12px 10px 0", verticalAlign: "middle" };

// ============================================================
// SCENARIO BLOCK CARDS
// ============================================================
function ScenarioBlockCard({ block, affordability, onToggle, onLock, onOpen, onDelete }) {
  const template = block.templateId ? TEMPLATES[block.templateId] : null;
  const Icon = template?.icon || Wrench;
  const primCount = block.primitives.length;
  const isLocked = !!block.locked;

  // Affordability presentation (only relevant for unlocked scenarios)
  const a = affordability;
  let affordColor = "#7a716a";
  let affordLabel = null;
  let affordDetail = null;
  if (!isLocked && a) {
    if (a.state === "affordable") {
      affordColor = green;
      affordLabel = "Affordable";
      affordDetail = `Lowest balance: ${fmtMoney(a.lowestBalance)}`;
    } else if (a.state === "tight") {
      affordColor = "#a16207";
      affordLabel = "Tight";
      affordDetail = a.earliestWorkableDate
        ? `Comfortable if delayed to ${fmtDate(a.earliestWorkableDate)}`
        : `Lowest balance: ${fmtMoney(a.lowestBalance)}`;
    } else if (a.state === "underwater") {
      affordColor = red;
      affordLabel = "Underwater";
      affordDetail = a.earliestWorkableDate
        ? `Workable if delayed to ${fmtDate(a.earliestWorkableDate)}`
        : `Lowest balance: ${fmtMoney(a.lowestBalance)} · won't recover in 5 yrs`;
    }
  }

  // Card styling differs for locked vs unlocked
  const cardBg = isLocked
    ? ink                                      // locked = inverse / "ledger entry"
    : block.active ? "#faf6ed" : "#ebe5d6";
  const cardFg = isLocked ? paper : ink;
  const cardOpacity = isLocked ? 1 : (block.active ? 1 : 0.55);
  const mutedFg = isLocked ? "#a8a09a" : "#7a716a";
  const dividerColor = isLocked ? "#3a342f" : "#d9d1c1";

  return (
    <div
      onClick={onOpen}
      style={{
        border: `1px solid ${ink}`,
        background: cardBg,
        color: cardFg,
        opacity: cardOpacity,
        padding: "16px 18px",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.15s ease",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `4px 4px 0 ${ink}`; e.currentTarget.style.transform = "translate(-2px, -2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <Icon size={20} style={{ color: isLocked ? accent : (block.active ? accent : "#7a716a") }} />
        <div style={{ display: "flex", gap: 4 }}>
          {!isLocked && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              title={block.active ? "Disable scenario" : "Enable scenario"}
              style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", color: block.active ? accent : "#7a716a", display: "flex", alignItems: "center" }}
            >
              <Power size={14} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onLock(); }}
            title={isLocked ? "Unlock — return to what-if" : "Lock — commit to the plan"}
            style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", color: isLocked ? accent : "#7a716a", display: "flex", alignItems: "center" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = accent)}
            onMouseLeave={(e) => (e.currentTarget.style.color = isLocked ? accent : "#7a716a")}
          >
            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete scenario"
            style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", color: mutedFg, display: "flex", alignItems: "center" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = red)}
            onMouseLeave={(e) => (e.currentTarget.style.color = mutedFg)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: isLocked ? accent : "#7a716a", marginBottom: 4 }}>
        {template?.name || "Custom"} · {isLocked ? "Committed" : (block.active ? "Active" : "Off")}
      </div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: 8 }}>
        {block.name}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: mutedFg, display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
        {primCount} event{primCount === 1 ? "" : "s"} <ChevronRight size={11} />
      </div>

      {/* Footer differs by state */}
      {isLocked ? (
        <div style={{ marginTop: "auto", paddingTop: 10, borderTop: `1px solid ${dividerColor}` }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: accent, fontWeight: 500, marginBottom: 4,
          }}>
            <Lock size={10} /> Part of the plan
          </div>
          {block.lockedAt && (
            <div style={{
              fontFamily: "'Fraunces', serif", fontSize: 12,
              fontStyle: "italic", color: mutedFg, lineHeight: 1.35,
            }}>
              Committed {fmtDate(fromKey(block.lockedAt))}
            </div>
          )}
        </div>
      ) : affordLabel && (
        <div style={{ marginTop: "auto", paddingTop: 10, borderTop: `1px solid ${dividerColor}` }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: affordColor, fontWeight: 500, marginBottom: 4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: affordColor }} />
            {affordLabel}
          </div>
          {affordDetail && (
            <div style={{
              fontFamily: "'Fraunces', serif", fontSize: 12,
              fontStyle: "italic", color: "#5b544d", lineHeight: 1.35,
            }}>
              {affordDetail}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TemplatePickerCard({ template, onClick }) {
  const Icon = template.icon;
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${ink}`, background: paper, padding: "20px 18px", textAlign: "left",
        cursor: "pointer", display: "flex", flexDirection: "column", gap: 10, transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = ink; e.currentTarget.style.color = paper; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = paper; e.currentTarget.style.color = ink; }}
    >
      <Icon size={22} />
      <div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, marginBottom: 4 }}>{template.name}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, opacity: 0.8, lineHeight: 1.4 }}>
          {template.description}
        </div>
      </div>
    </button>
  );
}

// ============================================================
// TEMPLATE FORM (renders any template's fields generically)
// ============================================================
function getDefaultValue(field, region) {
  if (field.defaultRef && region) {
    const [cat, key] = field.defaultRef.split(".");
    const entry = DEFAULTS[cat]?.[key]?.[region];
    if (entry) return entry.value;
  }
  return field.default;
}

function getDefaultMeta(field, region) {
  if (field.defaultRef && region) {
    const [cat, key] = field.defaultRef.split(".");
    return DEFAULTS[cat]?.[key]?.[region];
  }
  return null;
}

function TemplateForm({ template, region, income, onSave, onCancel, initialInputs, initialName }) {
  const [inputs, setInputs] = useState(() => {
    if (initialInputs) return initialInputs;
    const obj = {};
    template.fields.forEach((f) => {
      if (f.type === "date") obj[f.key] = toKey(new Date());
      else if (f.type === "income_select") obj[f.key] = income[0]?.id || "";
      else obj[f.key] = getDefaultValue(f, region) ?? "";
    });
    return obj;
  });
  const [name, setName] = useState(initialName || template.name);

  const update = (key, val) => setInputs((s) => ({ ...s, [key]: val }));

  const handleSave = () => {
    // coerce numbers
    const coerced = { ...inputs };
    template.fields.forEach((f) => {
      if (f.type === "money" || f.type === "number" || f.type === "percent") {
        coerced[f.key] = parseFloat(coerced[f.key]) || 0;
      }
    });
    // attach income label for sabbatical
    if (coerced.incomeTarget) {
      const sel = income.find((i) => i.id === coerced.incomeTarget);
      if (sel) coerced.incomeTargetLabel = `${sel.partner} · ${sel.name}`;
    }
    const primitives = template.generate(coerced);
    onSave({ name, templateId: template.id, inputs: coerced, primitives });
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: accent, marginBottom: 6 }}>
          Scenario name
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ background: "transparent", border: "none", borderBottom: `1px solid ${ink}`, padding: "6px 0", fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 24, color: ink, width: "100%", outline: "none" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {template.fields.map((field) => {
          const meta = getDefaultMeta(field, region);
          const isIncomeSelect = field.type === "income_select";
          return (
            <div key={field.key}>
              <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#5b544d", display: "block", marginBottom: 4 }}>
                {field.label}
                {field.type === "money" && " ($)"}
                {field.type === "percent" && " (%)"}
              </label>
              {isIncomeSelect ? (
                <select
                  value={inputs[field.key] || ""}
                  onChange={(e) => update(field.key, e.target.value)}
                  style={{ background: "transparent", border: "none", borderBottom: `1px solid #c9c1b3`, padding: "6px 0", fontFamily: "'Fraunces', serif", fontSize: 16, width: "100%", outline: "none", appearance: "none", cursor: "pointer" }}
                >
                  {income.length === 0 && <option value="">No income to select</option>}
                  {income.map((i) => (
                    <option key={i.id} value={i.id}>{i.partner} · {i.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={inputs[field.key] ?? ""}
                  onChange={(e) => update(field.key, e.target.value)}
                  type={field.type === "date" ? "date" : "number"}
                  step={field.type === "percent" ? "0.01" : "1"}
                  style={{ background: "transparent", border: "none", borderBottom: `1px solid #c9c1b3`, padding: "6px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: ink, width: "100%", outline: "none" }}
                  onFocus={(e) => (e.target.style.borderBottomColor = accent)}
                  onBlur={(e) => (e.target.style.borderBottomColor = "#c9c1b3")}
                />
              )}
              {meta && (
                <div style={{ marginTop: 6, padding: "4px 8px", background: "rgba(194,65,12,0.06)", borderLeft: `2px solid ${accent}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#5b544d", lineHeight: 1.5 }}>
                  <div style={{ color: accent, fontWeight: 500 }}>
                    <Info size={9} style={{ display: "inline", verticalAlign: 0, marginRight: 4 }} />
                    Default: {meta.value}{field.type === "percent" ? "%" : ""}
                  </div>
                  <div style={{ marginTop: 2, opacity: 0.85 }}>{meta.source}</div>
                  {meta.range && <div style={{ marginTop: 1, opacity: 0.75, fontStyle: "italic", fontFamily: "'Fraunces', serif", fontSize: 11 }}>Typical: {meta.range}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 32, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ background: "transparent", border: `1px solid ${ink}`, padding: "10px 20px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: ink, cursor: "pointer" }}>
          Cancel
        </button>
        <button onClick={handleSave} style={{ background: ink, border: `1px solid ${ink}`, padding: "10px 20px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: paper, cursor: "pointer" }}>
          Save scenario
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SIDE PANEL — for both creating and editing blocks
// ============================================================
function SidePanel({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,22,20,0.4)", zIndex: 50 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(640px, 90vw)",
        background: paper, borderLeft: `2px solid ${ink}`, zIndex: 51, overflowY: "auto",
        boxShadow: "-20px 0 40px rgba(26,22,20,0.15)",
      }}>
        <div style={{ position: "sticky", top: 0, background: paper, borderBottom: `1px solid ${ink}`, padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: accent, marginBottom: 4 }}>
              Scenario
            </div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, fontStyle: "italic" }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: ink, padding: 6 }}>
            <X size={22} />
          </button>
        </div>
        <div style={{ padding: "28px" }}>{children}</div>
      </div>
    </>
  );
}

// ============================================================
// PRIMITIVE EDITOR — used inside the side panel for editing an existing block
// ============================================================
function PrimitiveRow({ p, onChange, onDelete, income, expenses }) {
  const labelMap = {
    one_time: "One-time",
    recurring: "Recurring",
    amortized_loan: "Amortized loan",
    income_change: "Income change",
    expense_change: "Expense change",
  };
  const iconMap = {
    one_time: Zap,
    recurring: Repeat,
    amortized_loan: CalIcon,
    income_change: ArrowUpRight,
    expense_change: ArrowDownRight,
  };
  const TypeIcon = iconMap[p.type] || Layers;

  // Helpers for change-kind editors
  const setChange = (newChange) => onChange({ ...p, change: newChange });

  return (
    <div style={{ borderTop: `1px solid #d9d1c1`, padding: "14px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7a716a", display: "flex", alignItems: "center", gap: 6 }}>
          <TypeIcon size={11} /> {labelMap[p.type] || p.type}
        </div>
        <IconBtn onClick={onDelete} title="Remove"><Trash2 size={13} /></IconBtn>
      </div>
      <div style={{ marginBottom: 8 }}>
        <input value={p.label} onChange={(e) => onChange({ ...p, label: e.target.value })}
          placeholder="Name this event"
          style={{ background: "transparent", border: "none", borderBottom: `1px solid #c9c1b3`, padding: "4px 0", fontFamily: "'Fraunces', serif", fontSize: 15, width: "100%", outline: "none" }} />
      </div>

      {p.type === "one_time" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={miniLabel}>Amount (neg = expense)</label>
            <input type="number" value={p.amount} onChange={(e) => onChange({ ...p, amount: parseFloat(e.target.value) || 0 })} style={miniInput} />
          </div>
          <div>
            <label style={miniLabel}>Date</label>
            <input type="date" value={p.date} onChange={(e) => onChange({ ...p, date: e.target.value })} style={miniInput} />
          </div>
        </div>
      )}

      {p.type === "recurring" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={miniLabel}>Amount (neg = expense)</label>
            <input type="number" value={p.amount} onChange={(e) => onChange({ ...p, amount: parseFloat(e.target.value) || 0 })} style={miniInput} />
          </div>
          <div>
            <label style={miniLabel}>Frequency</label>
            <select value={p.frequency} onChange={(e) => onChange({ ...p, frequency: e.target.value })} style={miniInput}>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="semimonthly">Semi-monthly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div>
            <label style={miniLabel}>Start date</label>
            <input type="date" value={p.startDate} onChange={(e) => onChange({ ...p, startDate: e.target.value })} style={miniInput} />
          </div>
          <div>
            <label style={miniLabel}>End date (optional)</label>
            <input type="date" value={p.endDate || ""} onChange={(e) => onChange({ ...p, endDate: e.target.value || undefined })} style={miniInput} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={miniLabel}>Annual escalation %</label>
            <input
              type="number"
              step="0.1"
              value={p.escalation?.rate ? p.escalation.rate * 100 : ""}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (isNaN(v) || v === 0) onChange({ ...p, escalation: undefined });
                else onChange({ ...p, escalation: { rate: v / 100, appliedAt: "annual" } });
              }}
              placeholder="0 = no escalation"
              style={miniInput}
            />
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 11, color: "#7a716a", fontStyle: "italic", marginTop: 4 }}>
              e.g. 3% for inflation-tied costs like rent or tuition
            </div>
          </div>
        </div>
      )}

      {p.type === "amortized_loan" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={miniLabel}>Principal</label>
            <input type="number" value={p.principal} onChange={(e) => onChange({ ...p, principal: parseFloat(e.target.value) || 0 })} style={miniInput} />
          </div>
          <div>
            <label style={miniLabel}>APR %</label>
            <input type="number" step="0.01" value={p.apr} onChange={(e) => onChange({ ...p, apr: parseFloat(e.target.value) || 0 })} style={miniInput} />
          </div>
          <div>
            <label style={miniLabel}>Term (months)</label>
            <input type="number" value={p.termMonths} onChange={(e) => onChange({ ...p, termMonths: parseInt(e.target.value) || 0 })} style={miniInput} />
          </div>
          <div>
            <label style={miniLabel}>First payment</label>
            <input type="date" value={p.startDate} onChange={(e) => onChange({ ...p, startDate: e.target.value })} style={miniInput} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={miniLabel}>Extra monthly payment (optional)</label>
            <input
              type="number"
              value={p.extraMonthlyPayment || ""}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange({ ...p, extraMonthlyPayment: isNaN(v) || v === 0 ? undefined : v });
              }}
              placeholder="0"
              style={miniInput}
            />
          </div>
        </div>
      )}

      {p.type === "income_change" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={miniLabel}>Which income</label>
            <select
              value={p.targetIncomeId || ""}
              onChange={(e) => onChange({ ...p, targetIncomeId: e.target.value })}
              style={miniInput}
            >
              <option value="">— select an income —</option>
              {income.map((i) => (
                <option key={i.id} value={i.id}>{i.partner} · {i.name || "(unnamed)"}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={miniLabel}>Start date</label>
            <input type="date" value={p.startDate} onChange={(e) => onChange({ ...p, startDate: e.target.value })} style={miniInput} />
          </div>
          <div>
            <label style={miniLabel}>End date (optional)</label>
            <input type="date" value={p.endDate || ""} onChange={(e) => onChange({ ...p, endDate: e.target.value || undefined })} style={miniInput} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={miniLabel}>Change type</label>
            <select
              value={p.change?.kind || "pause"}
              onChange={(e) => {
                const kind = e.target.value;
                if (kind === "pause") setChange({ kind: "pause" });
                else if (kind === "replace") setChange({ kind: "replace", newAmount: 0 });
                else if (kind === "delta_absolute") setChange({ kind: "delta_absolute", deltaAmount: 0 });
                else if (kind === "delta_percent") setChange({ kind: "delta_percent", deltaPercent: 0 });
              }}
              style={miniInput}
            >
              <option value="pause">Pause (income drops to zero)</option>
              <option value="replace">Replace with new amount</option>
              <option value="delta_absolute">Add/subtract a fixed amount</option>
              <option value="delta_percent">Adjust by percentage</option>
            </select>
          </div>
          {p.change?.kind === "replace" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={miniLabel}>New amount per pay period</label>
              <input type="number" value={p.change.newAmount} onChange={(e) => setChange({ ...p.change, newAmount: parseFloat(e.target.value) || 0 })} style={miniInput} />
            </div>
          )}
          {p.change?.kind === "delta_absolute" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={miniLabel}>Delta per pay period (+ raise / − cut)</label>
              <input type="number" value={p.change.deltaAmount} onChange={(e) => setChange({ ...p.change, deltaAmount: parseFloat(e.target.value) || 0 })} style={miniInput} />
            </div>
          )}
          {p.change?.kind === "delta_percent" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={miniLabel}>Percentage change (+ raise / − cut)</label>
              <input type="number" step="0.1" value={p.change.deltaPercent} onChange={(e) => setChange({ ...p.change, deltaPercent: parseFloat(e.target.value) || 0 })} style={miniInput} />
            </div>
          )}
        </div>
      )}

      {p.type === "expense_change" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={miniLabel}>Which expense</label>
            <select
              value={p.targetExpenseId || ""}
              onChange={(e) => onChange({ ...p, targetExpenseId: e.target.value })}
              style={miniInput}
            >
              <option value="">— select an expense —</option>
              {expenses.map((x) => (
                <option key={x.id} value={x.id}>{x.name || "(unnamed)"}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={miniLabel}>Start date</label>
            <input type="date" value={p.startDate} onChange={(e) => onChange({ ...p, startDate: e.target.value })} style={miniInput} />
          </div>
          <div>
            <label style={miniLabel}>End date (optional)</label>
            <input type="date" value={p.endDate || ""} onChange={(e) => onChange({ ...p, endDate: e.target.value || undefined })} style={miniInput} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={miniLabel}>Change type</label>
            <select
              value={p.change?.kind || "remove"}
              onChange={(e) => {
                const kind = e.target.value;
                if (kind === "remove") setChange({ kind: "remove" });
                else if (kind === "replace") setChange({ kind: "replace", newAmount: 0 });
                else if (kind === "delta_absolute") setChange({ kind: "delta_absolute", deltaAmount: 0 });
                else if (kind === "delta_percent") setChange({ kind: "delta_percent", deltaPercent: 0 });
              }}
              style={miniInput}
            >
              <option value="remove">Remove the expense entirely</option>
              <option value="replace">Replace with new amount</option>
              <option value="delta_absolute">Add/subtract a fixed amount</option>
              <option value="delta_percent">Adjust by percentage</option>
            </select>
          </div>
          {p.change?.kind === "replace" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={miniLabel}>New amount</label>
              <input type="number" value={p.change.newAmount} onChange={(e) => setChange({ ...p.change, newAmount: parseFloat(e.target.value) || 0 })} style={miniInput} />
            </div>
          )}
          {p.change?.kind === "delta_absolute" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={miniLabel}>Delta (+ more expensive / − cheaper)</label>
              <input type="number" value={p.change.deltaAmount} onChange={(e) => setChange({ ...p.change, deltaAmount: parseFloat(e.target.value) || 0 })} style={miniInput} />
            </div>
          )}
          {p.change?.kind === "delta_percent" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={miniLabel}>Percentage change</label>
              <input type="number" step="0.1" value={p.change.deltaPercent} onChange={(e) => setChange({ ...p.change, deltaPercent: parseFloat(e.target.value) || 0 })} style={miniInput} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const miniLabel = { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7a716a", display: "block", marginBottom: 3 };
const miniInput = { background: "transparent", border: "none", borderBottom: `1px solid #c9c1b3`, padding: "4px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, width: "100%", outline: "none", color: ink };

// ============================================================
// WELCOME
// ============================================================
function Welcome({ onLoadSample, onStartFresh }) {
  return (
    <div style={{ minHeight: "100vh", background: paper, color: ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=JetBrains+Mono:wght@400;500&display=swap" />
      <div style={{ maxWidth: 720, width: "100%" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: accent, marginBottom: 16 }}>
          Household Ledger · Edition 02
        </div>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 72, fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 0.95, margin: 0 }}>
          <span style={{ fontStyle: "italic" }}>Cashflow</span><br />
          <span style={{ fontWeight: 400 }}>&amp;</span> Forecast
        </h1>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, lineHeight: 1.5, marginTop: 28, marginBottom: 36, color: "#3a342f", maxWidth: 540 }}>
          See where your money's headed — and what happens if you change course. Track your real cashflow, then model what-if scenarios like buying a house, taking a sabbatical, or financing a car.
        </p>
        <div style={{ borderTop: `1px solid ${ink}`, borderBottom: `1px solid ${ink}`, padding: "24px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <button onClick={onStartFresh}
            style={{ background: ink, color: paper, border: `1px solid ${ink}`, padding: "22px 24px", fontFamily: "'Fraunces', serif", fontSize: 22, fontStyle: "italic", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 8 }}>
            <span>Start fresh</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontStyle: "normal", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a8a09a", display: "flex", alignItems: "center", gap: 6 }}>
              Enter your own numbers <ArrowRight size={12} />
            </span>
          </button>
          <button onClick={onLoadSample}
            style={{ background: "transparent", color: ink, border: `1px solid ${ink}`, padding: "22px 24px", fontFamily: "'Fraunces', serif", fontSize: 22, fontStyle: "italic", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 8 }}>
            <span>See a sample</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontStyle: "normal", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "currentColor", opacity: 0.7, display: "flex", alignItems: "center", gap: 6 }}>
              Two-partner household demo <Sparkles size={12} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LOCAL STORAGE PERSISTENCE
// ============================================================
export const STORAGE_KEY = "stride_state_v1";
const CURRENT_VERSION = 1;

export function getStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === CURRENT_VERSION) {
      return parsed.data;
    }
    return null;
  } catch (e) {
    console.error("Failed to parse stored state:", e);
    return null;
  }
}

// ============================================================
// MAIN APP
// ============================================================
export default function CashflowApp() {
  const [income, setIncome] = useState(() => {
    const stored = getStoredState();
    return stored?.income || [];
  });
  const [expenses, setExpenses] = useState(() => {
    const stored = getStoredState();
    return stored?.expenses || [];
  });
  const [accounts, setAccounts] = useState(() => {
    const stored = getStoredState();
    return stored?.accounts || [];
  });
  const [debts, setDebts] = useState(() => {
    const stored = getStoredState();
    return stored?.debts || [];
  });
  const [blocks, setBlocks] = useState(() => {
    const stored = getStoredState();
    return stored?.blocks || [];
  });
  const [region, setRegion] = useState(() => {
    const stored = getStoredState();
    return stored?.region || "CA-ON";
  });
  const [horizon, setHorizon] = useState(() => {
    const stored = getStoredState();
    return stored?.horizon || 36;
  });
  const [hasStarted, setHasStarted] = useState(() => {
    const stored = getStoredState();
    return stored?.hasStarted || false;
  });

  // Side panel state
  const [panelMode, setPanelMode] = useState(null); // "template_picker" | "template_form" | "block_edit" | null
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [editingBlockId, setEditingBlockId] = useState(null);

  useEffect(() => {
    if (!hasStarted) return;
    const timer = setTimeout(() => {
      const stateToSave = {
        version: CURRENT_VERSION,
        data: { income, expenses, accounts, debts, blocks, region, horizon, hasStarted }
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, 500);
    return () => clearTimeout(timer);
  }, [income, expenses, accounts, debts, blocks, region, horizon, hasStarted]);

  const startDate = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);
  const endDate = useMemo(() => {
    const d = new Date(startDate); d.setMonth(d.getMonth() + horizon); return d;
  }, [startDate, horizon]);

  const { rows, startingBalance, totalDebt, debtTimelines } = useMemo(
    () => projectDaily(income, expenses, accounts, debts, blocks, startDate, endDate),
    [income, expenses, accounts, debts, blocks, startDate, endDate]
  );

  // Compute baseline (no scenarios) for comparison line
  // Locked blocks represent committed decisions — they participate in
  // the baseline (the "your committed plan" line on the chart).
  // Unlocked blocks are the toggleable what-ifs that compose on top.
  const lockedBlocks = useMemo(() => blocks.filter((b) => b.locked), [blocks]);

  const baseline = useMemo(() => {
    return projectDaily(income, expenses, accounts, debts, lockedBlocks, startDate, endDate);
  }, [income, expenses, accounts, debts, lockedBlocks, startDate, endDate]);

  // Per-block affordability. For unlocked scenarios, we evaluate against
  // a baseline that includes locked scenarios — so the affordability
  // accurately reflects "given everything I've committed to, can I also
  // do this?". Locked blocks don't need affordability checks (the
  // decision's been made).
  const affordabilities = useMemo(() => {
    const baseInputs = { income, expenses, accounts, debts, lockedBlocks };
    const map = {};
    blocks.forEach((b) => {
      if (b.locked) return;
      map[b.id] = computeAffordability(b, baseInputs, startDate, endDate);
    });
    return map;
  }, [blocks, lockedBlocks, income, expenses, accounts, debts, startDate, endDate]);

  const months = useMemo(() => monthlySummary(rows, startingBalance), [rows, startingBalance]);

  const milestones = useMemo(() => {
    const list = [];
    
    // 1. Income ends
    income.forEach((inc) => {
      if (inc.end) {
        const d = fromKey(inc.end);
        if (d >= startDate && d <= endDate) {
          list.push({
            id: `milestone_inc_${inc.id}`,
            date: inc.end,
            ts: d.getTime(),
            label: `${inc.name} Ends`,
            color: "#e88e8e"
          });
        }
      }
    });

    // 2. Expense ends
    expenses.forEach((exp) => {
      if (exp.end) {
        const d = fromKey(exp.end);
        if (d >= startDate && d <= endDate) {
          list.push({
            id: `milestone_exp_${exp.id}`,
            date: exp.end,
            ts: d.getTime(),
            label: `${exp.name} Ends`,
            color: "#e88e8e"
          });
        }
      }
    });

    // 3. Debt payoffs
    debtTimelines.forEach((timeline) => {
      if (timeline.payoffDate) {
        const d = new Date(timeline.payoffDate);
        if (d >= startDate && d <= endDate) {
          list.push({
            id: `milestone_debt_${timeline.name}`,
            date: toKey(d),
            ts: d.getTime(),
            label: `${timeline.name} Paid Off 🎉`,
            color: "#8fa8e0"
          });
        }
      }
    });

    return list;
  }, [income, expenses, debtTimelines, startDate, endDate]);

  const chartData = useMemo(() => {
    if (!rows.length && !baseline.rows.length) return [];
    // Build a date-keyed map merging baseline and scenario balances
    const baselineMap = {};
    baseline.rows.forEach((r) => { baselineMap[r.date] = r.balance; });
    const scenarioMap = {};
    rows.forEach((r) => { scenarioMap[r.date] = r.balance; });

    const allDates = new Set([toKey(startDate), ...Object.keys(baselineMap), ...Object.keys(scenarioMap)]);
    const sorted = Array.from(allDates).sort();

    // Forward-fill balances so the lines stay continuous
    let lastBase = startingBalance;
    let lastScen = startingBalance;
    return sorted.map((d) => {
      if (d in baselineMap) lastBase = baselineMap[d];
      if (d in scenarioMap) lastScen = scenarioMap[d];
      return { date: d, ts: fromKey(d).getTime(), baseline: lastBase, balance: lastScen };
    });
  }, [rows, baseline, startDate, startingBalance]);

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
    const ticks = []; const d = new Date(startDate); d.setDate(1);
    const step = horizon > 24 ? 3 : horizon > 12 ? 2 : 1;
    for (let i = 0; i <= horizon; i += step) {
      ticks.push(d.getTime()); d.setMonth(d.getMonth() + step);
    }
    return ticks;
  }, [startDate, horizon]);

  // CRUD for base data
  const updateIncome = (id, k, v) => setIncome((a) => a.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const addIncome = () => setIncome((a) => [...a, { id: `i_${Date.now()}`, partner: "Partner A", name: "", amount: "", frequency: "Biweekly (Friday)", start: toKey(startDate), end: "" }]);
  const delIncome = (id) => setIncome((a) => a.filter((r) => r.id !== id));
  const updateExpense = (id, k, v) => setExpenses((a) => a.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const addExpense = () => setExpenses((a) => [...a, { id: `e_${Date.now()}`, name: "", amount: "", due: "1", note: "", end: "" }]);
  const delExpense = (id) => setExpenses((a) => a.filter((r) => r.id !== id));
  const updateAccount = (id, k, v) => setAccounts((a) => a.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const addAccount = () => setAccounts((a) => [...a, { id: `a_${Date.now()}`, name: "", balance: "" }]);
  const delAccount = (id) => setAccounts((a) => a.filter((r) => r.id !== id));
  const updateDebt = (id, k, v) => setDebts((a) => a.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const addDebt = () => setDebts((a) => [...a, { id: `d_${Date.now()}`, name: "", balance: "", apr: "", minPayment: "", paymentDay: "1" }]);
  const delDebt = (id) => setDebts((a) => a.filter((r) => r.id !== id));

  // Blocks
  const openTemplatePicker = () => { setPanelMode("template_picker"); setActiveTemplate(null); setEditingBlockId(null); };
  const pickTemplate = (templateId) => { setActiveTemplate(templateId); setPanelMode("template_form"); };
  const saveNewBlock = ({ name, templateId, inputs, primitives }) => {
    setBlocks((b) => [...b, { id: `b_${Date.now()}`, name, templateId, inputs, primitives, active: true, locked: false }]);
    setPanelMode(null);
  };
  const createCustomBlock = () => {
    const id = `b_${Date.now()}`;
    setBlocks((b) => [...b, { id, name: "New scenario", templateId: null, primitives: [], active: true, locked: false }]);
    setEditingBlockId(id);
    setPanelMode("block_edit");
  };
  const openBlock = (id) => { setEditingBlockId(id); setPanelMode("block_edit"); };
  const updateBlock = (id, patch) => setBlocks((b) => b.map((bl) => (bl.id === id ? { ...bl, ...patch } : bl)));
  const updatePrimitive = (blockId, primIdx, newPrim) => {
    setBlocks((b) => b.map((bl) => {
      if (bl.id !== blockId) return bl;
      const next = [...bl.primitives];
      next[primIdx] = newPrim;
      return { ...bl, primitives: next };
    }));
  };
  const deletePrimitive = (blockId, primIdx) => {
    setBlocks((b) => b.map((bl) => {
      if (bl.id !== blockId) return bl;
      return { ...bl, primitives: bl.primitives.filter((_, i) => i !== primIdx) };
    }));
  };
  const addPrimitive = (blockId, type) => {
    const today = toKey(startDate);
    let newPrim;
    if (type === "one_time") newPrim = { type, label: "One-time event", amount: 0, date: today };
    else if (type === "recurring") newPrim = { type, label: "Recurring event", amount: 0, frequency: "monthly", startDate: today };
    else if (type === "amortized_loan") newPrim = { type, label: "Loan", principal: 0, apr: 5, termMonths: 60, startDate: today };
    else if (type === "income_change") newPrim = { type, label: "Income change", targetIncomeId: income[0]?.id || "", startDate: today, change: { kind: "pause" } };
    else if (type === "expense_change") newPrim = { type, label: "Expense change", targetExpenseId: expenses[0]?.id || "", startDate: today, change: { kind: "remove" } };
    setBlocks((b) => b.map((bl) => bl.id === blockId ? { ...bl, primitives: [...bl.primitives, newPrim] } : bl));
  };
  const toggleBlock = (id) => setBlocks((b) => b.map((bl) => (bl.id === id ? { ...bl, active: !bl.active } : bl)));
  // Locking commits a scenario as part of the baseline plan. Locked
  // scenarios always project (the active toggle is ignored) and feed
  // into the affordability calculations of unlocked ones.
  const toggleLock = (id) => setBlocks((b) => b.map((bl) => (bl.id === id ? {
    ...bl,
    locked: !bl.locked,
    active: !bl.locked ? true : bl.active, // when locking, ensure active too
    lockedAt: !bl.locked ? toKey(new Date()) : undefined,
  } : bl)));
  const deleteBlock = (id) => setBlocks((b) => b.filter((bl) => bl.id !== id));

  const loadSample = () => {
    setIncome(SAMPLE_INCOME); setExpenses(SAMPLE_EXPENSES); setAccounts(SAMPLE_ACCOUNTS); setDebts(SAMPLE_DEBTS);
    setHasStarted(true);
  };
  const startFresh = () => setHasStarted(true);
  const resetAll = () => {
    setIncome([]); setExpenses([]); setAccounts([]); setDebts([]); setBlocks([]);
    setHasStarted(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (!hasStarted) return <Welcome onLoadSample={loadSample} onStartFresh={startFresh} />;

  const hasInputs = income.length > 0 || expenses.length > 0 || accounts.length > 0 || debts.length > 0;
  const hasEnoughToProject = rows.length > 0 || accounts.length > 0 || debts.length > 0;
  const editingBlock = blocks.find((b) => b.id === editingBlockId);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0].payload;
    const delta = p.balance - p.baseline;
    return (
      <div style={{ background: paper, border: `1px solid ${ink}`, padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: ink, boxShadow: "4px 4px 0 rgba(26,22,20,0.15)" }}>
        <div style={{ marginBottom: 6, letterSpacing: "0.08em" }}>{fmtDate(fromKey(p.date))}</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500 }}>{fmtMoneyDetailed(p.balance)}</div>
        {blocks.some((b) => b.active) && Math.abs(delta) > 0.5 && (
          <div style={{ marginTop: 4, fontSize: 10, color: delta >= 0 ? green : red }}>
            {delta >= 0 ? "+" : ""}{fmtMoney(delta)} vs. baseline
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
              Household Ledger · Edition 02
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
            <select value={region} onChange={(e) => setRegion(e.target.value)}
              style={{ background: "transparent", border: `1px solid ${ink}`, padding: "6px 8px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.06em", color: ink, cursor: "pointer" }}>
              {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
            <button onClick={resetAll}
              style={{ background: "transparent", border: `1px solid ${ink}`, padding: "6px 10px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: ink, cursor: "pointer" }}>
              Reset
            </button>
          </div>
        </div>
      </header>

      <main style={{ padding: "32px 48px 64px", maxWidth: 1400, margin: "0 auto" }}>

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

        {hasEnoughToProject && (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, marginBottom: 40 }}>
              <NumberStat 
                label="Starting Balance" 
                value={fmtMoney(startingBalance)} 
                sub={`across ${accounts.length} account${accounts.length === 1 ? "" : "s"}`} 
                tooltipText="The sum of all your starting balances. This is where your financial projection begins today." 
              />
              <NumberStat
                label={`Ending · ${fmtMonth(toKey(endDate).slice(0, 7))}`}
                value={fmtMoney(stats.endBal)}
                tone={stats.endBal >= startingBalance ? "good" : "bad"}
                sub={stats.endBal >= startingBalance ? `+${fmtMoney(stats.endBal - startingBalance)} net` : `${fmtMoney(stats.endBal - startingBalance)} net`}
                tooltipText="Your projected total balance at the end of the horizon, representing your final net wealth."
              />
              <NumberStat
                label="Avg Monthly In · Out"
                value={fmtMoney(stats.monthlyIn - stats.monthlyOut)}
                tone={stats.monthlyIn - stats.monthlyOut >= 0 ? "good" : "bad"}
                sub={`${fmtMoney(stats.monthlyIn)} − ${fmtMoney(stats.monthlyOut)}`}
                tooltipText="Your average monthly income minus your average monthly expenses (including interest and debt minimum payments) over the horizon."
              />
              <NumberStat
                label="Lowest Projected"
                value={fmtMoney(stats.lowBal)}
                tone={stats.lowBal < 0 ? "bad" : stats.lowBal < 1000 ? undefined : "good"}
                sub={stats.lowBal < 0 ? "WARNING: goes negative" : "Stays above zero"}
                tooltipText="The lowest balance your accounts are projected to reach. If this falls below $0, your plan is 'underwater' (negative balance). If it stays above $0 but below $1,000, your plan is considered 'tight'."
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
                    {[12, 24, 36, 60].map((m) => (
                      <button key={m} onClick={() => setHorizon(m)}
                        style={{ background: horizon === m ? ink : "transparent", color: horizon === m ? paper : ink, border: `1px solid ${ink}`, padding: "5px 10px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, cursor: "pointer" }}>
                        {m}mo
                      </button>
                    ))}
                  </div>
                </div>

                {blocks.some((b) => b.active && !b.locked) && (
                  <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#5b544d", letterSpacing: "0.04em" }}>
                    <TooltipHelp text="Your projection incorporating all active (unlocked) scenarios/what-ifs.">
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 18, height: 2, background: ink }} /> With what-ifs
                      </span>
                    </TooltipHelp>
                    <TooltipHelp text="Your baseline projection containing only base cashflow and committed (locked) scenarios.">
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 18, height: 1, background: "#7a716a", borderTop: "1px dashed #7a716a" }} />
                        {lockedBlocks.length > 0 ? "Committed plan" : "Baseline"}
                      </span>
                    </TooltipHelp>
                  </div>
                )}

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
                      <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} ticks={monthTicks}
                        tickFormatter={(t) => {
                          const d = new Date(t);
                          return horizon > 24
                            ? d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).toUpperCase()
                            : d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
                        }}
                        tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: "#5b544d" }} stroke={ink} tickLine={false} />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: "#5b544d" }} stroke={ink} tickLine={false} width={56} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: ink, strokeDasharray: "3 3" }} />
                      <ReferenceLine y={0} stroke={red} strokeDasharray="4 4" />
                      {milestones.map((m) => (
                        <ReferenceLine
                          key={m.id}
                          x={m.ts}
                          stroke={m.color}
                          strokeWidth={1}
                          strokeDasharray="3 3"
                          label={{
                            value: m.label,
                            position: "top",
                            fill: "#7a716a",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 9
                          }}
                        />
                      ))}
                      <Area type="monotone" dataKey="balance" stroke="none" fill="url(#balFill)" isAnimationActive={false} />
                      {blocks.some((b) => b.active) && (
                        <Line type="monotone" dataKey="baseline" stroke="#7a716a" strokeWidth={1.25} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                      )}
                      <Line type="monotone" dataKey="balance" stroke={ink} strokeWidth={1.75} dot={false} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* SCENARIOS */}
            <section style={{ marginBottom: 48 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
                <SectionTitle kicker="Section II · Scenarios">
                  What <span style={{ fontStyle: "italic" }}>if</span>?
                </SectionTitle>
                <button onClick={openTemplatePicker}
                  style={{ background: ink, color: paper, border: `1px solid ${ink}`, padding: "8px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Plus size={14} /> New scenario
                </button>
              </div>

              {blocks.length === 0 ? (
                <div style={{ borderTop: `1px solid ${ink}`, padding: "20px 0", fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "#5b544d", fontSize: 16 }}>
                  No scenarios yet. Model a car purchase, a house, or a sabbatical — see how each one shifts the chart.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                  {[...blocks].sort((a, b) => (b.locked ? 1 : 0) - (a.locked ? 1 : 0)).map((b) => (
                    <ScenarioBlockCard key={b.id} block={b}
                      affordability={affordabilities[b.id]}
                      onToggle={() => toggleBlock(b.id)}
                      onLock={() => toggleLock(b.id)}
                      onOpen={() => openBlock(b.id)}
                      onDelete={() => deleteBlock(b.id)} />
                  ))}
                </div>
              )}
            </section>

            {/* Debt payoff */}
            {debts.length > 0 && (
              <section style={{ marginBottom: 48 }}>
                <SectionTitle kicker="Section III · Debt Payoff">
                  The <span style={{ fontStyle: "italic" }}>climb out</span>
                </SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))`, gap: 24, marginTop: 16 }}>
                  {debtTimelines.map((dt, i) => (
                    <div key={i} style={{ border: `1px solid ${ink}`, padding: "18px 20px", background: "#faf6ed" }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7a716a", marginBottom: 6 }}>{dt.name || "Untitled debt"}</div>
                      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 14, color: "#5b544d", marginBottom: 4 }}>Starting at <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: ink }}>{fmtMoney(dt.startBalance)}</span></div>
                      {dt.startBalance <= 0 ? (
                        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "#7a716a", marginTop: 8 }}>No balance yet.</div>
                      ) : dt.payoffDate ? (
                        <>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: green, marginTop: 12, marginBottom: 4 }}>Paid off</div>
                          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1 }}>{fmtDate(dt.payoffDate)}</div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#5b544d", marginTop: 8 }}>{fmtMoney(dt.totalPaid)} paid · {fmtMoney(dt.totalInterest)} interest</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: red, marginTop: 12, marginBottom: 4 }}>Not paid off</div>
                          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontStyle: "italic", lineHeight: 1.2 }}>Still owe {fmtMoney(dt.currentBalance)} after {horizon} months</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* EDITORS */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 40 }}>
          <div>
            <SectionTitle kicker={hasEnoughToProject ? "Inputs" : "Section I · Inputs"}>
              <TrendingUp size={22} style={{ display: "inline", marginRight: 8, verticalAlign: -3, color: green }} /> Income
            </SectionTitle>
            {income.length === 0 ? (
              <div style={{ borderTop: `1px solid ${ink}`, padding: "14px 0", fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "#7a716a", fontSize: 14 }}>
                No income yet. Add paychecks, freelance, or any recurring income.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${ink}` }}>
                    <th style={{ ...COL_STYLE, width: "16%" }}>Partner</th>
                    <th style={{ ...COL_STYLE, width: "22%" }}>Source</th>
                    <th style={{ ...COL_STYLE, width: "14%" }}>Amount</th>
                    <th style={{ ...COL_STYLE, width: "22%" }}>Frequency</th>
                    <th style={{ ...COL_STYLE, width: "13%" }}>Start</th>
                    <th style={{ ...COL_STYLE, width: "13%" }}>End</th>
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
                      <td style={tdStyle}><DatePickerCell value={r.start} onChange={(v) => updateIncome(r.id, "start", v)} /></td>
                      <td style={tdStyle}><DatePickerCell value={r.end || ""} onChange={(v) => updateIncome(r.id, "end", v)} placeholder="Ongoing" /></td>
                      <td style={tdStyle}><IconBtn onClick={() => delIncome(r.id)} title="Remove"><Trash2 size={14} /></IconBtn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <AddRowBtn onClick={addIncome}>Add Income</AddRowBtn>
          </div>

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
                    <th style={{ ...COL_STYLE, width: "26%" }}>Name</th>
                    <th style={{ ...COL_STYLE, width: "16%" }}>Amount</th>
                    <th style={{ ...COL_STYLE, width: "20%" }}>Due</th>
                    <th style={{ ...COL_STYLE, width: "16%" }}>Note</th>
                    <th style={{ ...COL_STYLE, width: "22%" }}>End</th>
                    <th style={{ ...COL_STYLE, width: "20px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((r) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid #e8e0d1` }}>
                      <td style={tdStyle}><InputCell value={r.name} onChange={(v) => updateExpense(r.id, "name", v)} placeholder="Rent" /></td>
                      <td style={tdStyle}><InputCell type="number" value={r.amount} onChange={(v) => updateExpense(r.id, "amount", v)} placeholder="0" /></td>
                      <td style={tdStyle}>
                        {r.note === "One-time" ? (
                          <DatePickerCell value={r.due} onChange={(v) => updateExpense(r.id, "due", v)} />
                        ) : (
                          <InputCell value={r.due} onChange={(v) => updateExpense(r.id, "due", v)} placeholder="1 or Weekly" />
                        )}
                      </td>
                      <td style={tdStyle}>
                        <Select value={r.note || "Recurring"} onChange={(v) => updateExpense(r.id, "note", v === "Recurring" ? "" : v)} options={["Recurring", "One-time"]} />
                      </td>
                      <td style={tdStyle}>
                        {r.note !== "One-time" && (
                          <DatePickerCell value={r.end || ""} onChange={(v) => updateExpense(r.id, "end", v)} placeholder="Ongoing" />
                        )}
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

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 40 }}>
          <div>
            <SectionTitle kicker="">
              <Wallet size={20} style={{ display: "inline", marginRight: 8, verticalAlign: -3 }} /> Starting balances
            </SectionTitle>
            {accounts.length === 0 ? (
              <div style={{ borderTop: `1px solid ${ink}`, padding: "14px 0", fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "#7a716a", fontSize: 14 }}>
                No accounts yet.
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

          <div>
            <SectionTitle kicker="">
              <CreditCard size={20} style={{ display: "inline", marginRight: 8, verticalAlign: -3, color: red }} /> Debts
            </SectionTitle>
            {debts.length === 0 ? (
              <div style={{ borderTop: `1px solid ${ink}`, padding: "14px 0", fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "#7a716a", fontSize: 14 }}>
                No debts.
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
          <span>{rows.length} dated events · {blocks.filter(b => b.active).length} of {blocks.length} scenarios active · {debts.length} debt{debts.length === 1 ? "" : "s"}</span>
        </footer>
      </main>

      {/* SIDE PANEL */}
      <SidePanel
        open={panelMode !== null}
        onClose={() => setPanelMode(null)}
        title={
          panelMode === "template_picker" ? "Choose a template"
          : panelMode === "template_form" && activeTemplate ? TEMPLATES[activeTemplate].name
          : panelMode === "block_edit" && editingBlock ? editingBlock.name
          : ""
        }
      >
        {panelMode === "template_picker" && (
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, lineHeight: 1.5, marginBottom: 24, color: "#3a342f" }}>
              Each scenario bundles a few cashflow events together. Toggle it on and off to see the effect on your forecast.
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7a716a", marginBottom: 10 }}>
              Templates
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
              {Object.values(TEMPLATES).map((t) => (
                <TemplatePickerCard key={t.id} template={t} onClick={() => pickTemplate(t.id)} />
              ))}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7a716a", marginBottom: 10 }}>
              Or build your own
            </div>
            <button
              onClick={createCustomBlock}
              style={{
                width: "100%",
                border: `1px dashed ${ink}`, background: "transparent", padding: "22px 20px", textAlign: "left",
                cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 16, transition: "all 0.15s ease",
                color: ink,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = ink; e.currentTarget.style.color = paper; e.currentTarget.style.borderStyle = "solid"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ink; e.currentTarget.style.borderStyle = "dashed"; }}
            >
              <Wrench size={22} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, marginBottom: 4, fontStyle: "italic" }}>Custom scenario</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, opacity: 0.8, lineHeight: 1.5 }}>
                  Start from a blank scenario and add events one at a time. Use this for anything not in the template list — leasing equipment, sponsoring a family member, a side business, etc.
                </div>
              </div>
            </button>
          </div>
        )}

        {panelMode === "template_form" && activeTemplate && (
          <TemplateForm
            template={TEMPLATES[activeTemplate]}
            region={region}
            income={income}
            onSave={saveNewBlock}
            onCancel={() => setPanelMode(null)}
          />
        )}

        {panelMode === "block_edit" && editingBlock && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7a716a", marginBottom: 4 }}>
                {editingBlock.templateId ? `Based on ${TEMPLATES[editingBlock.templateId]?.name || "template"}` : "Custom scenario"}
              </div>
              <input
                value={editingBlock.name}
                onChange={(e) => updateBlock(editingBlock.id, { name: e.target.value })}
                style={{ background: "transparent", border: "none", borderBottom: `1px solid ${ink}`, padding: "6px 0", fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 22, color: ink, width: "100%", outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              <button onClick={() => updateBlock(editingBlock.id, { active: !editingBlock.active })}
                style={{ background: editingBlock.active ? ink : "transparent", color: editingBlock.active ? paper : ink, border: `1px solid ${ink}`, padding: "8px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Power size={12} /> {editingBlock.active ? "Active" : "Inactive"}
              </button>
            </div>

            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: accent, marginBottom: 4 }}>
              Events ({editingBlock.primitives.length})
            </div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 13, fontStyle: "italic", color: "#5b544d", marginBottom: 16 }}>
              {editingBlock.templateId
                ? "The events this template generated. Edit or delete any of them, or add new ones below."
                : "Add cashflow events to model whatever you're trying to figure out."}
            </div>

            {editingBlock.primitives.length === 0 && (
              <div style={{ padding: "20px 0", fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "#7a716a", borderTop: `1px solid #d9d1c1` }}>
                No events yet. Add one below to start modeling this scenario.
              </div>
            )}

            {editingBlock.primitives.map((p, idx) => (
              <PrimitiveRow
                key={idx}
                p={p}
                onChange={(newP) => updatePrimitive(editingBlock.id, idx, newP)}
                onDelete={() => deletePrimitive(editingBlock.id, idx)}
                income={income}
                expenses={expenses}
              />
            ))}

            {/* Add event row */}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${ink}` }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>
                Add event
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <AddPrimitiveBtn onClick={() => addPrimitive(editingBlock.id, "one_time")} icon={Zap} label="One-time" hint="A single dated cashflow" />
                <AddPrimitiveBtn onClick={() => addPrimitive(editingBlock.id, "recurring")} icon={Repeat} label="Recurring" hint="Weekly/monthly/etc." />
                <AddPrimitiveBtn onClick={() => addPrimitive(editingBlock.id, "amortized_loan")} icon={CalIcon} label="Loan" hint="Principal, APR, term" />
                <AddPrimitiveBtn
                  onClick={() => addPrimitive(editingBlock.id, "income_change")}
                  icon={ArrowUpRight}
                  label="Income change"
                  hint="Pause, raise, replace existing income"
                  disabled={income.length === 0}
                />
                <AddPrimitiveBtn
                  onClick={() => addPrimitive(editingBlock.id, "expense_change")}
                  icon={ArrowDownRight}
                  label="Expense change"
                  hint="Remove or modify existing expense"
                  disabled={expenses.length === 0}
                />
              </div>
              {(income.length === 0 || expenses.length === 0) && (
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 12, fontStyle: "italic", color: "#7a716a", marginTop: 10 }}>
                  {income.length === 0 && expenses.length === 0
                    ? "Add income and expense rows in the main view to enable income/expense change events."
                    : income.length === 0
                    ? "Add an income row in the main view to enable income change events."
                    : "Add an expense row in the main view to enable expense change events."}
                </div>
              )}
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}