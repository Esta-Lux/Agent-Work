export type { BootrisePersonaId } from "@/lib/ai/bootrise-voice";
export { getPersonaLabel, getPersonaSystem } from "@/lib/ai/bootrise-voice";

export const BOOTRISE_PERSONAS = [
  { id: "architect" as const, label: "Architect", hint: "System design & safety" },
  { id: "developer" as const, label: "Developer", hint: "Files & implementation" },
  { id: "devops" as const, label: "DevOps", hint: "CI, deploy & verify" }
];
