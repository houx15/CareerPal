import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LangProvider } from "../i18n/LangProvider";
import { Workspace } from "./workspace/Workspace";

function renderWorkspace() {
  render(
    <LangProvider>
      <Workspace user={{ name: "Alex Chen", initials: "AC", email: "alex@example.com", handle: "alex" }} onLogout={vi.fn()} />
    </LangProvider>,
  );
}

describe("Workspace", () => {
  it("renders prototype top nav and profile dashboard by default", () => {
    renderWorkspace();

    expect(screen.getByText("CareerPal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /profile/i })).toHaveClass("active");
    expect(screen.getByText(/profile completion/i)).toBeInTheDocument();
    expect(screen.getAllByText("Alex Chen").length).toBeGreaterThan(0);
  });

  it("opens edit drawer from a profile card and can switch to chat improvement", async () => {
    renderWorkspace();

    await userEvent.click(screen.getAllByRole("button", { name: /edit/i })[0]);
    expect(screen.getByText(/edit/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /talk to pal/i }));
    expect(screen.getByText(/polish your profile with Pal/i)).toBeInTheDocument();
  });

  it("opens improve overlay from profile dashboard", async () => {
    renderWorkspace();

    await userEvent.click(screen.getByRole("button", { name: /improve via chat/i }));

    expect(screen.getAllByText(/which part should we work on/i).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: /skills/i }));
    expect(screen.getByText(/let's polish your skills/i)).toBeInTheDocument();
  });
});
