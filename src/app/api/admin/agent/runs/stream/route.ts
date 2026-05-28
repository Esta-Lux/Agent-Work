import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { subscribeStream, type AgentStreamEvent } from "@/lib/admin/agent-event-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(request, async (_user, req) => {
    const url = new URL(req.url);
    const streamId = url.searchParams.get("streamId");
    if (!streamId) {
      return new Response(JSON.stringify({ error: "streamId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: AgentStreamEvent) => {
          try {
            controller.enqueue(encoder.encode(`event: agent\ndata: ${JSON.stringify(event)}\n\n`));
          } catch {
            /* closed */
          }
        };
        const sub = subscribeStream(streamId, send);
        for (const past of sub.history) send(past);
        controller.enqueue(encoder.encode(`event: ready\ndata: ${JSON.stringify({ streamId, history: sub.history.length, cancelled: sub.cancelled })}\n\n`));
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`event: ping\ndata: ${Date.now()}\n\n`));
          } catch {
            clearInterval(heartbeat);
          }
        }, 15000);
        if (typeof (heartbeat as { unref?: () => void }).unref === "function") {
          (heartbeat as { unref: () => void }).unref();
        }
        const close = () => {
          clearInterval(heartbeat);
          sub.unsubscribe();
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        };
        req.signal.addEventListener("abort", close);
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      }
    });
  });
}
