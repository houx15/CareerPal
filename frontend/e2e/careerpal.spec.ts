import { expect, test, type Page } from "@playwright/test";

test("signs in and opens the core workspace screens", async ({ page }) => {
  await mockApi(page);

  await page.goto("/");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.getByLabel(/^email$/i).fill("alex@example.com");
  await page.getByLabel(/^password$/i).fill("secret123");
  await page.getByRole("button", { name: /log in/i }).click();

  await expect(page.getByText(/profile completion/i)).toBeVisible();

  await page.getByRole("button", { name: /my resume/i }).click();
  await expect(page.getByText(/your living resume site/i)).toBeVisible();

  await page.getByRole("button", { name: /^match$/i }).click();
  await expect(page.getByRole("heading", { name: /paste a jd/i })).toBeVisible();

  await page.getByRole("button", { name: /^grow$/i }).click();
  await expect(page.getByText("Close Backend Intern gaps")).toBeVisible();
  await expect(page.getByText("SQL evidence")).toBeVisible();

  await page.getByRole("button", { name: /activity/i }).click();
  await expect(page.getByRole("heading", { name: /^activity$/i })).toBeVisible();
  await expect(page.getByText(/recent changes/i)).toBeVisible();
});

async function mockApi(page: Page) {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "token-123",
        token_type: "bearer",
        user: { id: "u1", email: "alex@example.com", username: "alex" },
      }),
    });
  });

  await page.route("**/api/profile", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        updated_at: "2026-05-11T00:00:00Z",
        name: "Alex Chen",
        phone: null,
        contact_email: "alex@example.com",
        location: "Austin, TX",
        headline: "Backend Intern",
        target_direction: "Backend internship",
        comment: "I build reliable student projects.",
        education: [],
        experience: [],
        projects: [],
        skills: [],
        certificates: [],
      }),
    });
  });

  await page.route("**/api/profile/completeness", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        overall: "partial",
        sections: {
          basics: "complete",
          summary: "complete",
          contact: "partial",
          education: "empty",
          experience: "empty",
          projects: "empty",
          skills: "empty",
          certificates: "empty",
        },
      }),
    });
  });

  await page.route("**/api/conversation/history", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.route("**/api/conversation/start", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "conversation-1",
        context_type: "career",
        focus_node: null,
        messages: [],
        created_at: "2026-05-11T00:00:00Z",
        updated_at: "2026-05-11T00:00:00Z",
      }),
    });
  });

  await page.route("**/api/page/preview", async (route) => {
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ detail: "No generated page found" }) });
  });

  await page.route("**/api/page/versions", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ versions: [] }) });
  });

  await page.route("**/api/growth/plan", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "growth-1",
        goal: "Close Backend Intern gaps",
        nodes: [
          { id: "root", label: "Backend Intern readiness", state: "done", quality: 1, parent: null, x: 0, y: 0 },
          { id: "sql", label: "SQL evidence", state: "active", quality: 0.45, parent: "root", x: -160, y: 140 },
        ],
        progress_logs: [],
        created_at: "2026-05-11T00:00:00Z",
        updated_at: "2026-05-11T00:00:00Z",
      }),
    });
  });

  await page.route("**/api/match/history", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ analyses: [] }) });
  });
}
