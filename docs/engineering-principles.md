# Engineering Principles

## Core Rule

The planner decides architecture. Executors only perform approved steps.

## Edit Policy

- Small changes before large rewrites.
- Validate after each meaningful step.
- Prefer existing project patterns.
- Keep rollback metadata for every executed plan.
- Report uncertainty plainly.

## Risk Levels

- Low: Localized edits with existing tests.
- Medium: Multi-file changes, route changes, shared state, or new dependencies.
- High: Auth, billing, migrations, data loss risk, infra, or security boundaries.

## Done Means Verified

A change is not done when code compiles. It is done when the declared validation plan passes or the remaining risk is explicit.

