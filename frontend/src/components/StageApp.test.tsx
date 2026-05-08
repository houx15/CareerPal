import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import { defaultApiBaseUrl, StageApp } from "./StageApp";

const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

function apiMock() {
  return {
    register: vi
      .fn()
      .mockResolvedValue({ access_token: "token-123", user: { id: "u1", email: "alex@example.com", username: "alex" } }),
    login: vi
      .fn()
      .mockResolvedValue({ access_token: "token-123", user: { id: "u1", email: "alex@example.com", username: "alex" } }),
    patchProfile: vi.fn().mockResolvedValue({ name: "Alex Chen" }),
    getProfile: vi.fn().mockResolvedValue({
      updated_at: "2026-05-05T00:00:00Z",
      name: "Alex Chen",
      headline: null,
      target_direction: null,
      comment: null,
      education: [],
      experience: [],
      projects: [],
      skills: [],
      certificates: [],
    }),
    getCompleteness: vi.fn().mockResolvedValue({
      overall: "partial",
      sections: {
        basics: "partial",
        summary: "empty",
        experience: "empty",
        skills: "empty",
        projects: "empty",
        education: "empty",
      },
    }),
    listConversations: vi.fn().mockResolvedValue([]),
    getConversation: vi.fn().mockResolvedValue({ id: "c1", context_type: "career", focus_node: null, messages: [] }),
    startConversation: vi.fn().mockResolvedValue({ id: "c1", context_type: "career", focus_node: null, messages: [] }),
    sendMessage: vi.fn().mockResolvedValue({
      assistant_message: {
        role: "assistant",
        content: "I noted that. CareerPal's AI response will be enabled in a later milestone.",
      },
      messages: [],
    }),
    getPagePreview: vi.fn().mockRejectedValue(new ApiError(404, "No generated page found")),
    generatePage: vi.fn().mockResolvedValue({
      id: "page-1",
      html_content: "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
      style_template: "technical",
      version: 1,
      is_public: false,
      created_at: "2026-05-08T00:00:00Z",
    }),
    customizePage: vi.fn().mockResolvedValue({
      id: "page-2",
      html_content: "<!doctype html><html><body><h1>Projects first</h1></body></html>",
      style_template: "clean-professional",
      version: 2,
      is_public: false,
      created_at: "2026-05-08T00:01:00Z",
    }),
    updatePageSettings: vi.fn().mockImplementation(async (payload: { is_public: boolean }) => ({
      id: "page-1",
      html_content: "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
      style_template: "clean-professional",
      version: 1,
      is_public: payload.is_public,
      created_at: "2026-05-08T00:00:00Z",
    })),
    exportProfilePdf: vi.fn().mockResolvedValue(new Blob(["%PDF-1.7"], { type: "application/pdf" })),
  };
}

describe("StageApp", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalApiBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    }
  });

  it("uses same-origin API requests by default", () => {
    expect(defaultApiBaseUrl()).toBe("");
  });

  it("preserves prototype signup -> name -> onboarding -> workspace flow", async () => {
    const api = apiMock();
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /start free/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send code/i }));
    await userEvent.type(screen.getByLabelText(/verification code/i), "123456");
    await userEvent.click(screen.getByRole("button", { name: /^next/i }));

    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.type(screen.getByLabelText(/password ✓/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /^next/i }));

    await userEvent.type(screen.getByLabelText(/phone number/i), "+1 555 123 4567");
    await userEvent.click(screen.getByRole("button", { name: /send code/i }));
    await userEvent.type(screen.getByLabelText(/verification code/i), "654321");
    await userEvent.click(screen.getByRole("button", { name: /verify/i }));
    await userEvent.click(await screen.findByRole("button", { name: /continue/i }));

    expect(await screen.findByText(/what should i call you/i)).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(/your name/i), "Alex Chen");
    await userEvent.click(screen.getByRole("button", { name: /nice to meet you/i }));

    expect(await screen.findByText(/what brings you here today/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /i'll finish later/i }));

    await waitFor(() =>
      expect(api.register).toHaveBeenCalledWith({
        email: "alex@example.com",
        username: "alex",
        password: "secret123",
      }),
    );
    await waitFor(() => expect(api.getProfile).toHaveBeenCalled());
    expect(await screen.findByText(/profile completion/i)).toBeInTheDocument();
  }, 10000);

  it("loads existing users directly into the design-faithful workspace after login", async () => {
    const api = apiMock();
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(api.login).toHaveBeenCalledWith({ email: "alex@example.com", password: "secret123" }));
    await waitFor(() => expect(api.getProfile).toHaveBeenCalled());
    expect(await screen.findByText(/profile completion/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /my resume/i })).toBeInTheDocument();
    expect(screen.queryByText(/what should i call you/i)).not.toBeInTheDocument();
  }, 10000);

  it("loads the workspace when no generated page exists yet", async () => {
    const api = apiMock();
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(api.getPagePreview).toHaveBeenCalled());
    expect(await screen.findByText(/profile completion/i)).toBeInTheDocument();
  }, 10000);

  it("generates a page from the resume screen and renders the returned preview", async () => {
    const api = apiMock();
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    await userEvent.click(await screen.findByRole("button", { name: /my resume/i }));
    await userEvent.click(screen.getByRole("button", { name: /terminal/i }));
    await userEvent.click(screen.getByRole("button", { name: /create my page/i }));

    await waitFor(() => expect(api.generatePage).toHaveBeenCalledWith("technical"));
    expect(await screen.findByTitle("Generated living resume preview")).toHaveAttribute(
      "srcdoc",
      "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
    );
  }, 10000);

  it("customizes a generated page through a separate page conversation", async () => {
    const api = apiMock();
    api.getPagePreview.mockResolvedValue({
      id: "page-1",
      html_content: "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
      style_template: "clean-professional",
      version: 1,
      is_public: false,
      created_at: "2026-05-08T00:00:00Z",
    });
    api.listConversations.mockResolvedValue([
      { id: "career-conversation", context_type: "career", focus_node: null, messages: [] },
      {
        id: "page-conversation",
        context_type: "page",
        focus_node: null,
        messages: [{ role: "assistant", content: "What should this page emphasize?" }],
      },
    ]);
    api.getConversation.mockImplementation(async (id: string) =>
      id === "page-conversation"
        ? {
            id: "page-conversation",
            context_type: "page",
            focus_node: null,
            messages: [{ role: "assistant", content: "What should this page emphasize?" }],
          }
        : { id: "career-conversation", context_type: "career", focus_node: null, messages: [] },
    );
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    await userEvent.click(await screen.findByRole("button", { name: /my resume/i }));
    await userEvent.click(screen.getByRole("button", { name: /edit page/i }));
    await userEvent.type(screen.getByRole("textbox", { name: /page customization request/i }), "Make projects more prominent.");
    await userEvent.click(screen.getByRole("button", { name: /send page request/i }));

    await waitFor(() =>
      expect(api.customizePage).toHaveBeenCalledWith({
        conversation_id: "page-conversation",
        instruction: "Make projects more prominent.",
      }),
    );
    expect(api.startConversation).not.toHaveBeenCalledWith({ context_type: "page", focus_node: null });
    expect(await screen.findByTitle("Generated living resume preview")).toHaveAttribute(
      "srcdoc",
      "<!doctype html><html><body><h1>Projects first</h1></body></html>",
    );
  }, 10000);

  it("keeps the page customization request visible when customization fails", async () => {
    const api = apiMock();
    api.getPagePreview.mockResolvedValue({
      id: "page-1",
      html_content: "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
      style_template: "clean-professional",
      version: 1,
      is_public: false,
      created_at: "2026-05-08T00:00:00Z",
    });
    api.listConversations.mockResolvedValue([
      { id: "career-conversation", context_type: "career", focus_node: null, messages: [] },
      { id: "page-conversation", context_type: "page", focus_node: null, messages: [] },
    ]);
    api.getConversation.mockImplementation(async (id: string) =>
      id === "page-conversation"
        ? { id: "page-conversation", context_type: "page", focus_node: null, messages: [] }
        : { id: "career-conversation", context_type: "career", focus_node: null, messages: [] },
    );
    api.customizePage.mockRejectedValue(new Error("Page customization failed"));
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    await userEvent.click(await screen.findByRole("button", { name: /my resume/i }));
    await userEvent.click(screen.getByRole("button", { name: /edit page/i }));
    const input = screen.getByRole("textbox", { name: /page customization request/i });
    await userEvent.type(input, "Make projects more prominent.");
    await userEvent.click(screen.getByRole("button", { name: /send page request/i }));

    expect(await screen.findByText("Page customization failed")).toBeInTheDocument();
    expect(input).toHaveValue("Make projects more prominent.");
  }, 10000);

  it("publishes and unpublishes the loaded generated page", async () => {
    const api = apiMock();
    api.getPagePreview.mockResolvedValue({
      id: "page-1",
      html_content: "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
      style_template: "clean-professional",
      version: 1,
      is_public: false,
      created_at: "2026-05-08T00:00:00Z",
    });
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    await userEvent.click(await screen.findByRole("button", { name: /my resume/i }));

    expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open page/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /publish/i }));

    await waitFor(() => expect(api.updatePageSettings).toHaveBeenCalledWith({ is_public: true }));
    expect(await screen.findByRole("button", { name: /open page/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /unpublish/i }));

    await waitFor(() => expect(api.updatePageSettings).toHaveBeenCalledWith({ is_public: false }));
    expect(await screen.findByRole("button", { name: /publish/i })).toBeInTheDocument();
  }, 10000);

  it("keeps public page state intact when unpublish fails", async () => {
    const api = apiMock();
    api.getPagePreview.mockResolvedValue({
      id: "page-1",
      html_content: "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
      style_template: "clean-professional",
      version: 1,
      is_public: true,
      created_at: "2026-05-08T00:00:00Z",
    });
    api.updatePageSettings.mockRejectedValue(new Error("Could not update page settings."));
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    await userEvent.click(await screen.findByRole("button", { name: /my resume/i }));
    await userEvent.click(screen.getByRole("button", { name: /unpublish/i }));

    expect(await screen.findByText("Could not update page settings.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open page/i })).toBeInTheDocument();
  }, 10000);

  it("opens the public page with the auth username and configured API base URL", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:8000";
    const openMock = vi.spyOn(window, "open").mockImplementation(() => null);
    const api = apiMock();
    api.getPagePreview.mockResolvedValue({
      id: "page-1",
      html_content: "<!doctype html><html><body><h1>Alex Chen</h1></body></html>",
      style_template: "clean-professional",
      version: 1,
      is_public: true,
      created_at: "2026-05-08T00:00:00Z",
    });
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    await userEvent.click(await screen.findByRole("button", { name: /my resume/i }));
    await userEvent.click(screen.getByRole("button", { name: /open page/i }));

    expect(openMock).toHaveBeenCalledWith("http://localhost:8000/p/alex", "_blank", "noopener,noreferrer");
  }, 10000);

  it("downloads the exported PDF from the resume screen", async () => {
    const createObjectUrl = vi.fn().mockReturnValue("blob:careerpal-pdf");
    const revokeObjectUrl = vi.fn();
    const clickMock = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = createObjectUrl;
    URL.revokeObjectURL = revokeObjectUrl;
    const api = apiMock();
    render(<StageApp api={api} />);

    try {
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
      await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
      await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
      await userEvent.click(screen.getByRole("button", { name: /log in/i }));
      await userEvent.click(await screen.findByRole("button", { name: /my resume/i }));
      await userEvent.click(screen.getByRole("button", { name: /download pdf/i }));

      await waitFor(() => expect(api.exportProfilePdf).toHaveBeenCalled());
      expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
      expect(clickMock).toHaveBeenCalled();
      expect(revokeObjectUrl).toHaveBeenCalledWith("blob:careerpal-pdf");
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }
  }, 10000);

  it("shows an export error when PDF download fails", async () => {
    const api = apiMock();
    api.exportProfilePdf.mockRejectedValue(new Error("Could not download PDF."));
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    await userEvent.click(await screen.findByRole("button", { name: /my resume/i }));
    await userEvent.click(screen.getByRole("button", { name: /download pdf/i }));

    expect(await screen.findByText("Could not download PDF.")).toBeInTheDocument();
  }, 10000);

  it("reuses an existing general career conversation when loading the workspace", async () => {
    const api = apiMock();
    api.listConversations.mockResolvedValue([
      { id: "existing-page", context_type: "page", focus_node: null, messages: [] },
      {
        id: "existing-career",
        context_type: "career",
        focus_node: null,
        messages: [{ role: "assistant", content: "Welcome back. Want to keep shaping your profile?" }],
      },
    ]);
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(api.listConversations).toHaveBeenCalledTimes(1));
    expect(api.getConversation).toHaveBeenCalledWith("existing-career");
    expect(api.startConversation).not.toHaveBeenCalled();
    expect(await screen.findByText(/profile completion/i)).toBeInTheDocument();
  }, 10000);

  it("starts a general career conversation before onboarding chat messages are sent", async () => {
    const api = apiMock();
    render(<StageApp api={api} />);

    await reachOnboarding();

    expect(api.startConversation).toHaveBeenCalledWith({ context_type: "career", focus_node: null });
    await userEvent.click(screen.getByRole("button", { name: /i'm looking for a new job/i }));

    await waitFor(() =>
      expect(api.sendMessage).toHaveBeenCalledWith({
        conversation_id: "c1",
        content: "I'm looking for a new job",
      }),
    );
  }, 10000);

  it("starts and sends section-focused improvement chat through the focused conversation", async () => {
    const api = apiMock();
    api.startConversation.mockImplementation(async (payload) => ({
      id: payload.focus_node === "summary" ? "summary-conversation" : "general-conversation",
      context_type: "career",
      focus_node: payload.focus_node ?? null,
      messages: [],
    }));
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    await userEvent.click(await screen.findByRole("button", { name: /edit summary/i }));
    await userEvent.click(screen.getByRole("button", { name: /talk to pal/i }));

    await waitFor(() => expect(api.startConversation).toHaveBeenCalledWith({ context_type: "career", focus_node: "summary" }));

    await userEvent.type(screen.getByRole("textbox"), "Make the summary more outcome-oriented.");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() =>
      expect(api.sendMessage).toHaveBeenCalledWith({
        conversation_id: "summary-conversation",
        content: "Make the summary more outcome-oriented.",
      }),
    );
  }, 10000);

  it("renders persisted experience after login", async () => {
    const api = apiMock();
    api.getProfile.mockResolvedValue({
      updated_at: "2026-05-05T00:00:00Z",
      name: "Alex Chen",
      headline: null,
      target_direction: null,
      comment: null,
      education: [],
      experience: [
        {
          company: "Stripe",
          role: "Backend Engineering Intern",
          time: "Summer 2025",
          description: "Built reconciliation jobs for payment reporting.",
          achievements: ["Reduced manual review time by 30%"],
        },
      ],
      projects: [],
      skills: [],
      certificates: [],
    });
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Backend Engineering Intern · Stripe")).toBeInTheDocument();
    expect(screen.getByText("Built reconciliation jobs for payment reporting.")).toBeInTheDocument();
  }, 10000);

  it("renders persisted projects after login", async () => {
    const api = apiMock();
    api.getProfile.mockResolvedValue({
      updated_at: "2026-05-05T00:00:00Z",
      name: "Alex Chen",
      headline: null,
      target_direction: null,
      comment: null,
      education: [],
      experience: [],
      projects: [
        {
          name: "CareerPal",
          description: "Built a design-faithful profile workspace.",
          tech_stack: ["Next.js", "FastAPI"],
          achievements: ["Persisted projects across reloads"],
          link: "https://example.com/careerpal",
          comment: "Full-stack project",
        },
      ],
      skills: [],
      certificates: [],
    });
    api.getCompleteness.mockResolvedValue({
      overall: "partial",
      sections: {
        basics: "partial",
        summary: "empty",
        experience: "empty",
        skills: "empty",
        projects: "complete",
        education: "empty",
      },
    });
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    const projectsCard = (await screen.findByText("Projects")).closest("article");

    expect(projectsCard).not.toBeNull();
    expect(within(projectsCard as HTMLElement).getByText("Complete")).toBeInTheDocument();
    expect(within(projectsCard as HTMLElement).getByText("CareerPal")).toBeInTheDocument();
    expect(within(projectsCard as HTMLElement).getByText("Built a design-faithful profile workspace.")).toBeInTheDocument();
  }, 10000);

  it("renders persisted skills after login", async () => {
    const api = apiMock();
    api.getProfile.mockResolvedValue({
      updated_at: "2026-05-05T00:00:00Z",
      name: "Alex Chen",
      headline: null,
      target_direction: null,
      comment: null,
      education: [],
      experience: [],
      projects: [],
      skills: [
        {
          name: "Python",
          category: "Programming",
          proficiency: "advanced",
          comment: "FastAPI services",
        },
      ],
      certificates: [],
    });
    api.getCompleteness.mockResolvedValue({
      overall: "partial",
      sections: {
        basics: "partial",
        summary: "empty",
        experience: "empty",
        skills: "complete",
        projects: "empty",
        education: "empty",
      },
    });
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    const skillsCard = (await screen.findByText("Skills")).closest("article");

    expect(skillsCard).not.toBeNull();
    expect(within(skillsCard as HTMLElement).getByText("Complete")).toBeInTheDocument();
    expect(within(skillsCard as HTMLElement).getByText("Python")).toBeInTheDocument();
  }, 10000);

  it("renders persisted certificates after login", async () => {
    const api = apiMock();
    api.getProfile.mockResolvedValue({
      updated_at: "2026-05-05T00:00:00Z",
      name: "Alex Chen",
      headline: null,
      target_direction: null,
      comment: null,
      education: [],
      experience: [],
      projects: [],
      skills: [],
      certificates: [
        {
          name: "AWS Certified Cloud Practitioner",
          issuer: "Amazon Web Services",
          date: "2025-04-15",
          comment: "Cloud foundation",
        },
      ],
    });
    api.getCompleteness.mockResolvedValue({
      overall: "partial",
      sections: {
        basics: "partial",
        summary: "empty",
        experience: "empty",
        skills: "empty",
        projects: "empty",
        education: "empty",
        certificates: "complete",
      },
    });
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    const certificatesCard = (await screen.findByText("Certificates")).closest("article");

    expect(certificatesCard).not.toBeNull();
    expect(within(certificatesCard as HTMLElement).getByText("Complete")).toBeInTheDocument();
    expect(within(certificatesCard as HTMLElement).getByText("AWS Certified Cloud Practitioner")).toBeInTheDocument();
    expect(within(certificatesCard as HTMLElement).getByText("Amazon Web Services · 2025-04-15")).toBeInTheDocument();
  }, 10000);

  it("refetches completeness after profile edits and lets backend section state retake authority", async () => {
    const api = apiMock();
    api.getProfile.mockResolvedValue({
      updated_at: "2026-05-05T00:00:00Z",
      name: "Alex Chen",
      headline: null,
      target_direction: null,
      comment: null,
      education: [],
      experience: [],
      projects: [],
      skills: [],
      certificates: [],
    });
    api.getCompleteness
      .mockResolvedValueOnce({
        overall: "empty",
        sections: {
          basics: "empty",
          contact: "empty",
          summary: "empty",
          experience: "empty",
          skills: "empty",
          projects: "empty",
          education: "empty",
          certificates: "empty",
        },
      })
      .mockResolvedValueOnce({
        overall: "partial",
        sections: {
          basics: "empty",
          contact: "empty",
          summary: "empty",
          experience: "empty",
          skills: "empty",
          projects: "empty",
          education: "partial",
          certificates: "empty",
        },
      });
    api.patchProfile.mockResolvedValue({
      education: [{ school: "University of Washington", degree: "B.S. CS", time: "2023 - 2027" }],
    });
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    await userEvent.click(await screen.findByRole("button", { name: /edit education/i }));
    await userEvent.click(screen.getByRole("button", { name: /\+ add another/i }));
    await userEvent.type(screen.getByLabelText("School"), "University of Washington");
    await userEvent.type(screen.getByLabelText("Degree"), "B.S. CS");
    await userEvent.type(screen.getByLabelText("Time period"), "2023 - 2027");
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(api.getCompleteness).toHaveBeenCalledTimes(2));
    const educationCard = (await screen.findByText("Education")).closest("article");

    expect(educationCard).not.toBeNull();
    expect(within(educationCard as HTMLElement).getByText("Partial")).toBeInTheDocument();
  }, 10000);

  it("ignores repeated workspace clicks while the first load is pending", async () => {
    const api = apiMock();
    const profileLoad = deferred<Awaited<ReturnType<typeof api.getProfile>>>();
    api.getProfile.mockReturnValue(profileLoad.promise);
    render(<StageApp api={api} />);

    await reachOnboarding();

    const workspaceButton = screen.getByRole("button", { name: /i'll finish later/i });
    await userEvent.click(workspaceButton);
    await userEvent.click(workspaceButton);

    expect(screen.getByRole("status")).toHaveTextContent(/loading workspace/i);
    expect(api.getProfile).toHaveBeenCalledTimes(1);
    expect(api.getCompleteness).toHaveBeenCalledTimes(1);

    profileLoad.resolve({
      updated_at: "2026-05-05T00:00:00Z",
      name: "Alex Chen",
      headline: null,
      target_direction: null,
      comment: null,
      education: [],
      experience: [],
      projects: [],
      skills: [],
      certificates: [],
    });
    await waitFor(() => expect(api.startConversation).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/profile completion/i)).toBeInTheDocument();
  }, 10000);
});

async function reachOnboarding() {
  await userEvent.click(screen.getByRole("button", { name: /start free/i }));
  await userEvent.type(screen.getByLabelText(/^email$/i), "alex@example.com");
  await userEvent.click(screen.getByRole("button", { name: /send code/i }));
  await userEvent.type(screen.getByLabelText(/verification code/i), "123456");
  await userEvent.click(screen.getByRole("button", { name: /^next/i }));
  await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
  await userEvent.type(screen.getByLabelText(/password ✓/i), "secret123");
  await userEvent.click(screen.getByRole("button", { name: /^next/i }));
  await userEvent.type(screen.getByLabelText(/phone number/i), "+1 555 123 4567");
  await userEvent.click(screen.getByRole("button", { name: /send code/i }));
  await userEvent.type(screen.getByLabelText(/verification code/i), "654321");
  await userEvent.click(screen.getByRole("button", { name: /verify/i }));
  await userEvent.click(await screen.findByRole("button", { name: /continue/i }));
  await userEvent.type(await screen.findByPlaceholderText(/your name/i), "Alex Chen");
  await userEvent.click(screen.getByRole("button", { name: /nice to meet you/i }));
  expect(await screen.findByText(/what brings you here today/i)).toBeInTheDocument();
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}
