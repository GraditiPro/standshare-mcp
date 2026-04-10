import type { AuthStrategy } from "../types/index.js";

export class StandShareClient {
  constructor(
    private apiUrl: string,
    private tenantSlug: string,
    private auth: AuthStrategy
  ) {}

  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.request<T>("GET", url);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>("POST", url, body);
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>("PUT", url, body);
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>("PATCH", url, body);
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(path, this.apiUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const authHeaders = await this.auth.getHeaders();
    const headers: Record<string, string> = {
      ...authHeaders,
      "X-Tenant-Slug": this.tenantSlug,
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.ok) {
      return response.json() as Promise<T>;
    }

    if (response.status === 401) {
      const refreshed = await this.auth.onUnauthorized();
      if (refreshed) {
        const retryHeaders = await this.auth.getHeaders();
        const retryResponse = await fetch(url, {
          method,
          headers: {
            ...retryHeaders,
            "X-Tenant-Slug": this.tenantSlug,
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        if (retryResponse.ok) {
          return retryResponse.json() as Promise<T>;
        }
      }

      throw new Error(
        "Authentication failed — check your API token or credentials in your MCP server configuration"
      );
    }

    let message: string;
    try {
      const errorBody = await response.json() as { message?: string };
      message = errorBody.message ?? `API error: ${response.status}`;
    } catch {
      message = `API error: ${response.status}`;
    }
    throw new Error(message);
  }
}
