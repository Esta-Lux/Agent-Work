# BootRise integration roadmap (open source + compose, don’t fork)

BootRise’s moat is the **control layer** (Project Brain, scope contract, context governor, patch/hallucination guards, Safe-to-PR, credits, provider policy). Open-source projects supply **editor shell, execution sandbox, static analysis, and repo indexing** — studied and composed, not forked wholesale.

## Current stack (Agent-Work repo)

| Area | Status | Notes |
| --- | --- | --- |
| Control layer | **Shipped** | Context gate, scope contract, patch guards, token budget, task intent, senior architect brief |
| Project Brain | **v1** | File indexer, modules, memory retriever, local + optional Supabase |
| Repo intelligence | **Partial** | `ast-analyzer`, `symbol-graph`, blast radius, context builder |
| GitHub | **App + PAT** | Installation JWT path; UI status on Connect tab; see `GITHUB_APP.md` |
| Preview / verify | **WebContainer** | In-browser npm; not full OpenHands sandbox |
| Security scan | **Shipped (Phase 1)** | Deterministic rules + optional Semgrep (`BOOTRISE_SEMGREP=1`); blocks deploy via readiness |
| Editor UI | **Shipped (Phase 1)** | Monaco editor (Files), diff viewer (plan approval + fix report) |
| Agent runtime | **Supervisor only** | NVIDIA/OpenAI planners; no autonomous SWE-agent loop |

## GitHub — finish rolling (operator checklist)

1. In [GitHub App settings](https://github.com/settings/apps): copy **App ID**, generate **private key**, note **slug**.
2. `.env.local`:
   ```env
   GITHUB_APP_ID=
   GITHUB_APP_PRIVATE_KEY=   # or GITHUB_APP_PRIVATE_KEY_PATH=
   GITHUB_APP_SLUG=
   ```
3. Install app on org/repo → optional `GITHUB_APP_INSTALLATION_ID`.
4. Restart `npm run dev` → Connect tab shows **Ready** → test full import on SnapRoad repo.
5. **Rotate client secret** if it was ever pasted in chat/logs.

Optional: `GITHUB_TOKEN=ghp_...` for fastest local dev (overrides App when set).

---

## Borrow vs build (aligned with your research)

### Integrate next (Phase 1 — highest ROI)

| Resource | Use for BootRise | Action |
| --- | --- | --- |
| **Monaco** | File editor, diff viewer, patch preview | **Done** — `src/components/monaco-*.tsx`, Files + approval panels |
| **Semgrep** | Security Center v1, block deploy on critical | **Done** — `semgrep-runner.ts` + Security panel + agent council blockers |
| **RepoMaster principles** | Brain v2, 95% token reduction story | Extend `symbol-graph` + module dependency graph + context pruning (already started) |
| **RepoReviewer patterns** | Multi-pass review, finding priority | Already have deterministic + multi-pass; align report UX |

### Phase 2 — shipped (supervisor patterns)

| Resource | BootRise module | Enable |
| --- | --- | --- |
| **OpenHands** | `src/lib/sandbox/sandbox-lifecycle.ts`, `sandbox-supervisor.ts`, `GET /api/workspace/sandbox/status` | `BOOTRISE_SANDBOX_LIFECYCLE=1` |
| **SWE-agent / Aider** | `src/lib/fix/issue-patch-loop.ts` wired in `workspace-fix.server.ts` | `BOOTRISE_FIX_LOOP_V2=1` |

BootRise stays **supervisor**: tool boundaries, patch guard on each loop iteration, no autonomous agent.

### Study further (Phase 3+)

| Resource | Use for BootRise | Do not |
| --- | --- | --- |
| **OpenHands** | Full remote sandbox workers | Replace control layer |
| **SWE-agent** | Env feedback from real CI | Become the product UI |
| **Aider** | CLI export for power users | CLI-first product |

### Defer (Phase 3+)

| Resource | When | Why wait |
| --- | --- | --- |
| **Theia / code-server** | Enterprise “full IDE” mode | Heavy; BootRise identity is control-first, not generic cloud IDE |
| **CodeQL** | After Semgrep | Heavier; GitHub-centric |
| **Sourcegraph-scale index** | Never full clone | BootRise needs task-scoped index, not global search product |
| **AutoGPT-style autonomy** | Avoid | Opposite of control layer |

### Already aligned (keep investing)

- **WebContainer** — MVP verify path (keep; cap file count).
- **ts-morph / ast-analyzer** — TS/TSX symbols; add Tree-sitter later for Python breadth.
- **Next.js + Supabase + GitHub** — correct backbone; don’t restart on another repo.

---

## Suggested experiment folders

```
experiments/
  monaco-workspace-spike/
  semgrep-security-spike/
  repo-graph-spike/          # RepoMaster-style pruning metrics
  openhands-sandbox-spike/   # read-only architecture study
```

Graduate winners into `src/lib/security`, `src/components/workspace`, `src/lib/project-brain`.

---

## Week-by-week (matches your MVP shortcut)

| Week | Focus | BootRise outcome |
| --- | --- | --- |
| 1 | Monaco + file tree + diff | Human edits + AI patch preview in workspace |
| 2 | Semgrep + Security tab | Findings → block Safe-to-deploy |
| 3 | Brain v2 (graphs) | Module + call graph drives context governor |
| 4 | Multi-pass + completion evaluator | Fewer vague replies; scoped fix units |

---

## One-line strategy

**Compose Monaco + Semgrep + graph-based Brain + WebContainer; study OpenHands/SWE-agent/Aider for loops; build and keep the control layer as the product.**
