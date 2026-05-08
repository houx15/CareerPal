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

  it("uploads a resume file with bearer auth without forcing a JSON content type", async () => {
    const uploadResponse = {
      id: "resume-1",
      original_filename: "resume.pdf",
      content_type: "application/pdf",
      size_bytes: 1234,
      status: "parsed",
      parse_error: null,
      parsed_at: "2026-05-08T00:00:00Z",
      created_at: "2026-05-08T00:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: async () => uploadResponse,
    });
    const client = new ApiClient("http://api.test", () => "token-123", fetchMock as typeof fetch);
    const file = new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" });

    const result = await client.uploadResume(file);

    expect(result).toEqual(uploadResponse);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/resume/upload", {
      method: "POST",
      headers: { Authorization: "Bearer token-123" },
      body: expect.any(FormData),
    });
  });

  it("structures an uploaded resume with bearer auth", async () => {
    const structureResponse = {
      id: "resume-1",
      status: "structured",
      structure_error: null,
      structured_at: "2026-05-08T00:00:00Z",
      profile: { name: "Alex Chen", experience: [], education: [], projects: [], skills: [], certificates: [] },
      conversation_id: "conversation-1",
      follow_up_questions: ["What impact should we emphasize?"],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: async () => structureResponse,
    });
    const client = new ApiClient("http://api.test", () => "token-123", fetchMock as typeof fetch);

    const result = await client.structureResume("resume-1");

    expect(result).toEqual(structureResponse);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/resume/structure/resume-1", {
      method: "POST",
      headers: { Authorization: "Bearer token-123" },
    });
  });

  it("generates a profile page with bearer auth", async () => {
    const page = {
      id: "page-1",
      html_content: "<!doctype html><html><body>Alex Chen</body></html>",
      style_template: "technical",
      version: 1,
      is_public: false,
      created_at: "2026-05-08T00:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: async () => page,
    });
    const client = new ApiClient("http://api.test", () => "token-123", fetchMock as typeof fetch);

    const result = await client.generatePage("technical");

    expect(result).toEqual(page);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/page/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer token-123" },
      body: JSON.stringify({ style_template: "technical" }),
    });
  });

  it("gets the latest generated page preview with bearer auth", async () => {
    const page = {
      id: "page-1",
      html_content: "<!doctype html><html><body>Alex Chen</body></html>",
      style_template: "clean-professional",
      version: 3,
      is_public: false,
      created_at: "2026-05-08T00:02:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: async () => page,
    });
    const client = new ApiClient("http://api.test", () => "token-123", fetchMock as typeof fetch);

    const result = await client.getPagePreview();

    expect(result).toEqual(page);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/page/preview", {
      headers: { Authorization: "Bearer token-123" },
    });
  });


  it("customizes a profile page from an SSE done payload with bearer auth", async () => {
    const page = {
      id: "page-2",
      html_content: "<!doctype html><html><body>Projects first</body></html>",
      style_template: "modern-creative",
      version: 2,
      is_public: false,
      created_at: "2026-05-08T00:01:00Z",
    };
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event: message\ndata: {"delta":"<!doctype html>"}\n\n'));
        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify(page)}\n\n`));
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Type": "text/event-stream" }),
      body: stream,
    });
    const client = new ApiClient("http://api.test", () => "token-123", fetchMock as typeof fetch);

    const result = await client.customizePage({
      conversation_id: "conversation-1",
      instruction: "Make projects more prominent.",
    });

    expect(result).toEqual(page);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/page/customize", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer token-123" },
      body: JSON.stringify({
        conversation_id: "conversation-1",
        instruction: "Make projects more prominent.",
      }),
    });
  });

  it.each([true, false])("updates generated page public setting to %s with bearer auth", async (isPublic) => {
    const page = {
      id: "page-1",
      html_content: "<!doctype html><html><body>Alex Chen</body></html>",
      style_template: "clean-professional",
      version: 1,
      is_public: isPublic,
      created_at: "2026-05-08T00:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: async () => page,
    });
    const client = new ApiClient("http://api.test", () => "token-123", fetchMock as typeof fetch);

    const result = await client.updatePageSettings({ is_public: isPublic });

    expect(result).toEqual(page);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/page/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: "Bearer token-123" },
      body: JSON.stringify({ is_public: isPublic }),
    });
  });

  it("exports the structured profile PDF with bearer auth", async () => {
    const pdf = new Blob(["%PDF-1.7"], { type: "application/pdf" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="careerpal_resume_maya-chen.pdf"',
      }),
      blob: async () => pdf,
    });
    const client = new ApiClient("http://api.test", () => "token-123", fetchMock as typeof fetch);

    const result = await client.exportProfilePdf();

    expect(result).toEqual({ blob: pdf, filename: "careerpal_resume_maya-chen.pdf" });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/page/export/pdf", {
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

  it("parses streaming conversation events and returns the done payload with bearer auth", async () => {
    const donePayload = {
      conversation_id: "conversation-1",
      assistant_message: {
        role: "assistant",
        content: "Let's shape that internship story into a stronger project bullet.",
        timestamp: "2026-05-08T00:01:00Z",
      },
      extraction_diff: {
        profile: {
          headline: { before: null, after: "Backend SWE intern" },
        },
      },
      messages: [
        {
          role: "user",
          content: "I built a resume parser during my internship.",
          timestamp: "2026-05-08T00:00:00Z",
        },
        {
          role: "assistant",
          content: "Let's shape that internship story into a stronger project bullet.",
          timestamp: "2026-05-08T00:01:00Z",
        },
      ],
    };
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('event: message\ndata: {"content":"Let\'s shape"}\n\n'));
        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify(donePayload)}\n\n`));
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Type": "text/event-stream; charset=utf-8" }),
      body: stream,
    });
    const client = new ApiClient("http://api.test", () => "token-123", fetchMock as typeof fetch);

    const result = await client.sendMessage({
      conversation_id: "conversation-1",
      content: "I built a resume parser during my internship.",
    });

    expect(result).toEqual(donePayload);
    expect(result.extraction_diff).toEqual({
      profile: {
        headline: { before: null, after: "Backend SWE intern" },
      },
    });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/conversation/message", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer token-123" },
      body: JSON.stringify({
        conversation_id: "conversation-1",
        content: "I built a resume parser during my internship.",
      }),
    });
  });

  it("parses streaming conversation events split across network chunks", async () => {
    const donePayload = {
      conversation_id: "conversation-1",
      assistant_message: {
        role: "assistant",
        content: "First chunk second chunk",
        timestamp: "2026-05-08T00:01:00Z",
      },
      messages: [],
    };
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const payload = `event: message\ndata: {"delta":"First"}\n\nevent: done\ndata: ${JSON.stringify(donePayload)}\n\n`;
        controller.enqueue(encoder.encode(payload.slice(0, 21)));
        controller.enqueue(encoder.encode(payload.slice(21)));
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Type": "text/event-stream" }),
      body: stream,
    });
    const client = new ApiClient("http://api.test", () => "token-123", fetchMock as typeof fetch);

    await expect(client.sendMessage({ conversation_id: "conversation-1", content: "Hi" })).resolves.toEqual(donePayload);
  });

  it("throws ApiError when a streaming conversation emits an error event", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event: message\ndata: {"delta":"Partial"}\n\n'));
        controller.enqueue(encoder.encode('event: error\ndata: {"message":"LLM provider error: overloaded"}\n\n'));
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Type": "text/event-stream" }),
      body: stream,
    });
    const client = new ApiClient("http://api.test", () => "token-123", fetchMock as typeof fetch);

    await expect(client.sendMessage({ conversation_id: "conversation-1", content: "Hi" })).rejects.toEqual(
      new ApiError(200, "LLM provider error: overloaded"),
    );
  });
});
