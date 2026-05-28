import type { ToolLoopEvent } from "@/lib/admin/agent-tool-loop";
import type { AgentRun } from "@/lib/admin/agents/types";

export interface AgentStreamEvent extends ToolLoopEvent {
  agent?: AgentRun["agent"];
  at: string;
}

type Listener = (event: AgentStreamEvent) => void;

interface StreamState {
  listeners: Set<Listener>;
  history: AgentStreamEvent[];
  cancelled: boolean;
  createdAt: number;
}

const MAX_HISTORY = 500;
const STREAM_TTL_MS = 30 * 60 * 1000;
const streams = new Map<string, StreamState>();

function ensureStream(streamId: string): StreamState {
  let state = streams.get(streamId);
  if (!state) {
    state = { listeners: new Set(), history: [], cancelled: false, createdAt: Date.now() };
    streams.set(streamId, state);
  }
  return state;
}

export function publishEvent(streamId: string, event: Omit<AgentStreamEvent, "at"> & { at?: string }): void {
  if (!streamId) return;
  const state = ensureStream(streamId);
  const enriched: AgentStreamEvent = { ...event, at: event.at ?? new Date().toISOString() };
  state.history.push(enriched);
  if (state.history.length > MAX_HISTORY) state.history.shift();
  for (const listener of state.listeners) {
    try {
      listener(enriched);
    } catch {
      /* ignore listener errors */
    }
  }
}

export function subscribeStream(streamId: string, listener: Listener): { history: AgentStreamEvent[]; unsubscribe: () => void; cancelled: boolean } {
  const state = ensureStream(streamId);
  state.listeners.add(listener);
  return {
    history: [...state.history],
    cancelled: state.cancelled,
    unsubscribe: () => {
      state.listeners.delete(listener);
    }
  };
}

export function getStreamHistory(streamId: string): AgentStreamEvent[] {
  return streams.get(streamId)?.history.slice() ?? [];
}

export function cancelStream(streamId: string): boolean {
  const state = streams.get(streamId);
  if (!state) return false;
  state.cancelled = true;
  publishEvent(streamId, { kind: "stop", payload: { reason: "cancelled" } });
  return true;
}

export function isStreamCancelled(streamId: string | undefined): boolean {
  if (!streamId) return false;
  return streams.get(streamId)?.cancelled === true;
}

export function closeStream(streamId: string): void {
  streams.delete(streamId);
}

export function pruneExpiredStreams(now = Date.now()): void {
  for (const [id, state] of streams.entries()) {
    if (now - state.createdAt > STREAM_TTL_MS && state.listeners.size === 0) {
      streams.delete(id);
    }
  }
}
