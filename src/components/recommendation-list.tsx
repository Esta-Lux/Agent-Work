interface RecommendationListProps {
  items: string[];
}

export function RecommendationList({ items }: RecommendationListProps) {
  return (
    <section className="rounded border border-line bg-white p-5">
      <p className="text-sm font-semibold uppercase text-steel">Advanced Signals</p>
      <h2 className="mt-2 text-2xl font-semibold text-ink">What moves BootRise beyond builders</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="rounded border border-line bg-cloud p-4 text-sm leading-6 text-graphite">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

