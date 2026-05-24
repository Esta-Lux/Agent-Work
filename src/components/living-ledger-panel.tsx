import { StatusPill } from "@/components/status-pill";
import { blastRadiusSql } from "@/lib/memory/blast-radius";

const memoryLayers = [
  {
    title: "Static Memory",
    label: "The Graph",
    body: "Compiler-backed symbol maps track exports, file paths, calls, routes, schemas, and type surfaces."
  },
  {
    title: "Epistemic Memory",
    label: "The Why Registry",
    body: "Architectural intent, rules, and scar tissue stay attached to symbols before any mutation runs."
  },
  {
    title: "Dynamic Memory",
    label: "The Pulse",
    body: "Sandbox logs, failed checks, runtime signals, and past runs feed back into the next plan."
  }
];

export function LivingLedgerPanel() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-4">
      <div className="rounded border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-signal">Architectural Time Travel</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">The Living Ledger</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-graphite">
              VerityOS treats software changes like state transitions. It indexes what exists, remembers why it exists,
              captures what happened during verification, and uses that memory before future edits.
            </p>
          </div>
          <StatusPill label="State-aware compiler" tone="low" />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {memoryLayers.map((layer) => (
            <div key={layer.title} className="rounded border border-line bg-cloud p-4">
              <p className="text-xs font-semibold uppercase text-steel">{layer.label}</p>
              <h3 className="mt-2 text-base font-semibold text-ink">{layer.title}</h3>
              <p className="mt-2 text-sm leading-6 text-graphite">{layer.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded border border-line bg-ink p-4 text-white">
            <p className="text-sm font-semibold uppercase text-white/60">Deterministic Loop</p>
            <p className="mt-3 text-sm leading-6 text-white/75">
              User intent moves through memory, plan approval, diff preview, sandbox verification, and commit evidence.
              Failed verification becomes scar tissue instead of disappearing into terminal scrollback.
            </p>
          </div>
          <div className="rounded border border-line bg-cloud p-4">
            <p className="text-sm font-semibold text-ink">Recursive Blast Radius</p>
            <pre className="mt-3 max-h-48 overflow-auto rounded bg-white p-3 text-xs leading-5 text-graphite">
              {blastRadiusSql}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

