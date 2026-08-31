# Sprint 8 — Installation / Integration

This zip is **not standalone** — it's an overlay meant to be extracted into
your existing VertexOS repo checkout, not run on its own. It contains only
what Sprint 8 added or changed.

## 1. Extract into your repo root

Extract this zip's contents so they merge into the root of your VertexOS
checkout — the same level as your existing `ai/`, `dashboard/`, `data/`,
`analyzer/`, `scraper/`, `reports/` folders:

```
VertexOS/                        <- your existing repo root
├── ai/
│   ├── scorer.py                <- already there, untouched
│   └── providers/                <- NEW, from this zip
│       ├── __init__.py
│       ├── base.py
│       └── ollama_provider.py
├── data/
│   ├── scored.json               <- already there — REQUIRED, see below
│   └── ...                       <- your other existing data files, untouched
├── demo_generator/                <- NEW, from this zip
│   ├── context_builder.py
│   ├── industry_profiles.py
│   ├── pipeline.py
│   ├── site_spec_schema.py
│   ├── prompts/
│   └── fixtures/
└── ... (dashboard/, analyzer/, scraper/, reports/ — all untouched)
```

## 2. `data/scored.json` — nothing to add

`context_builder.py` reads `data/scored.json` via a path computed relative
to its own location (`demo_generator/../data/scored.json`, i.e. repo-root
`data/scored.json`). Since `data/scored.json` already exists in your repo
at exactly that path, **no action is needed** — it'll resolve correctly
the moment `demo_generator/` sits at your repo root alongside `data/`.

If your `scored.json` isn't populated yet, run your existing
scraper → analyzer → scorer pipeline first; `context_builder.py` doesn't
generate that file, it only reads it.

## 3. Dependencies

No new dependencies. Your existing `requirements.txt` already has
`pydantic` and `requests`, which is everything Sprint 8 needs.

```bash
pip install -r requirements.txt
```

## 4. Run it

```bash
# from your repo root
python -m demo_generator.pipeline --slug <slug>
```

Get a real slug from your data:
```bash
python3 -c "from demo_generator.context_builder import list_available_slugs; print(list_available_slugs()[:5])"
```

By default this calls a local Ollama server (`http://localhost:11434`,
model `qwen2.5:7b`) — install/run Ollama and pull that model, or set
`OLLAMA_MODEL` to whatever you have pulled. **If Ollama isn't running,
the pipeline does NOT crash** — it retries, then falls back to a
deterministic (non-AI) spec and still writes valid output. This is by
design (see the Sprint 8 summary) and is exactly what I could verify in
my own sandbox, since I don't have Ollama access there either.

## 5. About `demo_generator/fixtures/generated/*.json` in this zip

These four files are **my own test-run output** from running the pipeline
against your real `scored.json` during verification (via the fallback
path, since I had no Ollama access). They're included as evidence of what
I tested, not as something you need to keep — safe to delete or
regenerate; `pipeline.py` will happily overwrite them.
