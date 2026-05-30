import type { AgentEventLogEntry } from "@/lib/memory/agent-event-log";

export function summarizeConversationEvents(events: AgentEventLogEntry[]): string {
  if (events.length === 0) return "No prior agent events recorded.";
  const recent = events.slice(-8);
  const lines = recent.map((event) => `- ${event.event}${event.detail ? `: ${event.detail}` : ""}`);
  return ["Recent decisions and continuity context:", ...lines].join("\n");
}
