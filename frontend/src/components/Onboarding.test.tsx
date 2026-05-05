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
});
