import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LangProvider } from "../i18n/LangProvider";
import { Workspace } from "./workspace/Workspace";

function renderWorkspace() {
  const onPatchProfile = vi.fn();
  render(
    <LangProvider>
      <Workspace
        user={{ name: "Alex Chen", initials: "AC", email: "alex@example.com", handle: "alex" }}
        onLogout={vi.fn()}
        onPatchProfile={onPatchProfile}
      />
    </LangProvider>,
  );
  return { onPatchProfile };
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

  it("saves edited basics through the profile patch callback and updates the hero", async () => {
    const user = userEvent.setup();
    const { onPatchProfile } = renderWorkspace();
    onPatchProfile.mockResolvedValue({ name: "Jordan Lee", headline: "Backend SWE intern" });

    await user.click(screen.getAllByRole("button", { name: /edit/i })[0]);
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Jordan Lee");
    await user.clear(screen.getByLabelText("Role"));
    await user.type(screen.getByLabelText("Role"), "Backend SWE intern");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onPatchProfile).toHaveBeenCalledWith({ name: "Jordan Lee", headline: "Backend SWE intern" });
    expect(await screen.findByRole("heading", { name: "Jordan Lee" })).toBeInTheDocument();
  });

  it("saves edited summary through the profile patch callback", async () => {
    const user = userEvent.setup();
    const { onPatchProfile } = renderWorkspace();
    onPatchProfile.mockResolvedValue({ comment: "I build reliable backend systems for campus products." });

    await user.click(screen.getAllByRole("button", { name: /edit/i })[1]);
    await user.clear(screen.getByLabelText("Summary"));
    await user.type(screen.getByLabelText("Summary"), "I build reliable backend systems for campus products.");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onPatchProfile).toHaveBeenCalledWith({ comment: "I build reliable backend systems for campus products." });
    expect(await screen.findByText("I build reliable backend systems for campus products.")).toBeInTheDocument();
  });
});
