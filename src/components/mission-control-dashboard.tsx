"use client";

import { useMemo, useState } from "react";

type MissionPhase = "preview" | "sandbox" | "commit";

interface RadarNode {
  id: string;
  label: string;
  type: "component" | "api" | "schema" | "service";
  x: number;
  y: number;
  risk: "stable" | "impacted" | "critical";
}

interface RadarEdge {
  from: string;
  to: string;
  risk: "stable" | "impacted" | "critical";
}

const phases: Array<{ id: MissionPhase; label: string; meter: number }> = [
  { id: "preview", label: "Architectural Preview", meter: 34 },
  { id: "sandbox", label: "Sandbox Concurrency", meter: 68 },
  { id: "commit", label: "Commit & Regression", meter: 100 }
];

const radarNodes: RadarNode[] = [
  { id: "settings", label: "SettingsPage", type: "component", x: 50, y: 18, risk: "impacted" },
  { id: "switcher", label: "OrgSwitcher", type: "component", x: 78, y: 38, risk: "impacted" },
  { id: "session", label: "getSession", type: "service", x: 62, y: 70, risk: "critical" },
  { id: "permissions", label: "canAccess", type: "service", x: 28, y: 68, risk: "critical" },
  { id: "orgRoute", label: "Org API", type: "api", x: 18, y: 38, risk: "impacted" },
  { id: "schema", label: "users table", type: "schema", x: 48, y: 48, risk: "stable" }
];

const radarEdges: RadarEdge[] = [
  { from: "settings", to: "switcher", risk: "impacted" },
  { from: "switcher", to: "session", risk: "critical" },
  { from: "session", to: "permissions", risk: "critical" },
  { from: "permissions", to: "orgRoute", risk: "critical" },
  { from: "orgRoute", to: "schema", risk: "impacted" },
  { from: "schema", to: "session", risk: "stable" }
];

const terminalLines = [
  "$ bootrise plan --intent \"Add organization permissions\"",
  "indexed 7 source files, 9 symbols, 6 dependency edges",
  "$ npm run typecheck",
  "src/server/api/organizations/route.ts:42 requires orgId guard",
  "self-healing loop 1: patched route guard and session boundary",
  "$ npm run build && npm test",
  "verified: build passed, test suite passed, route smoke passed"
];

const timeline = [
  {
    label: "ADR",
    title: "Auth remains server-authoritative",
    body: "Client helpers can guide UX, but every protected route must enforce permission checks."
  },
  {
    label: "Run 18",
    title: "Compile failure repaired",
    body: "The worker routed a missing orgId type error into a bounded patch and reran typecheck."
  },
  {
    label: "Run 29",
    title: "Schema pressure detected",
    body: "Database shape changes now require migration preview evidence before execution approval."
  },
  {
    label: "Now",
    title: "Organization permissions plan",
    body: "BootRise sees session, permission, route, schema, and component impact before edits begin."
  }
];

export function MissionControlDashboard() {
  const [phase, setPhase] = useState<MissionPhase>("preview");
  const [selectedNodeId, setSelectedNodeId] = useState("session");
  const [ledgerIndex, setLedgerIndex] = useState(timeline.length - 1);

  const selectedNode = radarNodes.find((node) => node.id === selectedNodeId) ?? radarNodes[0];
  const activePhase = phases.find((item) => item.id === phase) ?? phases[0];
  const ledger = timeline[ledgerIndex];

  const relatedEdges = useMemo(
    () => radarEdges.filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id),
    [selectedNode.id]
  );

  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-steel">Live Mission Control</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Interactive software architecture review</h2>
        </div>
        <div className="flex rounded border border-line bg-white p-1">
          {phases.map((item) => (
            <button
              key={item.id}
              className={`rounded px-3 py-2 text-sm font-semibold ${
                phase === item.id ? "bg-ink text-white" : "text-steel hover:bg-cloud"
              }`}
              onClick={() => setPhase(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded border border-line bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-steel">Blast Radius Radar</p>
                <p className="text-lg font-semibold text-ink">{selectedNode.label}</p>
              </div>
              <span className="rounded bg-amber-50 px-3 py-1 text-xs font-semibold text-caution">
                {relatedEdges.length} live links
              </span>
            </div>
            <div className="relative aspect-square overflow-hidden rounded border border-line bg-[#0d1418]">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" role="img" aria-label="Blast radius graph">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#263941" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="28" fill="none" stroke="#263941" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="14" fill="none" stroke="#263941" strokeWidth="0.5" />
                <line x1="50" y1="8" x2="50" y2="92" stroke="#263941" strokeWidth="0.5" />
                <line x1="8" y1="50" x2="92" y2="50" stroke="#263941" strokeWidth="0.5" />
                {radarEdges.map((edge) => {
                  const from = radarNodes.find((node) => node.id === edge.from);
                  const to = radarNodes.find((node) => node.id === edge.to);
                  if (!from || !to) return null;
                  const active = from.id === selectedNode.id || to.id === selectedNode.id;
                  return (
                    <line
                      key={`${edge.from}-${edge.to}`}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={edge.risk === "critical" ? "#f04438" : edge.risk === "impacted" ? "#f59e0b" : "#5ea391"}
                      strokeDasharray={active ? "0" : "2 2"}
                      strokeOpacity={active ? 0.95 : 0.42}
                      strokeWidth={active ? 1.2 : 0.55}
                    />
                  );
                })}
                {radarNodes.map((node) => {
                  const active = node.id === selectedNode.id;
                  return (
                    <g key={node.id} onClick={() => setSelectedNodeId(node.id)} className="cursor-pointer">
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={active ? 5.2 : 4}
                        fill={node.risk === "critical" ? "#f04438" : node.risk === "impacted" ? "#f59e0b" : "#5ea391"}
                        opacity={active ? 1 : 0.9}
                      />
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={active ? 8 : 5.8}
                        fill="none"
                        stroke={node.risk === "critical" ? "#f04438" : node.risk === "impacted" ? "#f59e0b" : "#5ea391"}
                        strokeOpacity={active ? 0.7 : 0.18}
                      />
                      <text x={node.x} y={node.y + 9.4} textAnchor="middle" fill="#e8eef2" fontSize="3">
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="grid gap-4">
            <CodeHealthMonitors />
            <SchemaVisualizer />
          </div>
        </div>

        <div className="grid gap-4">
          <LiveSandboxPanel phase={activePhase.label} meter={activePhase.meter} />
          <SelfHealingMonitor />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <ComponentMatrix />
        <AdminCommandCenter />
      </div>

      <div className="mt-4 rounded border border-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-steel">Living Ledger Time Machine</p>
            <p className="mt-1 text-lg font-semibold text-ink">{ledger.title}</p>
          </div>
          <span className="rounded bg-cloud px-3 py-1 text-sm font-semibold text-graphite">{ledger.label}</span>
        </div>
        <input
          className="mt-4 w-full accent-ink"
          max={timeline.length - 1}
          min={0}
          onChange={(event) => setLedgerIndex(Number(event.target.value))}
          type="range"
          value={ledgerIndex}
        />
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {timeline.map((item, index) => (
            <button
              className={`rounded border px-3 py-2 text-left ${
                index === ledgerIndex ? "border-ink bg-ink text-white" : "border-line bg-cloud text-graphite"
              }`}
              key={item.label}
              onClick={() => setLedgerIndex(index)}
              type="button"
            >
              <span className="text-xs font-semibold uppercase">{item.label}</span>
              <span className="mt-1 block text-sm font-semibold">{item.title}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-graphite">{ledger.body}</p>
      </div>
    </section>
  );
}

function CodeHealthMonitors() {
  const meters = [
    { label: "Type Safety Coverage", value: 94, tone: "bg-signal" },
    { label: "Bundle Impact", value: 12, suffix: "KB", tone: "bg-caution" },
    { label: "Architectural Entropy", value: 21, tone: "bg-ink" }
  ];

  return (
    <div className="rounded border border-line bg-white p-4">
      <p className="text-sm font-semibold text-steel">Code Health Pulse</p>
      <div className="mt-4 space-y-4">
        {meters.map((meter) => (
          <div key={meter.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-semibold text-graphite">{meter.label}</span>
              <span className="font-semibold text-ink">
                {meter.value}
                {meter.suffix ?? "%"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-cloud">
              <div className={`h-full rounded ${meter.tone}`} style={{ width: `${Math.min(meter.value, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SchemaVisualizer() {
  return (
    <div className="rounded border border-line bg-white p-4">
      <p className="text-sm font-semibold text-steel">Schema & Data Flow</p>
      <div className="mt-3 grid gap-3 text-sm">
        {[
          ["users", "id, email, role", "session route"],
          ["organizations", "id, owner_id, plan", "org API"],
          ["memberships", "user_id, org_id, permission", "RBAC middleware"]
        ].map(([table, fields, route]) => (
          <div className="rounded border border-line bg-cloud p-3" key={table}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-ink">{table}</span>
              <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-caution">migration watch</span>
            </div>
            <p className="mt-2 text-steel">{fields}</p>
            <p className="mt-1 font-semibold text-graphite">{route}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveSandboxPanel({ phase, meter }: { phase: string; meter: number }) {
  return (
    <div className="rounded border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-steel">Live Sandbox Cam</p>
          <p className="mt-1 text-lg font-semibold text-ink">{phase}</p>
        </div>
        <span className="rounded bg-signal px-3 py-1 text-xs font-semibold text-white">{meter}%</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <div className="min-h-56 rounded bg-[#0d1418] p-3 font-mono text-xs leading-6 text-[#c8facc]">
          {terminalLines.map((line) => (
            <p className={line.includes("requires") ? "text-[#ffd166]" : line.includes("verified") ? "text-[#7ee787]" : ""} key={line}>
              {line}
            </p>
          ))}
        </div>
        <div className="min-h-56 rounded border border-line bg-cloud p-3">
          <div className="rounded border border-line bg-white p-3">
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-critical" />
              <span className="h-2 w-2 rounded-full bg-caution" />
              <span className="h-2 w-2 rounded-full bg-signal" />
            </div>
            <div className="mt-4 rounded bg-ink p-3 text-white">
              <p className="text-xs uppercase text-white/60">Preview</p>
              <p className="mt-2 text-lg font-semibold">Organization Settings</p>
              <button className="mt-4 rounded bg-signal px-3 py-2 text-sm font-semibold" type="button">
                Switch organization
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded bg-cloud p-2 text-xs font-semibold text-graphite">RBAC hook ready</div>
              <div className="rounded bg-cloud p-2 text-xs font-semibold text-graphite">Route smoke pass</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelfHealingMonitor() {
  const steps = [
    ["Plan", "Blast radius locked", "passed"],
    ["Compile", "Missing orgId guard detected", "repaired"],
    ["Retry", "Patched route contract", "running"],
    ["Verify", "Build and tests passing", "passed"]
  ];

  return (
    <div className="rounded border border-line bg-white p-4">
      <p className="text-sm font-semibold text-steel">Self-Healing Monitor</p>
      <div className="mt-4 space-y-3">
        {steps.map(([stage, detail, state]) => (
          <div className="flex items-start gap-3" key={stage}>
            <span
              className={`mt-1 h-3 w-3 rounded-full ${
                state === "passed" ? "bg-signal" : state === "repaired" ? "bg-caution" : "bg-ink"
              }`}
            />
            <div>
              <p className="text-sm font-semibold text-ink">{stage}</p>
              <p className="text-sm text-steel">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComponentMatrix() {
  const before = ["DashboardLayout", "Sidebar", "SettingsPage", "OrgSwitcher"];
  const after = ["DashboardLayout", "Sidebar", "SettingsPage + org guard", "OrgSwitcher + membership context"];

  return (
    <div className="rounded border border-line bg-white p-4">
      <p className="text-sm font-semibold text-steel">Component Hierarchy Matrix</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-steel">Before</p>
          {before.map((item, index) => (
            <div className="mb-2 rounded border border-line bg-cloud p-2 text-sm text-graphite" key={item}>
              {"  ".repeat(index)}
              {item}
            </div>
          ))}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-steel">After</p>
          {after.map((item, index) => (
            <div className="mb-2 rounded border border-line bg-white p-2 text-sm font-semibold text-ink" key={item}>
              {"  ".repeat(index)}
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded bg-[#0d1418] p-3 font-mono text-xs leading-6 text-[#e8eef2]">
        <p>
          <span className="text-[#f04438]">-</span> export function canAccess()
        </p>
        <p>
          <span className="text-[#7ee787]">+</span> export function canAccess(userId, orgId, permission)
        </p>
      </div>
    </div>
  );
}

function AdminCommandCenter() {
  const metrics = [
    ["Active sessions", "12"],
    ["Fleet sandboxes", "7"],
    ["Diffs committed", "438"],
    ["First-pass success", "82%"],
    ["Time-to-plan", "4.2s"],
    ["Time-to-verify", "12.8s"]
  ];

  return (
    <div className="rounded border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-steel">Executive Command Center</p>
          <p className="mt-1 text-lg font-semibold text-ink">Platform nervous system</p>
        </div>
        <span className="rounded bg-critical px-3 py-1 text-xs font-semibold text-white">2 hard alerts</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div className="rounded border border-line bg-cloud p-3" key={label}>
            <p className="text-xs font-semibold uppercase text-steel">{label}</p>
            <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded border border-critical/30 bg-red-50 p-3">
        <p className="text-sm font-semibold text-critical">Crash & Breakage Telegraph</p>
        <p className="mt-2 text-sm leading-6 text-graphite">
          Auth refactor hit a route contract stall after five recovery loops. Snapshot preserved with raw terminal output.
        </p>
      </div>
    </div>
  );
}
