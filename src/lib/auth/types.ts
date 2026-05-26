export interface AuthUser {
  id: string;
  email: string | null;
}

export interface UserOrgContext {
  user: AuthUser;
  orgId: string;
  orgName: string;
  orgRole: "owner" | "admin" | "member" | "viewer";
  isPersonalOrg: boolean;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}
