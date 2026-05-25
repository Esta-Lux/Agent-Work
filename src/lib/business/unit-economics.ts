export interface UsageScenario {
  label: string;
  users: number;
  tasksPerUserMonthly: number;
  lightTaskShare: number;
  paidConversionRate?: number;
}

export interface CostLine {
  label: string;
  monthlyCost: number;
  detail: string;
}

export interface RevenuePlan {
  name: string;
  monthlyPrice: number;
  includedTasks: number;
  targetUser: string;
  overagePerTask: number;
}

export interface ScenarioResult {
  label: string;
  users: number;
  monthlyTasks: number;
  aiAndSandboxCost: number;
  platformCost: number;
  supportAndOpsCost: number;
  totalCost: number;
  revenueAtRecommendedBlend: number;
  grossProfit: number;
  grossMargin: number;
  trialCostAtSevenDays: number;
}

const GPT55_INPUT_PER_MILLION = 5;
const GPT55_OUTPUT_PER_MILLION = 30;
const CLAUDE_SONNET_INPUT_PER_MILLION = 3;
const CLAUDE_SONNET_OUTPUT_PER_MILLION = 15;
const CLAUDE_OPUS_INPUT_PER_MILLION = 5;
const CLAUDE_OPUS_OUTPUT_PER_MILLION = 25;
const E2B_TWO_VCPU_TWO_GIB_PER_SECOND = 0.000028 + 0.0000045 * 2;

export const revenuePlans: RevenuePlan[] = [
  {
    name: "Builder",
    monthlyPrice: 49,
    includedTasks: 30,
    targetUser: "Solo builders validating serious app changes",
    overagePerTask: 2
  },
  {
    name: "Team",
    monthlyPrice: 149,
    includedTasks: 120,
    targetUser: "Small engineering teams using BootRise every week",
    overagePerTask: 1.5
  },
  {
    name: "Scale",
    monthlyPrice: 499,
    includedTasks: 500,
    targetUser: "Agencies and product teams with multiple repos",
    overagePerTask: 1.25
  },
  {
    name: "Enterprise",
    monthlyPrice: 2500,
    includedTasks: 2500,
    targetUser: "Security-sensitive organizations needing controls and SSO",
    overagePerTask: 1
  }
];

export const scenarios: UsageScenario[] = [
  {
    label: "Early paid beta",
    users: 200,
    tasksPerUserMonthly: 10,
    lightTaskShare: 0.75,
    paidConversionRate: 0.35
  },
  {
    label: "Scaled SaaS",
    users: 20000,
    tasksPerUserMonthly: 12,
    lightTaskShare: 0.82,
    paidConversionRate: 0.28
  }
];

export function getUnitEconomics() {
  const lightTaskCost = calculateLightTaskCost();
  const heavyTaskCost = calculateHeavyTaskCost();
  const blendedTaskCost = roundMoney(lightTaskCost * 0.8 + heavyTaskCost * 0.2);
  const scenarioResults = scenarios.map((scenario) => calculateScenario(scenario, lightTaskCost, heavyTaskCost));

  return {
    pricingSources: [
      "OpenAI GPT-5.5: $5 / 1M input tokens and $30 / 1M output tokens.",
      "Claude Sonnet 4.6: $3 / 1M input tokens and $15 / 1M output tokens.",
      "Claude Opus 4.7: $5 / 1M input tokens and $25 / 1M output tokens.",
      "E2B Pro: $150/month plus per-second sandbox usage; 2 vCPU + 2 GiB estimate uses listed CPU and RAM usage rates.",
      "Supabase Pro baseline: model with $25/month base before project-specific storage, egress, auth, and compute growth."
    ],
    taskCosts: {
      lightTaskCost,
      heavyTaskCost,
      blendedTaskCost
    },
    trial: {
      days: 7,
      includedTasks: 3,
      estimatedCostPerTrial: roundMoney(blendedTaskCost * 3),
      recommendation:
        "Affordable if capped to 3 verified tasks, 1 active sandbox, no long-running streams, and no uncapped GPT-5.5 loops."
    },
    plans: revenuePlans,
    scenarios: scenarioResults,
    engineStatus: [
      {
        engine: "Deterministic BootRise planner",
        status: "live",
        note: "Exists in code and keeps planning working without an LLM."
      },
      {
        engine: "OpenAI GPT-5.5 planner",
        status: "wired",
        note: "Server-side routes exist; requires OPENAI_API_KEY in runtime secrets."
      },
      {
        engine: "Claude worker/planner",
        status: "planned",
        note: "Not implemented yet; include Anthropic adapter before selling Claude-backed execution."
      },
      {
        engine: "Codex API / GPT-Codex worker",
        status: "planned",
        note: "Not implemented yet; current code does not call a Codex-specific API."
      }
    ]
  };
}

function calculateLightTaskCost(): number {
  const gptPlanner = tokenCost(20000, 3000, GPT55_INPUT_PER_MILLION, GPT55_OUTPUT_PER_MILLION);
  const sonnetWorker = tokenCost(25000, 8000, CLAUDE_SONNET_INPUT_PER_MILLION, CLAUDE_SONNET_OUTPUT_PER_MILLION);
  const sandbox = E2B_TWO_VCPU_TWO_GIB_PER_SECOND * 10 * 60;
  const storageAndLogs = 0.015;
  return roundMoney((gptPlanner + sonnetWorker + sandbox + storageAndLogs) * 1.25);
}

function calculateHeavyTaskCost(): number {
  const gptPlanner = tokenCost(80000, 12000, GPT55_INPUT_PER_MILLION, GPT55_OUTPUT_PER_MILLION);
  const opusReview = tokenCost(70000, 20000, CLAUDE_OPUS_INPUT_PER_MILLION, CLAUDE_OPUS_OUTPUT_PER_MILLION);
  const sandbox = E2B_TWO_VCPU_TWO_GIB_PER_SECOND * 45 * 60;
  const storageAndLogs = 0.08;
  return roundMoney((gptPlanner + opusReview + sandbox + storageAndLogs) * 1.3);
}

function calculateScenario(scenario: UsageScenario, lightTaskCost: number, heavyTaskCost: number): ScenarioResult {
  const monthlyTasks = scenario.users * scenario.tasksPerUserMonthly;
  const aiAndSandboxCost = roundMoney(
    monthlyTasks * (lightTaskCost * scenario.lightTaskShare + heavyTaskCost * (1 - scenario.lightTaskShare))
  );
  const platformCost = estimatePlatformCost(scenario.users);
  const supportAndOpsCost = estimateSupportAndOpsCost(scenario.users);
  const totalCost = roundMoney(aiAndSandboxCost + platformCost + supportAndOpsCost);
  const paidUsers = Math.round(scenario.users * (scenario.paidConversionRate ?? 1));
  const revenueAtRecommendedBlend = paidUsers * 99;
  const grossProfit = roundMoney(revenueAtRecommendedBlend - totalCost);

  return {
    label: scenario.label,
    users: scenario.users,
    monthlyTasks,
    aiAndSandboxCost,
    platformCost,
    supportAndOpsCost,
    totalCost,
    revenueAtRecommendedBlend,
    grossProfit,
    grossMargin: revenueAtRecommendedBlend > 0 ? Math.round((grossProfit / revenueAtRecommendedBlend) * 100) : 0,
    trialCostAtSevenDays: roundMoney(scenario.users * (lightTaskCost * 3))
  };
}

function tokenCost(inputTokens: number, outputTokens: number, inputPerMillion: number, outputPerMillion: number): number {
  return (inputTokens / 1_000_000) * inputPerMillion + (outputTokens / 1_000_000) * outputPerMillion;
}

function estimatePlatformCost(users: number): number {
  if (users <= 200) return 25 + 150 + 150;
  return 25 + 150 + 2500 + users * 0.08;
}

function estimateSupportAndOpsCost(users: number): number {
  if (users <= 200) return 600;
  return 12000 + users * 0.5;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
