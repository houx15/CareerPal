import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("CareerPal global CSS", () => {
  it("defines the prototype visual tokens and core shell classes", () => {
    expect(css).toContain("--accent: #5367F3");
    expect(css).toContain("--serif:");
    expect(css).toContain(".intro-hero");
    expect(css).toContain(".center-stage");
    expect(css).toContain(".app-shell");
    expect(css).toContain(".composer-row");
    expect(css).toContain(".profile-card");
    expect(css).toContain(".overlay-card");
  });

  it("keeps the app root full height with internal screen scrolling", () => {
    expect(css).toMatch(/html,\s*body/);
    expect(css).toContain("height: 100%");
    expect(css).toContain("overflow: hidden");
  });
});
