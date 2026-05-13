# Cashflow & Forecast — Roadmap Issues

Eight issues, prioritized roughly top-down: foundational gaps first, then features, then polish.

---

## Issue 1 — Persist data between sessions

**Labels:** `enhancement`, `priority:high`

Right now the app loses everything on refresh — a blocker for real use. Add automatic persistence so income, expenses, accounts, debts, goal, and horizon survive a reload.

**Acceptance criteria**
- App loads previous state on mount (graceful fallback if schema doesn't match).
- All edits auto-save (debounced to ~500ms).
- "Reset" button clears storage as well as state.
- Schema is versioned so future migrations are possible.

**Notes**
- `localStorage` is the obvious choice for v1. Scope is small (well under the 5 MB quota).
- Consider a one-time migration path in case we change shape later.

---

## Issue 2 — JSON export / import

**Labels:** `enhancement`, `priority:high`

Let users back up their data and move between devices. Adds trust for a tool that holds financial info.

**Acceptance criteria**
- "Export" button downloads a `.json` file with all current state and a schema version.
- "Import" button accepts a JSON file, validates it, and replaces current state (with a confirm dialog).
- Invalid files surface a clear error.

**Notes**
- Useful debugging tool too — paste edge-case data and see what the projection does.

---

## Issue 3 — Warn when a debt is growing

**Labels:** `bug`, `priority:high`

If the minimum payment is less than the monthly interest, the debt grows forever. The UI currently just says "not paid off in horizon," which is misleading.

**Acceptance criteria**
- Detect when monthly interest > min payment.
- Show an explicit warning state on the debt card ("This debt is growing — minimum payment doesn't cover monthly interest").
- Suggest the minimum payment needed to at least break even.

---

## Issue 4 — Debt strategy comparison (snowball vs avalanche)

**Labels:** `enhancement`, `priority:medium`

A high-value feature for households with multiple debts. Show what happens if extra cash goes to highest-APR (avalanche) vs smallest-balance (snowball) first.

**Acceptance criteria**
- Input: an "extra payment / month" slider or field.
- Compare two strategies side-by-side: total interest paid, total time to debt-free.
- Visualize as a small chart of total debt over time, one line per strategy.

**Notes**
- Should reuse the existing debt simulation engine, parameterized by extra-payment allocation.

---

## Issue 5 — What-if scenarios (toggle expenses/income on/off)

**Labels:** `enhancement`, `priority:medium`

Lets users explore "what if I cancel streaming?" or "what if I lose this contract?" without deleting data.

**Acceptance criteria**
- Each income/expense/debt row has an "active" toggle.
- Inactive rows are visually muted but kept.
- Optional "compare mode" overlays the active-only forecast against a baseline (all-rows-active) on the chart.

---

## Issue 6 — Mobile responsive layout

**Labels:** `enhancement`, `priority:medium`

The current layout assumes desktop width (1400px max, side-by-side tables). On mobile the editor tables overflow horizontally.

**Acceptance criteria**
- Stats grid collapses to 2×2 then 1 column.
- Editor tables convert to a card layout (label/value pairs stacked) below ~720px.
- Chart remains legible — fewer month ticks, smaller font.
- Welcome screen and "When can we afford" inputs stack vertically.

---

## Issue 7 — Smarter expense scheduling

**Labels:** `enhancement`, `priority:low`

The current "Due" field is overloaded: a number for day-of-month, "Weekly" for weekly, or a date for one-time. Works, but cryptic. Also limited — no biweekly or quarterly expenses, no semi-monthly (e.g. 15th and last day).

**Acceptance criteria**
- Replace single field with a `Frequency` dropdown like the income table.
- Support: Weekly, Biweekly, Semi-monthly, Monthly (day-of), Quarterly, Annual, One-time.
- Each frequency surfaces the right secondary input (start date, day-of-month, etc).
- Migration path for existing data.

---

## Issue 8 — Multiple goals + savings buckets

**Labels:** `enhancement`, `priority:low`

The "When can we afford X?" calculator only handles one goal. People typically have several (vacation, down payment, emergency fund). Also: real households allocate savings into buckets rather than a single pile.

**Acceptance criteria**
- Add a Goals table: name, target amount, priority.
- Show each goal as a horizontal line on the forecast chart with a different style.
- Calculate and display projected reach date for each.
- Stretch: model "save $X/month toward goal Y" as a virtual expense that builds a separate balance.

---

## Suggested labels to create

- `priority:high`, `priority:medium`, `priority:low`
- `enhancement`, `bug`
- `area:projection`, `area:ui`, `area:data`