import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LangProvider, LangToggle, useLang } from "./LangProvider";

function CopyProbe() {
  const { t, lang } = useLang();
  return (
    <div>
      <p data-testid="lang">{lang}</p>
      <p>{t("brand")}</p>
      <p>{t("intro_eyebrow")}</p>
    </div>
  );
}

describe("LangProvider", () => {
  it("defaults to English copy and can switch to Chinese", async () => {
    render(
      <LangProvider>
        <CopyProbe />
        <LangToggle compact />
      </LangProvider>,
    );

    expect(screen.getByTestId("lang")).toHaveTextContent("en");
    expect(screen.getByText("AI career companion")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "中文" }));

    expect(screen.getByTestId("lang")).toHaveTextContent("zh");
    expect(screen.getByText("AI 职业伙伴")).toBeInTheDocument();
  });
});
