import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  toKey,
  fromKey,
  projectDaily,
  getStoredState,
  STORAGE_KEY
} from "./CashflowApp";
import CashflowApp from "./CashflowApp";

// Mock Recharts to avoid jsdom rendering errors
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="recharts-container">{children}</div>,
  ComposedChart: ({ children }) => <div>{children}</div>,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
  Area: () => null,
  Line: () => null
}));

describe("Date Utilities", () => {
  it("formats Date to YYYY-MM-DD", () => {
    const d = new Date(2026, 5, 15); // June 15th, 2026
    expect(toKey(d)).toBe("2026-06-15");
  });

  it("parses YYYY-MM-DD to Date", () => {
    const d = fromKey("2026-06-15");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5); // 0-indexed June
    expect(d.getDate()).toBe(15);
  });
});

describe("Local Storage Persistence Logic", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null if nothing is stored", () => {
    expect(getStoredState()).toBeNull();
  });

  it("parses stored state if version matches", () => {
    const mockState = {
      version: 1,
      data: {
        income: [{ id: "i1", amount: 100 }],
        hasStarted: true
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockState));
    expect(getStoredState()).toEqual(mockState.data);
  });

  it("returns null if version mismatches", () => {
    const mockState = {
      version: 99,
      data: { income: [] }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockState));
    expect(getStoredState()).toBeNull();
  });
});

describe("Daily Projection End-Date Logic", () => {
  const startDate = new Date(2026, 5, 1); // June 1, 2026
  const endDate = new Date(2026, 5, 30); // June 30, 2026

  it("projects income streams until end of horizon if ongoing", () => {
    const income = [
      { id: "inc1", amount: "100", frequency: "Weekly", start: "2026-06-01", name: "Job" }
    ];
    const { rows } = projectDaily(income, [], [], [], [], startDate, endDate);
    // Weekly income on 1st, 8th, 15th, 22nd, 29th (5 instances)
    const incomeDays = rows.filter(r => r.income > 0);
    expect(incomeDays).toHaveLength(5);
  });

  it("cuts off income streams on or after the end date", () => {
    const income = [
      { id: "inc1", amount: "100", frequency: "Weekly", start: "2026-06-01", end: "2026-06-15", name: "Job" }
    ];
    const { rows } = projectDaily(income, [], [], [], [], startDate, endDate);
    // Weekly income on 1st, 8th, 15th (3 instances)
    const incomeDays = rows.filter(r => r.income > 0);
    expect(incomeDays).toHaveLength(3);
    
    // Check that 22nd has no freelance income (it should be excluded from sparse rows)
    const june22 = rows.find(r => r.date === "2026-06-22");
    expect(june22).toBeUndefined();
  });

  it("cuts off base recurring expenses on or after the end date", () => {
    const expenses = [
      { id: "exp1", amount: "50", due: "Weekly", note: "", end: "2026-06-15" }
    ];
    const { rows } = projectDaily([], expenses, [], [], [], startDate, endDate);
    // Weekly expense on 1st, 8th, 15th (3 instances)
    const expenseDays = rows.filter(r => r.expense > 0);
    expect(expenseDays).toHaveLength(3);
  });
});

describe("Interactive Tooltips UI", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("displays explanations when hovering over metric labels", async () => {
    // Load sample data via starting state to show stats grid
    const mockState = {
      version: 1,
      data: {
        hasStarted: true,
        income: [{ id: "i1", partner: "Partner A", name: "Salary", amount: 2000, frequency: "Monthly", start: "2026-06-01" }],
        expenses: [],
        accounts: [{ id: "a1", name: "Main", balance: 5000 }],
        debts: [],
        blocks: [],
        region: "CA-ON",
        horizon: 36
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockState));

    render(<CashflowApp />);

    // Query starting balance label
    const label = screen.getByText("Starting Balance");
    expect(label).toBeInTheDocument();

    // Hover to reveal tooltip
    fireEvent.mouseEnter(label);
    
    const tooltipText = await screen.findByText(/The sum of all your starting balances/);
    expect(tooltipText).toBeInTheDocument();

    // Mouse leave hides it
    fireEvent.mouseLeave(label);
    expect(screen.queryByText(/The sum of all your starting balances/)).toBeNull();
  });
});
