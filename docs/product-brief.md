# VerityOS Product Brief

## Positioning

VerityOS is an engineering reliability platform for teams that need software systems to evolve safely.

It is not a prompt-to-app generator. The product exists to understand existing software, plan changes before editing, execute controlled refactors, and verify runtime behavior before declaring success.

## MVP

The first shippable product is an AI Safe Refactoring Platform.

Core jobs:

1. Build a repo map from source files, dependencies, routes, and runtime contracts.
2. Turn a user request into a structured change plan with blast radius and risk.
3. Execute refactors incrementally through bounded workers.
4. Verify builds, routes, API contracts, UI integrity, and rollback readiness.
5. Explain what changed, why it changed, and what risk remains.

## Non-Goals

- Autonomous agent swarms.
- Full deployment automation.
- Generic app generation.
- Personality systems.
- Heavy orchestration before the core loop works.

## Trust Contract

Every change must answer:

- What is the intent?
- What files and systems are affected?
- What can break?
- What validations prove the change works?
- What rollback exists if validation fails?
