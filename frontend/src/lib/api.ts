import type {
  AuthResponse,
  CustomizePagePayload,
  GeneratedPage,
  Conversation,
  LoginPayload,
  PageSettingsPayload,
  Profile,
  ProfileCompleteness,
  ProfilePatch,
  RegisterPayload,
  ResumeStructureResponse,
  ResumeUploadResponse,
  SendMessagePayload,
  SendMessageResponse,
  StartConversationPayload,
  PageStyleTemplate,
  User,
} from "./types";

type TokenProvider = () => string | null;

export interface PdfExport {
  blob: Blob;
  filename: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: TokenProvider = () => null,
    private readonly fetcher: typeof fetch = (input, init) => globalThis.fetch(input, init),
  ) {}

  register(payload: RegisterPayload): Promise<AuthResponse> {
    return this.request("/api/auth/register", { method: "POST", body: payload });
  }

  login(payload: LoginPayload): Promise<AuthResponse> {
    return this.request("/api/auth/login", { method: "POST", body: payload });
  }

  me(): Promise<User> {
    return this.request("/api/auth/me", { auth: true });
  }

  getProfile(): Promise<Profile> {
    return this.request("/api/profile", { auth: true });
  }

  patchProfile(payload: ProfilePatch): Promise<Profile> {
    return this.request("/api/profile", { method: "PATCH", body: payload, auth: true });
  }

  getCompleteness(): Promise<ProfileCompleteness> {
    return this.request("/api/profile/completeness", { auth: true });
  }

  startConversation(payload: StartConversationPayload): Promise<Conversation> {
    return this.request("/api/conversation/start", { method: "POST", body: payload, auth: true });
  }

  listConversations(): Promise<Conversation[]> {
    return this.request("/api/conversation/history", { auth: true });
  }

  getConversation(id: string): Promise<Conversation> {
    return this.request(`/api/conversation/${id}`, { auth: true });
  }

  sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
    return this.request("/api/conversation/message", { method: "POST", body: payload, auth: true });
  }

  uploadResume(file: File): Promise<ResumeUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return this.request("/api/resume/upload", { method: "POST", formData, auth: true });
  }

  structureResume(resumeId: string): Promise<ResumeStructureResponse> {
    return this.request(`/api/resume/structure/${resumeId}`, { method: "POST", auth: true });
  }

  generatePage(styleTemplate: PageStyleTemplate): Promise<GeneratedPage> {
    return this.request("/api/page/generate", {
      method: "POST",
      body: { style_template: styleTemplate },
      auth: true,
    });
  }

  getPagePreview(): Promise<GeneratedPage> {
    return this.request("/api/page/preview", { auth: true });
  }

  customizePage(payload: CustomizePagePayload): Promise<GeneratedPage> {
    return this.request("/api/page/customize", { method: "POST", body: payload, auth: true });
  }

  updatePageSettings(payload: PageSettingsPayload): Promise<GeneratedPage> {
    return this.request("/api/page/settings", { method: "PATCH", body: payload, auth: true });
  }

  exportProfilePdf(): Promise<PdfExport> {
    return this.requestBlob("/api/page/export/pdf", { auth: true });
  }

  private async requestBlob(
    path: string,
    options: { method?: string; auth?: boolean } = {},
  ): Promise<PdfExport> {
    const headers: Record<string, string> = {};

    const token = options.auth ? this.getToken() : null;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await this.fetcher(this.url(path), {
      ...(options.method ? { method: options.method } : {}),
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    });

    if (!response.ok) {
      const error = await this.errorPayload(response);
      throw new ApiError(response.status, error.message, error.detail);
    }

    return {
      blob: await response.blob(),
      filename: filenameFromDisposition(response.headers?.get("content-disposition")) ?? "careerpal_resume.pdf",
    };
  }

  private async request<T>(
    path: string,
    options: { method?: string; body?: unknown; formData?: FormData; auth?: boolean } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {};

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const token = options.auth ? this.getToken() : null;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await this.fetcher(this.url(path), {
      ...(options.method ? { method: options.method } : {}),
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      ...(options.formData !== undefined ? { body: options.formData } : {}),
    });

    if (!response.ok) {
      const error = await this.errorPayload(response);
      throw new ApiError(response.status, error.message, error.detail);
    }

    if (response.headers?.get("content-type")?.startsWith("text/event-stream")) {
      return this.eventStreamPayload(response);
    }

    return (await response.json()) as T;
  }

  private async eventStreamPayload<T>(response: Response): Promise<T> {
    if (!response.body) {
      throw new ApiError(response.status, "Streaming response did not include a body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let donePayload: T | null = null;

    const consumeEvent = (eventText: string) => {
      let eventName = "message";
      const dataLines: string[] = [];

      for (const line of eventText.split(/\r?\n/)) {
        if (line.startsWith("event:")) {
          eventName = line.slice("event:".length).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice("data:".length).trimStart());
        }
      }

      if (eventName === "done" && dataLines.length > 0) {
        donePayload = JSON.parse(dataLines.join("\n")) as T;
      } else if (eventName === "error" && dataLines.length > 0) {
        const errorPayload = JSON.parse(dataLines.join("\n")) as { message?: unknown };
        throw new ApiError(
          response.status,
          typeof errorPayload.message === "string" ? errorPayload.message : "Streaming response failed",
        );
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      let delimiter = /\r?\n\r?\n/.exec(buffer);
      while (delimiter) {
        const eventEnd = delimiter.index;
        consumeEvent(buffer.slice(0, eventEnd));
        buffer = buffer.slice(eventEnd + delimiter[0].length);
        delimiter = /\r?\n\r?\n/.exec(buffer);
      }

      if (done) {
        break;
      }
    }

    if (buffer.trim()) {
      consumeEvent(buffer);
    }

    if (donePayload === null) {
      throw new ApiError(response.status, "Streaming response did not include a done event");
    }

    return donePayload;
  }

  private async errorPayload(response: Response): Promise<{ message: string; detail?: unknown }> {
    try {
      const data = (await response.json()) as { detail?: unknown };
      return {
        message: this.detailMessage(data.detail) ?? `Request failed with status ${response.status}`,
        detail: typeof data.detail === "string" ? undefined : data.detail,
      };
    } catch {
      return { message: `Request failed with status ${response.status}` };
    }
  }

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/$/, "")}${path}`;
  }

  private detailMessage(detail: unknown): string | null {
    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages = detail.map((item) => this.validationMessage(item)).filter((message) => message !== null);
      return messages.length > 0 ? messages.join("; ") : null;
    }

    return null;
  }

  private validationMessage(item: unknown): string | null {
    if (!item || typeof item !== "object") {
      return null;
    }

    const { loc, msg } = item as { loc?: unknown; msg?: unknown };
    if (typeof msg !== "string") {
      return null;
    }

    if (!Array.isArray(loc) || loc.length === 0) {
      return msg;
    }

    const field = loc[loc.length - 1];
    return typeof field === "string" || typeof field === "number" ? `${field}: ${msg}` : msg;
  }
}

function filenameFromDisposition(disposition: string | null | undefined): string | null {
  if (!disposition) {
    return null;
  }
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].trim());
  }
  const quotedMatch = disposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1].trim();
  }
  const plainMatch = disposition.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim() || null;
}
