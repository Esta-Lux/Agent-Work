"use client";

import { useMemo, useState } from "react";

type ChatModel = "bootrise" | "openai";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
}

interface WebsitePlan {
  name: string;
  sections: string[];
  primaryCta: string;
  secondaryCta: string;
  risks: string[];
}

interface OperatorPlan {
  mission: string;
  operatingMode: string;
  phases: Array<{
    name: string;
    objective: string;
    outputs: string[];
  }>;
  acceptanceChecks: string[];
  blockers: string[];
  immediateNextActions: string[];
}

interface AdminChatResponse {
  reply: string;
  model: string;
  provider: string;
  connected: boolean;
  websitePlan: WebsitePlan;
  operatorPlan: OperatorPlan;
  message?: string;
  error?: string;
}

const promptStarters = [
  "Build the user-facing BootRise homepage around repo intelligence and safe execution.",
  "Create a pricing section with a 7-day capped free trial.",
  "Design the admin workflow for reviewing and approving generated website changes."
];

export function AdminAIChatbox() {
  const [model, setModel] = useState<ChatModel>("bootrise");
  const [input, setInput] = useState(promptStarters[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      model: "bootrise",
      content:
        "Use this console to design the user-facing BootRise website from the admin side. Choose BootRise or ChatGPT as separate engines."
    }
  ]);
  const [plan, setPlan] = useState<WebsitePlan | null>(null);
  const [operatorPlan, setOperatorPlan] = useState<OperatorPlan | null>(null);
  const [status, setStatus] = useState("Ready");
  const [isSending, setIsSending] = useState(false);

  const history = useMemo(
    () =>
      messages
        .filter((message) => message.id !== "welcome")
        .slice(-8)
        .map((message) => ({ role: message.role, content: message.content })),
    [messages]
  );

  async function sendMessage(nextInput = input) {
    const message = nextInput.trim();
    if (!message || isSending) return;

    setIsSending(true);
    setStatus("Thinking");
    setInput("");

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: message
    };
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await fetch("/api/ai/admin-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, model, history })
      });
      const data = (await response.json()) as AdminChatResponse;
      if (!response.ok) throw new Error(data.error ?? "Chat request failed.");

      setMessages((current) => [
        ...current,
        {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          model: data.model,
          content: data.reply
        }
      ]);
      setPlan(data.websitePlan);
      setOperatorPlan(data.operatorPlan);
      setStatus(data.connected ? `Responded with ${data.provider === "openai" ? "ChatGPT" : "BootRise"}` : data.message ?? "Selected engine is offline");
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant_error_${Date.now()}`,
          role: "assistant",
          model: "system",
          content: error instanceof Error ? error.message : "Chat request failed."
        }
      ]);
      setStatus("Blocked");
    } finally {
      setIsSending(false);
    }
  }

  function clearChat() {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        model: "bootrise",
        content:
          "Chat cleared. Start with the product outcome you want, then turn the answer into a website plan."
      }
    ]);
    setPlan(null);
    setOperatorPlan(null);
    setInput(promptStarters[0]);
    setStatus("Ready");
  }

  function createWebsitePlan() {
    const planPrompt =
      "Create a complete user-facing website plan for BootRise with hero, product demo, trust proof, pricing, trial limits, and conversion CTAs.";
    setInput(planPrompt);
    void sendMessage(planPrompt);
  }

  return (
    <section className="p-0">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-steel">Admin AI Build Console</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Build the user-facing website from the admin side</h2>
        </div>
        <div className="rounded border border-line bg-white px-4 py-2 text-sm font-semibold text-graphite">{status}</div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded border border-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
            <div className="flex rounded border border-line bg-cloud p-1">
              <button
                className={`rounded px-3 py-2 text-sm font-semibold ${model === "bootrise" ? "bg-ink text-white" : "text-steel"}`}
                onClick={() => setModel("bootrise")}
                type="button"
              >
                BootRise
              </button>
              <button
                className={`rounded px-3 py-2 text-sm font-semibold ${model === "openai" ? "bg-ink text-white" : "text-steel"}`}
                onClick={() => setModel("openai")}
                type="button"
              >
                ChatGPT
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded border border-line px-3 py-2 text-sm font-semibold text-graphite" onClick={createWebsitePlan} type="button">
                Create Website Plan
              </button>
              <button className="rounded border border-line px-3 py-2 text-sm font-semibold text-graphite" onClick={clearChat} type="button">
                Clear
              </button>
            </div>
          </div>

          <div className="max-h-[520px] space-y-3 overflow-y-auto p-4">
            {messages.map((message) => (
              <div
                className={`rounded border p-3 ${
                  message.role === "user" ? "ml-auto max-w-[86%] border-ink bg-ink text-white" : "mr-auto max-w-[92%] border-line bg-cloud text-graphite"
                }`}
                key={message.id}
              >
                <div className="mb-2 text-xs font-semibold uppercase opacity-70">
                  {message.role === "user" ? "Admin" : message.model ?? "BootRise"}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-line p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {promptStarters.map((starter) => (
                <button
                  className="rounded border border-line bg-cloud px-3 py-2 text-left text-xs font-semibold text-graphite"
                  key={starter}
                  onClick={() => setInput(starter)}
                  type="button"
                >
                  {starter}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                className="min-h-20 flex-1 resize-y rounded border border-line bg-cloud p-3 text-sm leading-6 text-graphite"
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask BootRise to design, price, or scope the user-facing website..."
                value={input}
              />
              <button
                className="min-w-28 rounded bg-signal px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-steel"
                disabled={isSending || input.trim().length === 0}
                onClick={() => void sendMessage()}
                type="button"
              >
                {isSending ? "Sending" : "Send"}
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded border border-line bg-white p-4">
            <p className="text-sm font-semibold uppercase text-steel">Operator Contract</p>
            {operatorPlan ? (
              <div className="mt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xl font-semibold text-ink">{operatorPlan.operatingMode}</h3>
                  <span className="rounded bg-ink px-2 py-1 text-xs font-semibold text-white">active</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-graphite">{operatorPlan.mission}</p>
                <div className="mt-4 space-y-3">
                  {operatorPlan.phases.map((phase) => (
                    <div className="rounded border border-line bg-cloud p-3" key={phase.name}>
                      <p className="text-sm font-semibold text-ink">{phase.name}</p>
                      <p className="mt-1 text-sm leading-6 text-steel">{phase.objective}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {phase.outputs.map((output) => (
                          <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-graphite" key={output}>
                            {output}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <CheckList title="Acceptance" items={operatorPlan.acceptanceChecks} />
                  <CheckList title="Blockers" items={operatorPlan.blockers} />
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded border border-dashed border-line bg-cloud p-5 text-sm leading-6 text-steel">
                Send a message to generate an operator contract with phases, blockers, and acceptance checks.
              </div>
            )}
          </div>

          <div className="rounded border border-line bg-white p-4">
            <p className="text-sm font-semibold uppercase text-steel">Generated Website Plan</p>
            {plan ? (
            <div className="mt-3">
              <h3 className="text-xl font-semibold text-ink">{plan.name}</h3>
              <div className="mt-4 space-y-2">
                {plan.sections.map((section) => (
                  <div className="rounded border border-line bg-cloud p-3 text-sm font-semibold text-graphite" key={section}>
                    {section}
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Mini label="Primary CTA" value={plan.primaryCta} />
                <Mini label="Secondary CTA" value={plan.secondaryCta} />
              </div>
              <div className="mt-4 rounded border border-critical/20 bg-red-50 p-3">
                <p className="text-sm font-semibold text-critical">Guardrails</p>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-graphite">
                  {plan.risks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded border border-dashed border-line bg-cloud p-5 text-sm leading-6 text-steel">
              Send a message or click Create Website Plan to generate a structured site plan here.
            </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function CheckList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded bg-cloud p-3">
      <p className="text-xs font-semibold uppercase text-steel">{title}</p>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-graphite">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-cloud p-3">
      <p className="text-xs font-semibold uppercase text-steel">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
