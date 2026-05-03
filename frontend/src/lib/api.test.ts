import { describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError } from "./api";

describe("ApiClient", () => {
  it("attaches bearer token and returns parsed JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ email: "alex@example.com" }),
    });
    const client = new ApiClient("http://api.test", () => "token-123", fetchMock as typeof fetch);

    const result = await client.me();

    expect(result).toEqual({ email: "alex@example.com" });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/auth/me", {
      headers: { Authorization: "Bearer token-123" },
    });
  });

  it("throws ApiError with backend detail", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ detail: "Email is already registered" }),
    });
    const client = new ApiClient("http://api.test", () => null, fetchMock as typeof fetch);

    await expect(client.register({ email: "alex@example.com", username: "alex", password: "secret123" })).rejects.toEqual(
      new ApiError(409, "Email is already registered"),
    );
  });
});
