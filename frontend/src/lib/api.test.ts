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

  it("uses the global fetch binding safely when no fetcher is injected", async () => {
    const originalFetch = globalThis.fetch;
    const response = {
      ok: true,
      status: 200,
      json: async () => ({ email: "alex@example.com" }),
    };
    const fetchMock = vi.fn(function (this: typeof globalThis) {
      if (this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }
      return Promise.resolve(response);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const client = new ApiClient("http://api.test", () => "token-123");

      await expect(client.me()).resolves.toEqual({ email: "alex@example.com" });
    } finally {
      globalThis.fetch = originalFetch;
    }
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

  it("preserves FastAPI validation details with field-aware message", async () => {
    const detail = [
      { type: "missing", loc: ["body", "email"], msg: "Field required", input: {} },
      {
        type: "string_too_short",
        loc: ["body", "password"],
        msg: "String should have at least 8 characters",
        input: "x",
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ detail }),
    });
    const client = new ApiClient("http://api.test", () => null, fetchMock as typeof fetch);

    await expect(client.register({ email: "", username: "alex", password: "x" })).rejects.toEqual(
      new ApiError(422, "email: Field required; password: String should have at least 8 characters", detail),
    );
  });

  it("lists conversation history with bearer auth", async () => {
    const conversations = [
      {
        id: "conversation-1",
        context_type: "career",
        focus_node: null,
        messages: [],
        created_at: "2026-05-08T00:00:00Z",
        updated_at: "2026-05-08T00:00:00Z",
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => conversations,
    });
    const client = new ApiClient("http://api.test", () => "token-123", fetchMock as typeof fetch);

    const result = await client.listConversations();

    expect(result).toEqual(conversations);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/conversation/history", {
      headers: { Authorization: "Bearer token-123" },
    });
  });

  it("gets one conversation with bearer auth", async () => {
    const conversation = {
      id: "conversation-1",
      context_type: "page",
      focus_node: "theme",
      messages: [],
      created_at: "2026-05-08T00:00:00Z",
      updated_at: "2026-05-08T00:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => conversation,
    });
    const client = new ApiClient("http://api.test", () => "token-123", fetchMock as typeof fetch);

    const result = await client.getConversation("conversation-1");

    expect(result).toEqual(conversation);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/conversation/conversation-1", {
      headers: { Authorization: "Bearer token-123" },
    });
  });
});
