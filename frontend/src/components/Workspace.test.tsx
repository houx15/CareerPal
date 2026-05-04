import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Workspace } from "./Workspace";

describe("Workspace", () => {
  it("renders profile and completeness states from backend data", () => {
    render(
      <Workspace
        profile={{
          name: "Alex Chen",
          headline: "CS student",
          target_direction: "Backend SWE",
          education: [],
          experience: [],
          projects: [],
          skills: [],
          certificates: [],
        }}
        completeness={{
          overall: "partial",
          sections: {
            basics: "partial",
            summary: "empty",
            experience: "empty",
            skills: "empty",
            projects: "empty",
            education: "empty",
          },
        }}
        onLogout={() => undefined}
      />,
    );

    assertVisible("Alex Chen");
    assertVisible("Backend SWE");
    assertVisible("Basics");
    assertVisible("partial");
  });
});

function assertVisible(text: string) {
  expect(screen.getByText(text)).toBeInTheDocument();
}
