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
    await user.clear(screen.getByLabelText("Location"));
    await user.type(screen.getByLabelText("Location"), "Seattle, WA");
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "jordan.contact@example.com");
    await user.clear(screen.getByLabelText("Phone"));
    await user.type(screen.getByLabelText("Phone"), "+1 555 123 4567");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onPatchProfile).toHaveBeenCalledWith({
      name: "Jordan Lee",
      headline: "Backend SWE intern",
      location: "Seattle, WA",
      contact_email: "jordan.contact@example.com",
      phone: "+1 555 123 4567",
    });
    expect(await screen.findByRole("heading", { name: "Jordan Lee" })).toBeInTheDocument();
    expect(screen.getByText(/Backend SWE intern · Seattle, WA/)).toBeInTheDocument();
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

  it("saves edited education through the profile patch callback and updates the card", async () => {
    const user = userEvent.setup();
    const { onPatchProfile } = renderWorkspace();
    onPatchProfile.mockResolvedValue({
      education: [{ school: "University of Washington", degree: "MS, Computer Science", time: "2024 - 2026" }],
    });

    await user.click(screen.getAllByRole("button", { name: /edit/i })[5]);
    await user.clear(screen.getByLabelText("School"));
    await user.type(screen.getByLabelText("School"), "University of Washington");
    await user.clear(screen.getByLabelText("Degree"));
    await user.type(screen.getByLabelText("Degree"), "MS, Computer Science");
    await user.clear(screen.getByLabelText("Time period"));
    await user.type(screen.getByLabelText("Time period"), "2024 - 2026");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onPatchProfile).toHaveBeenCalledWith({
      education: [{ school: "University of Washington", degree: "MS, Computer Science", time: "2024 - 2026" }],
    });
    expect(await screen.findByText("University of Washington")).toBeInTheDocument();
    expect(screen.getByText("MS, Computer Science")).toBeInTheDocument();
    expect(screen.getByText("2024 - 2026")).toBeInTheDocument();
  });

  it("saves added education rows in order", async () => {
    const user = userEvent.setup();
    const { onPatchProfile } = renderWorkspace();
    onPatchProfile.mockResolvedValue({
      education: [
        { school: "Carnegie Mellon", degree: "BFA, Design", time: "2013 - 2017" },
        { school: "University of Washington", degree: "MS, Computer Science", time: "2024 - 2026" },
      ],
    });

    await user.click(screen.getAllByRole("button", { name: /edit/i })[5]);
    await user.click(screen.getByRole("button", { name: /\+ add another/i }));
    const schools = screen.getAllByLabelText("School");
    const degrees = screen.getAllByLabelText("Degree");
    const periods = screen.getAllByLabelText("Time period");
    await user.type(schools[1], "University of Washington");
    await user.type(degrees[1], "MS, Computer Science");
    await user.type(periods[1], "2024 - 2026");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onPatchProfile).toHaveBeenCalledWith({
      education: [
        { school: "Carnegie Mellon", degree: "BFA, Design", time: "2013 - 2017" },
        { school: "University of Washington", degree: "MS, Computer Science", time: "2024 - 2026" },
      ],
    });
  });

  it("removes education rows before saving", async () => {
    const user = userEvent.setup();
    const { onPatchProfile } = renderWorkspace();
    onPatchProfile.mockResolvedValue({ education: [] });

    await user.click(screen.getAllByRole("button", { name: /edit/i })[5]);
    await user.click(screen.getByRole("button", { name: /remove education 1/i }));
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onPatchProfile).toHaveBeenCalledWith({ education: [] });
  });
});
