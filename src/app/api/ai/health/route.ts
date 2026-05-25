import { NextResponse } from "next/server";
import { checkOpenAIConnection, getOpenAIModel, hasOpenAIKey } from "@/lib/ai/openai-client";

export const runtime = "nodejs";

export async function GET() {
  if (!hasOpenAIKey()) {
    return NextResponse.json({
      product: "BootRise",
      provider: "OpenAI",
      model: getOpenAIModel(),
      connected: false,
      message: "OPENAI_API_KEY is not configured on the server."
    });
  }

  try {
    const result = await checkOpenAIConnection();
    return NextResponse.json({
      product: "BootRise",
      provider: "OpenAI",
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        product: "BootRise",
        provider: "OpenAI",
        model: getOpenAIModel(),
        connected: false,
        message: error instanceof Error ? error.message : "OpenAI connection failed."
      },
      { status: 502 }
    );
  }
}
