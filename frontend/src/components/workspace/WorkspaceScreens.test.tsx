import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LangProvider } from "../../i18n/LangProvider";
import { Workspace } from "./Workspace";

function renderWorkspace() {
  render(
    <LangProvider>
      <Workspace user={{ name: "Alex Chen", initials: "AC", email: "alex@example.com", handle: "alex" }} onLogout={vi.fn()} />
    </LangProvider>,
  );
}

describe("workspace screens", () => {
  it("navigates to resume, match, grow, and activity screens", async () => {
    renderWorkspace();

    await userEvent.click(screen.getByRole("button", { name: /my resume/i }));
    expect(screen.getByText(/your living resume site/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^match$/i }));
    expect(screen.getByText(/paste a jd/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^grow$/i }));
    expect(screen.getByText(/grow your craft/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /activity/i }));
    expect(screen.getAllByText(/activity/i).length).toBeGreaterThan(0);
  });

  it("shows a deterministic match result after analyzing a JD", async () => {
    renderWorkspace();

    await userEvent.click(screen.getByRole("button", { name: /^match$/i }));
    await userEvent.type(screen.getByPlaceholderText(/job description|role you're aiming/i), "Frontend internship using React");
    await userEvent.click(screen.getByRole("button", { name: /analyze/i }));

    expect(await screen.findByText(/match score/i)).toBeInTheDocument();
    expect(screen.getByText(/strengths/i)).toBeInTheDocument();
    expect(screen.getByText(/gaps/i)).toBeInTheDocument();
  });
});
