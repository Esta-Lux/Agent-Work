"use client";

export type WorkspaceV2Step = "connect" | "brief" | "fix" | "verify" | "export";
export type WorkflowStepStatus = "done" | "active" | "pending" | "locked";

export interface WorkflowStepDef {
  id: string;
  label: string;
  hint: string;
  status: WorkflowStepStatus;
  lockReason?: string;
}

interface WorkspaceRailProps {
  activeStep: WorkspaceV2Step;
  repoConnected: boolean;
  onStepChange: (step: WorkspaceV2Step) => void;
}

interface LegacyRailProps {
  steps: WorkflowStepDef[];
  onSelect: (step: never) => void;
  operatorFocus: {
    headline: string;
    whyItMatters: string;
    nextAction: { label: string; disabled?: boolean };
    onNextActionClick: () => void;
  };
  className?: string;
}

type WorkflowRailV2Props = WorkspaceRailProps | LegacyRailProps;

const steps: Array<{ id: WorkspaceV2Step; name: string; detail: string }> = [
  { id: "connect", name: "Connect", detail: "GitHub + files" },
  { id: "brief", name: "Brief", detail: "Files + product" },
  { id: "fix", name: "Fix", detail: "Report + diff" },
  { id: "verify", name: "Verify", detail: "Sandbox" },
  { id: "export", name: "Export", detail: "Bundle / push" }
];

const focus: Record<WorkspaceV2Step, string> = {
  connect: "Import real code so BootRise can index files and unlock scoped work.",
  brief: "Shape the product context that guides planning and export quality.",
  fix: "Describe one controlled change and review the blast radius before approval.",
  verify: "Run sandbox checks and inspect runtime proof before shipping.",
  export: "Download the bundle or push the approved work to a branch."
};

export function WorkflowRailV2(props: WorkflowRailV2Props) {
  if ("steps" in props) return <LegacyWorkflowRail {...props} />;
  const { activeStep, repoConnected, onStepChange } = props;
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-border-ws bg-panel-ws p-3">
      <div className="mb-3 px-2 font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Workflow</div>
      <ol className="space-y-1">
        {steps.map((step, index) => {
          const locked = !repoConnected && index > 0;
          const done = repoConnected && index < activeIndex;
          const active = step.id === activeStep;
          return (
            <li key={step.id} className="relative">
              <button
                type="button"
                disabled={locked}
                onClick={() => onStepChange(step.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition disabled:cursor-not-allowed ${
                  active
                    ? "border border-signal/30 bg-signal-glow text-signal-text"
                    : done
                      ? "bg-signal/10 text-signal-text"
                      : locked
                        ? "text-text-ws-3 opacity-60"
                        : "text-text-ws-2 hover:bg-white/5"
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] ${active ? "border-signal bg-signal text-white" : "border-border-ws-2"}`}>
                  {done ? "OK" : locked ? "-" : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{step.name}</span>
                  <span className="block truncate text-xs opacity-70">{step.detail}</span>
                </span>
              </button>
              {index < steps.length - 1 ? <div className="ml-6 h-3 w-px bg-border-ws" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
      <div className="mt-5 rounded-lg border border-signal/30 bg-signal-glow p-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-signal-text">Operator focus</p>
        <p className="mt-2 text-sm font-semibold text-text-ws-1">{steps.find((step) => step.id === activeStep)?.name}</p>
        <p className="mt-1 text-xs leading-5 text-text-ws-2">{focus[activeStep]}</p>
      </div>
    </aside>
  );
}

function LegacyWorkflowRail({ steps: legacySteps, onSelect, operatorFocus, className = "" }: LegacyRailProps) {
  return (
    <aside className={`flex flex-col gap-4 ${className}`} aria-label="Workflow rail">
      <div className="rounded-2xl border border-line bg-white p-3 shadow-sm">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-steel">Workflow</p>
        <ol className="space-y-1">
          {legacySteps.map((step, index) => {
            const locked = step.status === "locked";
            return (
              <li key={step.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onSelect(step.id as never)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    step.status === "active" ? "bg-ink text-white" : "bg-white text-graphite hover:bg-cloud"
                  }`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cloud font-mono text-[10px] text-steel">
                    {step.status === "done" ? "ok" : locked ? "lk" : index + 1}
                  </span>
                  <span>
                    <span className="block font-semibold">{step.label}</span>
                    <span className="text-steel">{locked ? step.lockReason ?? step.hint : step.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-signal">Operator focus</p>
        <p className="mt-2 text-sm font-semibold text-ink">{operatorFocus.headline}</p>
        <p className="mt-1 text-xs leading-5 text-graphite">{operatorFocus.whyItMatters}</p>
        <button
          type="button"
          disabled={operatorFocus.nextAction.disabled}
          onClick={operatorFocus.onNextActionClick}
          className="mt-3 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {operatorFocus.nextAction.label}
        </button>
      </div>
    </aside>
  );
}
