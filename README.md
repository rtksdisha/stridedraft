# Cashflow & Forecast

A simple, editorial-styled household cashflow projection tool. Enter your income, expenses, accounts, and debts — get a daily-balance forecast, a monthly ledger, debt payoff dates, and a "when can we afford X?" calculator.

## Local development

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Deploy

```bash
npm run build
```

Outputs to `dist/`. Vercel auto-detects Vite — no configuration needed.

## Stack

- Vite + React 18
- Recharts for the forecast chart
- Lucide for icons
- Fraunces + JetBrains Mono (loaded from Google Fonts at runtime)

## Roadmap

See open issues for what's next.
