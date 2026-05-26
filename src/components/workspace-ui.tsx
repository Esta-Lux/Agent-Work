"use client";

import type { ReactNode } from "react";
import { StatusPill } from "@/components/status-pill";

export type WorkspaceStep = "connect" | "plan" | "fix" | "verify" | "export";

const STEPS: Array<{ id: WorkspaceStep; label: string; hint: string }> = [
  { id: "connect", label: "Connect", hint: "GitHub + files" },
  { id: "plan", label: "Plan", hint: "Chat + brief" },
  { id: "fix", label: "Fix", hint: "Report + diff" },
  { id: "verify", label: "Verify", hint: "Sandbox" },
  { id: "export", label: "Export", hint: "Bundle / push" }
];

export function WorkspaceStepRail({
  active,
  onChange,
  completed
}: {
  active: WorkspaceStep;
  onChange: (step: WorkspaceStep) => void;
  completed: Partial<Record<WorkspaceStep, boolean>>;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1">
      {STEPS.map((step) => {
        const done = completed[step.id];
        const isActive = active === step.id;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onChange(step.id)}
            className={`flex min-w-[4.5rem] flex-1 cursor-pointer flex-col rounded-md px-2 py-2 text-left transition ${
              isActive ? "bg-ink text-white" : "text-graphite hover:bg-cloud"
            }`}
          >
            <span className="text-xs font-semibold">{step.label}</span>
            <span className={`text-[10px] ${isActive ? "text-white/80" : "text-steel"}`}>{step.hint}</span>
            {done ? <span className={`mt-0.5 text-[10px] ${isActive ? "text-signal" : "text-signal"}`}>✓</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function WorkspaceTabs({
  active,
  onChange,
  tabs
}: {
  active: string;
  onChange: (id: string) => void;
  tabs: Array<{ id: string; label: string; badge?: string }>;
}) {
  return (
    <div className="flex border-b border-line">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`relative cursor-pointer px-4 py-3 text-sm font-semibold ${
            active === tab.id ? "text-ink" : "text-steel hover:text-graphite"
          }`}
        >
          {tab.label}
          {tab.badge ? (
            <span className="ml-1.5 rounded-full bg-cloud px-1.5 py-0.5 text-[10px] font-semibold text-graphite">
              {tab.badge}
            </span>
          ) : null}
          {active === tab.id ? <span className="absolute inset-x-2 bottom-0 h-0.5 bg-signal" /> : null}
        </button>
      ))}
    </div>
  );
}

export function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

export function FileList({
  files,
  selectedPath,
  onSelect
}: {
  files: Array<{ path: string }>;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  return <FileTreeExplorer files={files} selectedPath={selectedPath} onSelect={onSelect} maxTreeHeight="12rem" />;
}

export function FileTreeExplorer({
  files,
  selectedPath,
  onSelect,
  maxTreeHeight = "12rem"
}: {
  files: Array<{ path: string }>;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  maxTreeHeight?: string;
}) {
  if (files.length === 0) {
    return <p className="text-sm text-steel">No files yet. Connect GitHub or upload files.</p>;
  }

  const tree = buildPathTree(files.map((f) => f.path));

  return (
    <div className="overflow-y-auto rounded-lg border border-line bg-cloud/40 p-2" style={{ maxHeight: maxTreeHeight }}>
      <TreeNodes nodes={tree} selectedPath={selectedPath} onSelect={onSelect} depth={0} />
    </div>
  );
}

type TreeNode = { name: string; path?: string; children: TreeNode[] };

function buildPathTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const fullPath of paths.sort((a, b) => a.localeCompare(b))) {
    const parts = fullPath.split("/");
    let level = root;
    let prefix = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      prefix = prefix ? `${prefix}/${part}` : part;
      const isFile = i === parts.length - 1;
      let node = level.find((n) => n.name === part);
      if (!node) {
        node = { name: part, path: isFile ? fullPath : undefined, children: [] };
        level.push(node);
      }
      if (isFile) node.path = fullPath;
      level = node.children;
    }
  }
  return root;
}

function TreeNodes({
  nodes,
  selectedPath,
  onSelect,
  depth
}: {
  nodes: TreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth: number;
}) {
  return (
    <ul className={depth === 0 ? "space-y-0.5" : "ml-3 border-l border-line/60 pl-2"}>
      {nodes.map((node) => (
        <li key={node.path ?? node.name}>
          {node.path ? (
            <button
              type="button"
              onClick={() => onSelect(node.path!)}
              className={`w-full cursor-pointer truncate rounded px-2 py-1 text-left font-mono text-[11px] ${
                selectedPath === node.path ? "bg-ink text-white" : "text-graphite hover:bg-white"
              }`}
              title={node.path}
            >
              {node.name}
            </button>
          ) : (
            <p className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel">{node.name}</p>
          )}
          {node.children.length > 0 ? (
            <TreeNodes nodes={node.children} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Persistent activity strip above chat — planning, import, fix, verify. */
export function ActivityConsole({
  label,
  steps,
  detail
}: {
  label: string;
  steps: Array<{ id: string; label: string; status: string; detail?: string }>;
  detail?: string;
}) {
  return (
    <div className="shrink-0 border-b border-signal/25 bg-gradient-to-b from-signal/8 to-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-signal">{label}</p>
        {detail ? <p className="max-w-[60%] truncate text-[11px] text-steel">{detail}</p> : null}
      </div>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {steps.map((step) => (
          <li key={step.id} className="flex gap-2 rounded-md bg-white/80 px-2 py-1 text-xs text-graphite">
            <span className="font-mono text-steel">
              {step.status === "done" ? "✓" : step.status === "active" ? "…" : "○"}
            </span>
            <span className="min-w-0 truncate">
              <span className="font-medium text-ink">{step.label}</span>
              {step.detail ? <span className="text-steel"> — {step.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EngineToggle({
  provider,
  onChange,
  mode,
  onModeChange,
  bootriseOk,
  openaiOk
}: {
  provider: "bootrise" | "openai";
  onChange: (p: "bootrise" | "openai") => void;
  mode: "fast" | "deep" | "security" | "premium";
  onModeChange: (mode: "fast" | "deep" | "security" | "premium") => void;
  bootriseOk: boolean;
  openaiOk: boolean;
}) {
  const modes: Array<{ id: "fast" | "deep" | "security" | "premium"; label: string; title: string }> = [
    { id: "fast", label: "Fast", title: "Default BootRise AI for small and medium tasks" },
    { id: "deep", label: "Deep", title: "More context for larger architecture questions" },
    { id: "security", label: "Security", title: "Sensitive auth, data, billing, and deployment review" },
    { id: "premium", label: "Premium", title: "Premium model escalation with credit approval" }
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-line bg-white p-0.5 shadow-sm">
        <button
          type="button"
          className={`cursor-pointer rounded-md px-3 py-2 text-xs font-semibold ${provider === "bootrise" ? "bg-ink text-white" : "text-graphite"}`}
          onClick={() => onChange("bootrise")}
        >
          BootRise
        </button>
        <button
          type="button"
          className={`cursor-pointer rounded-md px-3 py-2 text-xs font-semibold ${provider === "openai" ? "bg-ink text-white" : "text-graphite"}`}
          onClick={() => onChange("openai")}
        >
          ChatGPT
        </button>
      </div>
      <div className="inline-flex rounded-lg border border-line bg-white p-0.5 shadow-sm">
        {modes.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.title}
            className={`cursor-pointer rounded-md px-2.5 py-2 text-xs font-semibold ${
              mode === item.id ? "bg-signal text-white" : "text-graphite"
            }`}
            onClick={() => {
              onModeChange(item.id);
              if (item.id === "premium") onChange("openai");
              if (item.id !== "premium" && provider === "openai") onChange("bootrise");
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <StatusPill
        label={provider === "bootrise" ? (bootriseOk ? "BootRise ready" : "BootRise offline") : openaiOk ? "ChatGPT ready" : "ChatGPT offline"}
      />
    </div>
  );
}

export function LiveWorkBanner({
  steps,
  label
}: {
  label: string;
  steps: Array<{ id: string; label: string; status: string; detail?: string }>;
}) {
  return (
    <div className="border-b border-signal/30 bg-signal/5 px-4 py-3">
      <p className="text-xs font-semibold uppercase text-signal">{label}</p>
      <ul className="mt-2 space-y-1">
        {steps.map((step) => (
          <li key={step.id} className="flex gap-2 text-xs text-graphite">
            <span className="font-mono text-steel">
              {step.status === "done" ? "✓" : step.status === "active" ? "…" : "○"}
            </span>
            <span>
              <span className="font-medium text-ink">{step.label}</span>
              {step.detail ? <span className="text-steel"> — {step.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
