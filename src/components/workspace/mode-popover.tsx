"use client";

import { useState } from "react";
import { CommandButton } from "@/components/ui/command-button";

export type WorkspaceRole = "architect" | "developer" | "devops";
export type WorkspaceProvider = "bootrise" | "openai";
export type WorkspaceSpeed = "fast" | "deep" | "security" | "premium";

interface ModePopoverProps {
  role: WorkspaceRole;
  provider: WorkspaceProvider;
  speed: WorkspaceSpeed;
  onRoleChange: (role: WorkspaceRole) => void;
  onProviderChange: (provider: WorkspaceProvider) => void;
  onSpeedChange: (speed: WorkspaceSpeed) => void;
}

export function ModePopover({ role, provider, speed, onRoleChange, onProviderChange, onSpeedChange }: ModePopoverProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <CommandButton theme="workspace" variant="ghost" size="sm" label="Mode" onClick={() => setOpen((value) => !value)} />
      {open ? (
        <div className="absolute right-0 top-10 z-30 w-80 rounded-lg border border-border-ws bg-panel-ws p-3 shadow-2xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Role</p>
          <div className="mt-2 grid gap-2">
            {[
              ["architect", "Architect", "System design & safety"],
              ["developer", "Developer", "Files & implementation"],
              ["devops", "DevOps", "CI, deploy & verify"]
            ].map(([id, label, detail]) => (
              <button
                key={id}
                type="button"
                onClick={() => onRoleChange(id as WorkspaceRole)}
                className={`rounded-lg px-3 py-2 text-left ${role === id ? "bg-signal-glow text-signal-text" : "bg-card-ws text-text-ws-2 hover:bg-white/5"}`}
              >
                <span className="block text-sm font-medium">{label}</span>
                <span className="text-xs text-text-ws-3">{detail}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Model</p>
          <div className="mt-2 flex rounded-lg bg-card-ws p-1">
            {[
              ["bootrise", "BootRise"],
              ["openai", "ChatGPT"]
            ].map(([id, label]) => (
              <button key={id} type="button" onClick={() => onProviderChange(id as WorkspaceProvider)} className={`h-8 flex-1 rounded-md text-xs font-medium ${provider === id ? "bg-signal text-white" : "text-text-ws-2"}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-text-ws-3">Speed</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["fast", "deep", "security", "premium"] as const).map((item) => (
              <button key={item} type="button" onClick={() => onSpeedChange(item)} className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${speed === item ? "bg-signal text-white" : "bg-card-ws text-text-ws-2"}`}>
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
