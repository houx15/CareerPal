import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LangProvider } from "../i18n/LangProvider";
import { Workspace } from "./workspace/Workspace";

function renderWorkspace({ profile = {}, completeness }: { profile?: Parameters<typeof Workspace>[0]["profile"]; completeness?: Parameters<typeof Workspace>[0]["completeness"] } = {}) {
  const onPatchProfile = vi.fn();
  render(
    <LangProvider>
      <Workspace
        user={{ name: "Alex Chen", initials: "AC", email: "alex@example.com", handle: "alex" }}
        onLogout={vi.fn()}
        profile={profile}
        completeness={completeness}
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
    await userEvent.click(screen.getByRole("button", { name: /^skills$/i }));
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

  it("saves edited experience through the profile patch callback and updates the card", async () => {
    const user = userEvent.setup();
    const { onPatchProfile } = renderWorkspace();
    onPatchProfile.mockResolvedValue({
      experience: [
        {
          company: "Stripe",
          role: "Backend Engineering Intern",
          time: "Summer 2025",
          description: "Built reconciliation jobs for payment reporting.",
          achievements: ["Reduced manual review time by 30%"],
        },
      ],
    });

    await user.click(screen.getAllByRole("button", { name: /edit/i })[2]);
    await user.clear(screen.getByLabelText("Company"));
    await user.type(screen.getByLabelText("Company"), "Stripe");
    await user.clear(screen.getByLabelText("Role"));
    await user.type(screen.getByLabelText("Role"), "Backend Engineering Intern");
    await user.clear(screen.getByLabelText("Time period"));
    await user.type(screen.getByLabelText("Time period"), "Summer 2025");
    await user.clear(screen.getByLabelText("Description"));
    await user.type(screen.getByLabelText("Description"), "Built reconciliation jobs for payment reporting.");
    await user.clear(screen.getByLabelText("Achievements"));
    await user.type(screen.getByLabelText("Achievements"), "Reduced manual review time by 30%");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onPatchProfile).toHaveBeenCalledWith({
      experience: [
        {
          company: "Stripe",
          role: "Backend Engineering Intern",
          time: "Summer 2025",
          description: "Built reconciliation jobs for payment reporting.",
          achievements: ["Reduced manual review time by 30%"],
        },
      ],
    });
    expect(await screen.findByText("Backend Engineering Intern · Stripe")).toBeInTheDocument();
    expect(screen.getByText("Summer 2025")).toBeInTheDocument();
    expect(screen.getByText("Built reconciliation jobs for payment reporting.")).toBeInTheDocument();
  });

  it("saves added experience rows in order", async () => {
    const user = userEvent.setup();
    const { onPatchProfile } = renderWorkspace();
    onPatchProfile.mockResolvedValue({
      experience: [
        { company: "Linear", role: "Lead Designer", time: "2023 - present", description: "Shipped issue triage v2.", achievements: [] },
        { company: "Stripe", role: "Backend Intern", time: "Summer 2025", description: "Built reporting jobs.", achievements: ["Cut review time 30%"] },
      ],
    });

    await user.click(screen.getAllByRole("button", { name: /edit/i })[2]);
    await user.click(screen.getByRole("button", { name: /\+ add another/i }));
    const companies = screen.getAllByLabelText("Company");
    const roles = screen.getAllByLabelText("Role");
    const periods = screen.getAllByLabelText("Time period");
    const descriptions = screen.getAllByLabelText("Description");
    const achievements = screen.getAllByLabelText("Achievements");
    await user.type(companies[1], "Stripe");
    await user.type(roles[1], "Backend Intern");
    await user.type(periods[1], "Summer 2025");
    await user.type(descriptions[1], "Built reporting jobs.");
    await user.type(achievements[1], "Cut review time 30%");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onPatchProfile).toHaveBeenCalledWith({
      experience: [
        { company: "Linear", role: "Lead Designer", time: "2023 - present", description: "Shipped issue triage v2.", achievements: [] },
        { company: "Stripe", role: "Backend Intern", time: "Summer 2025", description: "Built reporting jobs.", achievements: ["Cut review time 30%"] },
      ],
    });
  });

  it("removes experience rows before saving", async () => {
    const user = userEvent.setup();
    const { onPatchProfile } = renderWorkspace();
    onPatchProfile.mockResolvedValue({ experience: [] });

    await user.click(screen.getAllByRole("button", { name: /edit/i })[2]);
    await user.click(screen.getByRole("button", { name: /remove experience 1/i }));
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onPatchProfile).toHaveBeenCalledWith({ experience: [] });
  });

  it("saves edited projects through the profile patch callback", async () => {
    const user = userEvent.setup();
    const { onPatchProfile } = renderWorkspace({
      profile: {
        projects: [
          {
            name: "Portfolio",
            description: "Built a static portfolio.",
            tech_stack: ["React"],
            achievements: [],
            link: null,
            comment: null,
          },
        ],
      },
    });
    onPatchProfile.mockResolvedValue({
      projects: [
        {
          name: "CareerPal",
          description: "Built profile persistence.",
          tech_stack: ["Next.js", "FastAPI"],
          achievements: ["Saved project data"],
          link: "https://example.com/careerpal",
          comment: null,
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: /edit projects/i }));
    await user.clear(screen.getByLabelText("Project name"));
    await user.type(screen.getByLabelText("Project name"), "CareerPal");
    await user.clear(screen.getByLabelText("Link"));
    await user.type(screen.getByLabelText("Link"), "https://example.com/careerpal");
    await user.clear(screen.getByLabelText("Description"));
    await user.type(screen.getByLabelText("Description"), "Built profile persistence.");
    await user.clear(screen.getByLabelText("Tech stack"));
    fireEvent.change(screen.getByLabelText("Tech stack"), { target: { value: "Next.js\nFastAPI" } });
    await user.clear(screen.getByLabelText("Achievements"));
    await user.type(screen.getByLabelText("Achievements"), "Saved project data");
    await user.type(screen.getByLabelText("Comment"), "Strong full-stack project");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onPatchProfile).toHaveBeenCalledWith({
      projects: [
        {
          name: "CareerPal",
          description: "Built profile persistence.",
          tech_stack: ["Next.js", "FastAPI"],
          achievements: ["Saved project data"],
          link: "https://example.com/careerpal",
          comment: "Strong full-stack project",
        },
      ],
    });
  });

  it("recomputes project status after saving when fetched completeness is stale", async () => {
    const user = userEvent.setup();
    const { onPatchProfile } = renderWorkspace({
      profile: { projects: [] },
      completeness: {
        sections: {
          projects: "empty",
        },
      },
    });
    onPatchProfile.mockResolvedValue({
      projects: [
        {
          name: "CareerPal",
          description: "Built profile persistence.",
          tech_stack: ["Next.js"],
          achievements: ["Saved project data"],
          link: null,
          comment: null,
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: /edit projects/i }));
    await user.click(screen.getByRole("button", { name: /\+ add another/i }));
    await user.type(screen.getByLabelText("Project name"), "CareerPal");
    await user.type(screen.getByLabelText("Description"), "Built profile persistence.");
    fireEvent.change(screen.getByLabelText("Tech stack"), { target: { value: "Next.js" } });
    await user.type(screen.getByLabelText("Achievements"), "Saved project data");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    const projectsCard = (await screen.findByText("Projects")).closest("article");

    expect(projectsCard).not.toBeNull();
    expect(within(projectsCard as HTMLElement).getByText("Complete")).toBeInTheDocument();
  });

  it("renders persisted projects inside the Projects card with partial status when incomplete", () => {
    renderWorkspace({
      profile: {
        projects: [
          {
            name: "CareerPal",
            description: "Built profile persistence.",
            tech_stack: [],
            achievements: [],
            link: null,
            comment: null,
            completeness: "partial",
          },
        ],
      },
    });

    const projectsCard = screen.getByText("Projects").closest("article");

    expect(projectsCard).not.toBeNull();
    expect(within(projectsCard as HTMLElement).getByText("Partial")).toBeInTheDocument();
    expect(within(projectsCard as HTMLElement).getByText("CareerPal")).toBeInTheDocument();
    expect(within(projectsCard as HTMLElement).getByText("Built profile persistence.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Project highlights")).not.toBeInTheDocument();
  });

  it("saves edited skills through the profile patch callback with spec fields", async () => {
    const user = userEvent.setup();
    const { onPatchProfile } = renderWorkspace({
      profile: {
        skills: [
          {
            name: "React",
            category: "Frontend",
            proficiency: "advanced",
            comment: null,
          },
        ],
      },
    });
    onPatchProfile.mockResolvedValue({
      skills: [
        {
          name: "TypeScript",
          category: "Programming",
          proficiency: "expert",
          comment: "Production React and API work",
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: /edit skills/i }));
    await user.clear(screen.getByLabelText("Skill name"));
    await user.type(screen.getByLabelText("Skill name"), "TypeScript");
    await user.clear(screen.getByLabelText("Category"));
    await user.type(screen.getByLabelText("Category"), "Programming");
    await user.selectOptions(screen.getByLabelText("Proficiency"), "expert");
    await user.type(screen.getByLabelText("Comment"), "  Production React and API work  ");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onPatchProfile).toHaveBeenCalledWith({
      skills: [
        {
          name: "TypeScript",
          category: "Programming",
          proficiency: "expert",
          comment: "Production React and API work",
        },
      ],
    });
    expect(await screen.findByText("TypeScript")).toBeInTheDocument();
  });

  it("renders persisted partial skills inside the Skills card after reload", () => {
    renderWorkspace({
      profile: {
        skills: [
          {
            name: "Python",
            category: "",
            proficiency: "intermediate",
            comment: "FastAPI services",
          },
        ],
      },
      completeness: {
        sections: {
          skills: "partial",
        },
      },
    });

    const skillsCard = screen.getByText("Skills").closest("article");

    expect(skillsCard).not.toBeNull();
    expect(within(skillsCard as HTMLElement).getByText("Partial")).toBeInTheDocument();
    expect(within(skillsCard as HTMLElement).getByText("Python")).toBeInTheDocument();
  });

  it("does not render empty skill pills for partial persisted skills without names", () => {
    renderWorkspace({
      profile: {
        skills: [
          {
            name: "",
            category: "Programming",
            proficiency: "intermediate",
            comment: "Still clarifying the exact skill name",
          },
        ],
      },
      completeness: {
        sections: {
          skills: "partial",
        },
      },
    });

    const skillsCard = screen.getByText("Skills").closest("article");

    expect(skillsCard).not.toBeNull();
    expect(within(skillsCard as HTMLElement).getByText("Partial")).toBeInTheDocument();
    expect((skillsCard as HTMLElement).querySelectorAll(".profile-skill-pill")).toHaveLength(0);
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
