import { NextResponse } from "next/server";
import { checkAllProviderHealth } from "@/lib/ai/llm-router";
import { hasNvidiaKey, getNvidiaModel } from "@/lib/ai/nvidia-client";
import { hasOpenAIKey, getOpenAIModel } from "@/lib/ai/openai-client";
import { getProviderPolicies } from "@/lib/ai/model-router";
import { quotaPolicies } from "@/lib/usage/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await checkAllProviderHealth();
  return NextResponse.json({
    product: "BootRise",
    providers,
    configured: {
      bootrise: hasNvidiaKey(),
      openai: hasOpenAIKey()
    },
    policies: getProviderPolicies(),
    quotaPolicies,
    models: {
      bootrise: getNvidiaModel(),
      openai: getOpenAIModel()
    }
  });
}
