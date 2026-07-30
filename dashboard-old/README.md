# VertexOS — Dashboard V1

A dark, data-dense SaaS dashboard for triaging scored business leads. Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, and framer-motion.

## Project layout

This app expects to live inside a project where the scoring data sits **one level above** the app folder:

```
your-project/
├── data/
│   └── scored.json        <- read by this app, never bundled/mocked
└── dashboard/              <- this app (whatever you name it)
    ├── app/
    ├── components/
    ├── lib/
    └── package.json
```

`lib/data.ts` reads `../data/scored.json` relative to the app's project root at request time — there is no build-time caching of the file's contents beyond a single in-memory cache per server instance, and no fallback mock data.

## Expected `scored.json` shape

An array of records. Field names are normalized in `lib/data.ts`, so any of the common aliases below work:

```jsonc
[
  {
    "slug": "acme-supply-co",              // optional — derived from name if omitted
    "name": "Acme Supply Co",              // or: business_name / businessName / company
    "address": "412 Industrial Way, Columbus, OH", // optional — or: location / full_address
    "website": "https://acmesupply.com",   // or: url / domain / site
    "score": 92,                           // or: lead_score / leadScore
    "issues": ["No visible phone number", "Slow mobile load time"],       // or: problems
    "recommendations": ["Add a click-to-call number", "Compress hero image"] // or: suggestions
  }
]
```

Score color coding (used throughout the UI):

- **≥ 90** — green
- **70–89** — yellow
- **< 70** — red

### Derived statuses (v2)

Two statuses are computed from existing fields — no new data required:

- **Offline** — true if `website` is empty, or an issue string matches a pattern like "offline", "404", "unreachable", "no website".
- **No Booking** — true if any issue string mentions "booking".

These power the KPI cards and the `Offline` / `No Booking` filter chips in `lib/types.ts` (`isOffline`, `hasBookingIssue`, `applyFilter`). The **Contacted** filter chip is a UI placeholder only — there's no "contacted" field in the schema yet, so it intentionally shows an empty state until that data exists.

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Pages

- `/` — KPI summary, filter chips, and a searchable/sortable table of every scored business
- `/business/[slug]` — full detail view: name, address, score, website, issues, recommendations, and an "Open website" link

## Components

- `components/dashboard/kpi-cards.tsx` — Total Leads / High Priority / Offline Websites / Average Score
- `components/dashboard/filter-chips.tsx` — animated segmented control (All / 90+ / Offline / No Booking / Contacted)
- `components/dashboard/leads-table.tsx` — search, sort, and filtering, orchestrating the above
- `components/dashboard/lead-actions.tsx` — per-row placeholder actions (View Audit links to the detail page; Generate Email / Generate Demo are UI-only stubs, since there's no backend)

## Notes

- No authentication, no database — this reads a static JSON file from disk on the server.
- `app/page.tsx` and `app/business/[slug]/page.tsx` are server components; the interactive pieces (KPI card hover, filter chips, search/sort table, row actions) are client components.
