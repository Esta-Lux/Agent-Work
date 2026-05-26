export class ControlBlockedError extends Error {
  constructor(
    message: string,
    readonly code: string = "CONTROL_BLOCKED"
  ) {
    super(message);
    this.name = "ControlBlockedError";
  }
}
