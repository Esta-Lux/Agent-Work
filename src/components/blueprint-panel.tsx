const blueprintSteps = [
  "Interview the user before generating files.",
  "Infer core entities, pages, security rules, and database tables.",
  "Create test plan before UI implementation.",
  "Save the blueprint as the first architectural ledger entry."
];

export function BlueprintPanel() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-4">
      <div className="rounded border border-line bg-white p-5">
        <p className="text-sm font-semibold uppercase text-signal">Blank Canvas Mode</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">Blueprint before code</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-graphite">
          For brand-new projects, BootRise now has a blueprint endpoint that turns an interview into entities, pages,
          database tables, security rules, and a test plan before files are generated.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {blueprintSteps.map((step, index) => (
            <div key={step} className="rounded border border-line bg-cloud p-4">
              <p className="text-xs font-semibold uppercase text-steel">Step {index + 1}</p>
              <p className="mt-2 text-sm leading-6 text-graphite">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

