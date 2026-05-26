import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { BootriseJob, JobStatus } from "@/lib/jobs/job-types";

const root = resolve(process.cwd(), ".bootrise", "jobs");

function pathFor(id: string) {
  return join(root, `${id}.json`);
}

export function getJob(id: string): BootriseJob | null {
  const p = pathFor(id);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as BootriseJob;
  } catch {
    return null;
  }
}

export function saveJob(job: BootriseJob) {
  mkdirSync(root, { recursive: true });
  writeFileSync(pathFor(job.id), JSON.stringify(job, null, 2), "utf8");
}

export function updateJobStatus(id: string, status: JobStatus, error?: string) {
  const job = getJob(id);
  if (!job) return null;
  job.status = status;
  job.error = error;
  job.updatedAt = new Date().toISOString();
  saveJob(job);
  return job;
}
