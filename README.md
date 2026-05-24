# VerityOS

Architecture-aware AI engineering reliability platform.

Repository: `Agent-Work`

VerityOS helps teams safely evolve existing software by combining repo intelligence, structured planning, controlled execution, runtime verification, and change explainability.

The core promise is simple: changes start with understanding and end with evidence.

## What Exists Now

- Product and architecture docs in `docs/`.
- Repo intelligence primitives:
  - file classification
  - lightweight symbol extraction
  - import dependency mapping
- Planning primitives:
  - intent interpretation
  - impacted system inference
  - risk assessment
  - ordered execution steps
  - validation plan
- Backend route:
  - `GET /api/plans` returns the example API shape
  - `POST /api/plans` creates a plan from a request
- Dry-run execution and report types.
- A clean Next.js App Router dashboard showing the first safe-refactor workflow.

## Product Name

Working name: **VerityOS**

Why it works:

- Verity signals truth, verification, and correctness.
- OS signals the long-term ambition: an operating layer for engineering work.
- The name avoids sounding like another prompt-to-app generator.

## Run Locally

Install dependencies, then start the app:

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run build
npm test
```

## Use the Website

1. Open the dashboard.
2. Review the current change request.
3. Inspect repo intelligence metrics.
4. Read the risk and blast-radius analysis.
5. Confirm the execution plan.
6. Run or approve the validation plan.
7. Use the report as the evidence trail for the change.

## Use the API

Create a change plan:

```bash
curl -X POST http://localhost:3000/api/plans \
  -H "Content-Type: application/json" \
  -d '{"request":"Add organization permissions"}'
```

The response includes:

- interpreted intent
- impacted files and systems
- risk level and reasons
- execution steps
- verification checks
- rollback strategy

## Product Loop

```mermaid
flowchart TD
  A["User request"] --> B["Repo intelligence"]
  B --> C["Change plan"]
  C --> D["Risk and blast radius"]
  D --> E["Approved execution"]
  E --> F["Runtime verification"]
  F --> G["Explainability report"]
```

## Next Build Steps

1. Add a filesystem-backed repo ingestion command.
2. Replace lightweight parsing with TypeScript compiler AST extraction.
3. Persist snapshots and architecture memory.
4. Add an approval-gated execution worker.
5. Run real verification checks and store results.
6. Add browser-based route and visual smoke checks.

## Advanced Direction

The strongest next version should include:

- Repository connection and snapshot history.
- Architecture memory with decision records.
- Interactive plan approval.
- Worker-specific execution logs.
- Visual route checks through browser automation.
- Diff previews before execution.
- Validation evidence stored per change.
- Rollback snapshots for every approved execution.
