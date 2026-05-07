import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { defaultApiBaseUrl, StageApp } from "./StageApp";

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
    startConversation: vi.fn().mockResolvedValue({ id: "c1", context_type: "career", focus_node: null, messages: [] }),
    sendMessage: vi.fn().mockResolvedValue({
      assistant_message: {
        role: "assistant",
        content: "I noted that. CareerPal's AI response will be enabled in a later milestone.",
      },
      messages: [],
    }),
  };
}

describe("StageApp", () => {
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
