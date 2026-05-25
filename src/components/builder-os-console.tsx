"use client";

import { useMemo, useState } from "react";
import type { BuilderRun } from "@/lib/builder/app-builder";

type DeploymentTarget = "vercel" | "fly" | "render";

interface BuilderForm {
  idea: string;
  appType: string;
  targetUsers: string;
  brandStyle: string;
  authNeeded: boolean;
  paymentsNeeded: boolean;
  databaseNeeded: boolean;
  adminPanelNeeded: boolean;
  deploymentTarget: DeploymentTarget;
}

interface BuilderResponse {
  run: BuilderRun;
  error?: string;
}

const initialForm: BuilderForm = {
  idea: "Build a landing page for a mechanic shop with online booking",
  appType: "booking website",
  targetUsers: "local customers who need fast vehicle service scheduling",
  brandStyle: "clean industrial, trustworthy, mobile-first",
  authNeeded: false,
  paymentsNeeded: true,
  databaseNeeded: true,
  adminPanelNeeded: true,
  deploymentTarget: "vercel"
};

const pipeline = [
  "Idea",
  "Blueprint",
  "Template",
  "Repo files",
  "Sandbox preview",
  "QA",
  "Repair",
  "GitHub PR"
];

export function BuilderOSConsole() {
  const [form, setForm] = useState<BuilderForm>(initialForm);
  const [run, setRun] = useState<BuilderRun | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const activeFile = useMemo(() => run?.files.find((file) => file.path === selectedFile) ?? run?.files[0], [run, selectedFile]);

  async function generateBuilderRun() {
    setIsRunning(true);
    setError(null);
    setStatus("Generating blueprint and virtual repo");

    try {
      const response = await fetch("/api/builder/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = (await response.json()) as BuilderResponse;
      if (!response.ok) throw new Error(data.error ?? "Builder run failed.");
      setRun(data.run);
      setSelectedFile(data.run.files[0]?.path ?? null);
      setStatus("Blueprint and files ready for review");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Builder run failed.");
      setStatus("Blocked");
    } finally {
      setIsRunning(false);
    }
  }

  function updateForm<K extends keyof BuilderForm>(key: K, value: BuilderForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-steel">Builder OS</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">One controlled app-builder pipeline</h2>
        </div>
        <div className="rounded border border-line bg-white px-4 py-2 text-sm font-semibold text-graphite">{status}</div>
      </div>

      {error ? <div className="mb-4 rounded border border-critical/25 bg-critical/10 p-3 text-sm text-critical">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="rounded border border-line bg-white p-4">
          <p className="text-sm font-semibold uppercase text-steel">User Intake Wizard</p>
          <label className="mt-4 block text-sm font-semibold text-ink" htmlFor="idea">
            App idea
          </label>
          <textarea
            className="mt-2 min-h-24 w-full rounded border border-line bg-cloud p-3 text-sm leading-6 text-graphite"
            id="idea"
            onChange={(event) => updateForm("idea", event.target.value)}
            value={form.idea}
          />

          <div className="mt-3 grid gap-3">
            <Input label="App type" value={form.appType} onChange={(value) => updateForm("appType", value)} />
            <Input label="Target users" value={form.targetUsers} onChange={(value) => updateForm("targetUsers", value)} />
            <Input label="Brand style" value={form.brandStyle} onChange={(value) => updateForm("brandStyle", value)} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Toggle label="Auth" checked={form.authNeeded} onChange={(value) => updateForm("authNeeded", value)} />
            <Toggle label="Payments" checked={form.paymentsNeeded} onChange={(value) => updateForm("paymentsNeeded", value)} />
            <Toggle label="Database" checked={form.databaseNeeded} onChange={(value) => updateForm("databaseNeeded", value)} />
            <Toggle label="Admin panel" checked={form.adminPanelNeeded} onChange={(value) => updateForm("adminPanelNeeded", value)} />
          </div>

          <label className="mt-4 block text-sm font-semibold text-ink" htmlFor="deployment">
            Deployment target
          </label>
          <select
            className="mt-2 w-full rounded border border-line bg-cloud p-3 text-sm text-graphite"
            id="deployment"
            onChange={(event) => updateForm("deploymentTarget", event.target.value as DeploymentTarget)}
            value={form.deploymentTarget}
          >
            <option value="vercel">Vercel</option>
            <option value="fly">Fly.io</option>
            <option value="render">Render</option>
          </select>

          <button
            className="mt-4 w-full rounded bg-signal px-4 py-3 text-sm font-semibold text-white disabled:bg-steel"
            disabled={isRunning}
            onClick={() => void generateBuilderRun()}
            type="button"
          >
            {isRunning ? "Generating" : "Generate Blueprint + Repo"}
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded border border-line bg-white p-4">
            <div className="flex flex-wrap gap-2">
              {pipeline.map((step, index) => {
                const active = run ? index <= 3 : index === 0;
                const pending = run ? index > 3 : index > 0;
                return (
                  <div
                    className={`rounded px-3 py-2 text-xs font-semibold ${
                      active ? "bg-ink text-white" : pending ? "bg-cloud text-steel" : "bg-signal text-white"
                    }`}
                    key={step}
                  >
                    {step}
                  </div>
                );
              })}
            </div>
          </div>

          {run ? (
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <Panel title="Blueprint">
                  <Mini label="Template" value={run.blueprint.templateId} />
                  <Mini label="Project type" value={run.blueprint.projectType} />
                  <Mini label="Deploy" value={run.blueprint.deploymentTarget} />
                  <List title="Pages" items={run.blueprint.pages} />
                  <List title="Components" items={run.blueprint.components} />
                  <List title="API routes" items={run.blueprint.apiRoutes} />
                  {run.blueprint.databaseTables.length ? <List title="Database tables" items={run.blueprint.databaseTables} /> : null}
                </Panel>

                <Panel title="Approval Gates">
                  <div className="space-y-2">
                    {run.approvalGates.map((gate) => (
                      <div className="rounded bg-cloud p-3" key={gate.name}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-ink">{gate.name}</p>
                          <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-graphite">{gate.status}</span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-steel">{gate.reason}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              <div className="space-y-4">
                <Panel title="Generated Repo">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {run.repoStructure.map((path) => (
                      <code className="rounded bg-cloud px-2 py-1 text-xs font-semibold text-graphite" key={path}>
                        {path}
                      </code>
                    ))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                    <div className="space-y-2">
                      {run.files.map((file) => (
                        <button
                          className={`block w-full rounded border px-3 py-2 text-left text-xs font-semibold ${
                            activeFile?.path === file.path ? "border-ink bg-ink text-white" : "border-line bg-cloud text-graphite"
                          }`}
                          key={file.path}
                          onClick={() => setSelectedFile(file.path)}
                          type="button"
                        >
                          {file.path}
                        </button>
                      ))}
                    </div>
                    <pre className="max-h-96 overflow-auto rounded bg-[#0d1418] p-3 text-xs leading-5 text-[#e8eef2]">
                      {activeFile?.content ?? "No file selected."}
                    </pre>
                  </div>
                </Panel>

                <Panel title="QA + Quality Score">
                  <div className="grid gap-3 md:grid-cols-5">
                    {Object.entries(run.qualityScore).map(([key, value]) => (
                      <Mini key={key} label={key.replace(/([A-Z])/g, " $1")} value={String(value)} />
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {run.qaChecks.map((check) => (
                      <div className="rounded bg-cloud p-3" key={check.name}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-ink">{check.name}</p>
                          <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-graphite">{check.status}</span>
                        </div>
                        <p className="mt-1 text-sm text-steel">{check.evidence}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          ) : (
            <div className="rounded border border-dashed border-line bg-white p-8 text-center">
              <p className="text-xl font-semibold text-ink">Generate a blueprint to see the app builder pipeline.</p>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-steel">
                BootRise will choose a template, create the repo shape, generate starter files, list approval gates, and score the build before any dangerous action.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <input
        className="mt-2 w-full rounded border border-line bg-cloud p-3 text-sm font-normal text-graphite"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded border border-line bg-cloud p-3 text-sm font-semibold text-graphite">
      {label}
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded border border-line bg-white p-4">
      <p className="mb-3 text-sm font-semibold uppercase text-steel">{title}</p>
      {children}
    </article>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 rounded bg-cloud p-3">
      <p className="text-xs font-semibold uppercase text-steel">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase text-steel">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span className="rounded bg-cloud px-2 py-1 text-xs font-semibold text-graphite" key={item}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
