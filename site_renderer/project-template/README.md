# VertexOS Demo Site — Project Template

This is the base Next.js project every VertexOS "Generate Demo" run starts
from. It is not meant to be run as-is in production — it's copied per
generated demo (see `site_renderer/cli.ts`) and, from Sprint 6 onward, has
its `app/page.tsx` replaced with a real page composed from the selected
components for a specific business.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- TypeScript
- Tailwind CSS v4

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
