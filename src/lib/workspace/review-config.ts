export type ReviewMode = "auto" | "single" | "multi";

export interface ReviewConfig {
  mode: ReviewMode;
  singleMaxFiles: number;
  batchSize: number;
  maxBatches: number;
  charsPerFile: number;
  batchCharBudget: number;
  singleCharBudget: number;
}

export function getReviewConfig(): ReviewConfig {
  const mode = (process.env.BOOTRISE_REVIEW_MODE?.trim().toLowerCase() ?? "auto") as ReviewMode;
  return {
    mode: mode === "single" || mode === "multi" ? mode : "auto",
    singleMaxFiles: Number(process.env.BOOTRISE_REVIEW_SINGLE_MAX ?? "64"),
    batchSize: Number(process.env.BOOTRISE_REVIEW_BATCH_SIZE ?? "36"),
    maxBatches: Number(process.env.BOOTRISE_REVIEW_MAX_BATCHES ?? "8"),
    charsPerFile: Number(process.env.BOOTRISE_REVIEW_CHARS_PER_FILE ?? "3500"),
    batchCharBudget: Number(process.env.BOOTRISE_REVIEW_BATCH_CHARS ?? "52000"),
    singleCharBudget: Number(process.env.BOOTRISE_REVIEW_SINGLE_CHARS ?? "72000")
  };
}

function isBroadReviewMessage(message: string): boolean {
  const n = message.toLowerCase();
  return (
    /\b(review|audit|list all|issues?|risks?|gaps?|overall|whole codebase|entire (repo|codebase))\b/.test(n) &&
    !/\b(test file|pytest only)\b/.test(n)
  );
}

function isHudReviewMessage(message: string): boolean {
  const n = message.toLowerCase();
  return /\b(hud|heads-up|navigat|turn card|map screen|while driving|driving mode|eta strip|maneuver)\b/.test(n);
}

export function shouldUseMultiPassReview(corpusSize: number, message: string, config = getReviewConfig()): boolean {
  if (config.mode === "single") return false;
  if (config.mode === "multi") return corpusSize > config.singleMaxFiles;

  const broadOrHud = isBroadReviewMessage(message) || isHudReviewMessage(message);
  return corpusSize >= 120 && broadOrHud;
}

export function reviewCoverageSummary(deepRead: number, corpusSize: number, batchCount: number): string {
  return batchCount > 1
    ? `Multi-pass review: ${deepRead} files across ${batchCount} batches (${corpusSize} in corpus)`
    : `Single-pass review: ${deepRead} of ${corpusSize} files`;
}

export function maxDeepReadFiles(config = getReviewConfig()): number {
  return config.batchSize * config.maxBatches;
}
