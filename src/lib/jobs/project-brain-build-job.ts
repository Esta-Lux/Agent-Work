import { inngest } from "@/lib/jobs/inngest-client";
import { enqueueJob } from "@/lib/jobs/enqueue";

export const projectBrainBuildJob = inngest.createFunction(
  { id: "project-brain-build", triggers: [{ event: "projectBrain.build" }] },
  async ({ event }: { event: { data: unknown } }) => {
    const data = event.data as {
      orgId: string;
      userId: string;
      projectId: string;
      repositoryId?: string;
      files?: Array<{ path: string; content: string }>;
    };
    return enqueueJob({
      type: "projectBrain.build",
      orgId: data.orgId,
      userId: data.userId,
      projectId: data.projectId,
      repositoryId: data.repositoryId,
      files: data.files ?? []
    });
  }
);
