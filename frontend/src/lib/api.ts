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
      throw new ApiError(response.status, await this.errorMessage(response));
    }

    return (await response.json()) as T;
  }

  private async errorMessage(response: Response): Promise<string> {
    try {
      const data = (await response.json()) as { detail?: unknown };
      return typeof data.detail === "string" ? data.detail : `Request failed with status ${response.status}`;
    } catch {
      return `Request failed with status ${response.status}`;
    }
  }

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/$/, "")}${path}`;
  }
}
