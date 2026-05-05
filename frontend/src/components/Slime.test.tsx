import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Slime } from "./Slime";

describe("Slime", () => {
  it("renders the listening companion SVG with the requested size", () => {
    render(<Slime size={72} state="listening" />);

    const svg = screen.getByRole("img", { name: /careerpal companion listening/i });
    expect(svg).toHaveAttribute("width", "72");
    expect(svg).toHaveAttribute("height", "72");
    expect(svg.querySelector("animateTransform")).not.toBeNull();
  });

  it("renders a thinking state with thinking animation marks", () => {
    render(<Slime size={40} state="thinking" />);

    expect(screen.getByRole("img", { name: /careerpal companion thinking/i })).toBeInTheDocument();
    expect(document.querySelectorAll("animate").length).toBeGreaterThan(1);
  });
});
