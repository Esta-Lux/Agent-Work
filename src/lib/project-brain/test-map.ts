export interface TestMap {
  tests: Array<{ path: string; targetPath?: string }>;
}

export function buildTestMap(paths: string[]): TestMap {
  return {
    tests: paths
      .filter((path) => /\.test\.|\.spec\.|\/tests?\//i.test(path))
      .map((path) => ({
        path,
        targetPath: paths.find((candidate) => path.includes(candidate.replace(/\.(tsx?|jsx?)$/, "")) && candidate !== path)
      }))
  };
}
