import { inngest } from "@/lib/jobs/inngest-client";
import { enqueueJob } from "@/lib/jobs/enqueue";

export const securityScanJob = inngest.createFunction(
  { id: "security-scan", triggers: [{ event: "security.scan" }] },
  async ({ event }: { event: { data: unknown } }) => {
    const data = event.data as {
      orgId: string;
      userId: string;
      projectId: string;
      files?: Array<{ path: string; content: string }>;
    };
    return enqueueJob({
      type: "security.scan",
      orgId: data.orgId,
      userId: data.userId,
      projectId: data.projectId,
      files: data.files ?? []
    });
  }
);
