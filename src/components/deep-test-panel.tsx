import { getDeepTestReport } from "@/lib/admin/deep-tests";

const tone = {
  pass: "bg-signal text-white",
  partial: "bg-amber-50 text-caution",
  fail: "bg-red-50 text-critical"
};

export function DeepTestPanel() {
  const report = getDeepTestReport();

  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-steel">Deep QA</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">What is strong, weak, or still missing</h2>
        </div>
        <a className="rounded border border-line bg-white px-4 py-2 text-sm font-semibold text-graphite" href="/api/admin/deep-tests">
          View QA JSON
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded border border-line bg-white p-4">
          <p className="text-sm font-semibold uppercase text-steel">Overall Score</p>
          <p className="mt-2 text-5xl font-semibold text-ink">{report.score}%</p>
          <p className="mt-4 text-sm leading-6 text-graphite">{report.luxAssessment.summary}</p>
          <div className="mt-4 space-y-2">
            {report.luxAssessment.adoptedIdeas.map((idea) => (
              <div className="rounded bg-cloud p-3 text-sm font-semibold text-graphite" key={idea}>
                {idea}
              </div>
            ))}
          </div>
        </article>

        <div className="grid gap-4 md:grid-cols-2">
          {report.results.map((result) => (
            <article className="rounded border border-line bg-white p-4" key={result.name}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-ink">{result.name}</h3>
                <span className={`rounded px-2 py-1 text-xs font-semibold ${tone[result.status]}`}>{result.status}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-graphite">{result.evidence}</p>
              <p className="mt-4 text-sm font-semibold text-steel">{result.nextFix}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
