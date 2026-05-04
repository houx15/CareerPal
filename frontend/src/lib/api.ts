import type {
  AuthResponse,
  Conversation,
  LoginPayload,
  Profile,
  ProfileCompleteness,
  ProfilePatch,
  RegisterPayload,
  SendMessagePayload,
  SendMessageResponse,
  StartConversationPayload,
  User,
} from "./types";

type TokenProvider = () => string | null;

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
    private readonly fetcher: typeof fetch = fetch,
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

  sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
    return this.request("/api/conversation/message", { method: "POST", body: payload, auth: true });
  }

  private async request<T>(
    path: string,
    options: { method?: string; body?: unknown; auth?: boolean } = {},
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
    });

    if (!response.ok) {
      const error = await this.errorPayload(response);
      throw new ApiError(response.status, error.message, error.detail);
    }

    return (await response.json()) as T;
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
