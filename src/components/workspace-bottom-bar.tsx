"use client";

import type { WorkspaceStep } from "@/components/workspace-ui";

const PRIMARY: Array<{ id: WorkspaceStep | "chat"; label: string; short: string }> = [
  { id: "connect", label: "Connect", short: "Connect" },
  { id: "chat", label: "Chat", short: "Chat" },
  { id: "fix", label: "Fix", short: "Fix" },
  { id: "verify", label: "Verify", short: "Verify" },
  { id: "export", label: "Export", short: "Export" }
];

export function WorkspaceBottomBar({
  activeStep,
  onStep,
  onChat,
  operationBusy
}: {
  activeStep: WorkspaceStep;
  onStep: (step: WorkspaceStep) => void;
  onChat: () => void;
  operationBusy: boolean;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line/90 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-lg xl:hidden"
      aria-label="Workspace quick navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
        {PRIMARY.map((item) => {
          const isChat = item.id === "chat";
          const isActive = isChat ? false : activeStep === item.id;
          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                disabled={operationBusy && !isChat}
                onClick={() => (isChat ? onChat() : onStep(item.id as WorkspaceStep))}
                className={`flex w-full cursor-pointer flex-col items-center rounded-xl px-1 py-2 text-center transition disabled:opacity-50 ${
                  isActive ? "bg-ink text-white" : "text-graphite hover:bg-cloud"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wide">{item.short}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
