import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LangProvider } from "../i18n/LangProvider";
import { Onboarding } from "./Onboarding";

function renderOnboarding(props: Partial<Parameters<typeof Onboarding>[0]> = {}) {
  const onDone = vi.fn();
  render(
    <LangProvider>
      <Onboarding user={{ name: "Alex Chen", initials: "AC", email: "alex@example.com" }} onDone={onDone} {...props} />
    </LangProvider>,
  );
  return { onDone };
}

async function flushOnboardingPrompt() {
  await act(async () => {
    vi.advanceTimersByTime(950);
  });
}

describe("Onboarding", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the prototype chat prompt and fills the knowledge panel as the user answers", async () => {
    renderOnboarding();

    expect(screen.getAllByText(/alex chen/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/what pal knows so far/i)).toBeInTheDocument();
    expect(screen.getByText("7%")).toBeInTheDocument();
    expect(screen.getByText(/hi alex chen/i)).toBeInTheDocument();

    await flushOnboardingPrompt();

    expect(screen.getByText(/first, what brings you here today/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /i'm looking for a new job/i }));

    expect(screen.getAllByText(/i'm looking for a new job/i).length).toBeGreaterThan(1);
    expect(screen.getByText(/pal is thinking/i)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1150);
    });

    expect(screen.getByText(/tell me about your most recent role/i)).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/attach your resume/i), {
      target: { value: "Product analyst intern at Acme" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await act(async () => {
      vi.advanceTimersByTime(1150);
    });

    expect(screen.getByText(/i have enough to set up your workspace/i)).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open my workspace/i })).toBeInTheDocument();
  });

  it("lets users skip onboarding and shows the workspace loading state", async () => {
    const { onDone } = renderOnboarding();

    fireEvent.click(screen.getByRole("button", { name: /i'll finish later/i }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("shows the workspace loading state while onboarding is completing", () => {
    renderOnboarding({ isLoading: true });

    expect(screen.getByRole("status")).toHaveTextContent(/loading workspace/i);
  });

  it("hydrates existing backend-shaped conversation messages instead of restarting the script", async () => {
    renderOnboarding({
      conversationMessages: [
        { role: "assistant", content: "Welcome back. I found your latest resume." },
        { role: "user", content: "I want to focus on product analytics roles." },
      ],
    });

    expect(screen.getByText("Welcome back. I found your latest resume.")).toBeInTheDocument();
    expect(screen.getByText("I want to focus on product analytics roles.")).toBeInTheDocument();
    expect(screen.queryByText(/hi alex chen/i)).not.toBeInTheDocument();

    await flushOnboardingPrompt();

    expect(screen.queryByText(/first, what brings you here today/i)).not.toBeInTheDocument();
  });

  it("persists user sends through the optional callback and keeps scripted assistant replies", async () => {
    const onSendMessage = vi.fn();
    renderOnboarding({ onSendMessage });

    fireEvent.change(screen.getByPlaceholderText(/attach your resume/i), {
      target: { value: "I led onboarding analytics at Acme" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(onSendMessage).toHaveBeenCalledWith("I led onboarding analytics at Acme");

    await act(async () => {
      vi.advanceTimersByTime(1150);
    });

    expect(screen.getByText(/tell me about your most recent role/i)).toBeInTheDocument();
  });

  it("uploads an attached resume and renders structured follow-up questions in the chat", async () => {
    const onImportResume = vi.fn().mockResolvedValue({ id: "resume-1", status: "parsed" });
    const onStructureResume = vi.fn().mockResolvedValue({
      id: "resume-1",
      status: "structured",
      conversation_id: "conversation-1",
      follow_up_questions: ["Which AI platform roles are you targeting?", "What was the user impact at Acme?"],
    });
    const onResumeImported = vi.fn();
    renderOnboarding({ onImportResume, onStructureResume, onResumeImported });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "alex-resume.pdf", { type: "application/pdf" });

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.getByText(/attached: alex-resume\.pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/pal is thinking/i)).toBeInTheDocument();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText(/i imported your resume/i)).toBeInTheDocument();
    expect(screen.getByText(/which ai platform roles are you targeting/i)).toBeInTheDocument();
    expect(screen.getByText(/what was the user impact at acme/i)).toBeInTheDocument();
    expect(onImportResume).toHaveBeenCalledWith(file);
    expect(onStructureResume).toHaveBeenCalledWith("resume-1");
    expect(onResumeImported).toHaveBeenCalledTimes(1);
  });
});
