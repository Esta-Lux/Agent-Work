export interface SandboxProvider {
  name: "webcontainer" | "e2b" | "fly" | "modal" | "none";
  configured: boolean;
  supportsFrontendPreview: boolean;
  supportsBackendExecution: boolean;
  supportsNetworkIsolation: boolean;
}
