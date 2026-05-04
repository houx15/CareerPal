import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StageApp } from "./StageApp";

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
      name: "Alex Chen",
      headline: null,
      target_direction: null,
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
  it("preserves signup -> name -> onboarding -> workspace flow", async () => {
    const api = apiMock();
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /get started/i }));
    await userEvent.type(screen.getByLabelText(/email/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/username/i), "alex");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/what should i call you/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/your name/i), "Alex Chen");
    await userEvent.click(screen.getByRole("button", { name: /nice to meet you/i }));

    expect(await screen.findByText(/do you have a resume/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /show me my workspace/i }));

    await waitFor(() => expect(api.getProfile).toHaveBeenCalled());
    expect(await screen.findByText(/Alex Chen/)).toBeInTheDocument();
    expect(screen.getByText(/profile completion/i)).toBeInTheDocument();
  });

  it("loads existing users directly into the workspace after login", async () => {
    const api = apiMock();
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /get started/i }));
    await userEvent.click(screen.getByRole("button", { name: /i already have an account/i }));
    await userEvent.type(screen.getByLabelText(/email/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(api.login).toHaveBeenCalledWith({ email: "alex@example.com", password: "secret123" }));
    await waitFor(() => expect(api.getProfile).toHaveBeenCalled());
    expect(await screen.findByText(/Alex Chen/)).toBeInTheDocument();
    expect(screen.getByText(/profile completion/i)).toBeInTheDocument();
    expect(screen.queryByText(/what should i call you/i)).not.toBeInTheDocument();
  });

  it("ignores repeated workspace clicks while the first load is pending", async () => {
    const api = apiMock();
    const profileLoad = deferred<Awaited<ReturnType<typeof api.getProfile>>>();
    api.getProfile.mockReturnValue(profileLoad.promise);
    render(<StageApp api={api} />);

    await reachOnboarding();

    const workspaceButton = screen.getByRole("button", { name: /show me my workspace/i });
    await userEvent.click(workspaceButton);
    await userEvent.click(workspaceButton);

    expect(screen.getByRole("status")).toHaveTextContent(/loading workspace/i);
    expect(screen.getByRole("heading", { name: /do you have a resume/i }).closest("section")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(api.getProfile).toHaveBeenCalledTimes(1);
    expect(api.getCompleteness).toHaveBeenCalledTimes(1);

    profileLoad.resolve({
      name: "Alex Chen",
      headline: null,
      target_direction: null,
      education: [],
      experience: [],
      projects: [],
      skills: [],
      certificates: [],
    });
    await waitFor(() => expect(api.startConversation).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Alex Chen/)).toBeInTheDocument();
  });

  it("loads the workspace when choosing to add a resume later", async () => {
    const api = apiMock();
    render(<StageApp api={api} />);

    await reachOnboarding();
    await userEvent.click(screen.getByRole("button", { name: /i will add it later/i }));

    await waitFor(() => expect(api.getProfile).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Alex Chen/)).toBeInTheDocument();
    expect(screen.getByText(/profile completion/i)).toBeInTheDocument();
  });
});

async function reachOnboarding() {
  await userEvent.click(screen.getByRole("button", { name: /get started/i }));
  await userEvent.type(screen.getByLabelText(/email/i), "alex@example.com");
  await userEvent.type(screen.getByLabelText(/username/i), "alex");
  await userEvent.type(screen.getByLabelText(/password/i), "secret123");
  await userEvent.click(screen.getByRole("button", { name: /create account/i }));
  await userEvent.type(await screen.findByLabelText(/your name/i), "Alex Chen");
  await userEvent.click(screen.getByRole("button", { name: /nice to meet you/i }));
  expect(await screen.findByText(/do you have a resume/i)).toBeInTheDocument();
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
