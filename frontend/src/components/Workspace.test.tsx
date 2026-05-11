import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LangProvider } from "../i18n/LangProvider";
import { Workspace } from "./workspace/Workspace";

function renderWorkspace({
  profile = {},
  completeness,
  conversationMessages,
  conversationFocus,
  onSendMessage,
  onOpenConversation,
  generatedPage,
  pageConversationMessages,
  isGeneratingPage,
  isExportingPdf,
  isUpdatingPageVisibility,
  onGeneratePage,
  onCustomizePage,
  onPublishPage,
  onUnpublishPage,
  onOpenPublicPage,
  onExportPdf,
}: {
  profile?: Parameters<typeof Workspace>[0]["profile"];
  completeness?: Parameters<typeof Workspace>[0]["completeness"];
  conversationMessages?: Parameters<typeof Workspace>[0]["conversationMessages"];
  conversationFocus?: Parameters<typeof Workspace>[0]["conversationFocus"];
  onSendMessage?: Parameters<typeof Workspace>[0]["onSendMessage"];
  onOpenConversation?: Parameters<typeof Workspace>[0]["onOpenConversation"];
  generatedPage?: Parameters<typeof Workspace>[0]["generatedPage"];
  pageConversationMessages?: Parameters<typeof Workspace>[0]["pageConversationMessages"];
  isGeneratingPage?: Parameters<typeof Workspace>[0]["isGeneratingPage"];
  isExportingPdf?: Parameters<typeof Workspace>[0]["isExportingPdf"];
  isUpdatingPageVisibility?: Parameters<typeof Workspace>[0]["isUpdatingPageVisibility"];
  onGeneratePage?: Parameters<typeof Workspace>[0]["onGeneratePage"];
  onCustomizePage?: Parameters<typeof Workspace>[0]["onCustomizePage"];
  onPublishPage?: Parameters<typeof Workspace>[0]["onPublishPage"];
  onUnpublishPage?: Parameters<typeof Workspace>[0]["onUnpublishPage"];
  onOpenPublicPage?: Parameters<typeof Workspace>[0]["onOpenPublicPage"];
  onExportPdf?: Parameters<typeof Workspace>[0]["onExportPdf"];
} = {}) {
  const onPatchProfile = vi.fn();
  render(
    <LangProvider>
      <Workspace
        user={{ name: "Alex Chen", initials: "AC", email: "alex@example.com", handle: "alex" }}
        onLogout={vi.fn()}
        profile={profile}
        completeness={completeness}
        onPatchProfile={onPatchProfile}
        conversationMessages={conversationMessages}
        conversationFocus={conversationFocus}
        onSendMessage={onSendMessage}
        onOpenConversation={onOpenConversation}
        generatedPage={generatedPage}
        pageConversationMessages={pageConversationMessages}
        isGeneratingPage={isGeneratingPage}
        isExportingPdf={isExportingPdf}
        isUpdatingPageVisibility={isUpdatingPageVisibility}
        onGeneratePage={onGeneratePage}
        onCustomizePage={onCustomizePage}
        onPublishPage={onPublishPage}
        onUnpublishPage={onUnpublishPage}
        onOpenPublicPage={onOpenPublicPage}
        onExportPdf={onExportPdf}
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

  it("keeps an explicitly empty persisted profile empty instead of showing demo content", () => {
    renderWorkspace({
      profile: {
        name: null,
        headline: null,
        target_direction: null,
        comment: null,
        education: [],
        experience: [],
        projects: [],
        skills: [],
        certificates: [],
      },
      completeness: {
        sections: {
          basics: "empty",
          summary: "empty",
          education: "empty",
          experience: "empty",
          projects: "empty",
          skills: "empty",
          certificates: "empty",
        },
      },
    });

    expect(screen.getByText("CareerPal")).toBeInTheDocument();
    expect(screen.getByText(/profile completion/i)).toBeInTheDocument();
    expect(screen.queryByText("Senior Product Designer")).not.toBeInTheDocument();
    expect(screen.queryByText(/8 years designing tools for makers/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Linear")).not.toBeInTheDocument();
    expect(screen.queryByText("Product strategy")).not.toBeInTheDocument();
    expect(screen.queryByText("Carnegie Mellon")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /edit/i }).length).toBeGreaterThan(0);
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

  it("renders persisted improvement conversation messages when chat opens", async () => {
    renderWorkspace({
      conversationFocus: "any",
      conversationMessages: [
        { role: "ai", body: "I saved your prior coaching context." },
        { role: "user", body: "Help me rewrite the project impact." },
      ],
    });

    await userEvent.click(screen.getByRole("button", { name: /improve via chat/i }));

    expect(screen.getByText("I saved your prior coaching context.")).toBeInTheDocument();
    expect(screen.getByText("Help me rewrite the project impact.")).toBeInTheDocument();
  });

  it("hydrates focused improvement messages that arrive after the overlay opens", async () => {
    const view = render(
      <LangProvider>
        <Workspace
          user={{ name: "Alex Chen", initials: "AC", email: "alex@example.com", handle: "alex" }}
          onLogout={vi.fn()}
          profile={{}}
          onPatchProfile={vi.fn()}
          conversationFocus={null}
          conversationMessages={undefined}
        />
      </LangProvider>,
    );

    await userEvent.click(screen.getAllByRole("button", { name: /edit/i })[1]);
    await userEvent.click(screen.getByRole("button", { name: /talk to pal/i }));

    expect(screen.getByText(/let's polish your summary/i)).toBeInTheDocument();

    view.rerender(
      <LangProvider>
        <Workspace
          user={{ name: "Alex Chen", initials: "AC", email: "alex@example.com", handle: "alex" }}
          onLogout={vi.fn()}
          profile={{}}
          onPatchProfile={vi.fn()}
          conversationFocus="summary"
          conversationMessages={[{ role: "ai", body: "Previously we tightened your summary around analytics." }]}
        />
      </LangProvider>,
    );

    expect(await screen.findByText("Previously we tightened your summary around analytics.")).toBeInTheDocument();
  });

  it("does not show persisted messages from a different focused section", async () => {
    renderWorkspace({
      conversationFocus: "skills",
      conversationMessages: [{ role: "ai", body: "Let's tune your Python skills." }],
    });

    await userEvent.click(screen.getAllByRole("button", { name: /edit/i })[1]);
    await userEvent.click(screen.getByRole("button", { name: /talk to pal/i }));

    expect(screen.queryByText("Let's tune your Python skills.")).not.toBeInTheDocument();
    expect(screen.getByText(/let's polish your summary/i)).toBeInTheDocument();
  });

  it("sends improvement chat messages through the optional callback", async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    renderWorkspace({ onSendMessage });

    await user.click(screen.getByRole("button", { name: /improve via chat/i }));
    await user.click(screen.getByRole("button", { name: /^skills$/i }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Make my React experience stronger." } });
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(onSendMessage).toHaveBeenCalledWith({
      body: "Make my React experience stronger.",
      section: "skills",
      attachmentName: null,
    });
  });

  it("notifies the parent when switching improvement chat section chips", async () => {
    const user = userEvent.setup();
    const onOpenConversation = vi.fn();
    renderWorkspace({ onOpenConversation });

    await user.click(screen.getByRole("button", { name: /improve via chat/i }));
    await user.click(screen.getByRole("button", { name: /^skills$/i }));

    expect(onOpenConversation).toHaveBeenCalledWith("any");
    expect(onOpenConversation).toHaveBeenCalledWith("skills");
  });

  it("notifies the parent when opening section-focused improvement chat", async () => {
    const user = userEvent.setup();
    const onOpenConversation = vi.fn();
    renderWorkspace({ onOpenConversation });

    await user.click(screen.getAllByRole("button", { name: /edit/i })[1]);
    await user.click(screen.getByRole("button", { name: /talk to pal/i }));

    expect(onOpenConversation).toHaveBeenCalledWith("summary");
  });

  it("generates the living resume site with the selected design template", async () => {
    const user = userEvent.setup();
    const onGeneratePage = vi.fn().mockResolvedValue(undefined);
    renderWorkspace({ onGeneratePage });

    await user.click(screen.getByRole("button", { name: /my resume/i }));
    await user.click(screen.getByRole("button", { name: /terminal/i }));
    await user.click(screen.getByRole("button", { name: /create my page/i }));

    expect(onGeneratePage).toHaveBeenCalledWith("technical");
  });

  it("exports a PDF from the living resume screen", async () => {
    const user = userEvent.setup();
    const onExportPdf = vi.fn().mockResolvedValue(undefined);
    renderWorkspace({ onExportPdf });

    await user.click(screen.getByRole("button", { name: /my resume/i }));
    await user.click(screen.getByRole("button", { name: /download pdf/i }));

    expect(onExportPdf).toHaveBeenCalled();
  });

  it("disables the PDF export action while an export is running", async () => {
    renderWorkspace({ isExportingPdf: true });

    await userEvent.click(screen.getByRole("button", { name: /my resume/i }));

    expect(screen.getByRole("button", { name: /preparing pdf/i })).toBeDisabled();
  });

  it("renders an existing generated page preview and customizes it through page workflow", async () => {
    const user = userEvent.setup();
    const onCustomizePage = vi.fn().mockResolvedValue(undefined);
    renderWorkspace({
      generatedPage: {
        id: "page-1",
        html_content: "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
        style_template: "clean-professional",
        version: 2,
        is_public: false,
        created_at: "2026-05-08T00:00:00Z",
      },
      pageConversationMessages: [{ role: "ai", body: "What should this page emphasize?" }],
      onCustomizePage,
    });

    await user.click(screen.getByRole("button", { name: /my resume/i }));
    expect(screen.getByTitle("Generated living resume preview")).toHaveAttribute(
      "srcdoc",
      "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
    );
    expect(screen.getByText(/version 2/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /edit page/i }));
    expect(screen.getByText("What should this page emphasize?")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: /page customization request/i }), {
      target: { value: "Make projects more prominent." },
    });
    await user.click(screen.getByRole("button", { name: /send page request/i }));

    expect(onCustomizePage).toHaveBeenCalledWith("Make projects more prominent.");
  });

  it("keeps a page customization request when submission fails", async () => {
    const user = userEvent.setup();
    const onCustomizePage = vi.fn().mockRejectedValue(new Error("Page customization failed"));
    renderWorkspace({
      generatedPage: {
        id: "page-1",
        html_content: "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
        style_template: "clean-professional",
        version: 2,
        is_public: false,
        created_at: "2026-05-08T00:00:00Z",
      },
      onCustomizePage,
    });

    await user.click(screen.getByRole("button", { name: /my resume/i }));
    await user.click(screen.getByRole("button", { name: /edit page/i }));
    const input = screen.getByRole("textbox", { name: /page customization request/i });
    fireEvent.change(input, { target: { value: "Make projects more prominent." } });
    await user.click(screen.getByRole("button", { name: /send page request/i }));

    expect(input).toHaveValue("Make projects more prominent.");
  });

  it("disables page customization controls while a request is in flight", async () => {
    const user = userEvent.setup();
    renderWorkspace({
      generatedPage: {
        id: "page-1",
        html_content: "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
        style_template: "clean-professional",
        version: 2,
        is_public: false,
        created_at: "2026-05-08T00:00:00Z",
      },
      isGeneratingPage: true,
      onCustomizePage: vi.fn(),
    });

    await user.click(screen.getByRole("button", { name: /my resume/i }));
    await user.click(screen.getByRole("button", { name: /edit page/i }));

    expect(screen.getByRole("textbox", { name: /page customization request/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /send page request/i })).toBeDisabled();
  });

  it("publishes a private generated page from the living resume actions", async () => {
    const user = userEvent.setup();
    const onPublishPage = vi.fn().mockResolvedValue(undefined);
    renderWorkspace({
      generatedPage: {
        id: "page-1",
        html_content: "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
        style_template: "clean-professional",
        version: 2,
        is_public: false,
        created_at: "2026-05-08T00:00:00Z",
      },
      onPublishPage,
    });

    await user.click(screen.getByRole("button", { name: /my resume/i }));
    expect(screen.queryByRole("button", { name: /open page/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /publish/i }));

    expect(onPublishPage).toHaveBeenCalledTimes(1);
  });

  it("opens and unpublishes a public generated page", async () => {
    const user = userEvent.setup();
    const onOpenPublicPage = vi.fn();
    const onUnpublishPage = vi.fn().mockResolvedValue(undefined);
    renderWorkspace({
      generatedPage: {
        id: "page-1",
        html_content: "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
        style_template: "clean-professional",
        version: 2,
        is_public: true,
        public_url: "/p/alex",
        created_at: "2026-05-08T00:00:00Z",
      },
      onOpenPublicPage,
      onUnpublishPage,
    });

    await user.click(screen.getByRole("button", { name: /my resume/i }));
    await user.click(screen.getByRole("button", { name: /open page/i }));
    await user.click(screen.getByRole("button", { name: /unpublish/i }));

    expect(onOpenPublicPage).toHaveBeenCalledWith("/p/alex");
    expect(onUnpublishPage).toHaveBeenCalledTimes(1);
  });

  it("falls back to the profile handle when opening a public page without a URL", async () => {
    const user = userEvent.setup();
    const onOpenPublicPage = vi.fn();
    renderWorkspace({
      generatedPage: {
        id: "page-1",
        html_content: "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
        style_template: "clean-professional",
        version: 2,
        is_public: true,
        created_at: "2026-05-08T00:00:00Z",
      },
      onOpenPublicPage,
    });

    await user.click(screen.getByRole("button", { name: /my resume/i }));
    await user.click(screen.getByRole("button", { name: /open page/i }));

    expect(onOpenPublicPage).toHaveBeenCalledWith("/p/alex");
  });

  it("disables publish controls while page visibility updates", async () => {
    const user = userEvent.setup();
    renderWorkspace({
      generatedPage: {
        id: "page-1",
        html_content: "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
        style_template: "clean-professional",
        version: 2,
        is_public: false,
        created_at: "2026-05-08T00:00:00Z",
      },
      isUpdatingPageVisibility: true,
    });

    await user.click(screen.getByRole("button", { name: /my resume/i }));

    expect(screen.getByRole("button", { name: /publish/i })).toBeDisabled();
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

  it("uses backend completeness for persisted basics summary experience and education", () => {
    renderWorkspace({
      profile: {
        name: "Alex Chen",
        headline: "Backend engineer",
        target_direction: "Platform engineering",
        comment: "I build reliable student tools.",
        experience: [{ company: "Campus IT", role: "", time: "2024", description: "", achievements: [] }],
        education: [{ school: "University of Washington", degree: "", time: "" }],
      },
      completeness: {
        sections: {
          basics: "complete",
          summary: "complete",
          experience: "partial",
          education: "partial",
        },
      },
    });

    expect(within(screen.getByText("Basics").closest("article") as HTMLElement).getByText("Complete")).toBeInTheDocument();
    expect(within(screen.getByText("Summary").closest("article") as HTMLElement).getByText("Complete")).toBeInTheDocument();
    expect(within(screen.getByText("Experience").closest("article") as HTMLElement).getByText("Partial")).toBeInTheDocument();
    expect(within(screen.getByText("Education").closest("article") as HTMLElement).getByText("Partial")).toBeInTheDocument();
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

  it("saves edited certificates through the profile patch callback with spec fields", async () => {
    const user = userEvent.setup();
    const { onPatchProfile } = renderWorkspace({
      profile: {
        certificates: [{ name: "AWS CCP", issuer: "AWS", date: "2025-04-15", comment: null }],
      },
    });
    onPatchProfile.mockResolvedValue({
      certificates: [{ name: "Azure Fundamentals", issuer: "Microsoft", date: "2025-08-20", comment: "Cloud baseline" }],
    });

    await user.click(screen.getByRole("button", { name: /edit certificates/i }));
    await user.clear(screen.getByLabelText("Certificate name"));
    await user.type(screen.getByLabelText("Certificate name"), "Azure Fundamentals");
    await user.clear(screen.getByLabelText("Issuer"));
    await user.type(screen.getByLabelText("Issuer"), "Microsoft");
    await user.clear(screen.getByLabelText("Date"));
    await user.type(screen.getByLabelText("Date"), "2025-08-20");
    await user.type(screen.getByLabelText("Comment"), "  Cloud baseline  ");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onPatchProfile).toHaveBeenCalledWith({
      certificates: [{ name: "Azure Fundamentals", issuer: "Microsoft", date: "2025-08-20", comment: "Cloud baseline" }],
    });
    expect(await screen.findByText("Azure Fundamentals")).toBeInTheDocument();
  });

  it("renders persisted certificates and filters blank certificate names", () => {
    renderWorkspace({
      profile: {
        certificates: [
          { name: "AWS CCP", issuer: "Amazon Web Services", date: "2025-04-15", comment: "Cloud foundation" },
          { name: "   ", issuer: "ScrumStudy", date: "2024-10-01", comment: null },
        ],
      },
      completeness: {
        sections: {
          certificates: "partial",
        },
      },
    });

    const certificatesCard = screen.getByText("Certificates").closest("article");

    expect(certificatesCard).not.toBeNull();
    expect(within(certificatesCard as HTMLElement).getByText("Partial")).toBeInTheDocument();
    expect(within(certificatesCard as HTMLElement).getByText("AWS CCP")).toBeInTheDocument();
    expect(within(certificatesCard as HTMLElement).getByText("Amazon Web Services · 2025-04-15")).toBeInTheDocument();
    expect(within(certificatesCard as HTMLElement).queryByText("ScrumStudy · 2024-10-01")).not.toBeInTheDocument();
  });

  it("uses saved certificate completeness before stale fetched completeness", async () => {
    const user = userEvent.setup();
    const { onPatchProfile } = renderWorkspace({
      profile: { certificates: [] },
      completeness: {
        sections: {
          certificates: "empty",
        },
      },
    });
    onPatchProfile.mockResolvedValue({
      certificates: [{ name: "Azure Fundamentals", issuer: "Microsoft", date: "2025-08-20", comment: null }],
    });

    await user.click(screen.getByRole("button", { name: /edit certificates/i }));
    await user.click(screen.getByRole("button", { name: /\+ add another/i }));
    await user.type(screen.getByLabelText("Certificate name"), "Azure Fundamentals");
    await user.type(screen.getByLabelText("Issuer"), "Microsoft");
    await user.type(screen.getByLabelText("Date"), "2025-08-20");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    const certificatesCard = (await screen.findByText("Certificates")).closest("article");

    expect(certificatesCard).not.toBeNull();
    expect(within(certificatesCard as HTMLElement).getByText("Complete")).toBeInTheDocument();
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

  it("keeps saved education and experience status current before completeness refetch", async () => {
    const user = userEvent.setup();
    const { onPatchProfile } = renderWorkspace({
      profile: { education: [], experience: [] },
      completeness: {
        sections: {
          education: "empty",
          experience: "empty",
        },
      },
    });
    onPatchProfile.mockResolvedValue({
      education: [{ school: "University of Washington", degree: "B.S. CS", time: "2023 - 2027" }],
    });

    await user.click(screen.getByRole("button", { name: /edit education/i }));
    await user.click(screen.getByRole("button", { name: /\+ add another/i }));
    await user.type(screen.getByLabelText("School"), "University of Washington");
    await user.type(screen.getByLabelText("Degree"), "B.S. CS");
    await user.type(screen.getByLabelText("Time period"), "2023 - 2027");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(within((await screen.findByText("Education")).closest("article") as HTMLElement).getByText("Complete")).toBeInTheDocument();
  });
});
