import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LangProvider } from "../../i18n/LangProvider";
import type { GrowthPlan } from "../../lib/types";
import { Workspace } from "./Workspace";

const backendAnalysis = {
  id: "match-1",
  job_description: "Frontend internship using React",
  company: "Vercel",
  role: "Frontend Engineer",
  score: 82,
  strengths: ["Profile includes React."],
  gaps: ["Add evidence for TypeScript."],
  suggestions: ["Tailor the headline toward Frontend Engineer.", "Highlight shipped UI work."],
  created_at: "2026-05-08T00:00:00Z",
  updated_at: "2026-05-08T00:00:00Z",
};

const persistedGrowthPlan: GrowthPlan = {
  id: "growth-1",
  goal: "Become a platform engineer",
  nodes: [
    { id: "root", label: "Distributed systems", state: "active", quality: 0.7, parent: null, x: 50, y: 18 },
    { id: "sql", label: "SQL evidence", state: "locked", quality: 0.2, parent: "root", x: 28, y: 58 },
  ],
  created_at: "2026-05-11T00:00:00Z",
  updated_at: "2026-05-11T00:00:00Z",
};

const generatedGrowthPlan: GrowthPlan = {
  id: "growth-generated-1",
  goal: "Close Frontend Engineer gaps",
  nodes: [
    { id: "root", label: "Frontend Engineer readiness", state: "done", quality: 1, parent: null, x: 0, y: 0 },
    { id: "typescript", label: "TypeScript evidence", state: "active", quality: 0.25, parent: "root", x: -160, y: 140 },
  ],
  created_at: "2026-05-11T00:00:00Z",
  updated_at: "2026-05-11T00:00:00Z",
};

function renderWorkspace(props: Partial<Parameters<typeof Workspace>[0]> = {}) {
  render(
    <LangProvider>
      <Workspace user={{ name: "Alex Chen", initials: "AC", email: "alex@example.com", handle: "alex" }} onLogout={vi.fn()} {...props} />
    </LangProvider>,
  );
}

describe("workspace screens", () => {
  it("navigates to resume, match, grow, and activity screens", async () => {
    renderWorkspace();

    await userEvent.click(screen.getByRole("button", { name: /my resume/i }));
    expect(screen.getByText(/your living resume site/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^match$/i }));
    expect(screen.getByRole("heading", { name: /paste a jd/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^grow$/i }));
    expect(screen.getByText(/grow your craft/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /activity/i }));
    expect(screen.getAllByText(/activity/i).length).toBeGreaterThan(0);
  });

  it("submits a JD to the match handler and renders backend analysis", async () => {
    const onCreateJobMatch = vi.fn().mockResolvedValue(backendAnalysis);
    renderWorkspace({ onCreateJobMatch });

    await userEvent.click(screen.getByRole("button", { name: /^match$/i }));
    await userEvent.type(screen.getByPlaceholderText(/job description|role you're aiming/i), "Frontend internship using React");
    await userEvent.click(screen.getByRole("button", { name: /analyze/i }));

    expect(onCreateJobMatch).toHaveBeenCalledWith("Frontend internship using React");
    expect(await screen.findByText(/match score/i)).toBeInTheDocument();
    expect(screen.getByText(/Role bar/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/job description/i)).not.toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText(/Frontend Engineer at Vercel/i)).toBeInTheDocument();
    expect(screen.getByText("Profile includes React.")).toBeInTheDocument();
    expect(screen.getByText("Add evidence for TypeScript.")).toBeInTheDocument();
    expect(screen.getByText("Tailor the headline toward Frontend Engineer.")).toBeInTheDocument();
    expect(screen.getByText("Highlight shipped UI work.")).toBeInTheDocument();
  });

  it("jumps from match gaps to grow", async () => {
    const onCreateJobMatch = vi.fn().mockResolvedValue(backendAnalysis);
    renderWorkspace({ onCreateJobMatch });

    await userEvent.click(screen.getByRole("button", { name: /^match$/i }));
    await userEvent.type(screen.getByPlaceholderText(/job description|role you're aiming/i), "Frontend internship using React");
    await userEvent.click(screen.getByRole("button", { name: /analyze/i }));
    const growActions = await screen.findAllByRole("button", { name: /open grow/i });
    await userEvent.click(growActions[0]);

    expect(screen.getByText(/grow your craft/i)).toBeInTheDocument();
  });

  it("generates a roadmap from match gaps and opens Grow", async () => {
    const onCreateJobMatch = vi.fn().mockResolvedValue(backendAnalysis);
    const onGenerateGrowthPlanFromMatch = vi.fn().mockResolvedValue(generatedGrowthPlan);
    renderWorkspace({ onCreateJobMatch, onGenerateGrowthPlanFromMatch });

    await userEvent.click(screen.getByRole("button", { name: /^match$/i }));
    await userEvent.type(screen.getByPlaceholderText(/job description|role you're aiming/i), "Frontend internship using React");
    await userEvent.click(screen.getByRole("button", { name: /analyze/i }));
    await userEvent.click(await screen.findByRole("button", { name: /generate roadmap/i }));

    expect(onGenerateGrowthPlanFromMatch).toHaveBeenCalledWith("match-1");
    expect(await screen.findByText("Close Frontend Engineer gaps")).toBeInTheDocument();
    expect(screen.getByText("TypeScript evidence")).toBeInTheDocument();
  });

  it("renders the persisted growth plan on the Grow screen", async () => {
    renderWorkspace({ growthPlan: persistedGrowthPlan });

    await userEvent.click(screen.getByRole("button", { name: /^grow$/i }));

    expect(screen.getByText("Become a platform engineer")).toBeInTheDocument();
    expect(screen.getByText("Distributed systems")).toBeInTheDocument();
    expect(screen.getByText("SQL evidence")).toBeInTheDocument();
    expect(screen.queryByText("React evidence")).not.toBeInTheDocument();
  });

  it("logs Grow node progress from the Improve submit flow", async () => {
    const onLogGrowthProgress = vi.fn().mockResolvedValue({
      plan: {
        ...persistedGrowthPlan,
        nodes: persistedGrowthPlan.nodes.map((node) =>
          node.id === "root" ? { ...node, quality: 0.82, state: "active" as const } : node,
        ),
        progress_logs: [
          {
            id: "progress-1",
            node_id: "root",
            node_label: "Distributed systems",
            evidence: "Published a systems design write-up.",
            quality_delta: 0.12,
            created_at: "2026-05-11T00:01:00Z",
          },
        ],
        updated_at: "2026-05-11T00:01:00Z",
      },
      log: {
        id: "progress-1",
        node_id: "root",
        node_label: "Distributed systems",
        evidence: "Published a systems design write-up.",
        quality_delta: 0.12,
        created_at: "2026-05-11T00:01:00Z",
      },
    });
    renderWorkspace({ growthPlan: persistedGrowthPlan, onLogGrowthProgress });

    await userEvent.click(screen.getByRole("button", { name: /^grow$/i }));
    await userEvent.click(screen.getByRole("button", { name: /Distributed systems active/i }));
    expect(screen.getByText("70%")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^Improve$/i }));
    await userEvent.click(screen.getByRole("button", { name: /submit result/i }));
    await userEvent.type(screen.getByRole("textbox", { name: /evidence/i }), "Published a systems design write-up.");
    await userEvent.click(screen.getByRole("button", { name: /log progress/i }));

    expect(onLogGrowthProgress).toHaveBeenCalledWith("root", { evidence: "Published a systems design write-up." });
    expect(await screen.findByText("82%")).toBeInTheDocument();
  });

  it("opens recent match history", async () => {
    const onOpenJobMatch = vi.fn().mockResolvedValue(backendAnalysis);
    renderWorkspace({ jobMatches: [backendAnalysis], onOpenJobMatch });

    await userEvent.click(screen.getByRole("button", { name: /^match$/i }));
    await userEvent.click(screen.getByRole("button", { name: /Frontend Engineer/i }));

    expect(onOpenJobMatch).toHaveBeenCalledWith("match-1");
    expect(await screen.findByText("Profile includes React.")).toBeInTheDocument();
  });

  it("opens older match history after expanding the list", async () => {
    const olderAnalysis = {
      ...backendAnalysis,
      id: "match-5",
      company: "Stripe",
      role: "Backend Intern",
      score: 71,
      strengths: ["Profile includes Python."],
    };
    const matches = [
      backendAnalysis,
      { ...backendAnalysis, id: "match-2", role: "Product Engineer" },
      { ...backendAnalysis, id: "match-3", role: "UI Engineer" },
      { ...backendAnalysis, id: "match-4", role: "Design Engineer" },
      olderAnalysis,
    ];
    const onOpenJobMatch = vi.fn().mockResolvedValue(olderAnalysis);
    renderWorkspace({ jobMatches: matches, onOpenJobMatch });

    await userEvent.click(screen.getByRole("button", { name: /^match$/i }));
    expect(screen.queryByRole("button", { name: /Backend Intern/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /show all matches/i }));
    await userEvent.click(screen.getByRole("button", { name: /Backend Intern at Stripe/i }));

    expect(onOpenJobMatch).toHaveBeenCalledWith("match-5");
    expect(await screen.findByText("Profile includes Python.")).toBeInTheDocument();
  });

  it("shows match API errors and keeps the JD draft", async () => {
    const onCreateJobMatch = vi.fn().mockRejectedValue(new Error("Could not analyze this JD."));
    renderWorkspace({ onCreateJobMatch });

    await userEvent.click(screen.getByRole("button", { name: /^match$/i }));
    const input = screen.getByPlaceholderText(/job description|role you're aiming/i);
    await userEvent.type(input, "Frontend internship using React");
    await userEvent.click(screen.getByRole("button", { name: /analyze/i }));

    expect(await screen.findByText("Could not analyze this JD.")).toBeInTheDocument();
    expect(input).toHaveValue("Frontend internship using React");
    expect(screen.queryByText(/match score/i)).not.toBeInTheDocument();
  });
});
