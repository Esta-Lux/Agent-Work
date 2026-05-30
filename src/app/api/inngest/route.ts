import { serve } from "inngest/next";
import { inngest } from "@/lib/jobs/inngest-client";
import { projectBrainBuildJob } from "@/lib/jobs/project-brain-build-job";
import { securityScanJob } from "@/lib/jobs/security-scan-job";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [projectBrainBuildJob, securityScanJob]
});
