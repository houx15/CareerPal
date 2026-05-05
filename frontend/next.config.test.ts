import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("nextConfig", () => {
  it("proxies same-origin API requests to the local backend by default", async () => {
    const rewrites = await nextConfig.rewrites?.();

    expect(rewrites).toContainEqual({
      source: "/api/:path*",
      destination: "http://127.0.0.1:8000/api/:path*",
    });
  });
});
