interface WorkflowStepProps {
  eyebrow: string;
  title: string;
  body: string;
}

export function WorkflowStep({ eyebrow, title, body }: WorkflowStepProps) {
  return (
    <div className="rounded border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase text-signal">{eyebrow}</p>
      <h3 className="mt-2 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-graphite">{body}</p>
    </div>
  );
}

