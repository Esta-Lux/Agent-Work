# BootRise control layer

BootRise is the **supervisor** for AI coding in large codebases — not another app builder.

## Product loop

1. **Context Gate** — confidence, questions, or proceed with assumptions  
2. **Context Governor + Project Brain** — minimum files (deep read / reference / excluded)  
3. **Scope Contract** — allowed edits, forbidden zones, diff budget  
4. **Patch + Hallucination + No-op guards** — block bad diffs before apply  
5. **Regression shield** — targeted verify (skip exec in dev with `BOOTRISE_SKIP_REGRESSION_EXEC=1`)  
6. **Safe-to-PR** — requires sandbox proof after approve  
7. **Agent council** — structured decisions (Lead, Builder, Security, QA, Runtime, Deployment)

## Senior architect mode

BootRise classifies each request (`src/lib/ai/task-intent.ts`) into **explain**, **review**, **fix**, **architecture**, **deep_dive**, or **security**, with a **context depth** tier (`light` / `standard` / `deep`).

- **Context governor** caps deep-read files and chars per file from the depth tier — fewer tokens on simple questions, wider context on audits and architecture work.
- **Chat** injects a short **architect brief** (product tradeoffs, scope lock, Brain rules) before the model sees excerpts; excerpts use `buildEfficientModelContext` (deep-read paths only, not the whole corpus).
- **Fix / patches / planners** use the same intent when selecting files and when building NVIDIA/OpenAI planner JSON.

Reply **"proceed with assumptions"** or use the UI button when the context gate needs clarification — scope lock still applies.

## AI routing

| Tier | Engine | When |
| --- | --- | --- |
| 0 | Deterministic scanners | Always first (imports, secrets, diff size) |
| 1 | BootRise AI (NVIDIA) | Default chat, fix, brain, reviews |
| 2 | ChatGPT / premium | User confirms `premiumApproved` + credits |

Premium is **not** auto-selected from risk alone — the UI must approve escalation.

## Key APIs

- `POST /api/workspace/context-pack` — preview task context before spend  
- `POST /api/workspace/chat` — `assumptionsApproved`, `premiumApproved`  
- `POST /api/workspace/fix` — same flags + `repositoryId` for brain + token budget  

## Local env

See `.env.example` for regression skip, review depth, and dev auth bypass (`docs/DEV.md`).
