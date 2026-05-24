# Using VerityOS

## Website Flow

VerityOS should feel like a clean engineering review room.

1. Connect a repository.
2. Ask for a change in normal engineering language.
3. Review the interpreted intent.
4. Inspect impacted systems, files, APIs, schemas, and blast radius.
5. Read the risk assessment.
6. Approve the execution plan.
7. Run validations.
8. Review the final report and rollback notes.

## API Flow

Analyze repository files:

```bash
curl -X POST http://localhost:3000/api/repositories/analyze \
  -H "Content-Type: application/json" \
  -d '{"files":[{"path":"src/lib/auth.ts","content":"export function requireUser() { return null; }"}]}'
```

Create a plan:

```bash
curl -X POST http://localhost:3000/api/plans \
  -H "Content-Type: application/json" \
  -d '{"request":"Move billing routes into the dashboard app group"}'
```

Expected response:

- product name
- plan id
- intent
- impact analysis
- risk assessment
- execution steps
- validation checks
- rollback strategy

Read verification requirements:

```bash
curl http://localhost:3000/api/verification
```

Run verification:

```bash
curl -X POST http://localhost:3000/api/verification \
  -H "Content-Type: application/json" \
  -d '{"planId":"plan_123"}'
```

Generate a diff preview:

```bash
curl -X POST http://localhost:3000/api/diffs \
  -H "Content-Type: application/json" \
  -d '{"planId":"plan_123"}'
```

Execute an approved preview run:

```bash
curl -X POST http://localhost:3000/api/executions \
  -H "Content-Type: application/json" \
  -d '{"planId":"plan_123","approved":true}'
```

## Clean UX Principles

- Show the plan before code changes.
- Keep risk visible.
- Keep validation visible.
- Keep rollback visible.
- Make every result explainable.
- Keep repo health visible before and after execution.
- Preview generated app and website surfaces before treating them as shippable.

## Advanced Product Ideas

- Repo connection wizard.
- Architecture memory editor.
- Change approval queue.
- Diff preview panel.
- Validation evidence timeline.
- Route smoke-test recorder.
- Visual regression gallery.
- Worker logs by domain.
- Risk trends over time.
- Health score drift after every change.
