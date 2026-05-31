import { expect, test } from "playwright/test";
import { mockWorkspaceApis } from "./support/mock-api";

test.beforeEach(async ({ page }) => {
  await mockWorkspaceApis(page);
  let projects: Array<{
    id: string;
    name: string;
    brief: { productName: string; audience: string; primaryWorkflow: string; authRequired: boolean; paymentsRequired: boolean };
    files: Array<{ path: string; content: string }>;
    lastReport: null;
    preferredProvider: "bootrise" | "openai";
    githubUrl: string | null;
    repositoryId: string | null;
    updatedAt: string;
  }> = [];
  await page.route("**/api/workspace/projects**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "GET") {
      const id = url.searchParams.get("id");
      if (id) {
        const project = projects.find((item) => item.id === id);
        if (!project) {
          return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Project not found." }) });
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ project }) });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ projects, storage: "local", supabase: { message: "mocked" } })
      });
    }
    if (request.method() === "POST") {
      const body = request.postDataJSON() as {
        id?: string;
        name?: string;
        brief?: { productName?: string; audience?: string; primaryWorkflow?: string; authRequired?: boolean; paymentsRequired?: boolean };
      };
      const now = new Date().toISOString();
      const nextId = body.id ?? `proj_${projects.length + 1}`;
      const existing = projects.find((item) => item.id === nextId);
      const next = {
        id: nextId,
        name: body.name ?? "My startup",
        brief: {
          productName: body.brief?.productName ?? "My startup",
          audience: body.brief?.audience ?? "",
          primaryWorkflow: body.brief?.primaryWorkflow ?? "Ship the core user workflow",
          authRequired: body.brief?.authRequired ?? true,
          paymentsRequired: body.brief?.paymentsRequired ?? false
        },
        files: existing?.files ?? [],
        lastReport: null,
        preferredProvider: "bootrise" as const,
        githubUrl: null,
        repositoryId: null,
        updatedAt: now
      };
      projects = [next, ...projects.filter((item) => item.id !== next.id)];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ project: next, storage: "local", cloudSaved: false, supabase: { schemaReady: false } })
      });
    }
    return route.fallback();
  });
});

test("strict-auth workspace storage state unlocks the main surface", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("BootRise Command Center")).toBeVisible();
  await expect(page.getByText("workspace-e2e@bootrise.local")).toBeVisible();
});

test("strict-auth workspace users are blocked from admin routes", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/\?error=admin_forbidden/);
  await expect(page.getByText("BootRise Command Center")).toBeVisible();
});

test("dashboard loads, creates a project, and opens workspace project route", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Project dashboard" })).toBeVisible();
  await expect(page.getByText("No projects yet")).toBeVisible();
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/workspace\/proj_1/);
  await expect(page.getByText("BootRise Worklog").or(page.getByText("Agent Activity Timeline"))).toBeVisible();
});

test("login and signup routes load in strict auth", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your workspace account" })).toBeVisible();
  await page.goto("/auth/sign-up");
  await expect(page.getByRole("heading", { name: "Create your workspace account" })).toBeVisible();
});
