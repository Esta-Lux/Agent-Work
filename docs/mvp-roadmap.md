# VerityOS MVP Roadmap

## Phase 1: Safe Refactor Loop

Deliver the complete loop for local repositories:

1. Ingest repository files.
2. Build dependency and symbol summaries.
3. Produce a change plan.
4. Show risks and validations.
5. Execute approved file changes.
6. Run build/type/test checks.
7. Produce an explainability report.

Current scaffold already includes a dashboard, demo repo intelligence, planning API, repository analysis API, verification summary API, and repo health scoring.

## Phase 2: Runtime Awareness

Add real application signals:

- Route smoke tests.
- API contract checks.
- Browser visual checks.
- Runtime logs.
- Performance snapshots.

## Phase 3: Architecture Memory

Persist engineering judgment:

- Standards.
- Architectural decisions.
- Known constraints.
- Historical tradeoffs.
- Recurring failure modes.

## Phase 4: Self-Healing

Use verification failures to propose or apply bounded repairs with before/after validation.
