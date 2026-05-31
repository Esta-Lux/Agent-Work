import {
  listAgentActivityEvents,
  upsertAgentActivityEvent
} from "@/lib/agent-activity/agent-activity-store";
import type { AgentActivityEvent } from "@/lib/agent-activity/agent-activity-types";

export function recordAgentActivityEvent(
  input: Omit<AgentActivityEvent, "createdAt"> & { createdAt?: string }
): AgentActivityEvent {
  return upsertAgentActivityEvent({
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString()
  });
}

export function getAgentActivityEvents(projectId: string): AgentActivityEvent[] {
  return listAgentActivityEvents(projectId);
}
